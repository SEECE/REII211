/* Self-checks for the memory store, the two list kinds and the binary search tree. */
(function () {
  'use strict';

  window.Check.suite('structures — array and linked lists', function () {
    var C = window.Check, T = window.Trace, Store = window.Store;

    var arr = Store(72);
    [5, 1, 9, 3, 7, 3].forEach(function (v) { T.run(window.ArrayOps.insert(arr, v)); });
    C.equal(arr.order('array'), [1, 3, 3, 5, 7, 9], 'array insert keeps the block sorted');
    C.ok(T.run(window.ArrayOps.search(arr, 7)) >= 0, 'array binary search finds a present value');
    C.equal(T.run(window.ArrayOps.search(arr, 4)), -1, 'array binary search rejects an absent value');
    T.run(window.ArrayOps.remove(arr, 5));
    C.equal(arr.order('array'), [1, 3, 3, 7, 9], 'array delete closes the hole');
    T.run(window.ArrayOps.remove(arr, 1));
    T.run(window.ArrayOps.remove(arr, 9));
    C.equal(arr.order('array'), [3, 3, 7], 'array delete works at both ends');

    [false, true].forEach(function (doubly) {
      var tag = doubly ? 'doubly' : 'singly';
      var list = Store(72);
      [5, 1, 9, 3, 7].forEach(function (v) { T.run(window.ListOps.insert(list, v, doubly)); });
      C.equal(list.order('list'), [5, 1, 9, 3, 7], tag + ' insert keeps arrival order, unsorted');
      T.run(window.ListOps.remove(list, 5, doubly));
      C.equal(list.order('list'), [1, 9, 3, 7], tag + ' removes the head');
      T.run(window.ListOps.remove(list, 7, doubly));
      C.equal(list.order('list'), [1, 9, 3], tag + ' removes the tail');
      T.run(window.ListOps.remove(list, 9, doubly));
      C.equal(list.order('list'), [1, 3], tag + ' removes from the middle');
      T.run(window.ListOps.remove(list, 99, doubly));
      C.equal(list.order('list'), [1, 3], tag + ' survives removing an absent value');
      T.run(window.ListOps.insert(list, 42, doubly));
      C.equal(list.order('list'), [1, 3, 42], tag + ' insert always lands at the tail');
      C.equal(list.at(list.tail()).next, null, tag + ' tail pointer names the actual last node');
      if (!doubly) return;
      var ok = true, prev = null;
      for (var i = list.head(); i != null; i = list.at(i).next) {
        if (list.at(i).prev !== prev) ok = false;
        prev = i;
      }
      C.ok(ok, 'doubly linked back pointers stay consistent');
    });

    /* The claim the page is built on: a list insert is free (tail pointer), but its search still
       hops a lot — an array pays nothing for either, once it is sorted. */
    var a2 = Store(72), l2 = Store(72);
    for (var v = 1; v <= 20; v++) {
      T.run(window.ArrayOps.insert(a2, v));
      T.run(window.ListOps.insert(l2, v, false));
    }
    C.equal(l2.stats().Hops, 0, 'the list pays no hops to insert at the tail');
    T.run(window.ListOps.search(l2, 20));
    C.equal(a2.stats().Hops, 0, 'the array never follows a pointer');
    C.ok(l2.stats().Hops > 0, 'the list pays hops to search for the same value (' + l2.stats().Hops + ')');
  });

  window.Check.suite('structures — binary search tree', function () {
    var C = window.Check, T = window.Trace, BST = window.BST, Ops = window.BSTOps;

    var t = BST();
    [50, 30, 70, 20, 40, 60, 80, 35].forEach(function (v) { T.run(Ops.insert(t, v)); });
    C.equal(t.values(), [20, 30, 35, 40, 50, 60, 70, 80], 'in-order traversal is sorted');
    T.run(Ops.insert(t, 50));
    C.equal(t.values().length, 8, 'a duplicate is not inserted twice');
    T.run(Ops.remove(t, 20));
    C.equal(t.values(), [30, 35, 40, 50, 60, 70, 80], 'delete a leaf');
    T.run(Ops.remove(t, 40));
    C.equal(t.values(), [30, 35, 50, 60, 70, 80], 'delete a node with one child');
    T.run(Ops.remove(t, 50));
    C.equal(t.values(), [30, 35, 60, 70, 80], 'delete a node with two children');
    T.run(Ops.remove(t, 999));
    C.equal(t.values(), [30, 35, 60, 70, 80], 'delete an absent value changes nothing');
    while (t.values().length) T.run(Ops.remove(t, t.values()[0]));
    C.equal(t.root(), null, 'emptying the tree leaves a null root');

    var ladder = BST();
    for (var v = 1; v <= 15; v++) T.run(Ops.insert(ladder, v));
    var balanced = BST();
    [8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15]
      .forEach(function (x) { T.run(Ops.insert(balanced, x)); });
    C.equal(ladder.height(), 15, 'sorted input degenerates the tree into a list');
    C.equal(balanced.height(), 4, 'the same values, balanced, are four levels deep');
    C.equal(balanced.height(), balanced.stats().Ideal, 'and that matches the ideal height');
  });
})();
