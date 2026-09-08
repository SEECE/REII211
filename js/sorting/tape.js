/* The tape — an array that counts what you do to it. Plain script, one global `Tape`.

   Every sort on the site works through this instead of a bare array, which is where the
   comparison and swap counts come from. The old pages incremented `comparisons++` by hand
   inside each algorithm and then again inside its separate stepwise copy, so the two modes
   could — and did — report different numbers for the same run.

   It is also the SUBJECT the trace records (js/core/trace.js): view() is the snapshot the
   renderer draws and stats() is what the workbench pins. view() reuses one copy until
   something is written, so a run of pure comparisons costs no memory at all — which is most
   of a sort's frames. */
(function () {
  'use strict';

  window.Tape = function (values) {
    var a = values.slice();
    var cmp = 0, writes = 0, swaps = 0, reads = 0;
    var snapshot = a.slice();          // handed to every frame until a write invalidates it

    function dirty() { snapshot = null; }

    return {
      size: a.length,

      /* reads and comparisons — an algorithm never touches `a` directly */
      get: function (i) { reads++; return a[i]; },
      less: function (i, j) { cmp++; return a[i] < a[j]; },
      greater: function (i, j) { cmp++; return a[i] > a[j]; },
      /* compare two values already in hand — merge holds its halves outside the tape */
      lessVal: function (x, y) { cmp++; return x < y; },
      /* an uncounted copy of a range, for the auxiliary buffer a merge needs */
      slice: function (lo, hi) { return a.slice(lo, hi); },

      /* writes */
      set: function (i, v) { writes++; a[i] = v; dirty(); },
      swap: function (i, j) {
        swaps++; writes += 2;
        var t = a[i]; a[i] = a[j]; a[j] = t;
        dirty();
      },

      /* the Trace subject contract */
      view: function () { if (!snapshot) snapshot = a.slice(); return snapshot; },
      stats: function () { return { Comparisons: cmp, Swaps: swaps, Writes: writes, Reads: reads }; },

      /* for the self-checks: is it actually sorted, and with what in it */
      done: function () { return a.slice(); },
    };
  };

  /* The input to a run. `order` is what makes a sort's counts worth comparing — the same
     algorithm on a reversed array against a nearly-sorted one is the whole lesson. */
  window.Tape.build = function (n, order) {
    var a = [], i;
    for (i = 0; i < n; i++) a.push(i + 1);
    if (order === 'sorted') return a;
    if (order === 'reversed') return a.reverse();
    if (order === 'nearly') {
      // a handful of out-of-place elements, so the adaptive sorts can show they are adaptive.
      // n < 2 has no pair to disturb, and swapping past the end would put a hole in the array.
      for (i = 0; n > 1 && i < Math.max(1, Math.round(n / 12)); i++) {
        var p = Math.floor(Math.random() * (n - 1));
        var t = a[p]; a[p] = a[p + 1]; a[p + 1] = t;
      }
      return a;
    }
    for (i = a.length - 1; i > 0; i--) {          // Fisher-Yates
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  };
})();
