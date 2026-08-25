/* Self-checks for the two heuristics pages.

   Both make a CLAIM in their narration, so both claims are what get checked: that the pruned
   closest-pair search is still exact, and that earliest-finish-time really is optimal while the
   other two rules really are not. */
(function () {
  'use strict';

  function bruteClosest(set) {
    var best = Infinity;
    for (var i = 0; i < set.count(); i++) {
      for (var j = i + 1; j < set.count(); j++) best = Math.min(best, set.raw(i, j));
    }
    return best;
  }

  window.Check.suite('heuristics — tour and closest pair', function () {
    var C = window.Check, T = window.Trace, P = window.PointSet;

    for (var trial = 0; trial < 20; trial++) {
      var set = P.random(2 + (trial % 20));
      if (set.count() < 2) continue;

      set.resetCounters();
      var found = T.run(window.ClosestPair.run(set));
      C.close(found.distance, bruteClosest(set), 'closest pair is exact (n=' + set.count() + ')');
      var brute = set.count() * (set.count() - 1) / 2;
      C.ok(set.stats().Distances <= brute,
        'pruning never measures more than brute force would (n=' + set.count() + ')');

      if (set.count() < 3) continue;
      set.resetCounters();
      var tour = T.run(window.NearestTour.run(set, 0));
      C.equal(new Set(tour.order).size, set.count(), 'the tour visits every point once');
      C.close(P.tourLength(set, tour.order), tour.length, 'the reported tour length is the real one');
      if (set.count() <= window.NearestTour.EXACT_LIMIT) {
        C.ok(window.NearestTour.exact(set).length <= tour.length + 1e-9,
          'the exact tour is never worse than the greedy one');
      }
    }

    /* Points spread along a line: almost every pair should be pruned away unmeasured. */
    var wide = P();
    for (var i = 0; i < 16; i++) wide.add(i / 16 + 0.02, 0.5 + (i % 2) * 0.01);
    wide.resetCounters();
    T.run(window.ClosestPair.run(wide));
    C.ok(wide.stats().Distances < 16 * 15 / 2,
      'sorting first saves measurements (' + wide.stats().Distances + ' of 120)');
  });

  window.Check.suite('heuristics — job scheduling', function () {
    var C = window.Check, T = window.Trace, J = window.JobSet;

    function overlapFree(set, ids) {
      var chosen = ids.map(function (id) { return set.job(id); })
        .sort(function (a, b) { return a.start - b.start; });
      for (var i = 1; i < chosen.length; i++) if (chosen[i].start < chosen[i - 1].end) return false;
      return true;
    }

    var lost = 0;
    for (var trial = 0; trial < 20; trial++) {
      var set = J.random(2 + trial % 9, 6 + trial % 30);
      var best = J.optimum(set);
      var taken = {};
      ['start', 'shortest', 'finish'].forEach(function (rule) {
        set.resetCounters();
        var picked = T.run(window.Scheduling.run(set, rule));
        C.ok(overlapFree(set, picked), rule + ' never double-books');
        C.ok(picked.length <= best, rule + ' never beats the optimum');
        taken[rule] = picked.length;
      });
      C.equal(taken.finish, best, 'earliest finish time is optimal (trial ' + trial + ')');
      if (taken.start < best || taken.shortest < best) lost++;
    }
    C.ok(lost > 0, 'the other two rules do lose sometimes (' + lost + ' of 20 sets)');

    /* The textbook counterexample: one short job straddling the gap between two long ones. */
    var pinned = J([
      { id: 0, studio: 'A', row: 0, start: 0, end: 4 },
      { id: 1, studio: 'B', row: 1, start: 3, end: 5 },
      { id: 2, studio: 'C', row: 2, start: 4, end: 9 },
    ], 9);
    C.equal(T.run(window.Scheduling.run(pinned, 'shortest')).length, 1,
      'shortest-job-first takes the blocking job and gets one');
    C.equal(T.run(window.Scheduling.run(pinned, 'finish')).length, 2,
      'earliest-finish-time gets two on the same offers');
  });
})();
