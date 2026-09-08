/* The spanning-tree marking sheet — Prim and Kruskal written out the way they are marked on
   paper. Plain script, one global `MstMarks`; the drawing half is at the bottom of this file.

   A plane of circles shows you the graph. It does not show what a student is asked to hand in
   for an MST, which is the same plane with the WEIGHTS rubbed out and replaced by the ORDER the
   edges joined the tree:

        A ──1── B          the sheet starts as bare nodes and nothing else, and an edge
        │       │          appears on it the moment the algorithm takes one — numbered
        4       2          1, 2, 3 … so the finished sheet reads as the run and not just
        │       │          as the answer. Both algorithms end with the same edges; the
        D ──3── C          numbers on them are where they disagree.

   That is the whole difference between the two: Prim's numbers spread outwards from one node,
   Kruskal's land all over the plane and only join up at the end. The same drawing marks both,
   which is why there is one model here and not two.

   **Nothing is worked out here.** The order is read straight off the frames the player is
   already walking: both algorithms mark the edge they have just taken `focus`, and the k-th
   edge to be marked is edge number k. Which edge that is, and in what order, is the
   algorithm's — js/graph/spanning.js is not touched by any of this. Same rule as the Dijkstra
   marking table (js/graph/marks.js) and for the same reason: a second implementation could
   disagree with the first, and the whole site exists because one once did.

   The check that the sheet is a real spanning tree — n−1 edges over a connected graph, no
   cycle, and the same total weight the algorithm reported — is in js/tests/graph-mst.js. */
(function () {
  'use strict';

  /* frames → the edges in the order they joined the tree, plus how many of them are on the
     paper at each frame. Returns null for a run that is not building a spanning tree — the
     page draws a note instead. */
  function of(frames) {
    var view = frames && frames[0] && frames[0].state;
    if (!view || !view.nodes || !view.nodes.length) return null;

    var edge = {};
    view.edges.forEach(function (e) { edge[e.key] = e; });

    var order = [], taken = {}, at = new Int32Array(frames.length), total = 0;
    for (var i = 0; i < frames.length; i++) {
      var roles = frames[i].roles;
      for (var k in roles) {
        /* An edge under `focus` is one just taken. Dijkstra focuses a NODE and BFS focuses a
           node too, so a run that is not spanning never gets past this line. */
        if (roles[k] !== 'focus' || !edge[k] || taken[k]) continue;
        taken[k] = true;
        total += edge[k].w;
        order.push({ key: k, a: edge[k].a, b: edge[k].b, w: edge[k].w, at: i, total: total });
      }
      at[i] = order.length;
    }
    if (!order.length) return null;
    return { nodes: view.nodes, edges: view.edges, order: order, at: at };
  }

  window.MstMarks = { of: of };
})();
