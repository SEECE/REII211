/* Closest pair of points. Plain script, one global `ClosestPair`.

   The honest brute force is n²/2 distance measurements. This does the same job by sorting on x
   first and then refusing to measure any pair whose x-gap is already wider than the best
   distance found so far — because if two points are further apart horizontally than the best
   pair is in total, no vertical arrangement can save them.

   That is the whole idea worth taking away, and it is why this sits on the heuristics page next
   to the tour: PRUNING is not an approximation. The answer is still exact — you have simply
   stopped paying for comparisons whose outcome was already decided. Watch the Distances
   counter against the n(n−1)/2 the brute force would have cost. */
(function () {
  'use strict';
  var R = window.Roles;

  function label(id) { return '<span class="val">' + (id + 1) + '</span>'; }

  window.ClosestPair = {
    label: 'Closest pair',
    roles: ['idle', 'scan', 'focus', 'reject', 'done'],
    notes: {
      idle: { label: 'Not reached', desc: 'The sweep has not got here yet' },
      scan: { label: 'Measuring', desc: 'The pair being measured' },
      focus: { label: 'Sweep line', desc: 'The point the sweep has reached' },
      reject: { label: 'Pruned', desc: 'Too far left to possibly be closer — never measured' },
      done: { label: 'Closest pair', desc: 'The answer' },
    },

    run: function* (set) {
      var n = set.count();
      if (n < 2) { yield { note: 'Two points at least, please.', roles: {} }; return null; }

      var byX = set.points().map(function (p) { return p.id; })
        .sort(function (a, b) { return set.at(a).x - set.at(b).x; });
      var best = Infinity, pair = null, brute = n * (n - 1) / 2;

      yield {
        tag: 'setup',
        note: 'Sort the points left to right. Brute force would measure all <b>' + brute +
          '</b> pairs; sorting first lets most of them be skipped without ever being measured.',
        roles: R.of({ scan: byX.slice(0, 1) }),
      };

      for (var i = 1; i < n; i++) {
        var right = byX[i], pruned = [];
        for (var j = i - 1; j >= 0; j--) {
          var left = byX[j];
          var gap = set.at(right).x - set.at(left).x;
          if (gap >= best) {
            pruned = byX.slice(0, j + 1);
            yield {
              tag: 'prune',
              note: 'Point ' + label(left) + ' is already <b>' + gap.toFixed(3) + '</b> away ' +
                'horizontally, and the best pair so far is <b>' + best.toFixed(3) + '</b> apart ' +
                'in total. No point further left can beat that, so <b>' + (j + 1) + '</b> ' +
                'point' + (j ? 's are' : ' is') + ' skipped without a single measurement.',
              roles: R.of({ reject: pruned, focus: [right], done: pair || [] }),
            };
            break;
          }
          var d = set.dist(left, right);
          var better = d < best;
          if (better) { best = d; pair = [left, right]; }
          set.track('Closest', best === Infinity ? '—' : best.toFixed(3));
          yield {
            tag: 'measure',
            note: label(left) + ' to ' + label(right) + ' is <b>' + d.toFixed(3) + '</b>' +
              (better ? ' — a new closest pair.' : ', which is not closer than ' + best.toFixed(3) + '.'),
            roles: R.of({ scan: [left, right], focus: [right], done: better ? [] : (pair || []) }),
          };
        }
      }

      var saved = brute - set.stats().Distances;
      yield {
        tag: 'done',
        note: 'The closest pair is ' + label(pair[0]) + ' and ' + label(pair[1]) + ', <b>' +
          best.toFixed(3) + '</b> apart. It took <b>' + set.stats().Distances + '</b> ' +
          'measurements instead of <b>' + brute + '</b> — <b>' + saved + '</b> pairs were ruled ' +
          'out by the sort alone, and the answer is still exact.',
        roles: R.of({ done: pair }),
      };
      return { pair: pair, distance: best };
    },
  };
})();
