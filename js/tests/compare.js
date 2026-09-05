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

    var none = window.Race(Tape.build(10, 'shuffled'), []);
    C.equal(T.build(window.Race.run(none), none).length, 1, 'no algorithms ticked is one frame');
  });
})();
