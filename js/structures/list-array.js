/* The ARRAY half of the arrays-and-lists page. Plain script, one global `ArrayOps`.

   Kept sorted, contiguous, from address 0. The two things worth watching:

     search  is BINARY — the array can jump to the middle because element k is at address k,
             so it costs log n comparisons and ZERO pointer hops. This is the one operation an
             array wins outright and it is why the page keeps the data sorted.
     insert  pays for that: making room means shifting every larger element up one address,
             so a cheap search buys an expensive write. That trade is the whole lesson. */
(function () {
  'use strict';
  var R = window.Roles;

  function len(store) {
    var n = 0;
    while (n < store.size && store.at(n)) n++;
    return n;
  }
  function v(x) { return '<span class="val">' + x + '</span>'; }
  function addr(i) { return '<span class="val">0x' + (i + 1).toString(16).toUpperCase().padStart(2, '0') + '</span>'; }

  window.ArrayOps = {
    insert: function* (store, value) {
      var n = len(store);
      if (n >= store.size) {
        yield { note: 'The block is full. An array cannot grow in place — it has to be ' +
          'reallocated somewhere bigger and copied across.', roles: {} };
        return;
      }
      store.put(n, value);
      yield {
        tag: 'append',
        note: 'Write ' + v(value) + ' at the first free address, ' + addr(n) + '. It is in the ' +
          'block but not in order yet.',
        roles: R.of({ move: [n] }),
      };

      var i = n;
      while (i > 0 && store.greaterVal(store.value(i - 1), value)) {
        yield {
          note: store.value(i - 1) + ' at ' + addr(i - 1) + ' is bigger than ' + v(value) +
            ', so it has to move up one address to make room.',
          roles: R.of({ scan: [i - 1], focus: [i] }),
        };
        store.put(i, store.value(i - 1));
        store.put(i - 1, value);
        i--;
        yield { note: 'Shifted. Every larger element pays this — an insert into the middle of ' +
          'a full block is O(n) writes.', roles: R.of({ move: [i, i + 1] }) };
      }
      yield {
        tag: 'done',
        note: v(value) + ' is settled at ' + addr(i) + ' and the block is contiguous and sorted.',
        roles: R.of({ done: [i] }),
      };
    },

    search: function* (store, value) {
      var lo = 0, hi = len(store) - 1;
      if (hi < 0) { yield { note: 'The block is empty.', roles: {} }; return -1; }
      yield {
        tag: 'binary search',
        note: 'The block is sorted <b>and</b> element k lives at address k, so we can jump ' +
          'straight to the middle. A list cannot do this — that is what random access buys.',
        roles: R.of({ scan: R.range(lo, hi + 1) }),
      };
      while (lo <= hi) {
        var mid = (lo + hi) >> 1;
        var here = store.value(mid);
        yield {
          tag: 'binary search',
          note: 'Look at the middle of ' + addr(lo) + '‥' + addr(hi) + ': ' + addr(mid) +
            ' holds ' + v(here) + '.',
          roles: R.of({ scan: R.range(lo, hi + 1), focus: [mid] }),
        };
        if (store.equalVal(here, value)) {
          yield { tag: 'found', note: 'Found ' + v(value) + ' at ' + addr(mid) + ' — and no ' +
            'pointer was followed to get here.', roles: R.of({ done: [mid] }) };
          return mid;
        }
        if (store.lessVal(here, value)) lo = mid + 1; else hi = mid - 1;
        yield {
          tag: 'binary search',
          note: v(here) + ' is ' + (here < value ? 'too small' : 'too big') + ', so <b>half</b> ' +
            'the remaining block is eliminated in one comparison.',
          roles: R.of({ reject: R.range(0, store.size), scan: R.range(lo, hi + 1) }),
        };
      }
      yield { tag: 'not found', note: v(value) + ' is not in the block. The search cost ' +
        'log₂n comparisons, not n.', roles: {} };
      return -1;
    },

    remove: function* (store, value) {
      var found = yield* window.ArrayOps.search(store, value);
      if (found < 0) return;
      var n = len(store);
      for (var i = found; i < n - 1; i++) {
        store.put(i, store.value(i + 1));
        yield {
          note: 'Pull ' + v(store.value(i)) + ' down from ' + addr(i + 1) + ' to ' + addr(i) +
            '. A gap in a contiguous block is not allowed, so everything above the hole moves.',
          roles: R.of({ move: [i], scan: R.range(i + 1, n) }),
        };
      }
      store.clear(n - 1);
      yield {
        tag: 'done',
        note: 'Removed. The block is contiguous again, at the cost of shifting <b>' +
          (n - 1 - found) + '</b> element' + (n - 1 - found === 1 ? '' : 's') + '.',
        roles: R.of({ done: R.range(0, n - 1) }),
      };
    },
  };
})();
