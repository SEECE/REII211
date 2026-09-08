/* The call tree — the SUBJECT the two recursion pages trace. Plain script, one global
   `CallTree`.

   A divide-and-conquer sort is two things at once: the array changing, and the calls nesting.
   The bar-graph pages show the first; these pages show the second, because that is where the
   log n lives and an array of bars cannot show it.

   A node is one call: the slice it was handed, the values in it, and where it sits. Nodes are
   created as the recursion enters and filled in as it returns, so the tree GROWS while the
   trace plays. Layout is computed once at the end, over the finished tree, and shared by every
   frame — a node therefore never jumps sideways as its siblings appear. */
(function () {
  'use strict';

  window.CallTree = function (tape) {
    var nodes = [], root = null, maxDepth = 0, snapshot = null;

    function dirty() { snapshot = null; }

    var api = {
      /* enter a call: a new node under `parent` covering [lo, hi) */
      open: function (parent, lo, hi, values) {
        var node = {
          id: nodes.length, lo: lo, hi: hi,
          depth: parent ? parent.depth + 1 : 0,
          values: values.slice(), marks: null, kids: [], parent: parent, closed: false,
        };
        nodes.push(node);
        if (parent) parent.kids.push(node); else root = node;
        if (node.depth > maxDepth) maxDepth = node.depth;
        dirty();
        return node;
      },
      /* return from a call with whatever it produced */
      close: function (node, values) {
        node.values = values.slice();
        node.marks = null;
        node.closed = true;
        dirty();
        return node;
      },
      /* mid-call update — a partition rearranging its own slice. `marks` is the role of each
         POSITION in the array underneath (the pivot, the boundary, the one being compared), so
         the box can show where in its own slice the scan has got to. It rides on the state and
         not on frame.roles because a role map is keyed by node, and this is inside a node. */
      touch: function (node, values, marks) {
        node.values = values.slice();
        node.marks = marks || null;
        dirty();
        return node;
      },

      /* the Trace subject contract. `tree` is the live object, read only for STRUCTURE and
         layout at draw time (both final by then); `cells` is this frame's own values. */
      view: function () {
        if (snapshot) return snapshot;
        var cells = {};
        nodes.forEach(function (n) {
          cells[n.id] = { values: n.values, closed: n.closed, marks: n.marks, lo: n.lo };
        });
        snapshot = { tree: api, live: nodes.length, cells: cells };
        return snapshot;
      },
      stats: function () {
        var s = tape ? tape.stats() : {};
        return {
          Comparisons: s.Comparisons || 0,
          Writes: s.Writes || 0,
          Calls: nodes.length,
          Depth: maxDepth + 1,
        };
      },

      nodes: function () { return nodes; },
      root: function () { return root; },
      depth: function () { return maxDepth; },
    };
    return api;
  };
})();
