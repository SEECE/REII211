/* The graph — the SUBJECT the node plane and the street map both trace. Plain script, one
   global `Graph`.

   Nodes carry a label and a position in the unit square (the renderer scales them to whatever
   the stage is); edges are undirected and weighted. Adjacency is kept as a map so a traversal
   costs what a traversal should cost.

   Roles are keyed two ways because a graph frame colours two kinds of thing: a NODE key is its
   id, and an EDGE key is `Graph.edgeKey(a, b)`, which sorts the endpoints so an undirected edge
   has exactly one name however the algorithm happened to reach it. That one detail is why the
   renderer never has to guess which direction an edge was walked in. */
(function () {
  'use strict';

  function key(a, b) { return 'e' + (a < b ? a + '-' + b : b + '-' + a); }

  window.Graph = function () {
    var nodes = [], edges = [], adj = {}, extras = {}, snapshot = null;
    var checked = 0, visited = 0, uid = 0;

    function dirty() { snapshot = null; }

    var api = {
      /* ── building ── */
      /* The id comes from a counter, never from nodes.length: erase a node in the middle and
         the length drops, so the next node would be handed an id that is still in use — which
         silently wiped the older node's adjacency and made `node(id)` ambiguous. */
      addNode: function (label, x, y) {
        var id = uid++;
        nodes.push({ id: id, label: label, x: x, y: y });
        adj[id] = [];
        dirty();
        return id;
      },
      addEdge: function (a, b, w) {
        if (a === b || api.edge(a, b)) return null;
        var e = { a: a, b: b, w: w == null ? 1 : w, key: key(a, b) };
        edges.push(e);
        adj[a].push({ to: b, w: e.w, key: e.key });
        adj[b].push({ to: a, w: e.w, key: e.key });
        dirty();
        return e;
      },
      removeEdge: function (a, b) {
        var k = key(a, b);
        edges = edges.filter(function (e) { return e.key !== k; });
        [a, b].forEach(function (id) {
          adj[id] = (adj[id] || []).filter(function (n) { return n.key !== k; });
        });
        dirty();
      },
      removeNode: function (id) {
        (adj[id] || []).slice().forEach(function (n) { api.removeEdge(id, n.to); });
        nodes = nodes.filter(function (n) { return n.id !== id; });
        delete adj[id];
        dirty();
      },
      moveNode: function (id, x, y) {
        var n = api.node(id);
        if (n) { n.x = x; n.y = y; dirty(); }
      },

      /* ── reading ── */
      nodes: function () { return nodes; },
      edges: function () { return edges; },
      node: function (id) { for (var i = 0; i < nodes.length; i++) if (nodes[i].id === id) return nodes[i]; return null; },
      edge: function (a, b) { var k = key(a, b); for (var i = 0; i < edges.length; i++) if (edges[i].key === k) return edges[i]; return null; },
      /* every examination of an incident edge is counted — it is what a traversal spends */
      neighbours: function (id) { checked += (adj[id] || []).length; return (adj[id] || []).slice(); },
      peek: function (id) { return (adj[id] || []).slice(); },     // uncounted, for the renderer
      settle: function () { visited++; },
      track: function (label, value) { extras[label] = value; dirty(); },

      /* ── the Trace subject contract ── */
      view: function () {
        if (snapshot) return snapshot;
        snapshot = {
          nodes: nodes.map(function (n) { return { id: n.id, label: n.label, x: n.x, y: n.y }; }),
          edges: edges.map(function (e) { return { a: e.a, b: e.b, w: e.w, key: e.key }; }),
        };
        return snapshot;
      },
      stats: function () {
        var out = { Nodes: nodes.length, Edges: edges.length, Visited: visited, Checked: checked };
        for (var k in extras) out[k] = extras[k];
        return out;
      },
      resetCounters: function () { checked = 0; visited = 0; extras = {}; dirty(); },
    };
    return api;
  };

  window.Graph.edgeKey = key;

  /* A route read back out of a parent map: the nodes from the source to `at`, the edge keys
     between them, and what walking it costs. Every algorithm that is given a destination ends
     the same way — trace the parents back — and every one of them has to report the same three
     answers, so it is worked out here once rather than three times in three narrations. */
  window.Graph.route = function (g, parent, at) {
    var nodes = [at];
    while (parent[nodes[0]] != null) nodes.unshift(parent[nodes[0]]);
    var keys = [], weight = 0;
    for (var i = 1; i < nodes.length; i++) {
      var e = g.edge(nodes[i - 1], nodes[i]);
      keys.push(key(nodes[i - 1], nodes[i]));
      weight += e ? e.w : 0;
    }
    return { nodes: nodes, keys: keys, weight: weight, hops: nodes.length - 1 };
  };

  /* Rebuild a graph from a saved view(). Ids are handed out fresh rather than trusted from the
     file, so an edge is only ever wired between two nodes this graph actually made. */
  window.Graph.load = function (saved) {
    var g = window.Graph(), id = {};
    saved.nodes.forEach(function (n) { id[n.id] = g.addNode(n.label, n.x, n.y); });
    (saved.edges || []).forEach(function (e) { g.addEdge(id[e.a], id[e.b], e.w); });
    return g;
  };

  /* A random graph that LOOKS like a map: nodes on a jittered grid, edges only between near
     neighbours. A uniformly random graph is a hairball at any useful size and teaches nothing
     about traversal order, because everything is two hops from everything. */
  window.Graph.random = function (count, extraEdges) {
    var g = window.Graph();
    var cols = Math.ceil(Math.sqrt(count)), rows = Math.ceil(count / cols);
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (var i = 0; i < count; i++) {
      var cx = (i % cols + 0.5) / cols, cy = (Math.floor(i / cols) + 0.5) / rows;
      g.addNode(i < 26 ? letters[i] : String(i + 1),
        Math.min(0.95, Math.max(0.05, cx + (Math.random() - 0.5) / cols * 0.55)),
        Math.min(0.92, Math.max(0.08, cy + (Math.random() - 0.5) / rows * 0.55)));
    }
    // a spanning path first, so the graph is always connected and every algorithm has an answer
    for (i = 1; i < count; i++) g.addEdge(i, Math.floor(Math.random() * i), 1 + Math.floor(Math.random() * 9));
    var pool = [];
    for (i = 0; i < count; i++) for (var j = i + 1; j < count; j++) pool.push([i, j]);
    pool.sort(function (p, q) { return dist(g, p) - dist(g, q); });
    for (i = 0; i < pool.length && g.edges().length < count - 1 + (extraEdges || 0); i++) {
      g.addEdge(pool[i][0], pool[i][1], 1 + Math.floor(Math.random() * 9));
    }
    return g;
  };

  function dist(g, pair) {
    var a = g.node(pair[0]), b = g.node(pair[1]);
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
})();
