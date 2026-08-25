/* Breadth-first and depth-first search. Plain script, one global `GraphSearch`.

   Both are the same five lines — take a node off a container, mark it, push its unvisited
   neighbours — and the ONLY difference is whether the container is a queue or a stack. That is
   the entire lesson, so both live in one file with one walk and one flag, rather than two files
   that look unrelated. The frontier is shown at every step so a student can see the queue grow
   in rings while the stack dives. */
(function () {
  'use strict';
  var R = window.Roles;

  function label(g, id) { return '<span class="val">' + g.node(id).label + '</span>'; }

  function* walk(g, start, breadth) {
    var container = [start], seen = {}, parent = {}, done = [], order = [];
    seen[start] = true;
    var name = breadth ? 'BFS' : 'DFS';

    yield {
      tag: name,
      note: 'Start at ' + label(g, start) + ' and put it in the ' + (breadth ? 'queue' : 'stack') +
        '. From here the algorithm is the same either way: take one out, mark it, put its ' +
        'unseen neighbours in. The container is the whole difference.',
      roles: R.of({ frontier: [start] }),
    };

    while (container.length) {
      var current = breadth ? container.shift() : container.pop();
      g.settle();
      done.push(current);
      order.push(g.node(current).label);
      g.track('Order', order.join(' '));

      yield {
        tag: name,
        note: 'Take ' + label(g, current) + ' off the ' + (breadth ? '<b>front</b> of the queue' : '<b>top</b> of the stack') +
          ' and visit it.' + (breadth
            ? ' A queue hands back the oldest entry, so everything one hop away is visited before anything two hops away.'
            : ' A stack hands back the newest entry, so the walk keeps going deeper until it has nowhere left to go.'),
        roles: R.of({ done: done, frontier: container, focus: [current],
          path: done.map(function (id) { return parent[id] != null ? window.Graph.edgeKey(id, parent[id]) : null; }) }),
      };

      var added = [];
      g.neighbours(current).forEach(function (n) {
        if (seen[n.to]) return;
        seen[n.to] = true;
        parent[n.to] = current;
        container.push(n.to);
        added.push(n.to);
      });

      if (added.length) {
        yield {
          tag: name,
          note: 'Its unseen neighbours — ' + added.map(function (id) { return label(g, id); }).join(', ') +
            ' — go into the ' + (breadth ? 'queue' : 'stack') + '. Marking them <b>now</b>, ' +
            'rather than when they are taken out, is what stops the same node being queued twice.',
          roles: R.of({ done: done, frontier: container, move: added }),
        };
      }
    }

    yield {
      tag: 'done',
      note: 'The container is empty, so everything reachable from ' + label(g, start) +
        ' has been visited. Visit order: <b>' + order.join(' → ') + '</b>.' +
        (breadth ? ' In an unweighted graph this order also gives the shortest path in hops.' : ''),
      roles: R.of({ done: done }),
    };
  }

  window.GraphSearch = {
    bfs: { label: 'Breadth-first search', weighted: false, roles: ['idle', 'frontier', 'focus', 'move', 'done'],
      run: function (g, start) { return walk(g, start, true); } },
    dfs: { label: 'Depth-first search', weighted: false, roles: ['idle', 'frontier', 'focus', 'move', 'done'],
      run: function (g, start) { return walk(g, start, false); } },
    notes: {
      frontier: { label: 'In the container', desc: 'Seen, waiting to be visited' },
      focus: { label: 'Visiting', desc: 'Just taken out of the queue or stack' },
      move: { label: 'Just added', desc: 'Discovered on this step' },
      done: { label: 'Visited', desc: 'Taken out and finished with' },
    },
  };
})();
