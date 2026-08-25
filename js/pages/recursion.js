/* The recursion-tree pages. Plain script, one global `RecursionPage`.

   Both pages are this file plus which algorithm they are. The tree is the subject, the tape
   underneath it is what counts the comparisons, and everything else is the runtime. */
(function () {
  'use strict';

  var ALGOS = { merge: 'MergeTree', quick: 'QuickTree' };

  var ORDERS = [
    { value: 'shuffled', label: 'Shuffled' },
    { value: 'sorted', label: 'Already sorted' },
    { value: 'reversed', label: 'Reversed' },
  ];

  window.RecursionPage = function (which) {
    var algo = window[ALGOS[which]];

    var fields = [
      /* capped well below the bar-graph pages on purpose: past about thirty elements the tree
         is wider than the stage and stops being the thing you can read */
      { id: 'n', kind: 'range', label: 'Entries', min: 4, max: 28, value: 16 },
      { id: 'order', kind: 'select', label: 'Start from', options: ORDERS },
    ];
    if (which === 'quick') {
      fields.push({
        id: 'pivot', kind: 'select', label: 'Pivot choice', value: 'last',
        options: [
          { value: 'last', label: 'Last element (naive)' },
          { value: 'median', label: 'Median of three' },
        ],
      });
    }
    fields.push({ id: 'again', kind: 'button', label: 'New array', variant: 'primary' });
    fields.push({
      id: 'hint', kind: 'note', spacer: true,
      label: which === 'quick'
        ? 'Try: “Already sorted” with the naive pivot, then switch to median of three on the same array.'
        : 'Try any two orderings at the same size — the tree comes out identical.',
    });

    return window.Playground({
      title: algo.label,
      fields: fields,
      legend: algo.roles,
      legendNotes: algo.notes,

      build: function (rail) {
        var values = window.Tape.build(rail.get('n'), rail.get('order'));
        var tape = window.Tape(values);
        var tree = window.CallTree(tape);
        return {
          subject: tree,
          gen: algo.run(tree, tape, values, rail.get('pivot')),
          title: algo.label,
        };
      },

      render: function (surface, frame, colours) { window.TreeDraw.draw(surface, frame, colours); },
    });
  };
})();
