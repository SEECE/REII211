/* The plane, as LaTeX — `Latex.plane`, added onto the global js/io/latex.js defines.

   The node plane and the point plane are the same picture: things at positions in the unit
   square, with some of the segments between them drawn in. One emitter serves both, because the
   only difference is whether the segments came from a graph's edges or from the role keys a
   heuristic left behind.

   Two decisions are the whole of this file.

   **The coordinates are on the page.** A figure handed in has to be readable off the paper, so
   the unit square is written out as a ruled 0–100 grid with both axes ticked, and every node
   carries its own (x, y) beside it. The drawn position is the ROUNDED one — the dot sits exactly
   where the printed pair says it does, because a figure whose label disagrees with its own
   picture by half a millimetre is a figure a student cannot mark against.

   **y is measured downward**, as it is on the screen the figure came off. Flipping it would
   make every exported picture a mirror image of the page it was exported from, which is a worse
   surprise than an axis that counts down; the caption says so in as many words. */
(function () {
  'use strict';

  var SIZE = 100;                 // the unit square, drawn as a 100 mm square of 0–100 units

  /* Where a node's (x, y) goes. Eight compass points around the disc; the candidate that
     collides with the least — other nodes, the edges, the labels already placed, the edge of
     the plot — wins. This is the readability of the whole figure, and it is a greedy pass in a
     fixed order, so the same plane always exports the same picture. */
  var DIRS = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];

  function overlap(a, b) {
    var ox = a.hw + b.hw - Math.abs(a.x - b.x), oy = a.hh + b.hh - Math.abs(a.y - b.y);
    return ox > 0 && oy > 0 ? ox * oy : 0;
  }

  /* How far a point is from a box — 0 when it is inside it. */
  function gap(box, px, py) {
    var dx = Math.max(0, Math.abs(px - box.x) - box.hw);
    var dy = Math.max(0, Math.abs(py - box.y) - box.hh);
    return Math.hypot(dx, dy);
  }

  function cost(box, self, nodes, segs, at, r, placed) {
    var sum = 0;
    /* off the plot: the ticks and their numbers live out there */
    sum += 6 * (Math.max(0, box.hw - box.x) + Math.max(0, box.x + box.hw - SIZE) +
      Math.max(0, box.hh - box.y) + Math.max(0, box.y + box.hh - SIZE));
    nodes.forEach(function (n) {
      var d = gap(box, at[n.id].x, at[n.id].y);
      // its own disc is the one it is being placed against, so it counts like any other
      if (d < r + 1) sum += (n.id === self ? 12 : 40) * (r + 1 - d);
    });
    placed.forEach(function (p) { sum += 30 * overlap(box, p); });
    /* a label lying along an edge is the case that makes a dense plane unreadable, and the
       node's OWN edges are the worst of them — so every segment is sampled, not just the far
       ones. Ten samples is enough at this scale and costs nothing at forty nodes. */
    segs.forEach(function (s) {
      for (var i = 0; i <= 10; i++) {
        var t = i / 10;
        if (gap(box, s.ax + (s.bx - s.ax) * t, s.ay + (s.by - s.ay) * t) < 0.8) sum += 5;
      }
    });
    return sum;
  }

  function place(nodes, segs, at, r) {
    var out = {}, placed = [];
    nodes.forEach(function (n) {
      var p = at[n.id], text = '(' + p.x + ', ' + p.y + ')';
      var hw = text.length * 0.48 + 0.5, hh = 1.6, best = null;
      DIRS.forEach(function (d, i) {
        var len = Math.hypot(d[0], d[1]), ux = d[0] / len, uy = d[1] / len;
        // clear of the disc along the direction, then half the box again — so a diagonal
        // label hugs the corner instead of being flung out by the width it does not need
        var box = { hw: hw, hh: hh,
          x: p.x + ux * (r + 1.2) + Math.sign(ux) * hw,
          y: p.y + uy * (r + 1.2) + Math.sign(uy) * hh };
        // a hair of preference for the first direction, so ties break the same way every time
        var c = cost(box, n.id, nodes, segs, at, r, placed) + i * 0.01;
        if (!best || c < best.c) best = { c: c, box: box };
      });
      placed.push(best.box);
      out[n.id] = { x: best.box.x, y: best.box.y, text: '$(' + p.x + ',\\,' + p.y + ')$' };
    });
    return out;
  }

  /* Both rules and both scales are written out line by line rather than with tikz's `grid`:
     the y unit vector here is NEGATIVE, and `grid` quietly draws only the vertical rules when
     it is — a plot with half its gridlines missing and no error anywhere. */
  function axes() {
    var out = ['  % the unit square as 0-100, ruled and ticked both ways; y counts DOWN'];
    for (var t = 0; t <= SIZE; t += 10) {
      out.push('  \\draw[ruling] (' + t + ',0) -- (' + t + ',' + SIZE + ')' +
        ' (0,' + t + ') -- (' + SIZE + ',' + t + ');');
      out.push('  \\node[above, font=\\tiny, text=black!70] at (' + t + ',0) {' + t + '};');
      out.push('  \\node[left, font=\\tiny, text=black!70] at (0,' + t + ') {' + t + '};');
    }
    out.push('  \\draw[black!45, line width=0.4pt] (0,0) rectangle (' + SIZE + ',' + SIZE + ');');
    out.push('  \\draw[-{Stealth[length=2mm]}, black!55] (0,0) -- (' + (SIZE + 9) +
      ',0) node[right, font=\\footnotesize, text=black] {$x$};');
    out.push('  \\draw[-{Stealth[length=2mm]}, black!55] (0,0) -- (0,' + (SIZE + 7) +
      ') node[below, font=\\footnotesize, text=black] {$y$};');
    return out;
  }

  /* spec: { nodes, edges, chosen, weighted, title } — nodes and edges exactly as a subject's
     view() states them, `chosen` the set of edge keys the run picked (Latex.chosen) or null for
     the bare problem. */
  window.Latex.plane = function (o) {
    var L = window.Latex, nodes = o.nodes || [], edges = o.edges || [], won = o.chosen || null;
    var at = {};
    nodes.forEach(function (n) {
      at[n.id] = { x: Math.round(n.x * SIZE), y: Math.round(n.y * SIZE) };
    });
    var segs = edges.filter(function (e) { return at[e.a] && at[e.b]; }).map(function (e) {
      return { ax: at[e.a].x, ay: at[e.a].y, bx: at[e.b].x, by: at[e.b].y, e: e,
        lead: !!(won && won[e.key]) };
    });
    var r = Math.max(2.8, Math.min(4.6, 26 / Math.sqrt(nodes.length + 4)));
    var font = r >= 4 ? '\\small' : r >= 3.3 ? '\\scriptsize' : '\\tiny';
    var spots = place(nodes, segs, at, r);
    var body = [];

    /* the plain segments first and the chosen ones over them: the route being shown has to be
       the line on top, which is the same two passes js/graph/draw.js makes */
    body.push('  % edges, plain ones first so a chosen route is never drawn under one');
    [false, true].forEach(function (pass) {
      segs.forEach(function (s) {
        if (s.lead !== pass) return;
        body.push('  \\draw[' + (s.lead ? 'lead' : 'link') + '] (' + s.ax + ',' + s.ay +
          ') -- (' + s.bx + ',' + s.by + ');');
      });
    });
    if (o.weighted) {
      segs.forEach(function (s) {
        if (s.e.w == null) return;
        body.push('  \\node[fill=white, inner sep=0.7pt, font=\\tiny] at (' +
          L.num((s.ax + s.bx) / 2) + ',' + L.num((s.ay + s.by) / 2) + ') {' + L.esc(s.e.w) + '};');
      });
    }
    body.push('  % the discs, then each one\'s own coordinates beside it');
    nodes.forEach(function (n) {
      var p = at[n.id];
      body.push('  \\filldraw[disc] (' + p.x + ',' + p.y + ') circle (' + L.num(r) + ');');
      body.push('  \\node[font=' + font + '\\bfseries] at (' + p.x + ',' + p.y + ') {' +
        L.esc(n.label) + '};');
      body.push('  \\node[font=\\tiny, text=black!80] at (' + L.num(spots[n.id].x) + ',' +
        L.num(spots[n.id].y) + ') {' + spots[n.id].text + '};');
    });

    var title = o.title || 'Plane';
    var note = 'Positions are the unit square scaled to 0--100; $y$ is measured downward, ' +
      'as the page draws it.' + (won ? ' The heavy lines are the answer the run ended on.' : '');
    return L.document({
      title: title,
      body: L.open().concat(axes(), body,
        ['  \\node[font=\\bfseries\\small] at (' + SIZE / 2 + ',-8) {' + L.esc(title) + '};',
         /* `text width` and not a bare node: the caption is one long line, and a node that
            wide stretches the picture's bounding box — which \resizebox then shrinks the whole
            plot to fit, so a sentence at the bottom decides how big the figure is. */
         '  \\node[right, text width=' + (SIZE + 8) + 'mm, align=left, font=\\tiny, ' +
           'text=black!70] at (0,' + (SIZE + 17) + ') {' + note + '};'],
        ['\\end{tikzpicture}']),
    });
  };
})();
