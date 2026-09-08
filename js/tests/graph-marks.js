/* Self-checks for the Dijkstra marking table — js/graph/marks.js.

   The table is derived from the frames rather than computed a second time, so what is worth
   checking is that the derivation is FAITHFUL: the last column has to agree with an
   independent Dijkstra (js/tests/graph.js keeps one), and the front of the priority queue has
   to be the node the run actually settles next. If either drifts, the table is quietly
   teaching a student something the algorithm beside it did not do. */
(function () {
  'use strict';

  window.Check.suite('graphs — the Dijkstra marking table', function () {
    var C = window.Check, T = window.Trace, G = window.Graph, M = window.GraphMarks;
    var reference = window.GraphRef.reference;
    var trial;

    for (trial = 0; trial < 15; trial++) {
      var n = 3 + (trial % 12);
      var g = G.random(n, trial % 5);
      g.resetCounters();
      var model = M.tabulate(T.build(window.GraphShortest.run(g, 0), g));
      if (!C.ok(!!model, 'the table is built from the trace (n=' + n + ')')) continue;

      /* ── the answer ── the rightmost column against a Dijkstra that never saw the trace */
      var want = reference(g, 0), last = model.cols[model.cols.length - 1].dist;
      C.ok(g.nodes().every(function (node) { return last[node.id] === want[node.id]; }),
        'the last column matches an independent Dijkstra (n=' + n + ')');
      C.equal(model.order.length,
        g.nodes().filter(function (node) { return want[node.id] < Infinity; }).length,
        'one column per node the run could reach (n=' + n + ')');
      C.equal(new Set(model.order).size, model.order.length,
        'and nothing is settled twice (n=' + n + ')');

      /* ── the queue ── whoever is at the front is who comes out next. This is the claim the
         chips under the table make, and it is checked against the settle order the run
         recorded, not against a queue kept here. */
      var jumped = null, worse = null;
      model.cols.forEach(function (col, k) {
        var q = M.queue(model, k, col.dist);
        if (k < model.order.length && (!q.length || q[0].id !== model.order[k]) && jumped === null) {
          jumped = k;
        }
        /* a tentative distance only ever improves — the column before can never be lower */
        if (!k) return;
        g.nodes().forEach(function (node) {
          if (col.dist[node.id] > model.cols[k - 1].dist[node.id] && worse === null) worse = k;
        });
      });
      C.ok(jumped === null, 'the front of the queue is the node settled next (n=' + n + ')',
        'column ' + jumped);
      C.ok(worse === null, 'and no distance in the table ever gets worse (n=' + n + ')',
        'column ' + worse);
    }

    /* ── the worked example in js/graph/marks.js ──
       A—B 5, A—C 7, B—D 1. A settles and finds B at 5 and C at 7; B is nearer so B settles and
       finds D at 6; 6 beats C's 7, so D jumps the queue and settles third; C is last. */
    var ex = G();
    ['A', 'B', 'C', 'D'].forEach(function (l, i) { ex.addNode(l, i / 4, 0.5); });
    ex.addEdge(0, 1, 5); ex.addEdge(0, 2, 7); ex.addEdge(1, 3, 1);
    var m = M.tabulate(T.build(window.GraphShortest.run(ex, 0), ex));

    C.equal(m.order.map(function (id) { return ex.node(id).label; }), ['A', 'B', 'D', 'C'],
      'the worked example settles A, B, D, C — D jumps ahead of C');
    C.equal(m.cols.map(function (c) { return c.settled == null ? '–' : ex.node(c.settled).label; }),
      ['–', 'A', 'B', 'D', 'C'], 'and writes one column per settled node');
    C.equal(ex.nodes().map(function (node) {
      return m.cols.map(function (c) {
        return c.dist[node.id] === Infinity ? '–' : c.dist[node.id];
      });
    }), [[0, 0, 0, 0, 0], ['–', 5, 5, 5, 5], ['–', 7, 7, 7, 7], ['–', '–', 6, 6, 6]],
      'giving exactly the table the file writes out');
    C.equal(M.queue(m, 1, m.cols[1].dist).map(function (e) { return e.label + e.d; }), ['B5', 'C7'],
      'after A the queue holds B at 5 in front of C at 7');
    C.equal(M.queue(m, 2, m.cols[2].dist).map(function (e) { return e.label + e.d; }), ['D6', 'C7'],
      'and D pushes in ahead of C the moment B discovers it at 6');

    /* A run that is not Dijkstra's has no columns to write, and must say so rather than
       tabulate whatever roles it happens to find. */
    ex.resetCounters();
    C.equal(M.tabulate(T.build(window.GraphSearch.bfs.run(ex, 0), ex)), null,
      'BFS produces no marking table');
    ex.resetCounters();
    C.equal(M.tabulate(T.build(window.GraphSpanning.prim.run(ex, 0), ex)), null,
      'nor does Prim');

    /* Unreachable nodes stay at nothing in every column — the table must not quietly hand a
       node a distance the run never proved. */
    var split = G();
    ['A', 'B', 'C'].forEach(function (l, i) { split.addNode(l, i / 3, 0.5); });
    split.addEdge(0, 1, 2);
    split.resetCounters();
    var s = M.tabulate(T.build(window.GraphShortest.run(split, 0), split));
    C.equal(s.order.length, 2, 'only the reachable half of a split graph gets a column');
    C.ok(s.cols.every(function (c) { return c.dist[2] === Infinity; }),
      'and the stranded node is at nothing in every one of them');
  });
})();
