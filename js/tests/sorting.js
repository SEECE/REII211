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

    /* A step you can walk is a step you can SEE. Every comparison a sort charges must have a
       beat of its own — insertion sort tested `key < a[j]` inside its `while` header, which
       billed the comparison that ends the inner loop and never drew it, so stepping jumped
       from the last shift straight to the drop and the reason the sort is adaptive was the
       one moment the walk skipped. The counters are the honest witness here: no frame may
       advance Comparisons by more than one. */
    Sorts.ids().forEach(function (id) {
      var tape = Tape(Tape.build(40, 'shuffled'));
      var frames = T.build(Sorts.get(id).run(tape, { pivot: 'last' }), tape);
      var jump = 0, prev = 0;
      frames.forEach(function (f) {
        jump = Math.max(jump, f.stats.Comparisons - prev);
        prev = f.stats.Comparisons;
      });
      C.ok(jump <= 1, id + ' narrates every comparison it charges (worst beat: ' + jump + ')');
    });

    /* The marking table (js/sorting/marks.js) is the same trace written out the way a student
       writes it in a test, so the only thing it can get wrong is the LINES. Two claims:

       Every row is an arrangement of the input. This is the one that matters — insertion sort
       shifts rather than swaps, so the array genuinely passes through [3, 3, 2] mid-copy, and
       a table that printed that line would be marked wrong. Rows are pass ends, so it cannot.

       And the highlight never runs backwards: at[i] is the row frame i is standing in, so
       walking the trace forwards must walk the table forwards. */
    Sorts.ids().forEach(function (id) {
      ORDERS.forEach(function (order) {
        var input = Tape.build(24, order), tape = Tape(input);
        var model = window.Marks.tabulate(T.build(Sorts.get(id).run(tape, { pivot: 'last' }), tape));
        var want = input.slice().sort(function (a, b) { return a - b; }).join(' ');
        var smeared = model.rows.filter(function (r) {
          return r.state.slice().sort(function (a, b) { return a - b; }).join(' ') !== want;
        });
        C.equal(smeared.length, 0,
          id + ' — every ' + order + ' table row is an arrangement of the input');
        C.equal(model.rows[model.rows.length - 1].state.join(' '), want,
          id + ' — the last ' + order + ' row is the sorted answer');
        var back = 0, prev = -1;
        for (var i = 0; i < model.at.length; i++) {
          if (model.at[i] < prev || model.at[i] >= model.rows.length) back++;
          prev = model.at[i];
        }
        C.equal(back, 0, id + ' — walking the ' + order + ' trace walks the table forwards');
      });
    });

    /* The worked example the file documents itself with. Three rows, not the five the shifts
       pass through — if this changes, the comment at the top of marks.js is now a lie. */
    var ex = Tape([3, 1, 2]);
    C.equal(window.Marks.tabulate(T.build(Sorts.get('insertion').run(ex), ex)).rows.map(function (r) {
      return r.state.join(' ');
    }), ['3 1 2', '1 3 2', '1 2 3'], 'insertion sort marks [3,1,2] in three lines');

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

    /* One pivot choice, two pages. Both make the same three comparisons through the same tape,
       so they must bill the same for it — the counters disagreeing about one algorithm is the
       exact bug this site was rebuilt to remove. n=3 isolates it: one pivot choice and one
       partition of two comparisons, whichever page you are on. */
    function cost(strategy) {
      var bars = Tape([3, 1, 2]);
      T.run(window.Sorts.get('quick').run(bars, { pivot: strategy }));
      var values = [3, 1, 2], tape = Tape(values);
      T.run(window.QuickTree.run(window.CallTree(tape), tape, values, strategy));
      return { bars: bars.stats().Comparisons, tree: tape.stats().Comparisons };
    }
    var naiveCost = cost('last'), medianCost = cost('median');
    C.equal(medianCost.bars, medianCost.tree,
      'median-of-three costs the same on the bar graph as in the call tree');
    C.equal(medianCost.bars - naiveCost.bars, 3,
      'and it costs the three comparisons the narration claims');

    /* The page prints what a perfectly balanced tree would be. No real tree can beat that, and
       median-of-three on already-sorted input splits exactly in half every time, so it should
       hit it dead on. Both directions are checked: the claim was over by one on every n that
       was not a power of two, which made the page report trees better than perfect. */
    [2, 3, 4, 5, 6, 7, 8, 15, 16, 31].forEach(function (n) {
      var values = Tape.build(n, 'sorted'), tape = Tape(values), tree = window.CallTree(tape);
      var frames = T.build(window.QuickTree.run(tree, tape, values, 'median'), tree);
      var claim = Number(frames[frames.length - 1].note.match(/would be <b>(\d+)</)[1]);
      C.equal(claim, Math.ceil(Math.log2(n + 1)), 'the ideal depth for n=' + n + ' is ceil(log2(n+1))');
      C.equal(tree.depth() + 1, claim,
        'median-of-three on sorted input builds exactly that tree (n=' + n + ')');
    });

    [2, 3, 7, 20, 33].forEach(function (n) {
      ['shuffled', 'reversed'].forEach(function (order) {
        ['last', 'median'].forEach(function (p) {
          var values = Tape.build(n, order), tape = Tape(values), tree = window.CallTree(tape);
          var frames = T.build(window.QuickTree.run(tree, tape, values, p), tree);
          var claim = Number(frames[frames.length - 1].note.match(/would be <b>(\d+)</)[1]);
          C.ok(tree.depth() + 1 >= claim,
            'no tree is shallower than perfect (' + p + ' ' + order + ' n=' + n + ')');
        });
      });
    });
  });
})();
