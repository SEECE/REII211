/* The binary search tree, drawn. Plain script, one global `BSTDraw`.

   Laid out per frame rather than once, because unlike a call tree a BST changes SHAPE as it is
   walked — an insert adds a node and a delete can pull a whole subtree up a level. In-order
   position sets x, depth sets y, which is the layout that makes the search-tree property
   visible: every node's left subtree is entirely to its left on screen. */
(function () {
  'use strict';
  var R = window.Roles;

  function layout(root) {
    var pos = {}, column = 0, depth = 0;
    (function walk(n, d) {
      if (!n) return;
      walk(n.left, d + 1);
      pos[n.id] = { col: column++, depth: d };
      if (d > depth) depth = d;
      walk(n.right, d + 1);
    })(root, 0);
    return { pos: pos, columns: Math.max(1, column), depth: depth };
  }

  function each(node, fn) {
    if (!node) return;
    fn(node);
    each(node.left, fn);
    each(node.right, fn);
  }

  window.BSTDraw = {
    draw: function (s, frame, colours) {
      if (!s || !frame || !frame.state) return;
      var root = frame.state.root, ctx = s.ctx;
      if (!root) {
        ctx.fillStyle = colours['ink-faint'];
        ctx.font = '500 13px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('The tree is empty — insert a value to begin.', s.w / 2, s.h / 2);
        return;
      }

      var L = layout(root);
      var rowH = s.h / (L.depth + 1.4);
      var colW = s.w / L.columns;
      var r = Math.max(9, Math.min(19, Math.min(colW * 0.42, rowH * 0.32)));
      var xy = {};
      each(root, function (n) {
        var p = L.pos[n.id];
        xy[n.id] = { x: (p.col + 0.5) * colW, y: rowH * 0.7 + p.depth * rowH };
      });

      ctx.strokeStyle = colours.grid;
      ctx.lineWidth = 1.4;
      each(root, function (n) {
        [n.left, n.right].forEach(function (kid) {
          if (!kid) return;
          ctx.beginPath();
          ctx.moveTo(xy[n.id].x, xy[n.id].y + r);
          ctx.lineTo(xy[kid.id].x, xy[kid.id].y - r);
          ctx.stroke();
        });
      });

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 ' + Math.round(r * 0.92) + 'px ui-sans-serif, system-ui, sans-serif';
      each(root, function (n) {
        var role = R.at(frame.roles, n.id, 'done');
        var c = colours[role];
        ctx.fillStyle = window.Palette.mix(c, 18, colours.paper);
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(xy[n.id].x, xy[n.id].y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = colours.ink;
        ctx.fillText(String(n.value), xy[n.id].x, xy[n.id].y + 0.5);
      });
    },
  };
})();
