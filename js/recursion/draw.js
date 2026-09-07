/* The call tree, drawn. Plain script, one global `TreeDraw`.

   One renderer for both recursion pages: it draws a FRAME — the nodes that exist at this
   point, at their final positions (js/recursion/layout.js), coloured by frame.roles. It knows
   nothing about merging or partitioning.

   A node shows its values as text while they fit and as a bar strip when they do not, which is
   what keeps a 24-element tree readable at the top and at the bottom of the same drawing. */
(function () {
  'use strict';
  var R = window.Roles;

  /* The box is as wide as the slab of stage its subtree owns, so it cannot reach past the edge
     or into a sibling however lopsided the tree is. The floor is there for a 40-column tree on
     a phone, where a column is a couple of pixels wide. */
  function nodeBox(L, W, H, node) {
    var rows = L.depth + 1;
    var rowH = H / rows;
    var w = Math.max(8, L.span(node.id) * W * 0.92);
    return {
      cx: L.x(node.id) * W,
      cy: node.depth * rowH + rowH / 2,
      w: w,
      h: Math.min(30, rowH * 0.52),
    };
  }

  window.TreeDraw = {
    draw: function (s, frame, colours) {
      if (!s || !frame || !frame.state) return;
      var state = frame.state, tree = state.tree;
      var L = window.TreeLayout(tree);
      var ctx = s.ctx, W = s.w, H = s.h;
      var boxes = {};

      tree.nodes().forEach(function (n) { if (L.has(n.id)) boxes[n.id] = nodeBox(L, W, H, n); });

      // edges first, so a box always sits on top of the line reaching it
      ctx.strokeStyle = colours.grid;
      ctx.lineWidth = 1.2;
      tree.nodes().forEach(function (n) {
        if (!state.cells[n.id] || !n.parent || !state.cells[n.parent.id]) return;
        var a = boxes[n.parent.id], b = boxes[n.id];
        ctx.beginPath();
        ctx.moveTo(a.cx, a.cy + a.h / 2);
        ctx.bezierCurveTo(a.cx, (a.cy + b.cy) / 2, b.cx, (a.cy + b.cy) / 2, b.cx, b.cy - b.h / 2);
        ctx.stroke();
      });

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      tree.nodes().forEach(function (n) {
        var cell = state.cells[n.id];
        if (!cell) return;                       // this call has not happened yet
        var box = boxes[n.id];
        var role = R.at(frame.roles, n.id, cell.closed ? 'done' : 'idle');
        TreeDraw.cell(ctx, box, cell, colours, role);
      });
    },

    cell: function (ctx, box, cell, colours, role) {
      var values = cell.values, x = box.cx - box.w / 2, y = box.cy - box.h / 2;
      var colour = colours[role];
      ctx.fillStyle = window.Palette.mix(colour, 15, colours.paper);
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1.4;
      var r = Math.min(5, box.h / 2);
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, box.w, box.h, r) : ctx.rect(x, y, box.w, box.h);
      ctx.fill();
      ctx.stroke();

      var perValue = box.w / Math.max(1, values.length);
      if (perValue >= 15 && box.h >= 14) {
        ctx.fillStyle = colours.ink;
        ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
        /* One value in the slice, in the role that POSITION is in — the pivot, the boundary
           the smaller ones are piling up behind, the one being compared this step. Without it
           a partition is twenty frames of identical-looking box while the prose does all the
           work, which is the whole complaint about watching a quick sort as a tree. */
        values.forEach(function (v, i) {
          var mark = cell.marks && cell.marks[cell.lo + i];
          ctx.fillStyle = mark ? colours[mark] || colours.ink : colours.ink;
          ctx.font = (mark ? '800 ' : '600 ') + '10px ui-sans-serif, system-ui, sans-serif';
          ctx.fillText(String(v), x + perValue * (i + 0.5), box.cy);
        });
        return;
      }
      // too tight for numbers: a strip of bars, tall for a big value, in the same colour
      var max = Math.max.apply(null, values.concat([1]));
      ctx.fillStyle = colour;
      values.forEach(function (v, i) {
        var h = Math.max(1.5, (v / max) * (box.h - 5));
        ctx.fillRect(x + perValue * i + 0.4, y + box.h - 2.5 - h, Math.max(1, perValue - 0.8), h);
      });
    },
  };
})();
