/* Exchange sort — compare position i against every position after it, swapping on sight.

   The point of the visualisation: put it next to bubble sort. Both are Θ(n²) neighbour-free
   double loops, but exchange sort has no notion of a pass making no progress, so it has no
   early exit and pays the full n²/2 comparisons on an already-sorted array. It also swaps far
   more than selection sort does for the same scan, because it takes every improvement it sees
   instead of remembering the best one and swapping once. */
(function () {
  'use strict';
  var S = window.Sorts, R = window.Roles;

  S.register({
    id: 'exchange',
    label: 'Exchange sort',
    complexity: 'Θ(n²) always',
    roles: ['idle', 'focus', 'scan', 'move', 'done'],
    notes: {
      focus: { label: 'Anchor', desc: 'Position i — everything after it is compared to this' },
      scan: { desc: 'The candidate being compared against the anchor' },
      move: { desc: 'Smaller than the anchor — swapped in immediately' },
      done: { desc: 'Final: nothing after it can be smaller' },
    },

    run: function* (t) {
      var n = t.size;
      for (var i = 0; i < n - 1; i++) {
        yield {
          tag: 'anchor ' + S.v(i),
          note: 'Compare position ' + S.v(i) + ' against <b>every</b> position after it. ' +
            'Anything smaller is swapped in on the spot.',
          roles: R.of({ done: R.range(0, i), focus: [i] }),
        };

        for (var j = i + 1; j < n; j++) {
          var smaller = t.less(j, i);
          yield {
            tag: 'anchor ' + S.v(i),
            note: 'Is ' + S.at(j, t.get(j)) + ' smaller than the anchor ' + S.at(i, t.get(i)) +
              '? <b>' + (smaller ? 'Yes — swap now' : 'No') + '</b>.',
            roles: R.of({ done: R.range(0, i), focus: [i], scan: [j] }),
          };
          if (smaller) {
            t.swap(i, j);
            yield {
              tag: 'anchor ' + S.v(i),
              note: 'Swapped. Selection sort would have <i>remembered</i> this and swapped ' +
                'once at the end of the scan; exchange sort writes every time it improves.',
              roles: R.of({ done: R.range(0, i), move: [i, j] }),
            };
          }
        }

        yield {
          tag: 'anchor ' + S.v(i),
          note: 'Nothing after ' + S.v(i) + ' is smaller than it any more, so it is final.',
          roles: R.of({ done: R.range(0, i + 1) }),
        };
      }

      yield {
        tag: 'done',
        note: 'Sorted. There was no early exit to take — exchange sort pays the same number ' +
          'of comparisons on a sorted array as on a reversed one. Try both.',
        roles: R.of({ done: R.range(0, n) }),
      };
    },
  });
})();
