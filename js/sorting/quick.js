/* Quick sort — partition around a pivot, then recurse on the two sides.

   The point of the visualisation: the pivot lands in its FINAL position after one partition
   and never moves again, which is why quick sort needs no merge step and no buffer. The other
   point is what a bad pivot costs — run it on an already-sorted array with the last-element
   pivot and watch the recursion go n deep instead of log n. The median-of-three option is the
   standard fix, and switching between the two on the same input is the argument for it. */
(function () {
  'use strict';
  var S = window.Sorts, R = window.Roles;

  /* Median of the first, middle and last element, moved to the end so the partition below is
     unchanged. Three comparisons buy immunity to the sorted-input worst case. */
  function* choosePivot(t, lo, hi, strategy) {
    if (strategy !== 'median') return;
    var mid = (lo + hi) >> 1;
    if (t.greater(lo, mid)) t.swap(lo, mid);
    if (t.greater(lo, hi)) t.swap(lo, hi);
    if (t.greater(mid, hi)) t.swap(mid, hi);
    t.swap(mid, hi);
    yield {
      tag: 'pivot',
      note: 'Median of three: compare the first, middle and last of ' + S.v(lo) + '‥' + S.v(hi) +
        ' and put the middle one at ' + S.v(hi) + '. Three extra comparisons, and the sorted-input ' +
        'worst case goes away.',
      roles: R.of({ focus: [hi], scan: [lo, (lo + hi) >> 1] }),
    };
  }

  /* Lomuto: one pass, one boundary index, pivot swapped into place at the end. */
  function* partition(t, lo, hi, depth) {
    var pivot = t.get(hi), boundary = lo;
    yield {
      tag: 'depth ' + depth,
      note: 'Partition ' + S.v(lo) + '‥' + S.v(hi) + ' around the pivot ' + S.at(hi, pivot) +
        '. Everything smaller goes left of the boundary, everything else stays right.',
      roles: R.of({ focus: [hi] }),
    };

    for (var i = lo; i < hi; i++) {
      var smaller = t.lessVal(t.get(i), pivot);
      yield {
        tag: 'depth ' + depth,
        note: S.at(i, t.get(i)) + ' against the pivot ' + S.v(pivot) + ' — <b>' +
          (smaller ? 'smaller, it belongs left' : 'not smaller, leave it') + '</b>.',
        roles: R.of({ done: R.range(lo, boundary), focus: [hi], scan: [i] }),
      };
      if (smaller) {
        if (i !== boundary) t.swap(i, boundary);
        boundary++;
      }
    }

    t.swap(boundary, hi);
    yield {
      tag: 'depth ' + depth,
      note: 'Swap the pivot to the boundary at ' + S.v(boundary) + '. <b>It is now in its ' +
        'final position</b> — everything left of it is smaller, everything right is not, so ' +
        'nothing will ever move it again.',
      roles: R.of({ move: [boundary], scan: R.range(lo, boundary), focus: R.range(boundary + 1, hi + 1) }),
    };
    return boundary;
  }

  function* sort(t, lo, hi, depth, strategy) {
    if (lo >= hi) return;
    yield* choosePivot(t, lo, hi, strategy);
    var p = yield* partition(t, lo, hi, depth);
    yield* sort(t, lo, p - 1, depth + 1, strategy);
    yield* sort(t, p + 1, hi, depth + 1, strategy);
  }

  S.register({
    id: 'quick',
    label: 'Quick sort',
    complexity: 'Θ(n log n) average · Θ(n²) worst · in place',
    roles: ['idle', 'focus', 'scan', 'move', 'done'],
    notes: {
      focus: { label: 'Pivot side', desc: 'The pivot, and the not-smaller part behind it' },
      scan: { desc: 'Being compared against the pivot' },
      move: { label: 'Placed', desc: 'The pivot, dropped into its final position' },
      done: { label: 'Smaller', desc: 'Confirmed smaller than the pivot' },
    },
    /* the page offers this as an extra rail field; see js/pages/sort.js */
    options: [{
      id: 'pivot', kind: 'select', label: 'Pivot choice', value: 'last',
      options: [
        { value: 'last', label: 'Last element (naive)' },
        { value: 'median', label: 'Median of three' },
      ],
    }],

    run: function* (t, opts) {
      yield* sort(t, 0, t.size - 1, 0, (opts && opts.pivot) || 'last');
      yield {
        tag: 'done',
        note: 'Sorted in place — no buffer, and every pivot went straight to where it belonged.',
        roles: R.of({ done: R.range(0, t.size) }),
      };
    },
  });
})();
