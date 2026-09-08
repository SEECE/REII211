/* Tidy layout for a finished call tree. Plain script, one global `TreeLayout`.

   The classic two-rule layout: leaves take the next free column, and a parent centres over the
   columns its subtree occupies. Computed ONCE over the finished tree and cached on it, which is
   what stops a node from sliding sideways every time a sibling is created — the reason it runs
   after the trace is built rather than per frame.

   A node reports that SPAN as well as its centre, and the drawing sizes its box from it. Sizing
   a box from the number of values in the slice instead is what sent the quick tree off the
   sides: its slices hold more values than they leave columns, because every pivot stays behind
   at an internal node. Centre and width from the same columns, and no box can leave the stage
   or land on its neighbour.

   Coordinates come out in the unit square (0‥1 across, 0‥depth down); js/recursion/draw.js
   scales them to whatever the stage is that second. */
(function () {
  'use strict';

  window.TreeLayout = function (tree) {
    var cached = tree.__layout;
    if (cached) return cached;

    var pos = {}, span = {}, column = 0;

    (function place(node) {
      if (!node) return;
      var start = column;
      if (!node.kids.length) column += 1; else node.kids.forEach(place);
      span[node.id] = column - start;
      pos[node.id] = (start + column) / 2;
    })(tree.root());

    var columns = Math.max(1, column);
    var out = {
      columns: columns,
      depth: tree.depth(),
      /* 0‥1 across the width: the centre of the columns this subtree occupies */
      x: function (id) { return pos[id] / columns; },
      /* and how much of that width it covers, 0‥1 */
      span: function (id) { return span[id] / columns; },
      y: function (id, node) { return node.depth; },
      has: function (id) { return pos[id] != null; },
    };
    tree.__layout = out;
    return out;
  };
})();
