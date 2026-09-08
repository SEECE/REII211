/* Selection sort — scan the unsorted tail for its minimum, then put it where it belongs.

   The point of the visualisation: the number of COMPARISONS is the same whatever the input
   (n²/2 always), but the number of SWAPS is at most n−1, which is what makes it the sort you
   pick when a write is expensive and a read is not. Watch the two counters diverge. */
(function () {
  'use strict';
  var S = window.Sorts, R = window.Roles;

  S.register({
    id: 'selection',
    label: 'Selection sort',
    complexity: 'Θ(n²) comparisons · O(n) swaps',
    roles: ['idle', 'scan', 'focus', 'move', 'done'],
    notes: {
      focus: { label: 'Smallest so far', desc: 'The minimum of everything scanned in this pass' },
      scan: { desc: 'Being compared against the smallest so far' },
      done: { desc: 'The sorted prefix — every pass adds one element to it' },
    },

    run: function* (t) {
      var n = t.size;
      for (var i = 0; i < n - 1; i++) {
        var min = i;
        yield {
          tag: 'pass ' + (i + 1),
          note: 'Everything left of ' + S.v(i) + ' is already in place. Scan the rest for the ' +
            'smallest value and bring it here.',
          roles: R.of({ done: R.range(0, i), focus: [min] }),
        };

        for (var j = i + 1; j < n; j++) {
          var better = t.less(j, min);
          yield {
            tag: 'pass ' + (i + 1),
            note: 'Is ' + S.at(j, t.get(j)) + ' smaller than the best so far, ' +
              S.at(min, t.get(min)) + '? <b>' + (better ? 'Yes' : 'No') + '</b>' +
              (better ? ' — the minimum moves to ' + S.v(j) + '.' : '.'),
            roles: R.of({ done: R.range(0, i), focus: [min], scan: [j] }),
          };
          if (better) min = j;
        }

        if (min !== i) {
          t.swap(i, min);
          yield {
            tag: 'pass ' + (i + 1),
            note: 'Swap the minimum into position ' + S.v(i) + '. That is <b>one</b> write ' +
              'pair for a whole pass of comparisons — the trade selection sort makes.',
            roles: R.of({ done: R.range(0, i), move: [i, min] }),
          };
        } else {
          yield {
            tag: 'pass ' + (i + 1),
            note: 'The minimum was already at ' + S.v(i) + ' — no swap needed.',
            roles: R.of({ done: R.range(0, i + 1) }),
          };
        }
      }

      yield {
        tag: 'done',
        note: 'Sorted. Note the comparison count: selection sort pays it in full no matter ' +
          'what the input looked like.',
        roles: R.of({ done: R.range(0, n) }),
      };
    },
  });
})();
