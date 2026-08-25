/* The binary search tree — the SUBJECT the BST page traces. Plain script, one global `BST`.

   The tree owns its shape and its counters; js/structures/bst-ops.js owns the narration. Every
   comparison goes through here, which is how the workbench can put the comparison count next
   to the HEIGHT and let a student see the relationship: a search costs one comparison per
   level, so the height is the running time, and the height depends entirely on the order the
   values arrived in. Insert 1..15 in order and then shuffled, and compare. */
(function () {
  'use strict';

  window.BST = function () {
    var root = null, uid = 0, cmp = 0, writes = 0, count = 0, snapshot = null;

    function dirty() { snapshot = null; }
    function clone(n) {
      return n && { id: n.id, value: n.value, left: clone(n.left), right: clone(n.right) };
    }
    function height(n) { return n ? 1 + Math.max(height(n.left), height(n.right)) : 0; }

    var api = {
      root: function () { return root; },
      setRoot: function (n) { writes++; root = n; dirty(); },
      make: function (value) { count++; writes++; dirty(); return { id: uid++, value: value, left: null, right: null }; },
      attach: function (parent, side, child) { writes++; parent[side] = child; dirty(); },
      drop: function () { count--; writes++; dirty(); },
      /* a value written into an existing node — the two-child delete case does this */
      overwrite: function (node, value) { writes++; node.value = value; dirty(); },

      lessVal: function (a, b) { cmp++; return a < b; },
      equalVal: function (a, b) { cmp++; return a === b; },

      view: function () { if (!snapshot) snapshot = { root: clone(root) }; return snapshot; },
      stats: function () {
        var h = height(root);
        return {
          Comparisons: cmp, Nodes: count, Height: h,
          /* the number worth staring at: what the height WOULD be if the tree were balanced */
          Ideal: count ? Math.ceil(Math.log2(count + 1)) : 0,
        };
      },

      height: function () { return height(root); },
      /* in-order values — sorted if and only if it really is a search tree */
      values: function () {
        var out = [];
        (function walk(n) { if (!n) return; walk(n.left); out.push(n.value); walk(n.right); })(root);
        return out;
      },
      has: function (value) {
        for (var n = root; n; n = value < n.value ? n.left : n.right) if (n.value === value) return true;
        return false;
      },
    };
    return api;
  };

  /* Rebuild a tree from a saved view(). The SHAPE is what is saved, not the values in order —
     the shape is what the insertion order produced and the whole argument of the page. */
  window.BST.load = function (saved) {
    var tree = window.BST();
    tree.setRoot(function build(n) {
      if (!n) return null;
      var node = tree.make(n.value);
      var left = build(n.left), right = build(n.right);
      if (left) tree.attach(node, 'left', left);
      if (right) tree.attach(node, 'right', right);
      return node;
    }(saved.root));
    return tree;
  };
})();
