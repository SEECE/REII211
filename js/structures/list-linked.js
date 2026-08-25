/* The LINKED LIST half of the arrays-and-lists page — singly and doubly. Plain script, one
   global `ListOps`.

   The mirror image of ArrayOps:

     search  must HOP. There is no arithmetic that gets you to the middle, because the middle
             could be anywhere in memory — the only way to element k is to follow k pointers
             from the head. Sorted or not, that is O(n), and the Hops counter is the proof.
     insert  is the payoff: once you are standing at the right place, splicing a node in is
             two pointer writes and nothing moves. No shifting, ever.

   Singly and doubly differ in one line — whether a node also stores the way back — so they
   share this file rather than duplicating a walk that is identical. */
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

  /* Walk to the last node whose value is < target, narrating each hop. Returns
     { prev, at } — the node to splice after, and the node we stopped on. */
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
      if (!store.lessVal(here, value)) break;
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

      var spot = yield* walk(store, value, 'find the spot');
      store.put(slot, value, spot.at, doubly ? spot.prev : null);
      yield {
        tag: 'allocate',
        note: 'Allocate a node at ' + addr(slot) + ' — <b>wherever there was room</b>, not next ' +
          'to its neighbours. Its value is ' + v(value) + ' and its next pointer already points ' +
          'at ' + (spot.at == null ? 'null (end of list)' : addr(spot.at)) + '.',
        roles: R.of({ move: [slot] }),
      };

      if (spot.prev == null) store.setHead(slot); else store.link(spot.prev, slot);
      if (doubly && spot.at != null) store.link(spot.at, undefined, slot);
      yield {
        tag: 'done',
        note: 'Point ' + (spot.prev == null ? 'the <b>head</b>' : addr(spot.prev)) + ' at the new node' +
          (doubly ? ', and point the following node back at it' : '') +
          '. That is <b>' + (doubly ? 'three' : 'two') + ' pointer writes</b> and <b>nothing ' +
          'moved</b> — the array had to shift every larger element to do the same job.',
        roles: R.of({ path: chain(store), done: [slot] }),
      };
    },

    search: function* (store, value) {
      if (store.head() == null) { yield { note: 'The list is empty.', roles: {} }; return -1; }
      var spot = yield* walk(store, value, 'search');
      var hit = spot.at != null && store.equalVal(store.at(spot.at).value, value);
      yield {
        tag: hit ? 'found' : 'not found',
        note: hit
          ? 'Found ' + v(value) + ' at ' + addr(spot.at) + ' after <b>' + (spot.steps + 1) +
            '</b> hop' + (spot.steps ? 's' : '') + '. The array found the same value by ' +
            'halving the block; this had to walk to it.'
          : v(value) + ' is not in the list. The walk still had to be made — a sorted list ' +
            'saves you nothing on a miss unless you stop early, and stopping early still ' +
            'costs the hops it took to get there.',
        roles: hit ? R.of({ done: [spot.at] }) : R.of({ reject: chain(store) }),
      };
      return hit ? spot.at : -1;
    },

    remove: function* (store, value, doubly) {
      if (store.head() == null) { yield { note: 'The list is empty.', roles: {} }; return; }
      var spot = yield* walk(store, value, 'find it');
      if (spot.at == null || !store.equalVal(store.at(spot.at).value, value)) {
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
