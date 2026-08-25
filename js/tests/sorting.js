/* Self-checks for the six sorts and the two recursion trees. The point is not that a sort
   sorts — it is that it sorts on EVERY input ordering including the degenerate sizes, and that
   the claims the narration makes about the counters are true. */
(function () {
  'use strict';

  var ORDERS = ['shuffled', 'reversed', 'nearly', 'sorted'];
  var SIZES = [0, 1, 2, 7, 40, 63];

  window.Check.suite('sorting — six algorithms', function () {
    var C = window.Check, Tape = window.Tape, Sorts = window.Sorts, T = window.Trace;

    Sorts.ids().forEach(function (id) {
      ORDERS.forEach(function (order) {
        SIZES.forEach(function (n) {
          var input = Tape.build(n, order);
          var tape = Tape(input);
          var frames = T.build(Sorts.get(id).run(tape, { pivot: 'last' }), tape);
          var out = tape.done();
          C.equal(out, input.slice().sort(function (a, b) { return a - b; }),
            id + ' sorts ' + order + ' n=' + n);
          C.ok(frames.length > 0, id + ' narrates ' + order + ' n=' + n);
        });
      });
    });

    [8, 30, 64].forEach(function (n) {
      var tape = Tape(Tape.build(n, 'sorted'));
      T.run(Sorts.get('quick').run(tape, { pivot: 'median' }));
      C.sorted(tape.done(), 'quick sort with median-of-three, sorted input n=' + n);
    });

    var m = Tape(Tape.build(64, 'shuffled'));
    T.run(Sorts.get('merge').run(m));
    C.equal(m.stats().Swaps, 0, 'merge sort never swaps — the narration says so');

    var b = Tape(Tape.build(50, 'sorted'));
    T.run(Sorts.get('bubble').run(b));
    C.equal(b.stats().Comparisons, 49, 'bubble sort takes its early exit after one clean pass');

    var s = Tape(Tape.build(50, 'reversed'));
    T.run(Sorts.get('selection').run(s));
    C.ok(s.stats().Swaps <= 49, 'selection sort swaps at most n-1 times');

    var e1 = Tape(Tape.build(30, 'sorted')), e2 = Tape(Tape.build(30, 'reversed'));
    T.run(Sorts.get('exchange').run(e1));
    T.run(Sorts.get('exchange').run(e2));
    C.equal(e1.stats().Comparisons, e2.stats().Comparisons,
      'exchange sort has no early exit: same comparisons sorted or reversed');
  });

  window.Check.suite('sorting — recursion trees', function () {
    var C = window.Check, Tape = window.Tape, T = window.Trace;

    function build(algo, n, order, strategy) {
      var values = Tape.build(n, order), tape = Tape(values), tree = window.CallTree(tape);
      T.build(algo.run(tree, tape, values, strategy), tree);
      return { tree: tree, out: tape.done(), want: values.slice().sort(function (a, b) { return a - b; }) };
    }

    [2, 3, 4, 7, 16, 28].forEach(function (n) {
      ['shuffled', 'sorted', 'reversed'].forEach(function (order) {
        var mt = build(window.MergeTree, n, order);
        C.equal(mt.out, mt.want, 'merge tree sorts ' + order + ' n=' + n);
        ['last', 'median'].forEach(function (p) {
          var qt = build(window.QuickTree, n, order, p);
          C.equal(qt.out, qt.want, 'quick tree (' + p + ') sorts ' + order + ' n=' + n);
        });
      });
    });

    var shapes = ['shuffled', 'sorted', 'reversed'].map(function (o) {
      return build(window.MergeTree, 16, o).tree.nodes().length;
    });
    C.equal(shapes[0] === shapes[1] && shapes[1] === shapes[2], true,
      'a merge tree has the same shape whatever the input');

    var naive = build(window.QuickTree, 20, 'sorted', 'last').tree.depth();
    var median = build(window.QuickTree, 20, 'sorted', 'median').tree.depth();
    C.ok(naive > median, 'median-of-three is shallower on sorted input (' + naive + ' vs ' + median + ')');

    var layout = window.TreeLayout(build(window.MergeTree, 12, 'shuffled').tree);
    C.ok(layout.columns > 0, 'the tree layout assigns columns');
  });
})();
