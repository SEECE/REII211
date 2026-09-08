/* Self-checks for the spanning-tree marking sheet — js/graph/mst-marks.js.

   The sheet is derived from the frames rather than by running Prim or Kruskal a second time,
   so what is worth checking is that the derivation is FAITHFUL. The drawing makes three claims
   and a student would lose marks for breaking any of them: the numbered edges are a TREE (no
   cycle, and n−1 of them over a connected graph), their total is the weight the algorithm
   itself reported, and edge k is on the paper from the frame the algorithm took it and not
   before. The last one is what makes stepping back un-draw.

   Prim and Kruskal are both put through it, because the sheet is one drawing for two runs and
   the interesting failure is the one that only shows up on the second. */
(function () {
  'use strict';

  window.Check.suite('graphs — the spanning-tree marking sheet', function () {
    var C = window.Check, T = window.Trace, G = window.Graph, M = window.MstMarks;

    /* A union-find written here, not borrowed from Kruskal — an edge closing a cycle has to be
       caught by something that has never seen the algorithm under test. */
    function cycles(order) {
      var parent = {};
      function find(x) {
        if (parent[x] == null) parent[x] = x;
        while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
      }
      for (var i = 0; i < order.length; i++) {
        var ra = find(order[i].a), rb = find(order[i].b);
        if (ra === rb) return order[i].a + '–' + order[i].b + ' closes a cycle';
        parent[ra] = rb;
      }
      return null;
    }

    for (var trial = 0; trial < 12; trial++) {
      var n = 3 + (trial % 10);
      var g = G.random(n, 1 + trial % 4);

      [['Prim', function () { return window.GraphSpanning.prim.run(g, 0); }],
        ['Kruskal', function () { return window.GraphSpanning.kruskal.run(g); }],
      ].forEach(function (pair) {
        var who = pair[0] + ' (n=' + n + ')';
        g.resetCounters();
        var frames = T.build(pair[1](), g);
        var model = M.of(frames);
        if (!C.ok(!!model, 'the sheet is built from the trace — ' + who)) return;

        /* ── the edges ── a tree, and the same tree the last frame is showing ── */
        C.ok(cycles(model.order) === null, 'nothing numbered closes a cycle — ' + who,
          cycles(model.order));
        var last = frames[frames.length - 1].roles;
        var path = Object.keys(last).filter(function (k) { return last[k] === 'path'; });
        C.equal(model.order.map(function (e) { return e.key; }).sort(), path.sort(),
          'the numbered edges are exactly the tree the run ends on — ' + who);

        /* ── the total ── the running weight the sheet prints is the run's own count ── */
        var weight = frames[frames.length - 1].stats.Weight;
        C.equal(model.order.length ? model.order[model.order.length - 1].total : 0, weight,
          'and they add up to the weight the run reported — ' + who);

        /* ── the numbers ── each is a real edge of the graph, and no edge is numbered twice ── */
        var keys = {};
        g.edges().forEach(function (e) { keys[e.key] = e.w; });
        C.ok(model.order.every(function (e) { return keys[e.key] === e.w; }),
          'every number sits on a real edge at its real weight — ' + who);
        C.equal(new Set(model.order.map(function (e) { return e.key; })).size, model.order.length,
          'no edge is numbered twice — ' + who);

        /* ── the timing ── edge k appears at the frame it was taken and stays ── */
        var bad = null;
        model.order.forEach(function (e, k) {
          if (bad) return;
          if (model.at[e.at] < k + 1) bad = 'edge ' + (k + 1) + ' is not on the paper when taken';
          else if (e.at && model.at[e.at - 1] > k) bad = 'edge ' + (k + 1) + ' is drawn early';
        });
        C.ok(bad === null, 'an edge is drawn from the frame it was taken, not before — ' + who,
          bad);
        C.ok(model.at[model.at.length - 1] === model.order.length,
          'and the finished sheet holds every one of them — ' + who);
      });
    }

    /* A graph in two pieces: neither algorithm can span it, and the sheet must show the forest
       it really built rather than pretending to a tree. Prim only ever reaches its own piece. */
    var split = G();
    ['A', 'B', 'C', 'D'].forEach(function (l, i) { split.addNode(l, i / 4, 0.5); });
    split.addEdge(0, 1, 2); split.addEdge(2, 3, 3);          // two components, no edge between

    split.resetCounters();
    var primSheet = M.of(T.build(window.GraphSpanning.prim.run(split, 0), split));
    C.equal(primSheet.order.length, 1, 'Prim numbers only the piece it was started in');
    split.resetCounters();
    var krSheet = M.of(T.build(window.GraphSpanning.kruskal.run(split), split));
    C.equal(krSheet.order.length, 2, 'Kruskal numbers both pieces of the forest');
  });
})();
