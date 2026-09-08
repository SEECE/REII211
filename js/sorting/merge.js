/* Merge sort — split to single elements, then merge sorted runs back up.

   The point of the visualisation on the BAR graph: the array is only ever partly rebuilt, so
   what you watch is a sorted run growing out of two smaller ones. The recursion itself is
   easier to see as a tree — that is the Merge Sort Tree page.

   Note the counters: swaps stay at zero for the whole run. Merge sort never swaps; it writes
   n values back per level and there are log n levels, which is the n log n. */
(function () {
  'use strict';
  var S = window.Sorts, R = window.Roles;

  function* merge(t, lo, mid, hi, depth) {
    var left = t.slice(lo, mid), right = t.slice(mid, hi);
    var tag = 'merge ' + S.v(lo) + '‥' + S.v(hi - 1);
    yield {
      tag: 'depth ' + depth,
      note: 'Both halves are sorted on their own. Merge <b>' + left.length + '</b> and <b>' +
        right.length + '</b> elements back into ' + S.v(lo) + '‥' + S.v(hi - 1) +
        ' by repeatedly taking the smaller front element.',
      roles: R.of({ scan: R.range(lo, mid), focus: R.range(mid, hi) }),
    };

    var i = 0, j = 0, k = lo;
    while (i < left.length && j < right.length) {
      var l = left[i], r = right[j];
      var takeLeft = !t.lessVal(r, l);      // right < left decides; ties take the left: stable
      t.set(k, takeLeft ? l : r);
      yield {
        tag: tag,
        note: 'Left front ' + S.v(l) + ' against right front ' + S.v(r) + ' — take the <b>' +
          (takeLeft ? 'left' : 'right') + '</b> one into ' + S.v(k) + '.',
        roles: R.of({ move: [k], scan: R.range(k + 1, mid), focus: R.range(Math.max(mid, k + 1), hi) }),
      };
      if (takeLeft) i++; else j++;
      k++;
    }
    // one half is empty — whatever is left of the other is already in order, so it just copies
    while (i < left.length) { t.set(k, left[i++]); k++; }
    while (j < right.length) { t.set(k, right[j++]); k++; }

    yield {
      tag: tag,
      note: 'One half ran out, so the tail of the other copies straight across — it is ' +
        'already sorted and everything in it is bigger than everything placed so far.',
      roles: R.of({ done: R.range(lo, hi) }),
    };
  }

  function* sort(t, lo, hi, depth) {
    if (hi - lo < 2) return;
    var mid = (lo + hi) >> 1;
    yield {
      tag: 'depth ' + depth,
      note: 'Split ' + S.v(lo) + '‥' + S.v(hi - 1) + ' at ' + S.v(mid) +
        '. Sort each half first; merging them is the easy part.',
      roles: R.of({ scan: R.range(lo, mid), focus: R.range(mid, hi) }),
    };
    yield* sort(t, lo, mid, depth + 1);
    yield* sort(t, mid, hi, depth + 1);
    yield* merge(t, lo, mid, hi, depth);
  }

  S.register({
    id: 'merge',
    label: 'Merge sort',
    complexity: 'Θ(n log n) always · O(n) extra space',
    roles: ['idle', 'scan', 'focus', 'move', 'done'],
    notes: {
      scan: { label: 'Left half', desc: 'The run being merged from the left' },
      focus: { label: 'Right half', desc: 'The run being merged from the right' },
      move: { label: 'Placed', desc: 'Just written back into the array' },
      done: { label: 'Merged', desc: 'A finished sorted run' },
    },

    run: function* (t) {
      yield* sort(t, 0, t.size, 0);
      yield {
        tag: 'done',
        note: 'Sorted. <b>Swaps: zero.</b> Merge sort never exchanges two elements — it ' +
          'writes each level back through a buffer, which is where the extra O(n) space goes.',
        roles: R.of({ done: R.range(0, t.size) }),
      };
    },
  });
})();
