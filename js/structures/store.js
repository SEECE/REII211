/* The memory store — the SUBJECT behind the arrays-and-lists page. Plain script, one global
   `Store`.

   The whole page is one idea: an array and a linked list hold the same values, and the
   difference is only in HOW YOU GET FROM ONE ELEMENT TO THE NEXT. So both live in the same
   fixed grid of addressed slots. An array's elements are contiguous and its "link" is
   arithmetic — address + 1, free, instantly, from anywhere. A list's elements are wherever
   there was room and its link is a POINTER stored in the slot, which you can only follow one
   at a time, from the head.

   That is why the counters here are `Comparisons`, `Writes` and `Hops`: a hop is a pointer
   dereference, the thing an array never has to pay and a list pays for every single access. */
(function () {
  'use strict';

  window.Store = function (size) {
    var slots = new Array(size), head = null;
    var cmp = 0, writes = 0, hops = 0, used = 0;
    var snapshot = null;

    function dirty() { snapshot = null; }

    var api = {
      size: size,

      /* ── reading ── */
      at: function (i) { return slots[i]; },                 // free, like an array subscript
      value: function (i) { return slots[i] ? slots[i].value : null; },
      /* following a stored pointer — the operation that costs a list its linear time */
      hop: function (i) { hops++; return i; },
      lessVal: function (a, b) { cmp++; return a < b; },
      greaterVal: function (a, b) { cmp++; return a > b; },
      equalVal: function (a, b) { cmp++; return a === b; },

      /* ── writing ── */
      put: function (i, value, next, prev) {
        writes++;
        if (!slots[i]) used++;
        slots[i] = { value: value, next: next === undefined ? null : next, prev: prev === undefined ? null : prev };
        dirty();
        return i;
      },
      clear: function (i) { if (slots[i]) { used--; writes++; slots[i] = null; dirty(); } },
      link: function (i, next, prev) {
        if (!slots[i]) return;
        writes++;
        slots[i].next = next === undefined ? slots[i].next : next;
        if (prev !== undefined) slots[i].prev = prev;
        dirty();
      },
      setHead: function (i) { writes++; head = i; dirty(); },
      head: function () { return head; },

      /* first free slot — a real allocator would keep a free list; scanning is honest enough
         here and shows that a list node lands wherever there happens to be room */
      alloc: function () {
        for (var i = 0; i < size; i++) if (!slots[i]) return i;
        return -1;
      },
      used: function () { return used; },

      /* opening a saved block is not work the student did, so it does not go on their bill */
      resetCounters: function () { cmp = 0; writes = 0; hops = 0; },

      /* ── the Trace subject contract ── */
      view: function () {
        if (snapshot) return snapshot;
        snapshot = { head: head, cells: slots.map(function (s) {
          return s ? { value: s.value, next: s.next, prev: s.prev } : null;
        }) };
        return snapshot;
      },
      stats: function () {
        return { Comparisons: cmp, Writes: writes, Hops: hops, Slots: used + ' / ' + size };
      },

      /* for the self-checks: the values in logical order, however they are stored */
      order: function (kind) {
        var out = [], i;
        if (kind === 'array') {
          for (i = 0; i < size && slots[i]; i++) out.push(slots[i].value);
          return out;
        }
        for (i = head; i != null && slots[i]; i = slots[i].next) {
          out.push(slots[i].value);
          if (out.length > size) break;                      // a cycle would hang the page
        }
        return out;
      },
    };
    return api;
  };

  /* Rebuild a block from a saved view() — slot for slot, pointer for pointer, because WHERE a
     value sits is the entire lesson of this page and re-inserting the values would put them
     somewhere else. js/io/reii.js has already checked every index is in range. */
  window.Store.load = function (saved) {
    var store = window.Store(saved.cells.length);
    saved.cells.forEach(function (c, i) { if (c) store.put(i, c.value, c.next, c.prev); });
    store.setHead(saved.head == null ? null : saved.head);
    store.resetCounters();
    return store;
  };
})();
