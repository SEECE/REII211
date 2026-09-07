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

  /* capped well below the bar-graph pages on purpose: past about thirty elements the tree is
     wider than the stage and stops being the thing you can read. The cap is a power of two so
     the merge tree at full size is the perfect one — every level splits evenly, no odd slice. */
  var SIZE = { min: 4, max: 32, value: 16 };

  window.RecursionPage = function (which) {
    var algo = window[ALGOS[which]];
    var values = null;

    function regenerate(rail) { values = window.Tape.build(rail.get('n'), rail.get('order')); }

    var fields = [
      { id: 'n', kind: 'range', label: 'Entries', min: SIZE.min, max: SIZE.max, value: SIZE.value },
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

      file: {
        kind: 'array',
        name: function () { return 'array-' + values.length; },
        get: function () { return values; },
        open: function (data, name, api) {
          if (data.length < SIZE.min || data.length > SIZE.max) {
            throw new Error('that array has ' + data.length + ' entries — this page draws ' +
              SIZE.min + ' to ' + SIZE.max + ', because a wider tree stops being readable');
          }
          api.rail.set('n', data.length);
          values = data.slice();
        },
      },

      /* the hint on the quick page asks for two pivot rules on the SAME array, so changing
         the pivot must not quietly shuffle it */
      onField: function (id, value, api) {
        if (id === 'n' || id === 'order' || id === 'again') regenerate(api.rail);
      },

      build: function (rail) {
        if (!values) regenerate(rail);
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
