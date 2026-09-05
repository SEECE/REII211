/* The sorting race — every sort the student ticks, on one array. One global `RacePage`.

   The other fourteen pages walk one algorithm and explain it. This one explains nothing: the
   six sorts are already taught elsewhere, and what no single page can show is the thing the
   module is actually about — that the choice between them is worth something, and how much
   depends on the array you hand them.

   Everything on the rail is deliberately UNIVERSAL. One size, one starting order, one array:
   a race where the lanes had different inputs would not be a comparison of anything. The tick
   boxes only decide who is in it. */
(function () {
  'use strict';

  /* Smaller than the single-sort pages allow. Six lanes have to fit side by side, and the
     slowest of them charges Θ(n²) operations — every one of which is a frame. */
  var SIZE = { min: 8, max: 1000, value: 24 };

  window.RacePage = function () {
    var ids = window.Sorts.ids();
    var values = null;

    function regenerate(rail) { values = window.Tape.build(rail.get('n'), rail.get('order')); }
    function entered(rail) { return ids.filter(function (id) { return rail.get(id); }); }

    var fields = [
      { id: 'n', kind: 'range', label: 'Entries', min: SIZE.min, max: SIZE.max, value: SIZE.value },
      { id: 'order', kind: 'select', label: 'Start from', options: window.SortPage.orders },
      { id: 'again', kind: 'button', label: 'New array — all lanes', variant: 'primary' },
      { id: 'entrants', kind: 'note', label: '<b>In the race</b>', spacer: true },
    ].concat(
      ids.map(function (id) {
        return { id: id, kind: 'check', label: window.Sorts.get(id).label, value: true };
      }),
      /* the pivot rule as quick sort itself declares it, so the wording cannot drift from the
         quick-sort page — and naive against median-of-three on a sorted array is the sharpest
         thing this page can show */
      window.Sorts.get('quick').options || [],
      [{ id: 'about', kind: 'note', spacer: true,
        label: 'A step charges every lane <b>one operation</b> — one comparison or one write. ' +
          'They are racing a budget, not a clock.' }]
    );

    return window.Playground({
      title: 'The sorting race',
      fields: fields,
      legend: ['idle', 'scan', 'focus', 'move', 'done'],
      legendNotes: {
        scan: { label: 'Comparing', desc: 'The values being compared in that lane right now' },
        focus: { label: 'The cursor', desc: 'The pivot, the key or the smallest so far — each sort marks its own' },
        move: { label: 'Writing', desc: 'Being swapped or written back' },
        done: { label: 'Settled', desc: 'In its final place, or a finished run' },
      },

      /* The same `array` kind the six sorting pages save, so a race can be saved and reopened
         one algorithm at a time — or an array that beat you on the bubble-sort page can be
         dropped in here to see who would have handled it better. */
      file: {
        kind: 'array',
        name: function () { return 'race-' + values.length; },
        get: function () { return values; },
        open: function (data, name, api) {
          if (data.length < SIZE.min || data.length > SIZE.max) {
            throw new Error('that array has ' + data.length + ' entries — the race runs ' +
              SIZE.min + ' to ' + SIZE.max + ', because every lane pays for all of them');
          }
          api.rail.set('n', data.length);      // moves the slider, which makes its own array…
          values = data.slice();               // …and this is the one every lane starts from
        },
      },

      /* A new array only when the PROBLEM changes. Ticking an algorithm in or out re-runs the
         race on the array already on screen, which is the whole point of the tick boxes. */
      onField: function (id, value, api) {
        if (id === 'n' || id === 'order' || id === 'again') regenerate(api.rail);
      },

      build: function (rail) {
        if (!values) regenerate(rail);
        var lanes = entered(rail);
        var race = window.Race(values, lanes, { pivot: rail.get('pivot') });
        return {
          subject: race,
          gen: window.Race.run(race),
          title: lanes.length > 1 ? lanes.length + ' sorts, one array' : 'The sorting race',
        };
      },

      render: function (surface, frame, colours) { window.Lanes.draw(surface, frame, colours); },
    });
  };
})();
