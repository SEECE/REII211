/* Self-checks for the DFS backtrack trace — js/graph/backtrack.js.

   The trace is read off the frames rather than walked a second time, so what is worth checking
   is that it is FAITHFUL to the run beside it: the line down the page has to be the visit
   order the algorithm actually took, and every jump back has to land on the node the walk
   really did resume under. Both are checked against the frames themselves — the `focus` roles
   the player is drawing — and the visit order against an independent stack walk that never saw
   the trace, so a bug in js/graph/traverse.js cannot hide by agreeing with itself. */
(function () {
  'use strict';

  /* The same stack walk js/graph/traverse.js performs, written again here: pop, drop the copy
     if that node has already been visited, otherwise mark it and push every unvisited
     neighbour BACKWARDS — a stack hands back the newest, so feeding it in reverse is what makes
     it take the adjacency list forwards. If this and the trace ever disagree, one of the two is
     wrong and the drawing is not to be trusted either way. */
  function order(g, from) {
    var stack = [from], seen = {}, out = [];
    while (stack.length) {
      var at = stack.pop();
      if (seen[at]) continue;
      seen[at] = true;
      out.push(at);
      g.peek(at).slice().reverse().forEach(function (e) {
        if (!seen[e.to]) stack.push(e.to);
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
       E = {(A,C),(B,C),(B,H),(B,D),(C,E),(F,H),(G,H)} from A. Adjacency in label order, so the
       walk descends A C B D; D has nowhere new, and the stack hands back H — found from B, so
       the line resumes under B one column right. Same again at F and at G. This is the answer
       the same graph gets worked out by hand, which is the whole point of both orderings. */
    var ex = G(), id = {};
    'ABCDEFGH'.split('').forEach(function (l) { id[l] = ex.addNode(l, 0.5, 0.5); });
    [['A', 'C'], ['B', 'C'], ['B', 'H'], ['B', 'D'], ['C', 'E'], ['F', 'H'], ['G', 'H']]
      .forEach(function (e) { ex.addEdge(id[e[0]], id[e[1]], 1); });
    ex.resetCounters();
    var m = B.tabulate(T.build(window.GraphSearch.dfs.run(ex, id.A), ex));

    C.equal(m.seq.map(function (s) { return s.label; }).join(''), 'ACBDHFGE',
      'the worked example is visited A C B D H F G E');
    C.equal(m.seq.map(function (s) { return s.col; }), [0, 0, 0, 0, 1, 1, 2, 3],
      'in four columns — three jumps back, so three steps right');
    C.equal(m.cols, 4, 'and the drawing is four columns wide');
    C.equal(m.seq.filter(function (s) { return s.back; }).map(function (s) {
      return ex.node(s.back.from).label + '>' + ex.node(s.back.to).label;
    }), ['D>B', 'F>H', 'G>C'], 'the jumps back run D→B, F→H and G→C');
    C.equal(m.seq.filter(function (s) { return s.dead; }).map(function (s) { return s.label; }),
      ['D', 'F', 'G', 'E'], 'and D, F, G and E are where the walk ran out of road');
    C.equal(m.cross.length, 0, 'a tree-shaped graph leaves no untravelled edges');

    /* One more edge is the dotted case — and it moves the run, which is the point: A now
       stacks C and then B, so B is on top and comes out first. The trace follows. */
    ex.addEdge(id.A, id.B, 1);
    ex.resetCounters();
    var withCross = B.tabulate(T.build(window.GraphSearch.dfs.run(ex, id.A), ex));
    C.equal(withCross.cross.map(function (e) {
      return ex.node(e.a).label + ex.node(e.b).label;
    }), ['AC'], 'A—C is kept aside to be drawn dotted: A stacks B last, so B comes off first ' +
      'and reaches C before A ever gets to look at it');
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
