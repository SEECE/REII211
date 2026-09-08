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

    /* A live trace has to be indistinguishable from a built one, or the colour block is a
       second runtime rather than the same one walked differently. Checked frame for frame
       against Trace.build over the real race. */
    function start(input, opts) {
      return function () {
        var race = window.Race(input, ids, opts || { pivot: 'last' });
        return { subject: race, gen: window.Race.run(race, 'the block') };
      };
    }

    [0, 1, 16, 64].forEach(function (n) {
      var input = Tape.build(n, 'reversed');
      var pair = start(input)();
      var built = T.build(pair.gen, pair.subject);
      var lazy = T.live(start(input), { window: 8 });

      var same = true;
      for (var k = 0; k < built.length; k++) {
        var a = built[k], b = lazy.at(k);
        if (!b || a.note !== b.note || a.tag !== b.tag ||
            JSON.stringify(a.state) !== JSON.stringify(b.state) ||
            JSON.stringify(a.stats) !== JSON.stringify(b.stats)) { same = false; break; }
      }
      C.ok(same, 'a live trace gives the same frames as a built one (n=' + n + ')');
      C.equal(lazy.at(built.length), null, 'and ends where it ends (n=' + n + ')');
      C.equal(lazy.total, built.length, 'and knows its length once it has walked it (n=' + n + ')');
    });

    /* The window is the whole point: memory must be the window and not the run. */
    var walked = T.live(start(Tape.build(64, 'reversed')), { window: 8 });
    var last = 0;
    while (walked.at(last + 1)) last++;
    C.ok(last > 200, 'a 64-pixel race is more than 200 frames at one operation a step (' + last + ')');
    C.equal(walked.at(last - 3).n, last - 3, 'the recent window is still there');

    /* Stepping back past the window replays rather than losing the frame — the trade the live
       trace makes, and the thing that would silently break Prev if it did not hold. */
    var early = walked.at(2);
    C.ok(early && early.n === 2, 'and stepping back past the window replays to reach it');
    C.equal(JSON.stringify(early.state), JSON.stringify(T.live(start(Tape.build(64, 'reversed')),
      { window: 8 }).at(2).state), 'a replayed frame is the frame it replaced');

    /* One operation a step is the promise on the rail: nothing may be skipped. */
    [16, 64].forEach(function (n) {
      var input = Tape.build(n, 'reversed');
      var pair = start(input)();
      var frames = T.build(pair.gen, pair.subject);
      var jumped = 0;
      for (var k = 1; k < frames.length; k++) {
        if (frames[k].state.ops - frames[k - 1].state.ops > 1) jumped++;
      }
      C.equal(jumped, 0, 'the budget rises one operation at a time, never in jumps (n=' + n + ')');
      C.ok(frames.every(function (f) {
        return f.state.lanes.every(function (l) { return l.done || l.cost >= f.state.ops; });
      }), 'and no lane falls behind it (n=' + n + ')');
    });

    /* Prev must never offer a journey it cannot make. Past the rewind budget the earliest
       reachable frame is the oldest one still in the window, and the player is told so rather
       than being left to trigger a replay that freezes the tab. */
    var bounded = T.live(start(Tape.build(64, 'reversed')), { window: 8, rewind: 40 });
    var k = 0;
    while (k < 400 && bounded.at(k + 1)) k++;
    C.ok(bounded.oldest > 0, 'a run past its rewind budget reports how far back it can go');
    C.equal(bounded.at(bounded.oldest - 1), null, 'and refuses anything earlier');
    C.ok(bounded.at(bounded.oldest) !== null, 'while the oldest kept frame is still there');

    var free = T.live(start(Tape.build(64, 'reversed')), { window: 8, rewind: 1e9 });
    k = 0;
    while (k < 400 && free.at(k + 1)) k++;
    C.equal(free.oldest, 0, 'a run inside its budget can always go back to the start');

    /* The race reports its own progress, because a live trace cannot say how long it is. */
    var pr = start(Tape.build(16, 'shuffled'))();
    var fs = T.build(pr.gen, pr.subject);
    C.equal(fs[fs.length - 1].progress, 1, 'the closing frame reports the race finished');
    C.ok(fs.slice(1).every(function (f, k) {
      return f.progress == null || fs[k].progress == null || f.progress >= fs[k].progress;
    }), 'and progress never goes backwards');

    /* The lane grid arranges square cells around square blocks rather than wide ones. */
    var L = window.Lanes;
    C.ok(L.split(6, 1200, 700, 1).cols >= L.split(6, 1200, 700).cols,
      'a square cell spreads at least as wide as a bar graph on the same stage');
    C.equal(L.split(4, 1000, 1000, 1).cols, 2, 'four square blocks on a square stage are 2 × 2');
  });
})();
