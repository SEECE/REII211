/* Bubble sort — sweep left to right swapping any neighbours that are out of order.

   The point of the visualisation: the largest remaining value reaches the end in a single
   pass, which is where the name comes from, and a pass that makes NO swap proves the array is
   sorted — the early exit that makes it O(n) on already-sorted input and the only thing
   distinguishing it from exchange sort. */
(function () {
  'use strict';
  var S = window.Sorts, R = window.Roles;

  S.register({
    id: 'bubble',
    label: 'Bubble sort',
    complexity: 'O(n) best · Θ(n²) worst',
    roles: ['idle', 'scan', 'move', 'done'],
    notes: {
      scan: { label: 'The pair', desc: 'The two neighbours being compared' },
      move: { desc: 'Out of order — being swapped past each other' },
      done: { desc: 'Bubbled to the end and settled' },
    },

    run: function* (t) {
      var n = t.size;
      for (var i = 0; i < n - 1; i++) {
        var swapped = false;
        var limit = n - i - 1;
        yield {
          tag: 'pass ' + (i + 1),
          note: 'Sweep from ' + S.v(0) + ' to ' + S.v(limit) + ', swapping any neighbour pair ' +
            'that is the wrong way round. The largest value still loose will end up at ' +
            S.v(limit) + '.',
          roles: R.of({ done: R.range(limit + 1, n) }),
        };

        for (var j = 0; j < limit; j++) {
          var out = t.greater(j, j + 1);
          yield {
            tag: 'pass ' + (i + 1),
            note: S.at(j, t.get(j)) + ' against ' + S.at(j + 1, t.get(j + 1)) + ' — <b>' +
              (out ? 'out of order' : 'fine') + '</b>.',
            roles: R.of({ done: R.range(limit + 1, n), scan: [j, j + 1] }),
          };
          if (out) {
            t.swap(j, j + 1);
            swapped = true;
            yield {
              tag: 'pass ' + (i + 1),
              note: 'Swapped. The bigger value carries on rightwards with the sweep.',
              roles: R.of({ done: R.range(limit + 1, n), move: [j, j + 1] }),
            };
          }
        }

        if (!swapped) {
          yield {
            tag: 'early exit',
            note: '<b>No swaps in that whole pass.</b> Nothing is out of order anywhere, so ' +
              'the array is sorted and the remaining passes would find nothing. Stop.',
            roles: R.of({ done: R.range(0, n) }),
          };
          return;
        }

        yield {
          tag: 'pass ' + (i + 1),
          note: 'End of the pass — ' + S.at(limit, t.get(limit)) + ' is the largest of what ' +
            'was left and will not move again.',
          roles: R.of({ done: R.range(limit, n) }),
        };
      }

      yield { tag: 'done', note: 'Sorted.', roles: R.of({ done: R.range(0, n) }) };
    },
  });
})();
