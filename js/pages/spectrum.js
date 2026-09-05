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

  /* The rail asks for the block's DETAIL, as a power of two, because the Hilbert curve the
     block is filled along is only defined on a 2ⁿ × 2ⁿ square (js/compare/spectrum.js). One
     control, and every step of it is four times the picture: 4×4 up to 128×128. */
  var STEP = { min: 2, max: 7, value: 5 };
  var LIMITS = { min: 1 << (STEP.min * 2), max: 1 << (STEP.max * 2) };
  function px(k) { return 1 << (k * 2); }

  window.SpectrumPage = function () {
    var ids = window.Sorts.ids();
    var values = null;

    function regenerate(rail) { values = window.Tape.build(px(rail.get('detail')), rail.get('order')); }
    function entered(rail) { return ids.filter(function (id) { return rail.get(id); }); }

    /* What the block is made of, said in the units a student can check: the two ends of the
       sweep as hex, which is what they would type into a stylesheet to get the same colour. */
    function intro(rail, n) {
      var lo = Math.min.apply(null, values), hi = Math.max.apply(null, values);
      var S = window.Spectrum;
      return '<b>' + n.toLocaleString() + ' pixels, one block, ' + entered(rail).length +
        ' sorts.</b> Each pixel is one value and its colour is where that value sits in the ' +
        'range — the smallest is <span class="val">' + S.hex(lo, lo, hi) + '</span> and the ' +
        'largest is <span class="val">' + S.hex(hi, lo, hi) + '</span>, sweeping the rainbow ' +
        'between them. The block is filled along a <b>Hilbert curve</b> rather than in rows, ' +
        'so the square is four quadrants in order, each of which is four quadrants in order, ' +
        'all the way down: <b>sorted, it is one line of hue folded into a square</b>, and ' +
        'values that are close stay close on screen in both directions. Every lane is charged ' +
        'the same budget per step, so the block that looks most like a rainbow is the one ' +
        'getting the most sorting done per operation.';
    }

    var fields = [
      /* `settle` because this is the expensive one: every notch is four times the pixels and
         six sorts have to be re-run over all of them, so rebuilding on every tick of a drag
         would lock the page up. */
      { id: 'detail', kind: 'range', label: 'Block', min: STEP.min, max: STEP.max,
        value: STEP.value, settle: true,
        format: function (k) { var s = 1 << k; return s + '&thinsp;×&thinsp;' + s; } },
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
          'lane more as the block grows, so the run is the same length either way. Tick one ' +
          'algorithm on its own to give it the whole stage.' }]
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
          /* A file carries values, not a shape. The slider goes to the smallest block that
             holds them and the array simply stops partway along the curve — the renderer draws
             the pixels it has, so nothing is padded and nothing is dropped. */
          var k = STEP.min;
          while (px(k) < data.length && k < STEP.max) k++;
          api.rail.set('detail', k);           // moves the slider, which makes its own block…
          values = data.slice();               // …and this is the one every lane starts from
        },
      },

      /* A new block only when the PICTURE changes. Ticking an algorithm in or out re-runs the
         race on the block already on screen, which is the whole point of the tick boxes. */
      onField: function (id, value, api) {
        if (id === 'detail' || id === 'order' || id === 'again') regenerate(api.rail);
      },

      build: function (rail) {
        if (!values) regenerate(rail);
        var side = window.Spectrum.side(values.length);
        var race = window.Race(values, entered(rail),
          { pivot: rail.get('pivot'), per: window.Spectrum.per(values.length) });
        return {
          subject: race,
          gen: window.Race.run(race, intro(rail, values.length)),
          title: side + ' × ' + side + ' — ' + values.length.toLocaleString() + ' pixels',
        };
      },

      /* A block is square, so a lane's cell should be too — `want: 1`. The renderer works its
         own square out from the number of pixels, so there is nothing to keep in step here. */
      render: function (surface, frame, colours) {
        window.Lanes.draw(surface, frame, colours, { want: 1, cell: window.Spectrum.draw.bind(window.Spectrum) });
      },
    });
  };
})();
