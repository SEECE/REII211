/* The adjacency matrix — the same graph, written down instead of drawn. Plain script, one
   global `MatrixDraw`.

   Worth having next to the plane because the matrix is what the algorithms actually see, and
   because its SHAPE is the argument for the other representation: an n×n grid costs n² whether
   the graph has n edges or n² of them, so a sparse graph wastes almost all of it. Switch a
   twelve-node graph between the two views and the emptiness is the point.

   It draws the same frame the plane does, and highlights a cell whenever its edge carries a
   role — so an algorithm walking the graph is visibly walking a row of the matrix. */
(function () {
  'use strict';
  var R = window.Roles;

  window.MatrixDraw = {
    draw: function (s, frame, colours, opts) {
      if (!s || !frame || !frame.state) return;
      var g = frame.state, ctx = s.ctx, n = g.nodes.length;
      if (!n) return;

      var head = 22;
      var cell = Math.max(12, Math.min(34, Math.min(s.w - head, s.h - head) / n));
      var x0 = (s.w - (head + cell * n)) / 2 + head;
      var y0 = (s.h - (head + cell * n)) / 2 + head;

      var weight = {};
      g.edges.forEach(function (e) { weight[e.a + ':' + e.b] = weight[e.b + ':' + e.a] = e; });

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 ' + Math.min(12, cell * 0.44) + 'px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = colours['ink-soft'];
      g.nodes.forEach(function (node, i) {
        ctx.fillText(node.label, x0 + cell * (i + 0.5), y0 - head / 2);
        ctx.fillText(node.label, x0 - head / 2, y0 + cell * (i + 0.5));
      });

      for (var r = 0; r < n; r++) {
        for (var c = 0; c < n; c++) {
          var e = weight[g.nodes[r].id + ':' + g.nodes[c].id];
          var role = e ? R.at(frame.roles, e.key, 'done') : null;
          var x = x0 + c * cell, y = y0 + r * cell;
          ctx.fillStyle = e ? window.Palette.mix(colours[role], role === 'done' ? 14 : 34, colours.paper) : colours.paper;
          ctx.fillRect(x, y, cell - 1, cell - 1);
          ctx.strokeStyle = colours.grid;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, cell - 2, cell - 2);
          if (!e) continue;
          ctx.fillStyle = colours.ink;
          ctx.fillText(String(opts && opts.weighted ? e.w : 1), x + cell / 2 - 0.5, y + cell / 2 - 0.5);
        }
      }

      var filled = g.edges.length * 2;
      ctx.textAlign = 'left';
      ctx.font = '500 11px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = colours['ink-faint'];
      ctx.fillText(filled + ' of ' + (n * n) + ' cells used — the rest is the cost of storing a sparse graph this way.',
        6, s.h - 8);
    },
  };
})();
