/* The Dijkstra marking table — the run written out the way it is marked on paper. Plain
   script, one global `GraphMarks`; the DOM half is js/graph/marks-view.js.

   A plane of circles shows you the graph. It does not show the ANSWER a student is asked to
   write in a test, which is one COLUMN per node coming out of the priority queue:

                –    A    B    D    C
        A       0    0    0    0    0
        B       –    5    5    5    5
        C       –    7    7    7    7
        D       –    –    6    6    6

   Read it left to right and it is the run: A settles at 0 and discovers B at 5 and C at 7; B
   is the nearest of those so B settles next and discovers D at 6; 6 beats C's 7 so D jumps the
   queue and settles third; C is rounded off last.

   **None of this is worked out here.** Every column is read straight off the frames the player
   is already walking — the settle beat says which node it settled (`focus`), the relax beat
   says which edges it improved (`scan`), and an edge plus its weight plus the distance of the
   node being settled is the new number. Nothing decides anything: which node settles, which
   edge relaxes and in what order are all the algorithm's, and js/graph/shortest.js is not
   touched by any of this. That is the same rule the bar-graph marking table follows
   (js/sorting/marks.js) and for the same reason — a second implementation could disagree with
   the first, and the whole site exists because one once did.

   The priority queue is the same story: it is the unsettled nodes that have a distance, in
   order — which is precisely the set the algorithm's linear scan looks at, so it can be listed
   from a column rather than tracked. The check that makes that trustworthy is in
   js/tests/graph.js: the front of the queue at every column is the node the run settles next,
   and the last column matches an independent Dijkstra. */
(function () {
  'use strict';

  /* The one key in a folded role map holding this role, as a node id. Dijkstra marks exactly
     one node `focus` — the one it is settling — and js/tests/frames.js already enforces that. */
  function pick(map, role) {
    for (var k in map) if (map[k] === role) return Number(k);
    return null;
  }

  function pickAll(map, role) {
    var out = [];
    for (var k in map) if (map[k] === role) out.push(k);
    return out;
  }

  function copy(d) {
    var out = {};
    for (var k in d) out[k] = d[k];
    return out;
  }

  /* frames → the columns a marker would write, plus which column each frame is standing in.
     Returns null for a trace that is not Dijkstra's — the page shows a note instead. */
  function tabulate(frames) {
    var view = frames[0] && frames[0].state;
    if (!view || !view.nodes || !view.nodes.length) return null;
    // the setup beat marks the source, and only the source, as reached
    var start = pick(frames[0].roles, 'frontier');
    if (start == null) return null;

    var weight = {};
    view.edges.forEach(function (e) { weight[e.key] = e; });

    var dist = {};
    view.nodes.forEach(function (n) { dist[n.id] = Infinity; });
    dist[start] = 0;

    /* Column 0 is the table before anything has been settled: the source at 0 and the rest at
       nothing. `relaxAt` is the frame where a column stops being copied forward and gets the
       improvements written into it — which is what lets the table be WRITTEN as the run walks
       rather than shown finished beside it. */
    var cols = [{ settled: null, at: 0, relaxAt: 0, dist: copy(dist), hit: {} }];
    var order = [], at = new Int32Array(frames.length);
    var best = null, k = 0;

    for (var i = 0; i < frames.length; i++) {
      var f = frames[i];
      if (f.tag === 'settle') {
        best = pick(f.roles, 'focus');
        if (best != null) {
          order.push(best);
          cols.push({ settled: best, at: i, relaxAt: Infinity, dist: copy(dist), hit: {} });
          k = cols.length - 1;
        }
      } else if (f.tag === 'relax' && best != null && k) {
        /* Only this beat's edges are `scan`: the settle before it promoted the previous beat's
           to `path`, which is the delta js/core/trace.js folds. */
        var col = cols[k];
        col.relaxAt = i;
        pickAll(f.roles, 'scan').forEach(function (key) {
          var e = weight[key];
          if (!e) return;
          var to = e.a === best ? e.b : e.a;
          dist[to] = dist[best] + e.w;
          col.dist[to] = dist[to];
          col.hit[to] = true;
        });
        best = null;                 // one relax per settle; a stray second must not apply twice
      }
      at[i] = k;
    }
    if (!order.length) return null;
    return { nodes: view.nodes, cols: cols, at: at, order: order, start: start };
  }

  /* What is in the queue at column k, nearest first — every node that has a distance and has
     not been settled. `dist` is passed in rather than read off the column so a column being
     written mid-beat lists what the table is actually showing at that instant.

     Ties are broken by the order the nodes are declared in, which is the order the algorithm's
     own scan walks them: `if (dist[n.id] < dist[best])` keeps the first of an equal pair, and a
     queue that showed the other one in front would be lying about which pops next. */
  function queue(model, k, dist) {
    var out = [], settled = {};
    for (var i = 0; i < k; i++) settled[model.order[i]] = true;
    model.nodes.forEach(function (n, i) {
      var d = dist[n.id];
      if (settled[n.id] || d == null || d === Infinity) return;
      out.push({ id: n.id, label: n.label, d: d, seq: i });
    });
    out.sort(function (a, b) { return a.d - b.d || a.seq - b.seq; });
    return out;
  }

  window.GraphMarks = { tabulate: tabulate, queue: queue };
})();
