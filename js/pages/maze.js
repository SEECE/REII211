/* The maze page. Plain script, one global `MazePage`.

   Two things to watch and a rail switch between them: how the maze was CARVED, and how it is
   SEARCHED. Keeping the maze between runs is what makes the searches comparable — run BFS on
   it, then DFS on the same maze, and the Visited counters are the answer. */
(function () {
  'use strict';

  window.MazePage = function () {
    var grid = null, rails = null;

    function build(cols, rows, style) {
      grid = window.MazeGrid(cols, rows);
      window.Trace.run(window.MazeCarve.run(grid, style));   // carve silently; the rail decides
      return grid;                                            // whether the carve is re-traced
    }

    function fresh(rail) {
      var n = rail.get('size');
      return build(n, Math.max(4, Math.round(n * 0.72)), rail.get('style'));
    }

    return window.Playground({
      title: 'Maze',
      legend: window.MazeSearch.roles,
      legendNotes: Object.assign({}, window.MazeSearch.notes, window.MazeCarve.notes),

      fields: [
        { id: 'watch', kind: 'choice', label: 'Watch', value: 'bfs', options: [
          { value: 'bfs', label: 'Search — breadth first' },
          { value: 'dfs', label: 'Search — depth first' },
          { value: 'carve', label: 'The carve itself' },
        ] },
        { id: 'style', kind: 'select', label: 'Maze style', value: 'backtracker', options: [
          { value: 'backtracker', label: 'Recursive backtracker — long corridors' },
          { value: 'prim', label: "Prim's — bushy, many dead ends" },
        ] },
        { id: 'size', kind: 'range', label: 'Width in cells', min: 6, max: 40, value: 20 },
        { id: 'generate', kind: 'button', label: 'New maze', variant: 'primary' },
        { id: 'hint', kind: 'note', spacer: true, label:
          'Run both searches on the same maze and compare Visited. The route they find is ' +
          'identical — a perfect maze has only one.' },
      ],

      onField: function (id, value, api) {
        // anything that changes the MAZE makes a new one; changing what you watch does not
        if (id === 'watch') return;
        fresh(api.rail);
      },

      build: function (rail) {
        rails = rail;
        if (!grid) fresh(rail);
        grid.resetCounters();
        var watch = rail.get('watch');
        if (watch === 'carve') {
          // re-carve from scratch so the trace shows it happening rather than a finished maze
          grid = window.MazeGrid(grid.cols, grid.rows);
          return { subject: grid, gen: window.MazeCarve.run(grid, rail.get('style')),
            title: window.MazeCarve.label };
        }
        var search = window.MazeSearch[watch];
        return { subject: grid, gen: search.run(grid), title: search.label + ' — through the maze' };
      },

      render: function (surface, frame, colours) { window.MazeDraw.draw(surface, frame, colours); },
    });
  };
})();
