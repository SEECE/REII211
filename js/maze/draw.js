/* The maze, drawn. Plain script, one global `MazeDraw`.

   Cells are filled by role and walls are strokes between them, which is why the grid stores
   walls per cell rather than as edges — drawing four line segments is cheaper than working out
   which edges are missing. Start and goal are marked so a search always has a visible errand. */
(function () {
  'use strict';
  var R = window.Roles;

  window.MazeDraw = {
    draw: function (s, frame, colours) {
      if (!s || !frame || !frame.state) return;
      var m = frame.state, ctx = s.ctx;
      var pad = 6;
      var size = Math.max(4, Math.min((s.w - pad * 2) / m.cols, (s.h - pad * 2) / m.rows));
      var x0 = (s.w - size * m.cols) / 2, y0 = (s.h - size * m.rows) / 2;

      m.cells.forEach(function (cell, i) {
        var c = i % m.cols, r = Math.floor(i / m.cols);
        var x = x0 + c * size, y = y0 + r * size;
        var role = R.at(frame.roles, i, 'wall');
        ctx.fillStyle = role === 'wall'
          ? window.Palette.mix(colours.wall, 8, colours.paper)
          : window.Palette.mix(colours[role], role === 'done' ? 26 : 62, colours.paper);
        ctx.fillRect(x, y, size + 0.6, size + 0.6);
      });

      ctx.strokeStyle = colours.wall;
      ctx.lineWidth = Math.max(1, Math.min(2.4, size / 9));
      ctx.lineCap = 'square';
      ctx.beginPath();
      m.cells.forEach(function (cell, i) {
        var c = i % m.cols, r = Math.floor(i / m.cols);
        var x = x0 + c * size, y = y0 + r * size;
        if (cell.n) { ctx.moveTo(x, y); ctx.lineTo(x + size, y); }
        if (cell.w) { ctx.moveTo(x, y); ctx.lineTo(x, y + size); }
        if (cell.s) { ctx.moveTo(x, y + size); ctx.lineTo(x + size, y + size); }
        if (cell.e) { ctx.moveTo(x + size, y); ctx.lineTo(x + size, y + size); }
      });
      ctx.stroke();

      [[m.start, 'A'], [m.goal, 'B']].forEach(function (pair) {
        var c = pair[0] % m.cols, r = Math.floor(pair[0] / m.cols);
        ctx.fillStyle = colours.ink;
        ctx.font = '700 ' + Math.min(13, size * 0.6) + 'px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pair[1], x0 + (c + 0.5) * size, y0 + (r + 0.5) * size);
      });
    },
  };
})();
