/* Self-checks for the race. The page makes three claims a student cannot verify by looking at
   it, so all three are checked here: that every lane really sorts, that a lane costs exactly
   what the same sort costs on its own page, and that the finishing order is the cost order. */
(function () {
  'use strict';

  var ORDERS = ['shuffled', 'reversed', 'nearly', 'sorted'];

  window.Check.suite('comparisons — the sorting race', function () {
    var C = window.Check, Tape = window.Tape, Sorts = window.Sorts, T = window.Trace;
    var ids = Sorts.ids();

    function ran(n, order, opts) {
      var input = Tape.build(n, order);
      var race = window.Race(input, ids, opts || { pivot: 'last' });
      return { input: input, race: race, frames: T.build(window.Race.run(race), race) };
    }

    [0, 1, 2, 9, 30].forEach(function (n) {
      ORDERS.forEach(function (order) {
        var r = ran(n, order);
        var want = r.input.slice().sort(function (a, b) { return a - b; });
        var all = r.race.lanes.every(function (l) {
          return JSON.stringify(l.tape.done()) === JSON.stringify(want);
        });
        C.ok(all, 'every lane sorts ' + order + ' n=' + n);
        C.ok(r.frames.length > 1 || n < 2, 'the race narrates ' + order + ' n=' + n);
      });
    });

    /* One array, six copies of it. A lane that quietly got its own shuffle would make every
       comparison on the page meaningless, and it is invisible on screen once they diverge. */
    var same = ran(24, 'shuffled');
    C.ok(same.frames[0].state.lanes.every(function (l) {
      return JSON.stringify(l.state) === JSON.stringify(same.input);
    }), 'every lane starts from the identical array');

    /* The race must not be a second implementation of anything: a lane is the same generator
       over the same Tape as the single-sort page, so it must bill exactly the same. */
    ORDERS.forEach(function (order) {
      var input = Tape.build(28, order);
      var race = window.Race(input, ids, { pivot: 'last' });
      T.run(window.Race.run(race));
      race.lanes.forEach(function (l) {
        var alone = Tape(input);
        T.run(Sorts.get(l.id).run(alone, { pivot: 'last' }));
        var s = alone.stats(), r = l.tape.stats();
        C.equal([r.Comparisons, r.Writes], [s.Comparisons, s.Writes],
          l.id + ' costs the same in the race as on its own page (' + order + ')');
      });
    });

    /* What the closing frame claims: they came home in the order of what they spent. */
    ORDERS.forEach(function (order) {
      var race = ran(30, order).race;
      var byPlace = race.lanes.slice().sort(function (a, b) { return a.place - b.place; });
      C.ok(byPlace.every(function (l, i) { return i === 0 || byPlace[i - 1].cost <= l.cost; }),
        'the finishing order is the cost order (' + order + ')');
    });

    /* The claim under the whole design: at every frame each lane has been charged the same
       budget, so what differs on screen is only how much sorting that budget bought. A lane
       can overshoot — the beat that takes it over the line may write a whole merged run — but
       it can never fall BEHIND, which is what would quietly hand somebody a head start. */
    [16, 24, 64].forEach(function (n) {
      var even = ran(n, 'reversed');
      var behind = 0, over = 0;
      even.frames.forEach(function (f) {
        f.state.lanes.forEach(function (l) {
          if (l.done) return;
          if (l.cost < f.state.ops) behind++;
          over = Math.max(over, l.cost - f.state.ops);
        });
      });
      C.equal(behind, 0, 'no lane ever falls behind the budget (n=' + n + ')');
      C.ok(over <= n, 'and no lane runs more than one beat of work ahead (n=' + n + ')');
    });

    /* The lane grid arranges itself around however many boxes are ticked. It is scored, not
       configured, so the check is that the score picks the sensible answer on a real stage. */
    var L = window.Lanes;
    C.equal(L.split(1, 900, 500).cols, 1, 'one lane takes the whole stage');
    C.ok(L.split(6, 400, 900).cols < L.split(6, 1600, 400).cols,
      'a tall narrow stage stacks where a wide one spreads');
    var widening = true;
    for (var w = 300; w < 2400; w += 50) {
      if (L.split(6, w, 600).cols < L.split(6, w - 50, 600).cols) widening = false;
    }
    C.ok(widening, 'a stage that gets wider never gets fewer columns');
    [1, 2, 3, 4, 5, 6].forEach(function (k) {
      var g = L.split(k, 800, 600);
      C.ok(g.cols * g.rows >= k, 'every lane gets a cell (' + k + ')');
    });

    var none = window.Race(Tape.build(10, 'shuffled'), []);
    C.equal(T.build(window.Race.run(none), none).length, 1, 'no algorithms ticked is one frame');
  });
})();

/* The colour block. It is the same race with a different renderer, so what needs checking is
   not the sorting — that is already checked above — but the three things the picture claims:
   that a sorted block really is a clean sweep of the rainbow, that the hex it prints is the
   paint it uses, and that charging a whole block of operations per step buys a shorter walk
   without buying anybody a head start. */
(function () {
  'use strict';

  window.Check.suite('comparisons — the colour block', function () {
    var C = window.Check, S = window.Spectrum, Tape = window.Tape, Sorts = window.Sorts;
    var T = window.Trace, ids = Sorts.ids();
    var SIDE = { min: 4, max: 22 };          // what js/pages/spectrum.js offers on the rail

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

    /* Every pixel gets a cell and the block never claims a row it does not need. */
    [16, 17, 100, 251, 484].forEach(function (n) {
      [4, 7, 16, 22].forEach(function (c) {
        var r = S.rows(n, c);
        C.ok(r * c >= n && (r - 1) * c < n, 'rows(' + n + ',' + c + ') fits it exactly once');
      });
    });

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
    for (var w = SIDE.min; w <= SIDE.max; w++) {
      for (var h = SIDE.min; h <= SIDE.max; h++) {
        var n = w * h, frames = 1.6 * n * n / S.per(n);
        longest = Math.max(longest, frames);
        if (frames >= 40000) fits = false;       // js/core/trace.js MAX
      }
    }
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
