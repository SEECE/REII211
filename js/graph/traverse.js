/* Breadth-first and depth-first search. Plain script, one global `GraphSearch`.

   Both are the same five lines — take a node off a container, mark it, push its unvisited
   neighbours — and the ONLY difference is whether the container is a queue or a stack. That is
   the entire lesson, so both live in one file with one walk and one flag, rather than two files
   that look unrelated. The frontier is shown at every step so a student can see the queue grow
   in rings while the stack dives.

   The one place the flag shows up twice is the direction the neighbours go IN, and it is the
   same fact stated again: a queue hands back the oldest so they go in forwards, a stack hands
   back the newest so they go in backwards. Both then take the neighbours in the order the
   adjacency list is written, which js/graph/model.js keeps in label order — so the visit order
   here is the visit order a student gets working the same graph out on paper.

   Given a `goal`, the walk stops the moment it comes off the container and reports the route it
   took to get there. That is the same walk with an extra `if`, not a second search: a page that
   wants a full traversal leaves the goal out and nothing about the run changes. Whether the
   route it hands back is worth having is the whole difference between the two — BFS's is the
   fewest EDGES by construction, DFS's is only the first one it stumbled into.

   The beats in the loop state their roles as a DELTA — what changed since the last one — while
   the beats that sum the run up state the whole picture. Both are the same walk and the same
   narration; see js/core/trace.js. Restating "everything visited so far" on every beat is fine
   on a graph with sixty-four nodes and quadratic on one with thirteen thousand, which is what
   the street map now holds. */
(function () {
  'use strict';
  var R = window.Roles;

  function label(g, id) { return '<span class="val">' + g.node(id).label + '</span>'; }

  function* walk(g, start, breadth, goal) {
    var container = [start], seen = {}, parent = {}, done = [], order = [];
    /* `added` outlives the iteration that filled it: the nodes shown as just-discovered on one
       beat are ordinary members of the container on the next, and that promotion is the delta. */
    var added = [], previous = null;
    seen[start] = true;
    var name = breadth ? 'BFS' : 'DFS';
    var hunting = goal != null;

    yield {
      tag: name,
      note: 'Start at ' + label(g, start) + ' and put it in the ' + (breadth ? 'queue' : 'stack') +
        '. From here the algorithm is the same either way: take one out, mark it, put its ' +
        'unseen neighbours in. The container is the whole difference.' +
        (hunting ? ' Stop as soon as ' + label(g, goal) + ' comes back out.' : ''),
      roles: R.of({ frontier: [start] }),
    };

    while (container.length) {
      var current = breadth ? container.shift() : container.pop();
      g.settle();
      done.push(current);
      order.push(g.node(current).label);
      /* the visit ORDER is a pinned counter, and thirteen thousand crossings written out in
         full is several megabytes of string rebuilt on every beat — so it is kept to the tail */
      g.track('Order', order.length > 40 ? '… ' + order.slice(-40).join(' ') : order.join(' '));

      if (hunting && current === goal) {
        var route = window.Graph.route(g, parent, current);
        g.track('Hops', route.hops);
        g.track('Weight', route.weight);
        yield {
          tag: 'found',
          note: 'Reached ' + label(g, goal) + ' after visiting <b>' + done.length + '</b> of ' +
            g.nodes().length + ' nodes. The route is <b>' + route.hops + '</b> edge' +
            (route.hops === 1 ? '' : 's') + ' long and weighs <b>' + route.weight + '</b>. ' +
            (breadth
              ? 'A queue empties in ring order, so nothing was reached in fewer edges than it had ' +
                'to be — this route uses the <b>fewest edges</b> there are. That is a claim about ' +
                'edges and nothing else: if the edges carry weights, a longer route can still weigh ' +
                'less, and finding <i>that</i> one is Dijkstra\u2019s job.'
              : 'A stack dives, so this is simply the first route the walk fell into. It is <i>a</i> ' +
                'route, and nothing about depth-first search makes it a good one — run BFS from the ' +
                'same node and compare the two numbers.'),
          roles: R.of({ done: done, path: route.keys, focus: [goal] }),
        };
        return route;
      }

      yield {
        tag: name,
        note: 'Take ' + label(g, current) + ' off the ' + (breadth ? '<b>front</b> of the queue' : '<b>top</b> of the stack') +
          ' and visit it.' + (breadth
            ? ' A queue hands back the oldest entry, so everything one hop away is visited before anything two hops away.'
            : ' A stack hands back the newest entry, so the walk keeps going deeper until it has nowhere left to go.'),
        /* what moved: last beat's discoveries are now plain members of the container, the node
           focused last time is finished with, this one arrived along one edge, and it is now
           the one being visited. Nothing else on the map changed. */
        delta: R.of({
          frontier: added,
          done: [previous],
          path: parent[current] != null ? [window.Graph.edgeKey(current, parent[current])] : null,
          focus: [current],
        }),
      };

      previous = current;
      added = [];
      /* Neighbours go in in the order the container will hand them BACK. A queue hands back
         the oldest, so they go in forwards; a stack hands back the newest, so they go in
         backwards. Either way the walk takes A's neighbours in the order the adjacency list
         writes them — which is label order (js/graph/model.js) — and the visit order on screen
         is the one a student gets working it out by hand. Feeding a stack forwards made it
         take the LAST neighbour first, which is right for no adjacency list anybody writes. */
      var ns = g.neighbours(current);
      if (!breadth) ns.reverse();
      ns.forEach(function (n) {
        if (seen[n.to]) return;
        seen[n.to] = true;
        parent[n.to] = current;
        container.push(n.to);
        added.push(n.to);
      });
      if (!breadth) added.reverse();     // narrate them in the order they will come out

      if (added.length) {
        yield {
          tag: name,
          note: 'Its unseen neighbours — ' + added.map(function (id) { return label(g, id); }).join(', ') +
            ' — go into the ' + (breadth ? 'queue' : 'stack') + '. Marking them <b>now</b>, ' +
            'rather than when they are taken out, is what stops the same node being queued twice.',
          // the visited node stops being the focus here, exactly as it did when this beat
          // restated the whole picture — `done` covers it and nothing overrides it
          delta: R.of({ done: [current], move: added }),
        };
      }
    }

    yield {
      tag: 'done',
      note: hunting
        ? 'The container emptied without ever reaching ' + label(g, goal) + '. Everything ' +
          'reachable from ' + label(g, start) + ' has been visited and the destination is not ' +
          'among it — there is no route at all, which is an answer as much as a route is.'
        : 'The container is empty, so everything reachable from ' + label(g, start) +
          ' has been visited. Visit order: <b>' + order.join(' → ') + '</b>.' +
          (breadth ? ' In an unweighted graph this order also gives the shortest path in hops.' : ''),
      roles: R.of({ done: done }),
    };
    return null;
  }

  window.GraphSearch = {
    bfs: { label: 'Breadth-first search', weighted: false, roles: ['idle', 'frontier', 'focus', 'move', 'done'],
      run: function (g, start, goal) { return walk(g, start, true, goal); } },
    dfs: { label: 'Depth-first search', weighted: false, roles: ['idle', 'frontier', 'focus', 'move', 'done'],
      run: function (g, start, goal) { return walk(g, start, false, goal); } },
    notes: {
      frontier: { label: 'In the container', desc: 'Seen, waiting to be visited' },
      focus: { label: 'Visiting', desc: 'Just taken out of the queue or stack' },
      move: { label: 'Just added', desc: 'Discovered on this step' },
      done: { label: 'Visited', desc: 'Taken out and finished with' },
    },
  };
})();
