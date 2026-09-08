/* Building a graph with the pointer. Plain script, one global `GraphEditor`.

   Two tools, chosen in the rail:
     build   click empty space to add a node · click one node then another to add or remove the
             edge between them · drag a node to move it
     erase   click a node to delete it and everything attached to it

   **The pointer means what the VIEW means.** One canvas carries four drawings and a click is
   an act on the one in front of you, not on the plane underneath it: on the plane it is a
   position, on the adjacency matrix it is a row and a column, and on a marking view it is
   nothing at all — a marking is an answer being written out and there is nothing there to
   edit. Everything went through the plane's hit testing before, so clicking a cell of the
   matrix, or the marking table's empty margin, dropped a node onto the plane at whatever
   position that pixel happened to be.

   It reads the geometry back from js/graph/draw.js and js/graph/matrix.js rather than working
   the positions out a second time, so what you click is exactly what was drawn — the old
   version computed hit testing separately and drifted from the renderer whenever the canvas
   was resized. */
(function () {
  'use strict';

  var MOVED = 5;                     // px of travel that turns a click into a drag

  window.GraphEditor = function (canvas, o) {
    var down = null, dragging = false, pending = null;

    function point(e) {
      var box = canvas.getBoundingClientRect();
      return { x: e.clientX - box.left, y: e.clientY - box.top };
    }
    function hit(p) { return window.GraphDraw.hit(o.surface(), o.view(), p.x, p.y); }
    function plane() { return o.mode() === 'plane'; }
    function matrix() { return o.mode() === 'matrix'; }

    canvas.addEventListener('pointerdown', function (e) {
      if (!plane() && !matrix()) return;
      var p = point(e);
      down = { p: p, id: plane() ? hit(p) : null };
      dragging = false;
      if (down.id != null) canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', function (e) {
      if (!down || down.id == null || o.tool() !== 'build' || !plane()) return;
      var p = point(e);
      if (!dragging && Math.hypot(p.x - down.p.x, p.y - down.p.y) < MOVED) return;
      dragging = true;
      var at = window.GraphDraw.place(o.surface(), p.x, p.y);
      o.graph().moveNode(down.id, at.x, at.y);
      o.repaint();
    });

    canvas.addEventListener('pointerup', function (e) {
      if (!down) return;
      var start = down, p = point(e);
      down = null;
      if (dragging) { dragging = false; o.commit('Moved a node. The layout has no effect on any of the algorithms — only the edges do.'); return; }
      if (matrix()) { return cell(p); }

      var id = start.id != null ? start.id : hit(p);
      var g = o.graph();

      if (o.tool() === 'erase') {
        if (id == null) return;
        g.removeNode(id);
        pending = null;
        o.commit('Deleted a node and every edge attached to it.');
        return;
      }

      if (id == null) {
        var at = window.GraphDraw.place(o.surface(), p.x, p.y);
        var made = g.addNode(o.nextLabel(), at.x, at.y);
        pending = null;
        o.commit('Added node ' + g.node(made).label + '. It has no edges yet, so no algorithm can reach it.');
        return;
      }

      if (pending == null) { pending = id; o.select(id); return; }
      if (pending === id) { pending = null; o.select(null); return; }

      var existing = g.edge(pending, id);
      var a = g.node(pending).label, b = g.node(id).label;
      if (existing) { g.removeEdge(pending, id); o.commit('Removed the edge ' + a + '–' + b + '.'); }
      else { g.addEdge(pending, id, o.weight()); o.commit('Connected ' + a + ' to ' + b + ' with weight ' + o.weight() + '.'); }
      pending = null;
    });

    /* The matrix, edited in the matrix's own terms. There is no pending-node dance here: a cell
       already names both ends of its edge, which is the one thing the plane cannot do in a
       single click. */
    function cell(p) {
      var g = o.graph(), spot = window.MatrixDraw.hit(o.surface(), o.view(), p.x, p.y);
      if (!spot) return;
      pending = null;

      if (spot.kind === 'add') {
        var at = o.nextSpot();
        var made = g.addNode(o.nextLabel(), at.x, at.y);
        o.commit('Added node ' + g.node(made).label + ' — a row and a column, both empty.');
        return;
      }
      if (spot.kind === 'node') {
        if (o.tool() !== 'erase') return;
        var gone = g.node(spot.id).label;
        g.removeNode(spot.id);
        o.commit('Deleted ' + gone + ', and with it a whole row and a whole column.');
        return;
      }

      var a = g.node(spot.a).label, b = g.node(spot.b).label;
      if (g.edge(spot.a, spot.b)) {
        g.removeEdge(spot.a, spot.b);
        o.commit('Cleared ' + a + '–' + b + '. An undirected edge is TWO cells, so the mirror ' +
          'image of this one emptied with it.');
      } else if (o.tool() !== 'erase') {
        g.addEdge(spot.a, spot.b, o.weight());
        o.commit('Filled in ' + a + '–' + b + ' with weight ' + o.weight() + ' — and its mirror ' +
          'image below the diagonal, because the edge has no direction.');
      }
    }

    return {
      selected: function () { return pending; },
      clear: function () { pending = null; },
    };
  };
})();
