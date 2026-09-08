/* The DFS backtrack trace, drawn. Plain script, one global `BacktrackDraw`. The model it
   renders is js/graph/backtrack.js — read that first.

   A row is a DEPTH and the levels are named down the right-hand edge, the way the level tree
   names them — a node sits one row under the node it hangs off, so two children of one node are
   level with each other however long the walk spent between them. A column is one unbroken
   descent; every new branch starts a column one step to the RIGHT, so the width of the drawing
   is the number of times the walk ran out of road.

   The visit number rides on each node rather than in the right-hand gutter, because a row is no
   longer one visit. Reading the columns left to right, each top to bottom, gives the same
   order — the numbers are there so nobody has to.

   Retreats go LEFT, into a gutter of their own, and they never share a line with the branch
   they lead to — which they did when each was routed through the half-column beside its own
   dead end, and it made the two directions of the drawing impossible to tell apart.

   Solid lines are edges the walk travelled along. A retreat is dashed, because it is not an
   edge and the walk did not cross it. It is drawn NODE BY NODE — a stub and an arrowhead into
   every node between the dead end and where the walk carries on, since "it went back four" is
   the thing being shown — while one unbroken spine down the gutter says those hops are a single
   retreat and not four separate ones. Two retreats whose rows overlap get different lanes
   (js/graph/backtrack.js works out which), so a spine is always one occasion.

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
      /* the retreat gutter, sized to the lanes it has to hold but never taking more than a
         fifth of the drawing away from the thing it is annotating */
      /* Retreats overlap far more often now that a row is a depth, so the gutter has to hold
         more lanes — but never more than a slice of the drawing it is annotating. */
      var laneW = model.lanes ? Math.max(5, Math.min(18, s.w * 0.28 / model.lanes)) : 0;
      var left = model.lanes ? model.lanes * laneW + 6 : 0;
      var W = Math.max(1, s.w - pad * 2 - gutter - left), H = Math.max(1, s.h - pad * 2);
      var colW = W / model.cols, rowH = H / model.rows;
      var r = Math.max(6, Math.min(18, rowH / 2.6, colW / 2.8));
      // lane 0 sits nearest the nodes, so the common shallow retreat keeps the shortest stubs
      function laneX(l) { return pad + left - (l + 0.5) * laneW; }

      var at = model.seq.map(function (n) {
        return { x: pad + left + colW * (n.col + 0.5), y: pad + rowH * (n.row + 0.5) };
      });

      /* the levels first, so everything else sits over them */
      ctx.textBaseline = 'middle';
      ctx.font = '700 11px ui-monospace, SFMono-Regular, monospace';
      for (var row = 0; row < model.rows; row++) {
        var y = pad + rowH * (row + 0.5);
        ctx.strokeStyle = colours.grid;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(pad + left, y);
        ctx.lineTo(s.w - pad, y);
        ctx.stroke();
        ctx.fillStyle = colours['ink-soft'];
        ctx.textAlign = 'right';
        ctx.fillText('L' + row, s.w - pad + 4, y);
      }

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

      /* the retreats — one spine per occasion, one arrowhead per node it goes back through */
      ctx.strokeStyle = colours.reject;
      ctx.fillStyle = colours.reject;
      model.seq.forEach(function (n, i) {
        if (i >= shown || !n.back) return;
        var lane = laneX(n.back.lane);
        var via = n.back.via.map(function (id) { return at[model.index[id]]; });
        var d = via[0];

        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(d.x - r - 1, d.y);            // out of the dead end, into the gutter
        ctx.lineTo(lane, d.y);
        ctx.lineTo(lane, via[via.length - 1].y); // the spine: all of this is one retreat
        ctx.stroke();

        for (var k = 1; k < via.length; k++) {   // and back in to every node on the way up
          ctx.beginPath();
          ctx.moveTo(lane, via[k].y);
          ctx.lineTo(via[k].x - r - 4, via[k].y);
          ctx.stroke();
          head(via[k].x - r - 3, via[k].y);
        }
        ctx.setLineDash([]);
        ctx.beginPath();                         // a dot where the retreat starts
        ctx.arc(lane, d.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      function head(x, y) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 6, y - 3.5);
        ctx.lineTo(x - 6, y + 3.5);
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

      /* the visit number, riding on the node — a row is a depth now, so the order is the one
         thing the position no longer says on its own */
      ctx.font = '700 9px ui-monospace, SFMono-Regular, monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = colours['ink-soft'];
      model.seq.forEach(function (n, i) {
        if (i < shown) ctx.fillText(String(i + 1), at[i].x + r * 0.75, at[i].y - r * 0.8);
      });
    },
  };
})();
