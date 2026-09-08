/* Self-checks for the two heuristics pages.

   Both make a CLAIM in their narration, so both claims are what get checked: that the pruned
   closest-pair search is still exact, and that earliest-finish-time really is optimal while the
   other two rules really are not. */
(function () {
  'use strict';

  /* A greedy-edge loop is valid only if it is ONE cycle through every point — every point has
     exactly two legs, and walking those legs from point 0 visits all n before coming home. Two
     disjoint triangles both have every point at degree two, and only the walk catches that. */
  function isSingleCycle(n, edges) {
    var adj = {};
    for (var i = 0; i < n; i++) adj[i] = [];
    edges.forEach(function (e) { adj[e.a].push(e.b); adj[e.b].push(e.a); });
    for (i = 0; i < n; i++) if (adj[i].length !== 2) return false;
    var visited = { 0: true }, prev = -1, cur = 0, count = 1;
    while (count < n) {
      var next = adj[cur][0] !== prev ? adj[cur][0] : adj[cur][1];
      if (visited[next]) return false;
      visited[next] = true; prev = cur; cur = next; count++;
    }
    return adj[cur].indexOf(0) !== -1;
  }

  window.Check.suite('heuristics — tour and closest pair', function () {
    var C = window.Check, T = window.Trace, P = window.PointSet;

    for (var trial = 0; trial < 20; trial++) {
      var set = P.random(3 + (trial % 20));

      set.resetCounters();
      var loop = T.run(window.ClosestPair.run(set));
      C.equal(loop.edges.length, set.count(), 'the loop has exactly n edges (n=' + set.count() + ')');
      C.ok(isSingleCycle(set.count(), loop.edges),
        'greedy edges form one closed loop through every point, not sub-loops (n=' + set.count() + ')');
      var real = loop.edges.reduce(function (sum, e) { return sum + set.raw(e.a, e.b); }, 0);
      C.close(real, loop.length, 'the reported loop length is the real one');

      set.resetCounters();
      var tour = T.run(window.NearestTour.run(set, 0));
      C.equal(new Set(tour.order).size, set.count(), 'the tour visits every point once');
      C.close(P.tourLength(set, tour.order), tour.length, 'the reported tour length is the real one');
      if (set.count() <= window.NearestTour.EXACT_LIMIT) {
        C.ok(window.NearestTour.exact(set).length <= tour.length + 1e-9,
          'the exact tour is never worse than the greedy one');
      }
    }
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
