/* Searching the maze — the same BFS and DFS, on a grid. Plain script, one global `MazeSearch`.

   Deliberately the same algorithm as js/graph/traverse.js, because a maze IS a graph and the
   point of running them here is that the difference between a queue and a stack, which is
   abstract on a node plane, is obvious on a grid: BFS floods outwards in an even wavefront,
   DFS dives down one corridor to the end before trying anything else.

   The other thing this page can show that the plane cannot: in a PERFECT maze there is exactly
   one route between any two cells, so both searches return the SAME path. They differ only in
   how much of the maze they had to look at to find it — which is the Visited counter. */
(function () {
  'use strict';
  var R = window.Roles;

  function* walk(grid, breadth) {
    var container = [grid.start], seen = {}, parent = {}, done = [];
    seen[grid.start] = true;
    var name = breadth ? 'BFS' : 'DFS';

    yield {
      tag: name,
      note: 'Start at the top-left and look for the bottom-right. The container is a <b>' +
        (breadth ? 'queue' : 'stack') + '</b>, and that single choice is the whole difference ' +
        'between the two searches.',
      roles: R.of({ frontier: [grid.start] }),
    };

    while (container.length) {
      var at = breadth ? container.shift() : container.pop();
      done.push(at);
      grid.settle();
      grid.track('Frontier', container.length);

      if (at === grid.goal) {
        var path = [], step = at;
        while (step != null) { path.push(step); step = parent[step]; }
        grid.track('Path', path.length);
        yield {
          tag: 'found',
          note: 'Reached the goal after visiting <b>' + done.length + '</b> of ' + grid.size +
            ' cells. The route is <b>' + path.length + '</b> cells long — and because the maze ' +
            'is perfect, it is the <i>only</i> route, so the other search will find exactly ' +
            'this one and differ only in how much of the maze it had to look at first.',
          roles: R.of({ done: done, path: path, focus: [grid.goal] }),
        };
        return path;
      }

      yield {
        tag: name,
        note: breadth
          ? 'Take the <b>oldest</b> cell off the queue. Everything one step from the start is ' +
            'visited before anything two steps away, so the search spreads as an even wavefront.'
          : 'Take the <b>newest</b> cell off the stack. The search commits to one corridor and ' +
            'follows it to its end before it will consider any other.',
        roles: R.of({ done: done, frontier: container, focus: [at] }),
      };

      grid.neighbours(at).forEach(function (next) {
        if (seen[next]) return;
        seen[next] = true;
        parent[next] = at;
        container.push(next);
      });
    }

    yield {
      tag: 'done',
      note: 'The container emptied without reaching the goal — nothing else is reachable.',
      roles: R.of({ done: done }),
    };
    return null;
  }

  window.MazeSearch = {
    roles: ['wall', 'frontier', 'focus', 'done', 'path'],
    notes: {
      wall: { label: 'Unreached', desc: 'Never looked at' },
      frontier: { label: 'In the container', desc: 'Seen, waiting its turn' },
      focus: { label: 'Here', desc: 'The cell being visited' },
      done: { label: 'Visited', desc: 'Looked at and finished with' },
      path: { label: 'The route', desc: 'Start to goal, traced back through the parents' },
    },
    bfs: { label: 'Breadth-first search', run: function (g) { return walk(g, true); } },
    dfs: { label: 'Depth-first search', run: function (g) { return walk(g, false); } },
  };
})();
