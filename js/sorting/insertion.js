/* Insertion sort — hold one card, slide it back into the hand until it fits.

   The point of the visualisation: this is the sort that ADAPTS. On a nearly-sorted array the
   inner loop exits immediately and the whole thing is close to linear; on a reversed one every
   element travels the full width. Run it on both and compare the write count. */
(function () {
  'use strict';
  var S = window.Sorts, R = window.Roles;

  S.register({
    id: 'insertion',
    label: 'Insertion sort',
    complexity: 'O(n) best · Θ(n²) worst',
    roles: ['idle', 'focus', 'scan', 'move', 'done'],
    notes: {
      focus: { label: 'The key', desc: 'The value lifted out and looking for its place' },
      scan: { desc: 'The sorted element being compared against the key' },
      move: { label: 'Shifting', desc: 'Slid one place right to make room' },
      done: { label: 'Sorted so far', desc: 'Sorted among themselves — but not necessarily final' },
    },

    run: function* (t) {
      var n = t.size;
      yield {
        tag: 'setup',
        note: 'A single element is trivially sorted, so the sorted prefix starts as just ' +
          S.v('[0]') + '. Everything to its right still has to be inserted.',
        roles: R.of({ done: [0] }),
      };

      for (var i = 1; i < n; i++) {
        var key = t.get(i);
        yield {
          tag: 'key ' + (i + 1) + '/' + n,
          note: 'Lift ' + S.at(i, key) + ' out. Where does it belong in the sorted prefix ' +
            'to its left?',
          roles: R.of({ done: R.range(0, i), focus: [i] }),
        };

        /* The comparison is yielded BEFORE it is acted on, including the one that fails.
           Writing the test inside the `while` header charged a comparison the walk never
           showed, so stepping through jumped straight from the last shift to the drop and
           the beat that actually ENDS the inner loop — the whole point of the sort being
           adaptive — was billed to the student and never drawn. */
        var j = i - 1, moved = 0;
        while (j >= 0) {
          var here = t.get(j);
          var bigger = t.lessVal(key, here);
          yield {
            tag: 'key ' + (i + 1) + '/' + n,
            note: 'Is the key ' + S.v(key) + ' smaller than ' + S.at(j, here) + '? <b>' +
              (bigger ? 'Yes' : 'No') + '</b>' + (bigger
                ? ' — so that value has to move out of the way.'
                : ' — everything further left is smaller still, so the search stops here.'),
            roles: R.of({ done: R.range(0, i + 1), focus: [j + 1], scan: [j] }),
          };
          if (!bigger) break;
          t.set(j + 1, here);
          moved++;
          yield {
            tag: 'key ' + (i + 1) + '/' + n,
            note: S.at(j, here) + ' shifts one place right, into ' + S.v(j + 1) +
              '. The key keeps travelling.',
            roles: R.of({ done: R.range(0, i + 1), move: [j + 1], scan: [j] }),
          };
          j--;
        }

        t.set(j + 1, key);
        yield {
          tag: 'key ' + (i + 1) + '/' + n,
          note: moved
            ? 'Everything bigger has moved up. Drop the key into ' + S.v(j + 1) + ' — it ' +
              'travelled <b>' + moved + '</b> place' + (moved === 1 ? '' : 's') + '.'
            : 'The element to the left is already smaller, so the key is <b>already</b> in ' +
              'place. On a nearly-sorted array this is the only work per element.',
          roles: R.of({ done: R.range(0, i + 1), move: [j + 1] }),
        };
      }

      yield {
        tag: 'done',
        note: 'Sorted. The write count is the honest measure here — it is how far, in total, ' +
          'the elements had to travel.',
        roles: R.of({ done: R.range(0, n) }),
      };
    },
  });
})();
