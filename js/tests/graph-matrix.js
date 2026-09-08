/* Self-checks for the adjacency matrix's hit testing — js/graph/matrix.js.

   The matrix is now edited in its own terms, so a click has to land on the cell that was
   DRAWN. Nothing here mocks a canvas: `hit` is given the same surface size the renderer would
   be, and every claim is that the point at the centre of a drawn cell resolves back to the
   thing drawn in it. If the two ever drift, clicking a cell puts an edge somewhere else.

   Read js/graph/editor.js for why this matters: the plane's hit testing used to answer for
   every view, so a click on the matrix dropped a node onto the plane at whatever position that
   pixel happened to be. */
(function () {
  'use strict';

  window.Check.suite('graphs — the adjacency matrix, clicked', function () {
    var C = window.Check, G = window.Graph, M = window.MatrixDraw;
    var s = { w: 640, h: 420 };

    var g = G();
    'ABCDE'.split('').forEach(function (l, i) { g.addNode(l, i / 5, 0.5); });
    g.addEdge(0, 1, 3);
    var view = g.view(), n = view.nodes.length;

    /* the geometry, worked out the way the renderer works it out — n+1 slots wide, because the
       last row and column are where a new node goes in */
    var head = 22, slots = n + 1;
    var cell = Math.max(12, Math.min(34, Math.min(s.w - head, s.h - head) / slots));
    var x0 = (s.w - (head + cell * slots)) / 2 + head;
    var y0 = (s.h - (head + cell * slots)) / 2 + head;
    function at(r, c) { return { x: x0 + cell * (c + 0.5), y: y0 + cell * (r + 0.5) }; }

    /* ── every cell resolves to the edge it stands for ── */
    var wrong = null;
    for (var r = 0; r < n && !wrong; r++) {
      for (var c = 0; c < n; c++) {
        var p = at(r, c), spot = M.hit(s, view, p.x, p.y);
        if (r === c) {
          if (!spot || spot.kind !== 'node' || spot.id !== view.nodes[r].id) wrong = r + ',' + c;
        } else if (!spot || spot.kind !== 'cell' ||
          spot.a !== view.nodes[r].id || spot.b !== view.nodes[c].id) wrong = r + ',' + c;
      }
    }
    C.ok(wrong === null, 'every cell resolves to the pair of nodes drawn in it', wrong);

    /* ── the headers are the node that owns the row and the column ── */
    C.equal(M.hit(s, view, x0 + cell * 2.5, y0 - head / 2), { kind: 'node', id: view.nodes[2].id },
      'the column head is the node that column belongs to');
    C.equal(M.hit(s, view, x0 - head / 2, y0 + cell * 3.5), { kind: 'node', id: view.nodes[3].id },
      'and the row head is the node that row belongs to');

    /* ── the add slot: the ruled row and column past the last node, and both its heads ── */
    C.equal(M.hit(s, view, at(n, 0).x, at(n, 0).y), { kind: 'add' }, 'the row past the last node adds one');
    C.equal(M.hit(s, view, at(0, n).x, at(0, n).y), { kind: 'add' }, 'so does the column past it');
    C.equal(M.hit(s, view, at(n, n).x, at(n, n).y), { kind: 'add' }, 'and the corner where they meet');
    C.equal(M.hit(s, view, x0 + cell * (n + 0.5), y0 - head / 2), { kind: 'add' },
      'the + at the head of that column adds one too');
    C.equal(M.hit(s, view, x0 - head / 2, y0 + cell * (n + 0.5)), { kind: 'add' },
      'and the + at the head of that row');

    /* ── off the grid is nothing, not a stray edge ── */
    C.equal(M.hit(s, view, 2, 2), null, 'a click outside the grid resolves to nothing');
    C.equal(M.hit(s, view, s.w - 2, s.h - 2), null, 'at either corner');

    /* ── an empty graph is all add slot: there is no grid yet to miss ── */
    C.equal(M.hit(s, G().view(), 5, 5), { kind: 'add' },
      'with no nodes at all, anywhere you click is where the first row and column go');

    /* ── the cell a click lands on is the cell the edge is IN ──
       A—B was added, so the two cells that stand for it must be the two the renderer fills. */
    var ab = M.hit(s, view, at(0, 1).x, at(0, 1).y);
    var ba = M.hit(s, view, at(1, 0).x, at(1, 0).y);
    C.ok(!!g.edge(ab.a, ab.b) && !!g.edge(ba.a, ba.b),
      'both cells of the one undirected edge resolve to that edge');
    C.equal(window.Graph.edgeKey(ab.a, ab.b), window.Graph.edgeKey(ba.a, ba.b),
      'and they are the same edge, not two — which is what makes the matrix symmetric');
  });
})();
