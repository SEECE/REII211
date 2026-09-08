/* Nearest-neighbour tour, and what it costs you. Plain script, one global `NearestTour`.

   The travelling-salesman tour is the standard example of a problem where the exact answer is
   unaffordable — n! orderings — so you take a rule of thumb instead. "Always go to the closest
   place you have not been" is the obvious one, and it is a good enough answer almost all of
   the time and an embarrassing one occasionally, because the last leg has no choice left: it
   has to come home from wherever the greedy walk stranded it.

   Up to eight points this page also solves the tour EXACTLY, by trying every ordering, and
   prints the two lengths side by side. That comparison is the only honest way to say how good
   a heuristic is, and it is why the point count is capped where brute force stops being
   instant. */
(function () {
  'use strict';
  var R = window.Roles;

  var EXACT_LIMIT = 8;

  function label(id) { return '<span class="val">' + (id + 1) + '</span>'; }
  function edges(order, closed) {
    var out = [];
    for (var i = 0; i + 1 < order.length; i++) out.push('e' + order[i] + '-' + order[i + 1]);
    if (closed && order.length > 2) out.push('e' + order[order.length - 1] + '-' + order[0]);
    return out;
  }
  /* A dotted line from `here` to every place not yet visited — the choices the heuristic is
     actually weighing, drawn before it picks one. */
  function scanLines(here, candidates) {
    return candidates.map(function (c) { return 'e' + here + '-' + c; });
  }

  /* Every ordering of 1‥n-1 with point 0 pinned. A tour is a CYCLE, so all n rotations of an
     ordering are the same tour and have the same length; pinning the start throws away n-1 of
     every n orderings for free, leaving (n-1)! to try. Reversals are a further factor of two
     that this does not bother to remove — at eight points it is not worth the code. */
  function exact(set) {
    var n = set.count(), best = null, bestLen = Infinity;
    var rest = [];
    for (var i = 1; i < n; i++) rest.push(i);
    (function permute(head, tail) {
      if (!tail.length) {
        var order = [0].concat(head);
        var len = window.PointSet.tourLength(set, order);
        if (len < bestLen) { bestLen = len; best = order; }
        return;
      }
      for (var k = 0; k < tail.length; k++) {
        permute(head.concat([tail[k]]), tail.slice(0, k).concat(tail.slice(k + 1)));
      }
    })([], rest);
    return { order: best, length: bestLen };
  }

  window.NearestTour = {
    label: 'Nearest neighbour — a tour',
    roles: ['idle', 'scan', 'focus', 'path', 'done'],
    notes: {
      idle: { label: 'Unvisited', desc: 'Still to be reached' },
      scan: { label: 'Measuring', desc: 'A candidate being measured against the others' },
      focus: { label: 'Standing here', desc: 'The point the tour has reached' },
      path: { label: 'The tour', desc: 'Legs taken so far' },
      done: { label: 'Visited', desc: 'Already on the tour' },
    },

    run: function* (set, start) {
      var n = set.count();
      if (n < 3) { yield { note: 'A tour needs at least three points.', roles: {} }; return; }

      var order = [start], seen = {}, total = 0;
      seen[start] = true;
      yield {
        tag: 'greedy',
        note: 'Start at point ' + label(start) + '. The rule never changes: from wherever you ' +
          'are, go to the <b>nearest place you have not been</b>. There is no lookahead and no ' +
          'undo — that is what makes it a heuristic rather than a search.',
        roles: R.of({ focus: [start] }),
      };

      while (order.length < n) {
        var here = order[order.length - 1];
        var best = null, bestD = Infinity, candidates = [];
        for (var i = 0; i < n; i++) {
          if (seen[i]) continue;
          candidates.push(i);
          var d = set.dist(here, i);
          if (d < bestD) { bestD = d; best = i; }
        }
        yield {
          tag: 'greedy',
          note: 'From ' + label(here) + ', a dotted line to each of the <b>' + candidates.length +
            '</b> unvisited points — every place the heuristic could go next. Measuring all of ' +
            'them finds the nearest: ' + label(best) + '.',
          roles: R.of({
            done: order, path: edges(order),
            scan: candidates.concat(scanLines(here, candidates)), focus: [here],
          }),
        };
        yield {
          tag: 'greedy',
          note: label(best) + ' wins at <b>' + bestD.toFixed(3) + '</b>. It is chosen only ' +
            'because it is closest right now, not because it leaves the tour anywhere good — ' +
            'connect to it and move there.',
          roles: R.of({
            done: order, path: edges(order),
            focus: [here, best, 'e' + here + '-' + best],
          }),
        };
        total += bestD;
        order.push(best);
        seen[best] = true;
        set.track('Tour', total.toFixed(3));
        yield {
          tag: 'greedy',
          note: 'Take that leg. Nothing about this choice considers where it leaves the tour ' +
            'for later — the cost of that shows up at the end.',
          roles: R.of({ done: order, path: edges(order), focus: [best] }),
        };
      }

      total += set.raw(order[order.length - 1], order[0]);
      set.track('Tour', total.toFixed(3));

      var verdict = '';
      if (n <= EXACT_LIMIT) {
        var best2 = exact(set);
        var over = ((total / best2.length - 1) * 100);
        set.track('Best', best2.length.toFixed(3));
        verdict = ' Trying <b>every</b> ordering gives a best tour of <b>' + best2.length.toFixed(3) +
          '</b>, so the greedy walk came out <b>' + over.toFixed(1) + '%</b> long' +
          (over < 0.05 ? ' — this time it happened to be optimal.' : '.');
      } else {
        verdict = ' Checking that against the true best would mean trying every ordering, and ' +
          'there are ' + n + '! of them. Drop to eight points or fewer and this page will do it.';
      }

      yield {
        tag: 'done',
        note: 'Close the loop back to ' + label(order[0]) + '. <b>That last leg was not chosen</b> ' +
          '— it is whatever is left, which is where a greedy tour usually loses.' +
          ' Tour length <b>' + total.toFixed(3) + '</b>.' + verdict,
        roles: R.of({ done: order, path: edges(order, true) }),
      };
      return { order: order, length: total };
    },
    exact: exact,
    EXACT_LIMIT: EXACT_LIMIT,
  };
})();
