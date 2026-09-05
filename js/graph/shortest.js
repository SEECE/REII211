/* Dijkstra's shortest paths. Plain script, one global `GraphShortest`.

   The claim worth watching: once a node is SETTLED its distance is final and will never be
   improved again. That is only true because every weight is non-negative — with one negative
   edge the argument collapses, which is why this algorithm has that precondition and BFS does
   not need one.

   The frontier is scanned linearly to find the nearest unsettled node. A real implementation
   uses a priority queue and that is where the E log V comes from; at the sizes this page draws,
   a scan is honest and shows exactly what the queue is doing for you. */
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

    run: function* (g, start) {
      var dist = {}, prev = {}, settled = {}, tree = [];
      g.nodes().forEach(function (n) { dist[n.id] = Infinity; });
      dist[start] = 0;

      yield {
        tag: 'setup',
        note: 'Every node starts at distance <b>∞</b> except the source ' + label(g, start) +
          ', which is at <b>0</b>. Nothing is settled yet — these are only the best routes ' +
          'known <i>so far</i>.',
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
        g.settle();
        g.track('Settled', Object.keys(settled).length);

        yield {
          tag: 'settle',
          note: 'The nearest unsettled node is ' + label(g, best) + ' at <b>' + d(dist[best]) +
            '</b>. <b>Settle it.</b> No route through any node still on the frontier could be ' +
            'shorter, because every one of them is already at least this far away and no edge ' +
            'has a negative weight to bring the total back down.',
          roles: R.of({ path: tree, done: Object.keys(settled).map(Number), focus: [best] }),
        };

        var improved = [];
        g.neighbours(best).forEach(function (n) {
          if (settled[n.to]) return;
          var through = dist[best] + n.w;
          if (through < dist[n.to]) { dist[n.to] = through; prev[n.to] = best; improved.push(n); }
        });

        tree = Object.keys(prev).map(function (id) { return window.Graph.edgeKey(id, prev[id]); });

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
          roles: R.of({
            done: Object.keys(settled).map(Number),
            path: tree,
            scan: improved.map(function (n) { return n.key; }),
            frontier: improved.map(function (n) { return n.to; }),
          }),
        };
      }

      var reached = g.nodes().filter(function (n) { return dist[n.id] < Infinity; });
      g.track('Total', reached.reduce(function (sum, n) { return sum + dist[n.id]; }, 0));
      var stranded = g.nodes().length - reached.length;
      yield {
        tag: 'done',
        note: 'Every reachable node is settled. Distances from ' + label(g, start) + ': ' +
          reached.map(function (n) { return n.label + '&thinsp;=&thinsp;<b>' + dist[n.id] + '</b>'; }).join(', ') +
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
