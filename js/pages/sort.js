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

  var SIZE = { min: 8, max: 120, value: 36 };

  window.SortPage = function (id) {
    var algo = window.Sorts.get(id);
    if (!algo) throw new Error('No sort registered as "' + id + '"');
    /* The array survives between runs. It has to: an array you can save, open on another
       sorting page and run again is the only way to compare two sorts on the same input. */
    var values = null;
    var api = null, marks = null;    // the table view of the same run, where the page carries it

    function regenerate(rail) { values = window.Tape.build(rail.get('n'), rail.get('order')); }

    var fields = [
      { id: 'n', kind: 'range', label: 'Entries', min: SIZE.min, max: SIZE.max, value: SIZE.value },
      { id: 'order', kind: 'select', label: 'Start from', options: ORDERS },
    ].concat(algo.options || [], [
      { id: 'again', kind: 'button', label: 'New array', variant: 'primary' },
      { id: 'complexity', kind: 'note', label: algo.complexity, spacer: true },
    ]);

    api = window.Playground({
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
              SIZE.min + ' to ' + SIZE.max);
          }
          api.rail.set('n', data.length);      // moves the slider, which makes its own array…
          values = data.slice();               // …and this is the one that gets run
        },
      },

      /* A new array only when the PROBLEM changes. Switching the pivot rule re-runs on the
         same array, which is the comparison the quick-sort page exists to make. */
      onField: function (id, value, api) {
        if (id === 'n' || id === 'order' || id === 'again') regenerate(api.rail);
      },

      build: function (rail) {
        if (!values) regenerate(rail);
        var tape = window.Tape(values);
        return {
          subject: tape,
          gen: algo.run(tape, { pivot: rail.get('pivot') }),
          title: algo.label,
        };
      },

      /* Two views of one trace. The table is the whole run at once, so walking it moves a
         highlight rather than redrawing anything — and there is nothing to draw on the canvas
         while it is hidden. */
      render: function (surface, frame, colours) {
        if (marks && marks.showing()) marks.paint(api.player.index());
        else window.Bars.draw(surface, frame, colours);
      },
    });

    /* Only where the page carries the markup for it; the other stages are unaffected. */
    marks = window.Marks(api, function () { api.repaint(); });
    return api;
  };

  /* The comparison page asks the same question and must ask it in the same words — a rail that
     said "Reversed" on one page and "Backwards" on the other would be two settings. */
  window.SortPage.orders = ORDERS;
})();
