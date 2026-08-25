/* The graph, drawn. Plain script, one global `GraphDraw`.

   One renderer for the node plane and for anything else holding a Graph. It draws a FRAME:
   edges first, then nodes on top, each coloured by frame.roles — nodes keyed by id, edges by
   Graph.edgeKey. Weights are drawn on the edge only when there is room and only when the page
   says the graph is weighted, because an unweighted BFS with a 1 on every edge is noise. */
(function () {
  'use strict';
  var R = window.Roles;

  window.GraphDraw = {
    /* opts: { weighted, radius } */
    draw: function (s, frame, colours, opts) {
      if (!s || !frame || !frame.state) return;
      var g = frame.state, ctx = s.ctx;
      var pad = 28;
      var W = Math.max(1, s.w - pad * 2), H = Math.max(1, s.h - pad * 2);
      var r = (opts && opts.radius) || Math.max(11, Math.min(20, Math.min(W, H) / (g.nodes.length + 6)));
      var at = {};
      g.nodes.forEach(function (n) { at[n.id] = { x: pad + n.x * W, y: pad + n.y * H }; });

      g.edges.forEach(function (e) {
        var role = R.at(frame.roles, e.key, 'idle');
        var a = at[e.a], b = at[e.b];
        if (!a || !b) return;
        var lead = role !== 'idle';
        ctx.strokeStyle = lead ? colours[role] : colours.grid;
        ctx.lineWidth = lead ? 3.2 : 1.4;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        if (!(opts && opts.weighted)) return;
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ctx.font = '700 10px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var text = String(e.w);
        var half = ctx.measureText(text).width / 2 + 3;
        ctx.fillStyle = colours.paper;
        ctx.fillRect(mx - half, my - 7, half * 2, 14);
        ctx.fillStyle = lead ? colours[role] : colours['ink-soft'];
        ctx.fillText(text, mx, my);
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
