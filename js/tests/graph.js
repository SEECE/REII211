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
  });

  window.Check.suite('graphs — mazes', function () {
    var C = window.Check, T = window.Trace;

    ['backtracker', 'prim'].forEach(function (style) {
      [[2, 2], [6, 4], [20, 14]].forEach(function (dim) {
        var grid = window.MazeGrid(dim[0], dim[1]);
        T.run(window.MazeCarve.run(grid, style));

        var seen = {}, stack = [0], reached = 0;
        seen[0] = true;
        while (stack.length) {
          var at = stack.pop();
          reached++;
          grid.neighbours(at).forEach(function (next) {
            if (!seen[next]) { seen[next] = true; stack.push(next); }
          });
        }
        C.equal(reached, grid.size, style + ' carves every cell (' + dim.join('x') + ')');
        C.equal(grid.stats().Gaps, grid.size - 1, style + ' leaves no loops (' + dim.join('x') + ')');

        grid.resetCounters();
        var bfs = T.run(window.MazeSearch.bfs.run(grid));
        grid.resetCounters();
        var dfs = T.run(window.MazeSearch.dfs.run(grid));
        C.equal(bfs, dfs, 'both searches find the one route through (' + style + ' ' + dim.join('x') + ')');
        C.equal(bfs[0], grid.goal, 'the route ends at the goal');
        C.equal(bfs[bfs.length - 1], grid.start, 'and starts at the start');
      });
    });
  });
})();
