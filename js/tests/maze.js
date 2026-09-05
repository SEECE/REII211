/* Self-checks for the maze — the carve and the search over it.

   Split out of js/tests/graph.js when that file reached the 200-line ceiling. A maze is a
   different SUBJECT from a graph even though the same searches run over it, which is the
   split; nothing here changed in the move. */
(function () {
  'use strict';

  window.Check.suite('graphs — mazes', function () {
    var C = window.Check, T = window.Trace;

    ['backtracker', 'prim'].forEach(function (style) {
      [[2, 2], [6, 4], [20, 14]].forEach(function (dim) {
        var grid = window.MazeGrid(dim[0], dim[1]);
        T.run(window.MazeCarve.run(grid, style));

        var seen = {}, stack = [0], reached = 0;
        seen[0] = true;
        while (stack.length) {
          var at = stack.pop();
          reached++;
          grid.neighbours(at).forEach(function (next) {
            if (!seen[next]) { seen[next] = true; stack.push(next); }
          });
        }
        C.equal(reached, grid.size, style + ' carves every cell (' + dim.join('x') + ')');
        C.equal(grid.stats().Gaps, grid.size - 1, style + ' leaves no loops (' + dim.join('x') + ')');

        grid.resetCounters();
        var bfs = T.run(window.MazeSearch.bfs.run(grid));
        grid.resetCounters();
        var dfs = T.run(window.MazeSearch.dfs.run(grid));
        C.equal(bfs, dfs, 'both searches find the one route through (' + style + ' ' + dim.join('x') + ')');
        C.equal(bfs[0], grid.goal, 'the route ends at the goal');
        C.equal(bfs[bfs.length - 1], grid.start, 'and starts at the start');
      });
    });
  });
})();
