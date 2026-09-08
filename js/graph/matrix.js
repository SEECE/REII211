/* The adjacency matrix — the same graph, written down instead of drawn. Plain script, one
   global `MatrixDraw`.

   Worth having next to the plane because the matrix is what the algorithms actually see, and
   because its SHAPE is the argument for the other representation: an n×n grid costs n² whether
   the graph has n edges or n² of them, so a sparse graph wastes almost all of it. Switch a
   twelve-node graph between the two views and the emptiness is the point.

   It draws the same frame the plane does, and highlights a cell whenever its edge carries a
   role — so an algorithm walking the graph is visibly walking a row of the matrix.

   It is also EDITABLE, in the terms the matrix is written in: a cell is an edge, so clicking one
   puts the edge in or takes it out, and the ruled row and column past the last node are where a
   new node goes in — which in this view is literally adding a row and a column. `geom` and `hit`
   are here and not in the editor for the same reason js/graph/draw.js owns the plane's hit
   testing: what you click has to be what was drawn, and two copies of the arithmetic drift the
   moment the canvas is resized. */
(function () {
  'use strict';
  var R = window.Roles;

  /* The grid is laid out for n+1 slots — the extra one is the row and column you add into. */
  function geom(s, n) {
    var head = 22, slots = n + 1;
    var cell = Math.max(12, Math.min(34, Math.min(s.w - head, s.h - head) / slots));
    return {
      head: head, cell: cell, n: n,
      x0: (s.w - (head + cell * slots)) / 2 + head,
      y0: (s.h - (head + cell * slots)) / 2 + head,
    };
  }

  window.MatrixDraw = {
    draw: function (s, frame, colours, opts) {
      if (!s || !frame || !frame.state) return;
      var g = frame.state, ctx = s.ctx, n = g.nodes.length;
      if (!n) {
        window.GraphDraw.note(s, colours, 'An adjacency matrix of nothing is nothing. Click ' +
          'anywhere to put the first node in — a node is a row and a column.');
        return;
      }
      var m = geom(s, n), cell = m.cell, x0 = m.x0, y0 = m.y0;

      var weight = {};
      g.edges.forEach(function (e) { weight[e.a + ':' + e.b] = weight[e.b + ':' + e.a] = e; });

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 ' + Math.min(12, cell * 0.44) + 'px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = colours['ink-soft'];
      g.nodes.forEach(function (node, i) {
        ctx.fillText(node.label, x0 + cell * (i + 0.5), y0 - m.head / 2);
        ctx.fillText(node.label, x0 - m.head / 2, y0 + cell * (i + 0.5));
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

      /* the row and column a new node goes into — ruled, empty, and marked with a + at each
         head, so that "add a node" and "add a row and a column" are visibly the same act */
      if (opts && opts.editable) {
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = colours['ink-faint'];
        for (var i = 0; i <= n; i++) {
          ctx.strokeRect(x0 + n * cell + 0.5, y0 + i * cell + 0.5, cell - 2, cell - 2);
          if (i < n) ctx.strokeRect(x0 + i * cell + 0.5, y0 + n * cell + 0.5, cell - 2, cell - 2);
        }
        ctx.setLineDash([]);
        ctx.fillStyle = colours['ink-faint'];
        ctx.fillText('+', x0 + cell * (n + 0.5), y0 - m.head / 2);
        ctx.fillText('+', x0 - m.head / 2, y0 + cell * (n + 0.5));
      }

      var filled = g.edges.length * 2;
      ctx.textAlign = 'left';
      ctx.font = '500 11px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = colours['ink-faint'];
      ctx.fillText(filled + ' of ' + (n * n) + ' cells used — the rest is the cost of storing a sparse graph this way.',
        6, s.h - 8);
    },

    /* What is under a point: a cell (two node ids — the edge it stands for), a header (one node
       id — the row and column that node owns), the add slot, or nothing. */
    hit: function (s, view, px, py) {
      var n = view.nodes.length;
      if (!n) return { kind: 'add' };
      var m = geom(s, n), cell = m.cell;
      var c = Math.floor((px - m.x0) / cell), r = Math.floor((py - m.y0) / cell);
      var inCols = c >= 0 && c <= n, inRows = r >= 0 && r <= n;
      var onColHead = py < m.y0 && py >= m.y0 - m.head;
      var onRowHead = px < m.x0 && px >= m.x0 - m.head;

      if (onColHead && inCols) return c === n ? { kind: 'add' } : { kind: 'node', id: view.nodes[c].id };
      if (onRowHead && inRows) return r === n ? { kind: 'add' } : { kind: 'node', id: view.nodes[r].id };
      if (!inCols || !inRows) return null;
      if (c === n || r === n) return { kind: 'add' };
      if (r === c) return { kind: 'node', id: view.nodes[r].id };   // the diagonal is the node
      return { kind: 'cell', a: view.nodes[r].id, b: view.nodes[c].id };
    },
  };
})();
