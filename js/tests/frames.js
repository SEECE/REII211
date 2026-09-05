/* Self-checks for what a search DRAWS, frame by frame — js/tests/graph.js checks what they
   answer.

   These exist because the searches state their roles as DELTAS (js/core/trace.js): a beat says
   only what changed and the trace folds those into the map a renderer reads. That is worth its
   own checks, because a forgotten promotion is invisible in the ANSWER and wrong on the screen.

   Nothing here reruns the walk under test to find out what it should have shown. Settling is
   counted by the graph itself in g.settle(); the distances and hop counts are the independent
   references js/tests/graph.js already keeps. */
(function () {
  'use strict';

  /* The nodes a frame shows as finished-with, and the edges it is highlighting as a route or a
     tree. The searches now state their roles as DELTAS (js/core/trace.js), so what a frame shows
     is accumulated rather than restated — which is exactly the thing worth checking, and it is
     checked against the references above rather than against the walk that produced it. */
  function settledIn(frame, g) {
    var out = [];
    out.focused = 0;
    g.nodes().forEach(function (n) {
      var r = frame.roles[n.id];
      if (r === 'focus') out.focused++;
      if (r === 'done' || r === 'focus') out.push(n.id);
    });
    return out;
  }

  /* Are the highlighted edges a forest? An edge left behind when a shorter route displaced it
     is a second way into one node, which shows up here and nowhere else. */
  function forest(frame, g) {
    var root = {}, seen = 0;
    function find(a) { while (root[a] !== a) { root[a] = root[root[a]]; a = root[a]; } return a; }
    g.nodes().forEach(function (n) { root[n.id] = n.id; });
    var ok = true;
    g.edges().forEach(function (e) {
      var r = frame.roles[e.key];
      if (r !== 'path' && r !== 'scan') return;
      seen++;
      var a = find(e.a), b = find(e.b);
      if (a === b) ok = false; else root[a] = b;
    });
    return { ok: ok, count: seen };
  }

  window.Check.suite('graphs — what a search draws', function () {
    var C = window.Check, T = window.Trace, G = window.Graph;
    var reference = window.GraphRef.reference, hops = window.GraphRef.hops;
    var trial;

    /* ── what every frame SHOWS ──

       Settling is counted by the graph itself, in g.settle(), and has nothing to do with roles;
       the reference distances are a second implementation. So "the frame shows exactly the
       nodes that have been settled, and they are the nearest ones" is a claim about the drawing
       checked against two things that never saw it. */
    for (trial = 0; trial < 12; trial++) {
      var gg = G.random(6 + trial, 3 + trial);
      var ns = gg.nodes(), src = ns[0].id, dst = ns[ns.length - 1].id;
      var ref = reference(gg, src), ring = hops(gg, src);

      [['Dijkstra', window.GraphShortest.run(gg, src, dst), ref],
        ['BFS', window.GraphSearch.bfs.run(gg, src, dst), ring],
        ['DFS', window.GraphSearch.dfs.run(gg, src, dst), null]].forEach(function (each) {
        gg.resetCounters();
        var frames = T.build(each[1], gg);
        var bad = null, unordered = null, tangled = null, crowded = null;
        frames.forEach(function (f) {
          var shown = settledIn(f, gg);
          if (shown.length !== f.stats.Visited && bad === null) bad = f.n;
          /* one node is being visited at a time. A delta that forgot to retire the last one
             leaves two, which the count above cannot see — both really were settled. */
          if (shown.focused > 1 && crowded === null) crowded = f.n;
          Object.keys(f.roles).forEach(function (k) {
            if (f.roles[k] === 'idle' && bad === null) bad = f.n;
          });
          var tree = forest(f, gg);
          if (!tree.ok && tangled === null) tangled = f.n;
          if (!each[2]) return;
          /* the settled set is a PREFIX by the reference measure — nothing outside it is nearer
             than something inside it, which is the whole of what "settled means final" claims */
          var inside = 0, outside = Infinity;
          shown.forEach(function (id) { inside = Math.max(inside, each[2][id]); });
          gg.nodes().forEach(function (n) {
            if (shown.indexOf(n.id) < 0 && each[2][n.id] != null) outside = Math.min(outside, each[2][n.id]);
          });
          if (inside > outside && unordered === null) unordered = f.n;
        });
        C.equal(bad, null, each[0] + ' shows exactly the nodes it has settled, on every frame' +
          ' (trial ' + trial + ')');
        C.equal(crowded, null, each[0] + ' marks one node as being visited, not two (trial ' + trial + ')');
        C.equal(tangled, null, each[0] + ' never highlights two ways into one node (trial ' + trial + ')');
        if (each[2]) {
          C.equal(unordered, null, each[0] + ' settles them nearest-first, on every frame' +
            ' (trial ' + trial + ')');
        }
      });
    }
  });
})();
