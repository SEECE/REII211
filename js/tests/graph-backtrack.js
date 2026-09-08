/* Self-checks for the DFS backtrack trace — js/graph/backtrack.js.

   The trace is read off the frames rather than walked a second time, so what is worth checking
   is that it is FAITHFUL to the run beside it: the line down the page has to be the visit
   order the algorithm actually took, and every jump back has to land on the node the walk
   really did resume under. Both are checked against the frames themselves — the `focus` roles
   the player is drawing — and the visit order against an independent stack walk that never saw
   the trace, so a bug in js/graph/traverse.js cannot hide by agreeing with itself. */
(function () {
  'use strict';

  /* The same stack walk js/graph/traverse.js performs, written again here: pop, push every
     unseen neighbour and mark it as it goes in. If this and the trace ever disagree, one of
     the two is wrong and the drawing is not to be trusted either way. */
  function order(g, from) {
    var stack = [from], seen = {}, out = [];
    seen[from] = true;
    while (stack.length) {
      var at = stack.pop();
      out.push(at);
      g.peek(at).forEach(function (e) {
        if (seen[e.to]) return;
        seen[e.to] = true;
        stack.push(e.to);
      });
    }
    return out;
  }

  window.Check.suite('graphs — the DFS backtrack trace', function () {
    var C = window.Check, T = window.Trace, G = window.Graph, B = window.Backtrack;

    for (var trial = 0; trial < 15; trial++) {
      var n = 3 + (trial % 12);
      var g = G.random(n, trial % 5);
      g.resetCounters();
      var frames = T.build(window.GraphSearch.dfs.run(g, 0), g);
      var model = B.tabulate(frames);
      if (!C.ok(!!model, 'the trace is built from the frames (n=' + n + ')')) continue;

      /* ── the line ── it is the order the run went in, and nothing is on it twice ── */
      C.equal(model.seq.map(function (s) { return s.id; }), order(g, 0),
        'the line down the page is the visit order (n=' + n + ')');
      C.equal(model.seq.map(function (s) { return s.row; }),
        model.seq.map(function (s, i) { return i; }),
        'one row per visit, in order (n=' + n + ')');
      C.equal(new Set(model.seq.map(function (s) { return s.id; })).size, model.seq.length,
        'and nothing is drawn twice (n=' + n + ')');

      /* ── the columns ── a column is one unbroken descent, and a jump steps right by one ── */
      var bad = null;
      model.seq.forEach(function (s, i) {
        if (bad || !i) return;
        var prev = model.seq[i - 1];
        if (s.from === prev.id) {
          if (s.col !== prev.col) bad = s.label + ' left the column it descends in';
        } else if (s.col !== prev.col + 1) bad = s.label + ' did not step right by one';
        else if (!s.back || s.back.from !== prev.id || s.back.to !== s.from) {
          bad = s.label + ' has a jump back that does not match where it hangs from';
        } else if (!prev.dead) bad = prev.label + ' was jumped away from and is not a dead end';
      });
      C.ok(bad === null, 'a column is one descent and every jump steps right (n=' + n + ')', bad);

      /* ── the links ── you hang off a node you share an edge with, drawn before you ── */
      var loose = model.seq.filter(function (s, i) {
        if (s.from == null) return i > 0;
        return model.index[s.from] >= i ||
          !g.peek(s.from).some(function (e) { return e.to === s.id; });
      });
      C.equal(loose.length, 0, 'every node hangs off an earlier node it shares an edge with (n=' + n + ')');
      C.equal(model.cross.length, g.edges().length - (model.seq.length - 1),
        'the descents plus the untravelled edges are the whole graph (n=' + n + ')');

      /* ── the reveal ── the paper only ever gains rows, and ends holding the whole trace ── */
      var shrank = model.at.some(function (s, i) { return i && s.shown < model.at[i - 1].shown; });
      C.ok(!shrank, 'the trace is only ever added to as the run walks (n=' + n + ')');
      C.equal(model.at[model.at.length - 1].shown, model.seq.length,
        'and the last frame is holding the finished trace (n=' + n + ')');
    }

    /* ── the worked example in js/graph/backtrack.js ──
       E = {(A,C),(B,C),(B,H),(B,D),(C,E),(F,H),(G,H)} from A. The stack hands back A C E, then
       has nothing new under E and returns B — which was found from C, so the line resumes there
       one column right. Same again at D and at G. */
    var ex = G(), id = {};
    'ABCDEFGH'.split('').forEach(function (l) { id[l] = ex.addNode(l, 0.5, 0.5); });
    [['A', 'C'], ['B', 'C'], ['B', 'H'], ['B', 'D'], ['C', 'E'], ['F', 'H'], ['G', 'H']]
      .forEach(function (e) { ex.addEdge(id[e[0]], id[e[1]], 1); });
    ex.resetCounters();
    var m = B.tabulate(T.build(window.GraphSearch.dfs.run(ex, id.A), ex));

    C.equal(m.seq.map(function (s) { return s.label; }).join(''), 'ACEBDHGF',
      'the worked example is visited A C E B D H G F');
    C.equal(m.seq.map(function (s) { return s.col; }), [0, 0, 0, 1, 1, 2, 2, 3],
      'in four columns — three jumps back, so three steps right');
    C.equal(m.cols, 4, 'and the drawing is four columns wide');
    C.equal(m.seq.filter(function (s) { return s.back; }).map(function (s) {
      return ex.node(s.back.from).label + '>' + ex.node(s.back.to).label;
    }), ['E>C', 'D>B', 'G>H'], 'the jumps back run E→C, D→B and G→H');
    C.equal(m.seq.filter(function (s) { return s.dead; }).map(function (s) { return s.label; }),
      ['E', 'D', 'G', 'F'], 'and E, D, G and F are where the walk ran out of road');
    C.equal(m.cross.length, 0, 'a tree-shaped graph leaves no untravelled edges');

    /* One more edge is the dotted case — and it moves the run, which is the point: A now
       stacks C and then B, so B is on top and comes out first. The trace follows. */
    ex.addEdge(id.A, id.B, 1);
    ex.resetCounters();
    var withCross = B.tabulate(T.build(window.GraphSearch.dfs.run(ex, id.A), ex));
    C.equal(withCross.cross.map(function (e) {
      return ex.node(e.a).label + ex.node(e.b).label;
    }), ['BC'], 'B—C is kept aside to be drawn dotted: A now stacks B last, so B comes off first');
    C.equal(withCross.seq.length, 8, 'and every node is still on the line exactly once');

    /* A run that is not depth-first has no line to draw, and must say so rather than lay out
       whatever roles it happens to find. BFS walks the very same beats. */
    ex.resetCounters();
    C.equal(B.tabulate(T.build(window.GraphSearch.bfs.run(ex, id.A), ex)), null,
      'BFS produces no backtrack trace');
    ex.resetCounters();
    C.equal(B.tabulate(T.build(window.GraphShortest.run(ex, id.A), ex)), null,
      'nor does Dijkstra');

    /* Unreachable nodes are never on the line — the trace must not claim a visit the run never
       made. */
    var split = G();
    ['A', 'B', 'C'].forEach(function (l, i) { split.addNode(l, i / 3, 0.5); });
    split.addEdge(0, 1, 1);
    split.resetCounters();
    var s = B.tabulate(T.build(window.GraphSearch.dfs.run(split, 0), split));
    C.equal(s.seq.length, 2, 'only the reachable half of a split graph is on the line');
    C.equal(s.index[2], undefined, 'and the stranded node is on no row at all');
  });
})();
