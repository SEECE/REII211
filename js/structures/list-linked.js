/* The LINKED LIST half of the arrays-and-lists page — singly and doubly. Plain script, one
   global `ListOps`.

   The mirror image of ArrayOps, and unsorted on purpose:

     insert  is the payoff: a node keeps a TAIL pointer, so a new node is always linked in right
             there — one or two pointer writes, zero hops, no matter how long the list already
             is. Order does not matter to a list the way it does to a contiguous block.
     search  must still HOP. There is no arithmetic that gets you to a given node, because the
             node could be anywhere in memory — the only way to it is to follow pointers from
             the head, one at a time. Being unsorted costs nothing extra here either: a list
             cannot binary search regardless, so a miss was always going to walk the whole
             thing. */
(function () {
  'use strict';
  var R = window.Roles;

  function v(x) { return '<span class="val">' + x + '</span>'; }
  function addr(i) { return '<span class="val">0x' + (i + 1).toString(16).toUpperCase().padStart(2, '0') + '</span>'; }
  function chain(store, upto) {
    var out = [], i = store.head(), guard = 0;
    while (i != null && guard++ < store.size) { out.push(i); if (i === upto) break; i = store.at(i).next; }
    return out;
  }

  /* Walk from the head looking for a value, narrating each hop. Returns { prev, at, steps } —
     `at` is the matching node, or null if the walk ran off the end without one. */
  function* walk(store, value, verb) {
    var prev = null, at = store.head(), steps = 0;
    while (at != null) {
      var here = store.at(at).value;
      yield {
        tag: verb,
        note: 'Hop ' + (steps + 1) + ': follow the pointer to ' + addr(at) + ', which holds ' +
          v(here) + '. There is no way to skip ahead — the next address is only known by ' +
          'reading this node.',
        roles: R.of({ scan: chain(store, at), focus: [at] }),
      };
      if (store.equalVal(here, value)) break;
      prev = at;
      at = store.hop(store.at(at).next);
      steps++;
    }
    return { prev: prev, at: at, steps: steps };
  }

  window.ListOps = {
    insert: function* (store, value, doubly) {
      var slot = store.alloc();
      if (slot < 0) { yield { note: 'Memory is full — no free slot for a new node.', roles: {} }; return; }

      var oldTail = store.tail();
      store.put(slot, value, null, doubly ? oldTail : null);
      yield {
        tag: 'allocate',
        note: 'Allocate a node at ' + addr(slot) + ' — <b>wherever there was room</b>, not next ' +
          'to its neighbours — holding ' + v(value) + '.',
        roles: R.of({ move: [slot] }),
      };

      if (oldTail == null) store.setHead(slot); else store.link(oldTail, slot);
      store.setTail(slot);
      yield {
        tag: 'done',
        note: 'Link it after ' + (oldTail == null ? 'the <b>head</b>' : addr(oldTail)) +
          ' and move the <b>tail</b> pointer to it' +
          (doubly ? ', with its own back pointer set in the same write' : '') + '. Order does ' +
          'not matter to a list, so the new node always goes at the tail — <b>zero hops</b>, ' +
          'whatever the list already holds.',
        roles: R.of({ path: chain(store), done: [slot] }),
      };
    },

    search: function* (store, value) {
      if (store.head() == null) { yield { note: 'The list is empty.', roles: {} }; return -1; }
      var spot = yield* walk(store, value, 'search');
      var hit = spot.at != null;
      yield {
        tag: hit ? 'found' : 'not found',
        note: hit
          ? 'Found ' + v(value) + ' at ' + addr(spot.at) + ' after <b>' + (spot.steps + 1) +
            '</b> hop' + (spot.steps ? 's' : '') + '. The array found the same value by ' +
            'halving the block; this had to walk to it.'
          : v(value) + ' is not in the list. Nothing about order would have shortened that — ' +
            'a list cannot binary search, so a miss always costs a walk of the whole thing.',
        roles: hit ? R.of({ done: [spot.at] }) : R.of({ reject: chain(store) }),
      };
      return hit ? spot.at : -1;
    },

    remove: function* (store, value, doubly) {
      if (store.head() == null) { yield { note: 'The list is empty.', roles: {} }; return; }
      var spot = yield* walk(store, value, 'find it');
      if (spot.at == null) {
        yield { tag: 'not found', note: v(value) + ' is not in the list.', roles: {} };
        return;
      }
      var next = store.at(spot.at).next;
      yield {
        tag: 'unlink',
        note: 'Found it at ' + addr(spot.at) + '. To remove it, the node <b>before</b> it has ' +
          'to be made to point past it — which is why a singly linked list makes you keep ' +
          'hold of the previous node while you walk.',
        roles: R.of({ move: [spot.at], focus: spot.prev == null ? [] : [spot.prev] }),
      };

      if (spot.prev == null) store.setHead(next); else store.link(spot.prev, next);
      if (doubly && next != null) store.link(next, undefined, spot.prev);
      if (store.tail() === spot.at) store.setTail(spot.prev);
      store.clear(spot.at);
      yield {
        tag: 'done',
        note: 'Unlinked and the slot is free. <b>Nothing else moved</b> — every remaining node ' +
          'is at exactly the address it was at before.',
        roles: R.of({ path: chain(store) }),
      };
    },
  };
})();
