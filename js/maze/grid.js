/* The maze grid — the SUBJECT the maze page traces. Plain script, one global `MazeGrid`.

   A maze is a graph wearing a disguise: every cell is a node and every gap in a wall is an
   edge. That is worth saying out loud, because it means BFS and DFS on this page are the SAME
   algorithms as on the node plane — only the drawing changed. The one thing the grid adds is
   that the graph is planar and every node has at most four neighbours, which is why a maze is
   the clearest place to see the difference between the two.

   Walls live on the cell as four booleans rather than on the edge, and opening a wall clears
   it from BOTH cells, so the two can never disagree about whether there is a gap. */
(function () {
  'use strict';

  var DIRS = [
    { name: 'n', dc: 0, dr: -1, back: 's' },
    { name: 'e', dc: 1, dr: 0, back: 'w' },
    { name: 's', dc: 0, dr: 1, back: 'n' },
    { name: 'w', dc: -1, dr: 0, back: 'e' },
  ];

  window.MazeGrid = function (cols, rows) {
    var cells = [], snapshot = null, visited = 0, opened = 0, extras = {};
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) cells.push({ c: c, r: r, n: true, e: true, s: true, w: true });
    }
    function dirty() { snapshot = null; }

    var api = {
      cols: cols, rows: rows, size: cells.length,
      index: function (c, r) { return (c < 0 || r < 0 || c >= cols || r >= rows) ? -1 : r * cols + c; },
      cell: function (i) { return cells[i]; },
      start: 0,
      goal: cells.length - 1,

      /* every cell around this one, whether or not there is a wall in the way */
      around: function (i) {
        var cell = cells[i], out = [];
        DIRS.forEach(function (d) {
          var j = api.index(cell.c + d.dc, cell.r + d.dr);
          if (j >= 0) out.push({ to: j, dir: d });
        });
        return out;
      },
      /* the ones actually reachable — this is the maze's adjacency list */
      neighbours: function (i) {
        return api.around(i).filter(function (n) { return !cells[i][n.dir.name]; })
          .map(function (n) { return n.to; });
      },
      open: function (i, n) {
        cells[i][n.dir.name] = false;
        cells[n.to][n.dir.back] = false;
        opened++;
        dirty();
      },
      settle: function () { visited++; },
      track: function (k, v) { extras[k] = v; dirty(); },
      resetCounters: function () { visited = 0; extras = {}; dirty(); },

      view: function () {
        if (snapshot) return snapshot;
        snapshot = {
          cols: cols, rows: rows, start: api.start, goal: api.goal,
          cells: cells.map(function (x) { return { n: x.n, e: x.e, s: x.s, w: x.w }; }),
        };
        return snapshot;
      },
      stats: function () {
        var out = { Cells: cells.length, Visited: visited, Gaps: opened };
        for (var k in extras) out[k] = extras[k];
        return out;
      },
    };
    return api;
  };
  window.MazeGrid.DIRS = DIRS;
})();
