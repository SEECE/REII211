/* The BFS level tree, drawn. Plain script, one global `LevelDraw`. The model it renders is
   js/graph/levels.js — read that first.

   Rows top down, L0 at the top, level labels in a gutter down the right-hand edge. The layout
   is computed from the WHOLE tree and only the first `shown` nodes are painted, so a node lands
   where it will stay and the drawing never reflows under the run. That is a deliberate
   difference from the marking table, which hides its unwritten columns outright: a tree that
   re-laid itself every time a node appeared would be unreadable to watch.

   Colours come from the frame, exactly as on the plane — a node the run has focused is focused
   here too, and the route BFS reports at the end lights up along the tree edges because they
   are keyed by Graph.edgeKey like every other edge on the site. */
(function () {
  'use strict';
  var R = window.Roles;

  function note(s, colours, text) {
    var ctx = s.ctx;
    ctx.fillStyle = colours['ink-soft'];
    ctx.font = '500 13px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var words = text.split(' '), line = '', y = s.h / 2 - 10;
    var max = Math.min(s.w - 60, 420);
    words.forEach(function (w) {
      if (ctx.measureText(line + ' ' + w).width > max && line) {
        ctx.fillText(line, s.w / 2, y);
        y += 19;
        line = w;
      } else line = line ? line + ' ' + w : w;
    });
    ctx.fillText(line, s.w / 2, y);
  }

  window.LevelDraw = {
    /* opts: { model, step, cross } — the tree, where the run is standing in it, and whether to
       draw the edges the walk never took */
    draw: function (s, frame, colours, opts) {
      if (!s || !frame) return;
      var model = opts && opts.model;
      if (!model) {
        /* Only reachable now with nothing to draw at all — the rail hands this view the BFS
           run and no other, so a missing tree means a missing graph. */
        note(s, colours, 'There is no graph to walk yet. Put some nodes on the plane and the ' +
          'queue will build the level tree one ring at a time.');
        return;
      }
      var ctx = s.ctx;
      var step = (opts && opts.step) || model.at[0];
      var shown = step.shown;

      var gutter = 30, pad = 22;
      var W = Math.max(1, s.w - pad * 2 - gutter), H = Math.max(1, s.h - pad * 2);
      var rowH = H / model.levels;
      var widest = model.rows.reduce(function (m, r) { return Math.max(m, r.length); }, 1);
      var r = Math.max(8, Math.min(20, rowH / 2.8, W / (widest * 2.6)));

      var at = [];
      model.rows.forEach(function (row, level) {
        var y = pad + rowH * (level + 0.5);
        row.forEach(function (i, j) {
          at[i] = { x: pad + W * (j + 0.5) / row.length, y: y };
        });
      });

      /* the rows first, so everything else sits on top of them */
      ctx.textBaseline = 'middle';
      ctx.font = '700 11px ui-monospace, SFMono-Regular, monospace';
      model.rows.forEach(function (row, level) {
        var y = pad + rowH * (level + 0.5);
        ctx.strokeStyle = colours.grid;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(pad, y);
        ctx.lineTo(s.w - pad, y);
        ctx.stroke();
        ctx.fillStyle = colours['ink-soft'];
        ctx.textAlign = 'right';
        ctx.fillText('L' + level, s.w - pad + 4, y);
      });

      function stroke(a, b, colour, width, dash) {
        var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
        var t = len > r * 2 + 6 ? (r + 1) / len : 0;
        ctx.strokeStyle = colour;
        ctx.lineWidth = width;
        ctx.setLineDash(dash || []);
        ctx.beginPath();
        ctx.moveTo(a.x + dx * t, a.y + dy * t);
        ctx.lineTo(b.x - dx * t, b.y - dy * t);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      /* the edges the walk never took, under everything — off unless the page asks */
      if (opts && opts.cross) {
        model.cross.forEach(function (e) {
          var a = model.index[e.a], b = model.index[e.b];
          if (a == null || b == null || a >= shown || b >= shown) return;
          stroke(at[a], at[b], colours['ink-faint'], 1.3, [3, 4]);
        });
      }

      var lead = [];
      model.nodes.forEach(function (n, i) {
        if (i >= shown || n.parent == null) return;
        var p = model.index[n.parent];
        var role = R.at(frame.roles, window.Graph.edgeKey(n.id, n.parent), 'idle');
        if (role !== 'idle') { lead.push([at[p], at[i], role]); return; }
        stroke(at[p], at[i], colours['ink-faint'], 1.8);
      });
      lead.forEach(function (it) {
        stroke(it[0], it[1], colours.paper, 6.5);       // the casing that puts this edge on top
        stroke(it[0], it[1], colours[it[2]], 3);
      });

      ctx.textAlign = 'center';
      ctx.font = '700 ' + Math.round(r * 0.85) + 'px ui-sans-serif, system-ui, sans-serif';
      var isFresh = {};
      step.fresh.forEach(function (id) { isFresh[id] = true; });
      model.nodes.forEach(function (n, i) {
        if (i >= shown) return;
        var role = R.at(frame.roles, n.id, 'idle');
        var c = colours[role], p = at[i];
        ctx.fillStyle = window.Palette.mix(c, role === 'idle' ? 10 : 22, colours.paper);
        ctx.strokeStyle = c;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        /* a node placed on THIS beat gets a halo: the point of the drawing is watching a level
           fill in, and a colour alone does not say "this one is new to the paper" */
        if (isFresh[n.id]) {
          ctx.strokeStyle = colours[role === 'idle' ? 'move' : role];
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = colours.ink;
        ctx.fillText(n.label, p.x, p.y + 0.5);
      });
    },
  };
})();
