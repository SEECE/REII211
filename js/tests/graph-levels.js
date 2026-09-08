/* Self-checks for the BFS level tree — js/graph/levels.js.

   The tree is derived from the frames rather than searched a second time, so what is worth
   checking is that the derivation is FAITHFUL. The claim the drawing makes is a strong one and
   an easy one to break: a node drawn on row k is exactly k edges from the start. That is
   checked against js/tests/graph.js's independent hop count, which never saw the trace.

   The dotted leftovers carry a claim of their own. In an undirected graph BFS cannot leave an
   edge that skips a level — if it could, the far end would have been discovered a ring
   earlier — so every untaken edge joins nodes on the same row or on neighbouring rows. If that
   ever fails, the tree is not a BFS tree and the drawing is teaching the wrong thing. */
(function () {
  'use strict';

  window.Check.suite('graphs — the BFS level tree', function () {
    var C = window.Check, T = window.Trace, G = window.Graph, L = window.LevelTree;
    var hops = window.GraphRef.hops;

    for (var trial = 0; trial < 15; trial++) {
      var n = 3 + (trial % 12);
      var g = G.random(n, trial % 5);
      g.resetCounters();
      var model = L.tabulate(T.build(window.GraphSearch.bfs.run(g, 0), g));
      if (!C.ok(!!model, 'the tree is built from the trace (n=' + n + ')')) continue;

      /* ── the rows ── every node sits on the row that is its true hop distance ── */
      var want = hops(g, 0);
      var reachable = g.nodes().filter(function (node) { return want[node.id] != null; });
      C.equal(model.nodes.length, reachable.length,
        'one node in the tree per node BFS can reach (n=' + n + ')');
      C.ok(model.nodes.every(function (t) { return t.level === want[t.id]; }),
        'and every one of them is on the row of its hop distance (n=' + n + ')');
      C.equal(new Set(model.nodes.map(function (t) { return t.id; })).size, model.nodes.length,
        'nothing is drawn twice (n=' + n + ')');

      /* ── the links ── a parent is a real neighbour, one row up, drawn before its child ── */
      var bad = null;
      model.nodes.forEach(function (t, i) {
        if (bad) return;
        if (t.parent == null) { if (i) bad = t.label + ' has no parent'; return; }
        var p = model.index[t.parent];
        if (p == null || p >= i) bad = t.label + ' hangs off a node drawn after it';
        else if (model.nodes[p].level !== t.level - 1) bad = t.label + ' hangs off the wrong row';
        else if (!g.peek(t.parent).some(function (e) { return e.to === t.id; })) {
          bad = t.label + ' hangs off a node it shares no edge with';
        }
      });
      C.ok(bad === null, 'every node hangs off a neighbour one row up (n=' + n + ')', bad);
      C.ok(model.nodes.every(function (t, i) {
        return !i || t.level >= model.nodes[i - 1].level;
      }), 'and the drawing order is ring order, so a row fills left to right (n=' + n + ')');

      /* ── the leftovers ── an untaken edge never skips a row ── */
      var skipped = model.cross.filter(function (e) {
        return want[e.a] != null && want[e.b] != null && Math.abs(want[e.a] - want[e.b]) > 1;
      });
      C.equal(skipped.length, 0, 'no edge BFS skipped jumps more than one level (n=' + n + ')');
      C.equal(model.cross.length, g.edges().length - (model.nodes.length - 1),
        'and the tree plus the leftovers is the whole graph (n=' + n + ')');

      /* ── the reveal ── the paper only ever gains nodes, and ends holding all of them ── */
      var shrank = model.at.some(function (s, i) { return i && s.shown < model.at[i - 1].shown; });
      C.ok(!shrank, 'the tree is only ever added to as the run walks (n=' + n + ')');
      C.equal(model.at[model.at.length - 1].shown, model.nodes.length,
        'and the last frame is holding the finished tree (n=' + n + ')');
    }

    /* ── the worked example in js/graph/levels.js ──
       A joined to B, C, D; B to E and F; D to G. Three rows, and the row order is the order the
       queue handed the nodes out. */
    var ex = G();
    'ABCDEFG'.split('').forEach(function (l, i) { ex.addNode(l, i / 7, 0.5); });
    [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [3, 6]].forEach(function (e) { ex.addEdge(e[0], e[1], 1); });
    ex.resetCounters();
    var m = L.tabulate(T.build(window.GraphSearch.bfs.run(ex, 0), ex));

    C.equal(m.levels, 3, 'the worked example is three rows deep');
    C.equal(m.rows.map(function (row) {
      return row.map(function (i) { return m.nodes[i].label; }).join('');
    }), ['A', 'BCD', 'EFG'], 'A on top, then B C D, then E F G');
    C.equal(m.nodes.map(function (t) {
      return t.parent == null ? '·' : ex.node(t.parent).label;
    }), ['·', 'A', 'A', 'A', 'B', 'B', 'D'], 'and every node hangs off the node that found it');
    C.equal(m.cross.length, 0, 'a tree-shaped graph leaves no untaken edges');

    /* One more edge, between two nodes on the same row, is the dotted case. */
    ex.addEdge(4, 5, 1);
    ex.resetCounters();
    var withCross = L.tabulate(T.build(window.GraphSearch.bfs.run(ex, 0), ex));
    C.equal(withCross.cross.map(function (e) {
      return ex.node(e.a).label + ex.node(e.b).label;
    }), ['EF'], 'E—F is drawn dotted: both ends were already seen when BFS looked at it');
    C.equal(withCross.nodes.length, 7, 'and it changes nothing about the tree itself');

    /* A run that is not breadth-first has no rings to draw, and must say so rather than lay out
       whatever roles it happens to find. DFS walks the very same beats. */
    ex.resetCounters();
    C.equal(L.tabulate(T.build(window.GraphSearch.dfs.run(ex, 0), ex)), null,
      'DFS produces no level tree');
    ex.resetCounters();
    C.equal(L.tabulate(T.build(window.GraphShortest.run(ex, 0), ex)), null,
      'nor does Dijkstra');

    /* Unreachable nodes are never drawn — the tree must not put a node on a row the run never
       proved it belongs on. */
    var split = G();
    ['A', 'B', 'C'].forEach(function (l, i) { split.addNode(l, i / 3, 0.5); });
    split.addEdge(0, 1, 1);
    split.resetCounters();
    var s = L.tabulate(T.build(window.GraphSearch.bfs.run(split, 0), split));
    C.equal(s.nodes.length, 2, 'only the reachable half of a split graph is drawn');
    C.equal(s.index[2], undefined, 'and the stranded node is on no row at all');
  });
})();
