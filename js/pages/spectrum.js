/* The colour sort — the same six sorts, over a block of hues. One global `SpectrumPage`.

   The sorting race next door draws six bar graphs, and a bar graph is a thing you read: to
   see who is winning you compare heights across a lane. This page draws the identical race as
   a picture instead. Every value is a hue, so a sorted block is the rainbow — red in the
   top-left corner, magenta in the bottom-right — and a half-sorted one looks like a photograph
   half-developed. You can see who is ahead from across the room, which is a thing no amount of
   narration achieves.

   It is the same Race, the same Tape and the same six generators as every other sorting page,
   so a lane still bills exactly what the single-sort page bills. Only the renderer differs. */
(function () {
  'use strict';

  /* The rail asks for the SHAPE of the block, not how many pixels are in it — a block is a
     picture and a picture has a width and a height. 22×22 is 484, which is inside the 500 the
     `array` file kind will write (js/io/reii.js), so anything on screen can be saved. */
  var SIDE = { min: 4, max: 22 };
  var LIMITS = { min: SIDE.min * SIDE.min, max: SIDE.max * SIDE.max };

  window.SpectrumPage = function () {
    var ids = window.Sorts.ids();
    var values = null;
    var cols = 0;                  // the block's width, set by build and read back by render

    function size(rail) { return rail.get('cols') * rail.get('rows'); }
    function regenerate(rail) { values = window.Tape.build(size(rail), rail.get('order')); }
    function entered(rail) { return ids.filter(function (id) { return rail.get(id); }); }

    /* What the block is made of, said in the units a student can check: the two ends of the
       sweep as hex, which is what they would type into a stylesheet to get the same colour. */
    function intro(rail, n) {
      var lo = Math.min.apply(null, values), hi = Math.max.apply(null, values);
      var S = window.Spectrum;
      return '<b>' + n + ' pixels, one block, ' + entered(rail).length + ' sorts.</b> Each pixel ' +
        'is one value and its colour is where that value sits in the range — the smallest is ' +
        '<span class="val">' + S.hex(lo, lo, hi) + '</span> and the largest is ' +
        '<span class="val">' + S.hex(hi, lo, hi) + '</span>, sweeping the rainbow between them. ' +
        'The block is filled left to right, top to bottom, so <b>sorted, it is the spectrum ' +
        'itself</b> — and every lane is charged the same budget per step, so the block that ' +
        'looks most like a rainbow is the one getting the most sorting done per operation.';
    }

    var fields = [
      /* `settle` because these two are the expensive ones: a 22×22 block is six sorts over 484
         values, and rebuilding that on every tick of a drag would lock the page up. */
      { id: 'cols', kind: 'range', label: 'Block width', min: SIDE.min, max: SIDE.max, value: 16,
        settle: true, format: function (v) { return v + ' px'; } },
      { id: 'rows', kind: 'range', label: 'Block height', min: SIDE.min, max: SIDE.max, value: 16,
        settle: true, format: function (v) { return v + ' px'; } },
      { id: 'order', kind: 'select', label: 'Start from', options: window.SortPage.orders },
      { id: 'again', kind: 'button', label: 'New block — all lanes', variant: 'primary' },
      { id: 'entrants', kind: 'note', label: '<b>In the race</b>', spacer: true },
    ].concat(
      ids.map(function (id) {
        return { id: id, kind: 'check', label: window.Sorts.get(id).label, value: true };
      }),
      window.Sorts.get('quick').options || [],
      [{ id: 'about', kind: 'note', spacer: true,
        label: 'A bigger block is a sharper picture, not a longer walk: the step charges every ' +
          'lane more as the block grows, so the run is the same length either way.' }]
    );

    return window.Playground({
      title: 'The colour sort',
      fields: fields,
      legend: ['scan', 'focus', 'move'],
      legendNotes: {
        scan: { label: 'Comparing', desc: 'Outlined in that lane while it is being compared' },
        focus: { label: 'The cursor', desc: 'The pivot, the key or the smallest so far' },
        move: { label: 'Writing', desc: 'Being swapped or written back' },
      },

      /* The same `array` kind the six sorting pages and the race save, so a block can be
         opened on the bubble-sort page as bars and a bar graph opened here as a picture. */
      file: {
        kind: 'array',
        name: function () { return 'block-' + values.length; },
        get: function () { return values; },
        open: function (data, name, api) {
          if (data.length < LIMITS.min || data.length > LIMITS.max) {
            throw new Error('that array has ' + data.length + ' entries — a block here holds ' +
              LIMITS.min + ' to ' + LIMITS.max + ', because every lane pays for all of them');
          }
          /* A file carries values, not a shape, so it is laid out as near a square as it goes.
             The last row is allowed to come up short — the renderer draws the pixels it has. */
          var w = Math.min(SIDE.max, Math.max(SIDE.min, Math.round(Math.sqrt(data.length))));
          api.rail.set('cols', w);             // each moves a slider, which makes its own block…
          api.rail.set('rows', Math.min(SIDE.max, Math.ceil(data.length / w)));
          values = data.slice();               // …and this is the one every lane starts from
        },
      },

      /* A new block only when the PICTURE changes. Ticking an algorithm in or out re-runs the
         race on the block already on screen, which is the whole point of the tick boxes. */
      onField: function (id, value, api) {
        if (id === 'cols' || id === 'rows' || id === 'order' || id === 'again') regenerate(api.rail);
      },

      build: function (rail) {
        if (!values) regenerate(rail);
        cols = rail.get('cols');
        var race = window.Race(values, entered(rail),
          { pivot: rail.get('pivot'), per: window.Spectrum.per(values.length) });
        return {
          subject: race,
          gen: window.Race.run(race, intro(rail, values.length)),
          title: cols + ' × ' + window.Spectrum.rows(values.length, cols) + ' — ' +
            values.length + ' pixels',
        };
      },

      /* render also runs on resize, off the frame already on screen, so it reads the width
         the last build used rather than the rail's — which may have moved since. */
      render: function (surface, frame, colours) {
        window.Lanes.draw(surface, frame, colours, {
          want: cols / window.Spectrum.rows(values.length, cols),
          cell: function (s, f, c) { window.Spectrum.draw(s, f, c, cols); },
        });
      },
    });
  };
})();
