/* The graph, drawn. Plain script, one global `GraphDraw`.

   One renderer for the node plane and for anything else holding a Graph. It draws a FRAME:
   edges first, then nodes on top, each coloured by frame.roles — nodes keyed by id, edges by
   Graph.edgeKey. Weights are drawn on the edge only when there is room and only when the page
   says the graph is weighted, because an unweighted BFS with a 1 on every edge is noise.

   Edges are drawn in TWO passes and stop at the rim of the circles they join. Both of those are
   about the same complaint: a plane of nine nodes has edges crossing everywhere, and a single
   pass drew a highlighted route under whichever plain edge happened to come after it in the
   list, while an untrimmed line running into one node and out the far side reads as a line
   passing THROUGH it. A lead edge now gets a paper casing and is laid over the rest, so the
   route you are being shown is the one on top. */
(function () {
  'use strict';
  var R = window.Roles;

  window.GraphDraw = {
    /* A sentence centred on an empty stage — "there is nothing here and this is why". Every
       view on this page needs one and canvas has no line wrapping, so it lives here with the
       renderer the others are variations of rather than once per view. */
    note: function (s, colours, text) {
      var ctx = s.ctx;
      ctx.fillStyle = colours['ink-soft'];
      ctx.font = '500 13px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var max = Math.min(s.w - 60, 420), lines = [], line = '';
      text.split(' ').forEach(function (w) {
        if (line && ctx.measureText(line + ' ' + w).width > max) { lines.push(line); line = w; }
        else line = line ? line + ' ' + w : w;
      });
      lines.push(line);
      lines.forEach(function (l, i) {
        ctx.fillText(l, s.w / 2, s.h / 2 - (lines.length - 1) * 9.5 + i * 19);
      });
    },

    /* opts: { weighted, radius } */
    draw: function (s, frame, colours, opts) {
      if (!s || !frame || !frame.state) return;
      var g = frame.state, ctx = s.ctx;
      var pad = 28;
      var W = Math.max(1, s.w - pad * 2), H = Math.max(1, s.h - pad * 2);
      var r = (opts && opts.radius) || Math.max(11, Math.min(20, Math.min(W, H) / (g.nodes.length + 6)));
      var weighted = !!(opts && opts.weighted);
      var at = {};
      g.nodes.forEach(function (n) { at[n.id] = { x: pad + n.x * W, y: pad + n.y * H }; });

      /* Where an edge is actually drawn: from rim to rim, unless the two nodes are so close
         that trimming would leave nothing, in which case it runs the whole way and the circles
         cover it. `m` is the true midpoint either way — the weight belongs between the nodes,
         not between the two ends of a shortened line. */
      function span(e) {
        var a = at[e.a], b = at[e.b];
        if (!a || !b) return null;
        var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
        var t = len > r * 2 + 6 ? (r + 1) / len : 0;
        return {
          ax: a.x + dx * t, ay: a.y + dy * t, bx: b.x - dx * t, by: b.y - dy * t,
          mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2,
        };
      }

      function line(p, colour, width) {
        ctx.strokeStyle = colour;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(p.ax, p.ay);
        ctx.lineTo(p.bx, p.by);
        ctx.stroke();
      }

      function weight(p, e, colour) {
        if (!weighted) return;
        ctx.font = '700 10px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var text = String(e.w);
        var half = ctx.measureText(text).width / 2 + 3;
        ctx.fillStyle = colours.paper;
        ctx.fillRect(p.mx - half, p.my - 7, half * 2, 14);
        ctx.fillStyle = colour;
        ctx.fillText(text, p.mx, p.my);
      }

      /* Plain edges first — `ink-faint` and not `grid`, which is a ten-percent wash meant for
         ruled lines behind a chart and disappears the moment it is the thing you are tracing. */
      var lead = [];
      ctx.lineCap = 'round';
      g.edges.forEach(function (e) {
        var role = R.at(frame.roles, e.key, 'idle');
        var p = span(e);
        if (!p) return;
        if (role !== 'idle') { lead.push([p, e, role]); return; }
        line(p, colours['ink-faint'], 1.5);
        weight(p, e, colours['ink-soft']);
      });
      lead.forEach(function (it) {
        line(it[0], colours.paper, 7);              // the casing that puts this edge on top
        line(it[0], colours[it[2]], 3.2);
        weight(it[0], it[1], colours[it[2]]);
      });

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 ' + Math.round(r * 0.85) + 'px ui-sans-serif, system-ui, sans-serif';
      g.nodes.forEach(function (n) {
        var role = R.at(frame.roles, n.id, 'idle');
        var c = colours[role];
        var p = at[n.id];
        ctx.fillStyle = window.Palette.mix(c, role === 'idle' ? 10 : 22, colours.paper);
        ctx.strokeStyle = c;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = colours.ink;
        ctx.fillText(n.label, p.x, p.y + 0.5);
      });
    },

    /* Which node is under a point on the stage? The editor needs the same geometry the drawing
       used, so it lives here rather than being worked out a second time in the page. */
    hit: function (s, view, px, py, radius) {
      var pad = 28, W = Math.max(1, s.w - pad * 2), H = Math.max(1, s.h - pad * 2);
      var r = radius || Math.max(11, Math.min(20, Math.min(W, H) / (view.nodes.length + 6)));
      for (var i = view.nodes.length - 1; i >= 0; i--) {
        var n = view.nodes[i];
        if (Math.hypot(pad + n.x * W - px, pad + n.y * H - py) <= r + 3) return n.id;
      }
      return null;
    },
    /* the inverse: a point on the stage as a position in the unit square */
    place: function (s, px, py) {
      var pad = 28, W = Math.max(1, s.w - pad * 2), H = Math.max(1, s.h - pad * 2);
      return {
        x: Math.min(1, Math.max(0, (px - pad) / W)),
        y: Math.min(1, Math.max(0, (py - pad) / H)),
      };
    },
  };
})();
