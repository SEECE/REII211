/* Self-checks for the graph algorithms and the maze.

   Dijkstra is checked against an independent reference written here rather than against a
   remembered answer, and Prim is checked against Kruskal — two different algorithms agreeing
   on a total is a much stronger statement than either matching a number someone typed in. */
(function () {
  'use strict';

  function reference(g, from) {
    var d = {}, seen = {};
    g.nodes().forEach(function (n) { d[n.id] = Infinity; });
    d[from] = 0;
    for (;;) {
      var best = null;
      g.nodes().forEach(function (n) {
        if (!seen[n.id] && d[n.id] < Infinity && (best === null || d[n.id] < d[best])) best = n.id;
      });
      if (best === null) return d;
      seen[best] = true;
      g.peek(best).forEach(function (e) { if (d[best] + e.w < d[e.to]) d[e.to] = d[best] + e.w; });
    }
  }

  /* Hop counts, the thing BFS claims to minimise — a second implementation, not a rerun of
     the one under test. */
  function hops(g, from) {
    var d = {}, q = [from];
    d[from] = 0;
    while (q.length) {
      var at = q.shift();
      g.peek(at).forEach(function (e) { if (d[e.to] == null) { d[e.to] = d[at] + 1; q.push(e.to); } });
    }
    return d;
  }

  /* Both references are used again by js/tests/frames.js, which checks what the SEARCHES DRAW
     rather than what they answer. One implementation of each, in the file that wrote it. */
  window.GraphRef = { reference: reference, hops: hops };

  window.Check.suite('graphs — traversal, shortest path, spanning trees', function () {
    var C = window.Check, T = window.Trace, G = window.Graph;

    for (var trial = 0; trial < 20; trial++) {
      var n = 3 + (trial % 12);
      var g = G.random(n, trial % 5);

      ['bfs', 'dfs'].forEach(function (kind) {
        g.resetCounters();
        var frames = T.build(window.GraphSearch[kind].run(g, 0), g);
        var m = frames[frames.length - 1].note.match(/Visit order: <b>([^<]*)/);
        var order = m ? m[1].split(' → ') : [];
        C.equal(order.length, n, kind + ' reaches every node (n=' + n + ')');
        C.equal(new Set(order).size, order.length, kind + ' visits nothing twice (n=' + n + ')');
      });

      g.resetCounters();
      var got = T.run(window.GraphShortest.run(g, 0));
      var want = reference(g, 0);
      var same = Object.keys(want).every(function (k) { return got[k] === want[k]; });
      C.ok(same, 'Dijkstra matches the reference (n=' + n + ')');

      /* Given a destination all three stop early. Stopping must not change the ANSWER, which
         is the only reason stopping is allowed at all. */
      var goal = n - 1, far = hops(g, 0);

      g.resetCounters();
      var limited = T.run(window.GraphShortest.run(g, 0, goal));
      C.equal(limited[goal], want[goal],
        'stopping Dijkstra at the destination gives the distance the full run gives (n=' + n + ')');

      g.resetCounters();
      var found = T.run(window.GraphSearch.bfs.run(g, 0, goal));
      C.equal(found.hops, far[goal], 'BFS to a destination uses the fewest edges (n=' + n + ')');

      g.resetCounters();
      var dived = T.run(window.GraphSearch.dfs.run(g, 0, goal));
      C.equal([dived.nodes[0], dived.nodes[dived.nodes.length - 1]], [0, goal],
        'DFS hands back a route that really runs start to destination (n=' + n + ')');
      C.ok(dived.weight >= limited[goal],
        'and never beats Dijkstra on weight (n=' + n + ')', dived.weight + ' < ' + limited[goal]);
      C.ok(found.weight >= limited[goal],
        "nor does BFS — fewest edges is not shortest weight (n=" + n + ')',
        found.weight + ' < ' + limited[goal]);

      g.resetCounters();
      var prim = T.run(window.GraphSpanning.prim.run(g, 0));
      g.resetCounters();
      var kruskal = T.run(window.GraphSpanning.kruskal.run(g));
      C.equal(prim, kruskal, "Prim's total equals Kruskal's (n=" + n + ')');
    }

    /* A shortest route that is not the shortest single edge — the case a greedy walk gets
       wrong and Dijkstra does not. */
    var chain = G();
    ['A', 'B', 'C', 'D'].forEach(function (l, i) { chain.addNode(l, i / 4, 0.5); });
    chain.addEdge(0, 1, 1); chain.addEdge(1, 2, 1); chain.addEdge(0, 2, 5); chain.addEdge(2, 3, 1);
    var d = T.run(window.GraphShortest.run(chain, 0));
    C.equal(d[2], 2, 'Dijkstra prefers two cheap hops over one expensive edge');
    C.equal(d[3], 3, 'and carries that saving down the chain');

    /* Erasing a node and adding another is what the plane's Erase tool does all day. Ids are
       handed out by a counter, so the new node cannot land on top of a surviving one. */
    var edited = G();
    ['A', 'B', 'C'].forEach(function (l, i) { edited.addNode(l, i / 3, 0.5); });
    edited.addEdge(0, 2, 3);
    edited.removeNode(1);
    var fresh = edited.addNode('D', 0.9, 0.5);
    C.ok(edited.nodes().every(function (n) { return n.id === fresh ? n.label === 'D' : true; }),
      'a new node after an erase does not take a live id');
    C.equal(edited.nodes().length, 3, 'the erase left two nodes and the add made a third');
    C.equal(edited.peek(2).length, 1, 'and the surviving node kept its edge');

    /* Erasing edges on the plane can leave the graph in pieces, and a frame must not claim
       more than it did. Prim spans only the component it started in; Dijkstra leaves the other
       piece at ∞. Both used to end by marking every node on the plane finished. */
    var split = G();
    ['A', 'B', 'C', 'D'].forEach(function (l, i) { split.addNode(l, i / 4, 0.5); });
    split.addEdge(0, 1, 2); split.addEdge(2, 3, 3);          // two components, no edge between

    function finalFrame(gen) { var f = T.build(gen, split); return f[f.length - 1]; }
    function marked(frame, role) {
      return Object.keys(frame.roles).filter(function (k) { return frame.roles[k] === role; });
    }

    split.resetCounters();
    var primEnd = finalFrame(window.GraphSpanning.prim.run(split, 0));
    C.equal(marked(primEnd, 'done').sort(), ['0', '1'],
      'Prim ends marking only the component it started in');
    C.ok(/not connected/.test(primEnd.note), 'and says the graph is not connected');
    C.ok(!/Every node is in the one tree/.test(primEnd.note),
      'rather than claiming every node is in the tree');

    split.resetCounters();
    var dijkstraEnd = finalFrame(window.GraphShortest.run(split, 0));
    C.equal(marked(dijkstraEnd, 'done').sort(), ['0', '1'],
      'Dijkstra settles only what it could reach');
    C.ok(/∞/.test(dijkstraEnd.note), 'and reports the unreachable nodes as still at infinity');

    /* A destination in the other component is not reachable, and the walk must say so rather
       than hand back half a route. */
    split.resetCounters();
    C.equal(T.run(window.GraphSearch.bfs.run(split, 0, 3)), null,
      'a search that cannot reach the destination returns no route');
    C.ok(/no route at all/.test(finalFrame(window.GraphSearch.bfs.run(split, 0, 3)).note),
      'and ends by saying there is none');

    /* Prim on the other piece finds that component instead — the note says it can, so it must. */
    split.resetCounters();
    C.equal(T.run(window.GraphSpanning.prim.run(split, 2)), 3,
      'starting Prim in the other component spans that one');
    split.resetCounters();
    C.equal(T.run(window.GraphSpanning.kruskal.run(split)), 5,
      'Kruskal spans the whole forest without being told where to start');

  });
})();
