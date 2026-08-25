/* The binary search tree page. Plain script, one global `BSTPage`.

   Like the memory page, the tree survives between operations — you build one up and then walk
   it. The two Fill buttons are the argument the page exists to make: the same fifteen values
   inserted in order give a fifteen-level ladder, and shuffled give a four-level tree. The
   Height and Ideal counters sit next to each other in the readout so the gap is unmissable. */
(function () {
  'use strict';

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
    function* fill(order, n) {
      var values = window.Tape.build(n, order === 'ordered' ? 'sorted' : 'shuffled');
      values.forEach(function (value) {
        window.Trace.run(window.BSTOps.insert(tree, value));
      });
      yield {
        tag: order === 'ordered' ? 'sorted input' : 'shuffled input',
        note: 'Inserted ' + n + ' values ' + (order === 'ordered' ? 'in ascending order' : 'in random order') +
          '. Height is <b>' + tree.height() + '</b>; a balanced tree over ' + n +
          ' nodes would be <b>' + tree.stats().Ideal + '</b>.' +
          (order === 'ordered'
            ? ' Sorted input is the BST worst case: every value is bigger than the last, so ' +
              'every one becomes a right child and the tree degenerates into a linked list.'
            : ' Random order is close to balanced, which is where the O(log n) comes from.'),
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
        { id: 'random', kind: 'button', label: 'Fill — shuffled' },
        { id: 'ordered', kind: 'button', label: 'Fill — in order' },
        { id: 'clear', kind: 'button', label: 'Clear', variant: 'ghost' },
        { id: 'hint', kind: 'note', spacer: true, label:
          'Fill in order, then fill shuffled at the same size, and compare Height with Ideal.' },
      ],

      onField: function (id, v, api) {
        var rail = api.rail;
        if (id === 'clear') { reset('Cleared.'); return; }
        if (id === 'value' || id === 'size') return false;   // typing a number runs nothing
        if (id === 'random' || id === 'ordered') {
          reset();
          pending = function () { return fill(id, rail.get('size')); };
          return;
        }
        var target = Number.isFinite(rail.get('value')) ? rail.get('value') : Math.floor(Math.random() * 99) + 1;
        var op = window.BSTOps[id === 'remove' ? 'remove' : id];
        if (!op) return false;
        pending = function () { return op(tree, target); };
      },

      build: function () { return { subject: tree, gen: pending() }; },
      render: function (surface, frame, colours) { window.BSTDraw.draw(surface, frame, colours); },
    });
  };
})();
