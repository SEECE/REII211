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

  /* The sheet, drawn. It is the PLANE — same geometry, same circles, same renderer — with two
     things changed, and both changes are the marking: an edge is only on the paper once it has
     been taken, and what is written on it is its number rather than its weight. Nothing new is
     laid out, so a student can hold the drawing and the sheet in their head as one picture.

     The leftovers are off by default and keep their WEIGHTS when asked for, which is the
     question the sheet cannot otherwise answer: an edge is missing either because it was dearer
     than the one that beat it or because it would have closed a cycle, and you cannot see which
     without the numbers it was competing on.

     opts: { model, step, cross } — the sheet, how many edges are on it, and the leftovers. */
  function draw(s, frame, colours, opts) {
    if (!s || !frame) return;
    var model = opts && opts.model;
    if (!model) {
      window.GraphDraw.note(s, colours, 'There is no tree to write out yet. Put some nodes on ' +
        'the plane and the edges will be numbered here in the order they are taken.');
      return;
    }
    var k = Math.max(0, Math.min(model.order.length, (opts && opts.step) || 0));
    var taken = model.order.slice(0, k);

    /* An edge just taken is the one under discussion, the rest are the tree, and a node is
       drawn as reached the moment an edge lands on it — which is why the sheet opens on a
       plane of bare circles. */
    var labels = {}, roles = {};
    taken.forEach(function (e, i) {
      labels[e.key] = i + 1;
      roles[e.key] = i === k - 1 ? 'focus' : 'path';
      roles[e.a] = roles[e.b] = 'done';
    });

    window.GraphDraw.draw(s, {
      state: { nodes: model.nodes, edges: opts && opts.cross ? model.edges : taken },
      roles: roles,
    }, colours, { weighted: true, labels: labels });

    var ctx = s.ctx;
    ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = colours['ink-soft'];
    ctx.fillText(k
      ? 'Edge ' + k + ' of ' + model.order.length + ' — total weight ' + taken[k - 1].total
      : 'No edges yet: the sheet starts as bare nodes and one is numbered onto it each step.',
      10, 8);
  }

  window.MstMarks = { of: of, draw: draw };
})();
