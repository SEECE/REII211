/* Self-checks for the colour block. It is the same race with a different renderer, so what
   needs checking is not the sorting — js/tests/compare.js has that — but the three things the
   PICTURE claims: that a sorted block really is a clean sweep of the rainbow, that the hex it
   prints is the paint it uses, and that charging a whole block of operations per step buys a
   shorter walk without buying anybody a head start. */
(function () {
  'use strict';

  window.Check.suite('comparisons — the colour block', function () {
    var C = window.Check, S = window.Spectrum, Tape = window.Tape, Sorts = window.Sorts;
    var T = window.Trace, ids = Sorts.ids();
    var SIDES = [4, 8, 16, 32, 64, 128];     // what js/pages/spectrum.js offers on the rail

    /* "Sorted, it is the spectrum itself." That sentence is only true if the hue is strictly
       increasing in the value — one repeat or one inversion and a sorted block has a seam in
       it that a student would read as an unsorted patch. */
    var strict = true;
    for (var v = 2; v <= 484; v++) {
      if (S.hue(v, 1, 484) <= S.hue(v - 1, 1, 484)) strict = false;
    }
    C.ok(strict, 'the hue rises strictly with the value, so a sorted block has no seam');
    C.close(S.hue(1, 1, 484), 0, 'the smallest value is the red end');
    C.close(S.hue(484, 1, 484), S.SWEEP, 'the largest is the far end of the sweep');
    C.ok(S.SWEEP < 360, 'the sweep stops short of wrapping, so the two ends cannot look alike');

    /* The narration prints two hex values and says the block is made of them. */
    C.ok(/^#[0-9a-f]{6}$/.test(S.hex(7, 1, 16)), 'a pixel is a hex a student could type');
    C.equal(S.css(7, 1, 16), 'rgb(' + S.rgb(7, 1, 16).join(',') + ')',
      'the hex printed and the colour painted are the same colour');
    /* Colour comes from the position between the ends, not the number, so an opened .reii of
       arbitrary values still paints a full sweep rather than a corner of one. */
    C.equal(S.hex(1000, 1000, 2000), S.hex(1, 1, 484), 'the smallest value is red whatever it is');

    /* The Hilbert curve is the whole look of the page, and it is only a curve if it visits
       every cell of the square exactly once and never jumps between two of them. Both are
       checked directly rather than trusted to the bit-twiddling that produces them. */
    SIDES.forEach(function (side) {
      var seen = {}, once = true, joined = true, prev = null, count = 0;
      for (var d = 0; d < side * side; d++) {
        var p = S.xy(side, d), key = p[0] + ',' + p[1];
        if (seen[key]) once = false;
        seen[key] = true;
        count++;
        if (p[0] < 0 || p[1] < 0 || p[0] >= side || p[1] >= side) once = false;
        if (prev && Math.abs(p[0] - prev[0]) + Math.abs(p[1] - prev[1]) !== 1) joined = false;
        prev = p;
      }
      C.equal(Object.keys(seen).length, count, 'the curve visits every cell of ' + side +
        '² exactly once');
      C.ok(once, 'and never steps outside the square (' + side + ')');
      C.ok(joined, 'and never jumps — every step is to a neighbour (' + side + ')');
    });

    /* Self-similar, which is the sentence the narration makes: the first quarter of the curve
       stays inside one quadrant, the second inside the next, and so on. That is what makes a
       sorted block four blocks of colour, each of which is four smaller ones. */
    SIDES.forEach(function (side) {
      var half = side / 2, quads = {}, tidy = true;
      for (var d = 0; d < side * side; d++) {
        var p = S.xy(side, d), q = Math.floor(d / (side * side / 4));
        var where = (p[0] >= half ? 1 : 0) + ',' + (p[1] >= half ? 1 : 0);
        if (quads[q] === undefined) quads[q] = where;
        else if (quads[q] !== where) tidy = false;
      }
      C.ok(tidy, 'each quarter of the curve fills one quadrant (' + side + ')');
    });

    /* A block is the smallest square that holds it, so a short array stops partway along the
       curve rather than being padded or refused. */
    C.equal([S.side(16), S.side(17), S.side(4096), S.side(4097)], [4, 8, 64, 128],
      'a block is the smallest power-of-two square that holds it');
    C.ok(S.side(1) === 1 && S.side(2) === 2, 'and a tiny array still gets a square');

    /* The palette has to be at least as fine as the biggest block, or two adjacent values
       would paint the same colour and the sorted picture would band. */
    C.ok(S.STEPS >= SIDES[SIDES.length - 1] * SIDES[SIDES.length - 1],
      'the palette has a step for every pixel of the largest block');

    /* The rail's promise: a bigger block is a sharper picture, not a longer walk. The measured
       worst case of these six is under 1.6n² operations — checked here rather than asserted,
       because the whole claim rests on it — and per() has to keep that inside a trace at every
       shape the rail will hand it. */
    var worst = 0;
    ['reversed', 'shuffled'].forEach(function (order) {
      var input = Tape.build(96, order);
      ids.forEach(function (id) {
        var t = Tape(input);
        T.run(Sorts.get(id).run(t, { pivot: 'last' }));
        var st = t.stats();
        worst = Math.max(worst, (st.Comparisons + st.Writes) / (96 * 96));
      });
    });
    C.ok(worst < 1.6, 'no sort costs more than 1.6n² operations (worst seen: ' + worst.toFixed(2) + ')');

    var fits = true, longest = 0;
    SIDES.forEach(function (side) {
      var n = side * side, frames = 1.6 * n * n / S.per(n);
      longest = Math.max(longest, frames);
      if (frames >= 40000) fits = false;         // js/core/trace.js MAX
    });
    C.ok(fits, 'every block the rail offers walks inside a trace (longest: ' +
      Math.round(longest) + ' frames)');

    /* Charging a block of operations per step must not buy anyone a head start: the invariant
       is the one the race rests on, so it is checked again at a budget bigger than one. */
    [16, 144].forEach(function (n) {
      var input = Tape.build(n, 'reversed');
      var per = S.per(n);
      var race = window.Race(input, ids, { pivot: 'last', per: per });
      var frames = T.build(window.Race.run(race, 'the block'), race);
      var want = input.slice().sort(function (a, b) { return a - b; });

      C.equal(frames[0].note, 'the block', 'a page can say what its picture is (n=' + n + ')');
      C.ok(!frames.truncated, 'the walk finishes inside the trace (n=' + n + ')');
      C.ok(race.lanes.every(function (l) {
        return JSON.stringify(l.tape.done()) === JSON.stringify(want);
      }), 'every lane still sorts at ' + per + ' operations a step (n=' + n + ')');

      var behind = 0;
      frames.forEach(function (f) {
        f.state.lanes.forEach(function (l) { if (!l.done && l.cost < f.state.ops) behind++; });
      });
      C.equal(behind, 0, 'no lane falls behind a budget of ' + per + ' a step (n=' + n + ')');

      race.lanes.forEach(function (l) {
        var alone = Tape(input);
        T.run(Sorts.get(l.id).run(alone, { pivot: 'last' }));
        var a = alone.stats(), r = l.tape.stats();
        C.equal([r.Comparisons, r.Writes], [a.Comparisons, a.Writes],
          l.id + ' bills the same charged ' + per + ' a step as it does alone (n=' + n + ')');
      });
    });

    /* The lane grid arranges square cells around square blocks rather than wide ones. */
    var L = window.Lanes;
    C.ok(L.split(6, 1200, 700, 1).cols >= L.split(6, 1200, 700).cols,
      'a square cell spreads at least as wide as a bar graph on the same stage');
    C.equal(L.split(4, 1000, 1000, 1).cols, 2, 'four square blocks on a square stage are 2 × 2');
  });
})();
