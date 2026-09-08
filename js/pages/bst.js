/* The binary search tree page. Plain script, one global `BSTPage`.

   Like the memory page, the tree survives between operations — you build one up and then walk
   it. The two Fill buttons are the argument the page exists to make: shuffled insertion gives a
   four-level tree; "in order" roots the tree at a chosen Start and balances the smaller values
   to its left and the larger ones to its right — balanced only if Start is near the middle of
   the range, so picking one off to a side is what shows Height pulling away from Ideal. The
   Height and Ideal counters sit next to each other in the readout so the gap is unmissable. */
(function () {
  'use strict';

  /* Insertion order that roots the tree at `start` and recurses the median of what is left on
     each side — the same idea as building a balanced tree from a sorted array, except the root
     is chosen rather than always the middle of the whole range. */
  function rootedOrder(start, n) {
    var order = [start];
    function half(lo, hi) {
      if (lo > hi) return;
      var mid = lo + Math.floor((hi - lo) / 2);
      order.push(mid);
      half(lo, mid - 1);
      half(mid + 1, hi);
    }
    half(1, start - 1);
    half(start + 1, n);
    return order;
  }

  window.BSTPage = function () {
    var tree, pending;

    function* intro(message) {
      yield {
        note: message || 'Insert a few values, then search for one and count the comparisons. ' +
          'Watch <b>Height</b> against <b>Ideal</b> in the readout — that gap is what an ' +
          'unbalanced tree costs every single lookup.',
        roles: {},
      };
    }

    function reset(message) {
      tree = window.BST();
      pending = function () { return intro(message); };
    }

    /* Filling is not narrated step by step — it is setup, not the lesson, and fifteen traced
       inserts would bury the operation the student actually pressed. */
    function* fill(order, n, start) {
      var values;
      if (order === 'ordered') {
        start = Math.max(1, Math.min(n, Math.round(start) || 1));
        values = rootedOrder(start, n);
      } else {
        values = window.Tape.build(n, 'shuffled');
      }
      values.forEach(function (value) {
        window.Trace.run(window.BSTOps.insert(tree, value));
      });
      yield {
        tag: order === 'ordered' ? 'rooted at ' + start : 'shuffled input',
        note: order === 'ordered'
          ? 'Inserted ' + n + ' values rooted at <b>' + start + '</b> — ' + (start - 1) +
            ' smaller value' + (start - 1 === 1 ? '' : 's') + ' balanced to its left, ' +
            (n - start) + ' larger balanced to its right. Height is <b>' + tree.height() +
            '</b> against an ideal of <b>' + tree.stats().Ideal + '</b> — the closer Start sits ' +
            'to the middle of 1‥' + n + ', the closer those two numbers stay.'
          : 'Inserted ' + n + ' values in random order. Height is <b>' + tree.height() +
            '</b>; a balanced tree over ' + n + ' nodes would be <b>' + tree.stats().Ideal +
            '</b>. Random order is close to balanced, which is where the O(log n) comes from.',
        roles: {},
      };
    }

    reset();

    return window.Playground({
      title: 'Binary search tree',
      legend: ['idle', 'scan', 'focus', 'move', 'done', 'reject'],
      legendNotes: {
        scan: { label: 'Walked', desc: 'Nodes visited on the way down' },
        focus: { label: 'Here', desc: 'The node being compared right now' },
        move: { label: 'Changed', desc: 'Inserted, or having its value overwritten' },
        done: { label: 'In the tree', desc: 'A node that was not touched by this operation' },
        reject: { label: 'Dead end', desc: 'The walk ended without finding the value' },
      },

      fields: [
        { id: 'value', kind: 'number', label: 'Value', min: 1, max: 999, value: 42 },
        { id: 'insert', kind: 'button', label: 'Insert', variant: 'primary' },
        { id: 'search', kind: 'button', label: 'Search' },
        { id: 'remove', kind: 'button', label: 'Delete' },
        { id: 'size', kind: 'range', label: 'Fill size', min: 3, max: 31, value: 15 },
        { id: 'start', kind: 'number', label: 'Start (root)', min: 1, max: 31, value: 8 },
        { id: 'random', kind: 'button', label: 'Fill — shuffled' },
        { id: 'ordered', kind: 'button', label: 'Fill — in order' },
        { id: 'clear', kind: 'button', label: 'Clear', variant: 'ghost' },
        { id: 'autoplay', kind: 'check', label: 'Play automatically', value: true },
        { id: 'hint', kind: 'note', spacer: true, label:
          'Fill in order with Start near the middle of the range and it comes out balanced; ' +
          'push Start to either edge and watch Height pull away from Ideal.' },
      ],

      file: {
        kind: 'bst',
        name: function () { return 'tree-' + tree.stats().Nodes; },
        get: function () { return tree.stats().Nodes ? tree.view() : null; },
        open: function (data, name) {
          tree = window.BST.load(data);
          pending = function () {
            return intro('Opened <b>' + name + '</b>. Height is <b>' + tree.height() +
              '</b> against an ideal of <b>' + tree.stats().Ideal + '</b> — the shape the ' +
              'original insertion order produced, saved as it stood.');
          };
        },
      },

      onField: function (id, v, api) {
        var rail = api.rail;
        if (id === 'autoplay') return false;                  // just a preference, nothing to run
        if (id === 'clear') { reset('Cleared.'); return; }
        if (id === 'value' || id === 'size' || id === 'start') return false;   // typing runs nothing
        if (id === 'random' || id === 'ordered') {
          reset();
          pending = function () { return fill(id, rail.get('size'), rail.get('start')); };
        } else {
          var target = Number.isFinite(rail.get('value')) ? rail.get('value') : Math.floor(Math.random() * 99) + 1;
          var op = window.BSTOps[id === 'remove' ? 'remove' : id];
          if (!op) return false;
          pending = function () { return op(tree, target); };
        }
        if (rail.get('autoplay')) { api.rebuild(); api.player.play(); return false; }
      },

      build: function () { return { subject: tree, gen: pending() }; },
      render: function (surface, frame, colours) { window.BSTDraw.draw(surface, frame, colours); },
    });
  };
})();
