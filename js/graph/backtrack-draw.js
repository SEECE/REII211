/* The DFS backtrack trace, drawn. Plain script, one global `BacktrackDraw`. The model it
   renders is js/graph/backtrack.js — read that first.

   One row per visit, top to bottom, so the vertical position IS the order. A column is one
   unbroken descent; every jump back starts a new column one step to the right, so the width of
   the drawing is the number of times the walk ran out of road. The visit number is in a gutter
   down the right-hand edge, the way the level tree puts L0/L1 there.

   Solid lines are edges the walk travelled along. The dashed arrow is the jump BACK — it is not
   an edge and the walk did not cross it, so it must not look like one. It is routed
   orthogonally through the half-column of empty space to the left of the dead end, which is
   clear of every node by construction: there is exactly one node per row, and a node in that
   column sits on the column centre, half a column further right.

   Colours come from the frame, exactly as on the plane. */
(function () {
  'use strict';
  var R = window.Roles;

  window.BacktrackDraw = {
    /* opts: { model, step, cross } — the trace, where the run is standing in it, and whether to
       draw the edges the walk never travelled */
    draw: function (s, frame, colours, opts) {
      if (!s || !frame) return;
      var model = opts && opts.model;
      if (!model) {
        window.GraphDraw.note(s, colours, 'There is no graph to walk yet. Put some nodes on ' +
          'the plane and the stack will run this down the page one visit at a time.');
        return;
      }
      var ctx = s.ctx;
      var step = (opts && opts.step) || model.at[0];
      var shown = step.shown;

      var gutter = 30, pad = 22;
      var W = Math.max(1, s.w - pad * 2 - gutter), H = Math.max(1, s.h - pad * 2);
      var colW = W / model.cols, rowH = H / model.seq.length;
      var r = Math.max(7, Math.min(18, rowH / 2.6, colW / 2.8));

      var at = model.seq.map(function (n) {
        return { x: pad + colW * (n.col + 0.5), y: pad + rowH * (n.row + 0.5) };
      });

      /* the visit numbers first, so everything else sits over them */
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      ctx.font = '700 10px ui-monospace, SFMono-Regular, monospace';
      model.seq.forEach(function (n, i) {
        if (i >= shown) return;
        ctx.fillStyle = colours['ink-soft'];
        ctx.fillText(String(i + 1), s.w - pad + 4, at[i].y);
      });

      function trim(a, b) {                     // b, pulled back to the rim of its circle
        var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
        return { x: b.x - dx * (r + 1) / len, y: b.y - dy * (r + 1) / len };
      }

      /* the edges the walk never travelled, under everything — off unless the page asks */
      if (opts && opts.cross) {
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 1.3;
        ctx.strokeStyle = colours['ink-faint'];
        model.cross.forEach(function (e) {
          var a = model.index[e.a], b = model.index[e.b];
          if (a == null || b == null || a >= shown || b >= shown) return;
          var p = trim(at[b], at[a]), q = trim(at[a], at[b]);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }

      /* the descents. A step right is drawn as an elbow — out to the new column, then down —
         so the split reads as a split and not as a diagonal cutting across the rows. */
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      model.seq.forEach(function (n, i) {
        if (i >= shown || n.from == null) return;
        var p = at[model.index[n.from]], q = at[i];
        var role = R.at(frame.roles, window.Graph.edgeKey(n.id, n.from), 'idle');
        ctx.strokeStyle = role === 'idle' ? colours['ink-faint'] : colours[role];
        ctx.lineWidth = role === 'idle' ? 1.8 : 3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + (p.x === q.x ? r + 1 : 0));
        if (p.x !== q.x) ctx.lineTo(q.x, p.y);
        ctx.lineTo(q.x, q.y - r - 1);
        ctx.stroke();
      });

      /* the jumps back — dashed, arrowed, and routed clear of every node */
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = colours.reject;
      ctx.fillStyle = colours.reject;
      model.seq.forEach(function (n, i) {
        if (i >= shown || !n.back) return;
        var d = at[model.index[n.back.from]], t = at[model.index[n.back.to]];
        var lane = d.x - colW * 0.5;
        ctx.beginPath();
        ctx.moveTo(d.x - r - 1, d.y);
        ctx.lineTo(lane, d.y);
        ctx.lineTo(lane, t.y);
        ctx.lineTo(t.x + (t.x > lane ? -r - 4 : r + 4), t.y);
        ctx.stroke();
        head(t.x + (t.x > lane ? -r - 3 : r + 3), t.y, t.x > lane ? 1 : -1);
      });
      ctx.setLineDash([]);

      function head(x, y, dir) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - dir * 6, y - 3.5);
        ctx.lineTo(x - dir * 6, y + 3.5);
        ctx.closePath();
        ctx.fill();
      }

      ctx.textAlign = 'center';
      ctx.font = '700 ' + Math.round(r * 0.9) + 'px ui-sans-serif, system-ui, sans-serif';
      model.seq.forEach(function (n, i) {
        if (i >= shown) return;
        var role = R.at(frame.roles, n.id, 'idle'), c = colours[role], p = at[i];
        ctx.fillStyle = window.Palette.mix(c, role === 'idle' ? 10 : 22, colours.paper);
        ctx.strokeStyle = c;
        ctx.lineWidth = 2.2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        /* a node the walk could not go anywhere new from. The ring is only drawn once the run
           has actually got past it — a node is not a dead end because the finished trace says
           so, it is a dead end because the walk stopped there. */
        if (n.dead && i < shown - 1) {
          ctx.strokeStyle = colours.reject;
          ctx.lineWidth = 1.3;
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.fillStyle = colours.ink;
        ctx.fillText(n.label, p.x, p.y + 0.5);
      });
    },
  };
})();
