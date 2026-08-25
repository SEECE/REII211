/* The bar-graph sorting page — all six of them. Plain script, one global `SortPage`.

   Every sorting page is this file plus a sitemap entry plus a fifty-line HTML shell that says
   which algorithm it is. The algorithm itself is in js/sorting/<id>.js and knows nothing about
   any of this. Compare with the old site, where each sort carried its own copy of the array
   builder, the canvas code, the button wiring, the stats and a duplicated stepwise
   implementation of itself — around 350 lines per page, six times over. */
(function () {
  'use strict';

  var ORDERS = [
    { value: 'shuffled', label: 'Shuffled' },
    { value: 'reversed', label: 'Reversed — worst case' },
    { value: 'nearly', label: 'Nearly sorted' },
    { value: 'sorted', label: 'Already sorted — best case' },
  ];

  window.SortPage = function (id) {
    var algo = window.Sorts.get(id);
    if (!algo) throw new Error('No sort registered as "' + id + '"');

    var fields = [
      { id: 'n', kind: 'range', label: 'Entries', min: 8, max: 120, value: 36 },
      { id: 'order', kind: 'select', label: 'Start from', options: ORDERS },
    ].concat(algo.options || [], [
      { id: 'again', kind: 'button', label: 'New array', variant: 'primary' },
      { id: 'complexity', kind: 'note', label: algo.complexity, spacer: true },
    ]);

    return window.Playground({
      title: algo.label,
      fields: fields,
      legend: algo.roles,
      legendNotes: algo.notes,

      build: function (rail) {
        var tape = window.Tape(window.Tape.build(rail.get('n'), rail.get('order')));
        return {
          subject: tape,
          gen: algo.run(tape, { pivot: rail.get('pivot') }),
          title: algo.label,
        };
      },

      render: function (surface, frame, colours) { window.Bars.draw(surface, frame, colours); },
    });
  };
})();
