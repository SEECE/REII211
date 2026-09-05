/* Dijkstra's shortest paths. Plain script, one global `GraphShortest`.

   The claim worth watching: once a node is SETTLED its distance is final and will never be
   improved again. That is only true because every weight is non-negative — with one negative
   edge the argument collapses, which is why this algorithm has that precondition and BFS does
   not need one.

   The frontier is scanned linearly to find the nearest unsettled node. A real implementation
   uses a priority queue and that is where the E log V comes from; at the sizes this page draws,
   a scan is honest and shows exactly what the queue is doing for you.

   Given a `goal`, it stops the moment that node is settled rather than settling the rest of the
   map. That is not a shortcut and not a different algorithm — it falls straight out of the
   claim above: the node was settled, so its distance is already final, and nothing settled
   afterwards could change it. Leave the goal out and it does what it always did.

   The two beats in the loop state their roles as a DELTA — one node settled, a few edges
   relaxed, and the edge a shorter route DISPLACED going back to nothing. That last one is the
   only part that is not obvious, and it is the interesting part: the shortest-path tree is not
   append-only, and an edge leaves it the moment a better parent is found. See js/core/trace.js
   for why restating the whole tree on every beat was a page that could hold a district and not
   an island. */
(function () {
  'use strict';
  var R = window.Roles;

  function label(g, id) { return '<span class="val">' + g.node(id).label + '</span>'; }
  function d(x) { return x === Infinity ? '∞' : String(x); }

  window.GraphShortest = {
    label: 'Dijkstra — shortest paths',
    weighted: true,
    roles: ['idle', 'frontier', 'focus', 'scan', 'path', 'done'],
    notes: {
      frontier: { label: 'Reached', desc: 'Has a tentative distance, not settled yet' },
      focus: { label: 'Settling', desc: 'The nearest unsettled node — its distance is now final' },
      scan: { label: 'Relaxing', desc: 'The edge being tested for a shorter route' },
      path: { label: 'Tree edge', desc: 'The edge on the best known route to a node' },
      done: { label: 'Settled', desc: 'Shortest distance found and proven' },
    },

    run: function* (g, start, goal) {
      var dist = {}, prev = {}, settled = {}, tree = [], count = 0;
      /* carried from one beat to the next, because promoting them is the delta: the edges shown
         as being relaxed become ordinary tree edges, and the nodes shown as newly reached go
         back to being unremarkable until one of them is settled */
      var wasScanned = [], wasReached = [];
      var hunting = goal != null;
      g.nodes().forEach(function (n) { dist[n.id] = Infinity; });
      dist[start] = 0;

      yield {
        tag: 'setup',
        note: 'Every node starts at distance <b>∞</b> except the source ' + label(g, start) +
          ', which is at <b>0</b>. Nothing is settled yet — these are only the best routes ' +
          'known <i>so far</i>.' +
          (hunting ? ' Stop the moment ' + label(g, goal) + ' is settled: settled means final, ' +
            'so there is nothing left to find out about it.' : ''),
        roles: R.of({ frontier: [start] }),
      };

      while (true) {
        var best = null;
        g.nodes().forEach(function (n) {
          if (settled[n.id] || dist[n.id] === Infinity) return;
          if (best === null || dist[n.id] < dist[best]) best = n.id;
        });
        if (best === null) break;

        settled[best] = true;
        count++;
        g.settle();
        g.track('Settled', count);

        yield {
          tag: 'settle',
          note: 'The nearest unsettled node is ' + label(g, best) + ' at <b>' + d(dist[best]) +
            '</b>. <b>Settle it.</b> No route through any node still on the frontier could be ' +
            'shorter, because every one of them is already at least this far away and no edge ' +
            'has a negative weight to bring the total back down.',
          /* what moved: the edges relaxed last beat are ordinary tree edges now, the nodes they
             reached go back to nothing, and the nearest of them is the one being settled. The
             node settled last beat was already marked done by the relax that followed it. */
          delta: R.of({
            path: wasScanned, idle: wasReached, focus: [best],
          }),
        };

        if (hunting && best === goal) {
          var route = window.Graph.route(g, prev, goal);
          g.track('Hops', route.hops);
          g.track('Weight', route.weight);
          yield {
            tag: 'done',
            note: 'That settled node <i>is</i> the destination, so the answer is in: the shortest ' +
              'route from ' + label(g, start) + ' to ' + label(g, goal) + ' weighs <b>' +
              dist[goal] + '</b> and runs ' +
              route.nodes.map(function (id) { return label(g, id); }).join(' → ') + ' — <b>' +
              route.hops + '</b> edge' + (route.hops === 1 ? '' : 's') + '. Settling it took <b>' +
              count + '</b> of ' + g.nodes().length + ' nodes; the rest of ' +
              'the graph never had to be worked out at all, because no route through a node that ' +
              'is still further away than ' + label(g, goal) + ' could come back and beat it.',
            roles: R.of({
              done: Object.keys(settled).map(Number), path: route.keys, focus: [goal],
            }),
          };
          return dist;
        }

        var improved = [], displaced = [];
        g.neighbours(best).forEach(function (n) {
          if (settled[n.to]) return;
          var through = dist[best] + n.w;
          if (through >= dist[n.to]) return;
          /* a node that already had a route loses the edge it arrived by — the tree SHRINKS
             here as well as growing, and an edge that leaves it has to be put back to nothing */
          if (prev[n.to] != null) displaced.push(window.Graph.edgeKey(n.to, prev[n.to]));
          dist[n.to] = through;
          prev[n.to] = best;
          improved.push(n);
        });

        yield {
          tag: 'relax',
          note: improved.length
            ? 'Going through ' + label(g, best) + ' improves ' +
              improved.map(function (n) {
                return label(g, n.to) + ' to <b>' + (dist[best] + n.w) + '</b>';
              }).join(', ') + '. Each of those nodes now records ' + label(g, best) +
              ' as the step before it on its best route.'
            : 'No neighbour of ' + label(g, best) + ' gets a shorter route this way — every one ' +
              'of them already had an equal or better distance recorded.',
          delta: R.of({
            idle: displaced,
            done: [best],
            scan: improved.map(function (n) { return n.key; }),
            frontier: improved.map(function (n) { return n.to; }),
          }),
        };

        wasScanned = improved.map(function (n) { return n.key; });
        wasReached = improved.map(function (n) { return n.to; });
      }

      tree = Object.keys(prev).map(function (id) { return window.Graph.edgeKey(id, prev[id]); });

      var reached = g.nodes().filter(function (n) { return dist[n.id] < Infinity; });
      /* Every distance, when there are few enough to read. Thirteen thousand of them is not a
         list anybody reads and is a megabyte of HTML in a panel four inches wide. */
      var listed = reached.length <= 60
        ? reached.map(function (n) { return n.label + '&thinsp;=&thinsp;<b>' + dist[n.id] + '</b>'; }).join(', ')
        : '<b>' + reached.length.toLocaleString() + '</b> of them — too many to list';
      g.track('Total', reached.reduce(function (sum, n) { return sum + dist[n.id]; }, 0));
      var stranded = g.nodes().length - reached.length;
      yield {
        tag: 'done',
        note: 'Every reachable node is settled. Distances from ' + label(g, start) + ': ' +
          listed +
          '. The highlighted edges form the shortest-path <i>tree</i> — follow one back to the ' +
          'source and you have the route.' +
          (stranded
            ? ' <b>' + stranded + '</b> node' + (stranded === 1 ? ' is' : 's are') + ' still at ' +
              '<b>∞</b>: no path from ' + label(g, start) + ' reaches ' + (stranded === 1 ? 'it' : 'them') +
              ' at all, so ' + (stranded === 1 ? 'it' : 'they') + ' never entered the frontier.'
            : ''),
        /* only the nodes that were actually settled — marking an unreachable node "Settled"
           would contradict the ∞ the same frame reports for it */
        roles: R.of({ done: reached.map(function (n) { return n.id; }), path: tree }),
      };
      return dist;
    },
  };
})();
