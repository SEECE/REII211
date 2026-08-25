/* Tidy layout for a finished call tree. Plain script, one global `TreeLayout`.

   The classic two-rule layout: leaves take the next free column, and a parent centres over its
   children. Computed ONCE over the finished tree and cached on it, which is what stops a node
   from sliding sideways every time a sibling is created — the reason it runs after the trace
   is built rather than per frame.

   Coordinates come out in the unit square (0‥1 across, 0‥depth down); js/recursion/draw.js
   scales them to whatever the stage is that second. */
(function () {
  'use strict';

  window.TreeLayout = function (tree) {
    var cached = tree.__layout;
    if (cached) return cached;

    var pos = {}, column = 0;

    (function place(node) {
      if (!node) return 0;
      if (!node.kids.length) { pos[node.id] = column; return column++; }
      var xs = node.kids.map(place);
      pos[node.id] = (xs[0] + xs[xs.length - 1]) / 2;
      return pos[node.id];
    })(tree.root());

    var columns = Math.max(1, column);
    var out = {
      columns: columns,
      depth: tree.depth(),
      /* 0‥1 across the width, with half a column of margin at each edge */
      x: function (id) { return (pos[id] + 0.5) / columns; },
      y: function (id, node) { return node.depth; },
      has: function (id) { return pos[id] != null; },
    };
    tree.__layout = out;
    return out;
  };
})();
