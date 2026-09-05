/* The city, drawn. Plain script, one global `CityDraw`.

   A street map, not a node diagram: light blocks, dark streets ruled between the crossings, and
   nothing else on the page. Drawing the STREETS rather than the nodes is what makes the rest
   fall out for free.

     · a CLOSED street is a line that is not there, and the two blocks read as one
     · the PARK has no crossings, so nothing is ruled across it and no block is filled there
     · a crossing is where two lines meet and needs no mark of its own

   Nothing here is black or white literally — it is `ink` on `paper` from css/tokens.css, so the
   map reskins with the rest of the site and reads the same in either theme.

   Street width is the only thing drawn from a weight: a street's width is its length divided by
   what it costs, against the best ratio on the map. On a map priced in metres every street comes
   out the same width, and on one priced in time the jammed ones narrow — with no extra field
   anywhere, because the view already carries both numbers.

   **What it does not draw.** The whole island is resident and nineteen thousand blocks will not
   fit through a canvas at island zoom — laid end to end they are about two thirds of the ink
   the island's own footprint has room for, so it comes out as a solid smudge. Two filters, both
   purely about the drawing and neither touching the graph:

     · CULLING — a street with both ends outside the frame is skipped. That is what makes a
       zoomed-in view cost what a zoomed-in view should cost rather than what the island costs.
     · THINNING — when a pixel is worth many metres, the residential mesh is dropped and the
       avenues are left, the way a real map does it. It is by street CLASS and not by length,
       because dropping short streets deletes the dense parts of the grid, which are the parts
       worth recognising.

   A street an algorithm is talking about is drawn at any zoom whatever either filter says: the
   route is the answer, and an answer you have to zoom in to see is not one. */
(function () {
  'use strict';
  var R = window.Roles;

  /* How major a street is, and how coarse the drawing has to get before it is dropped. The
     numbers are metres per pixel; the whole island on a laptop stage is about 35. */
  var RANK = { motorway: 0, trunk: 0, primary: 0, secondary: 1, tertiary: 2 };
  var SHOWN = [20, 9, 4];           // above 20 m/px rank 0 only, above 9 rank ≤1, above 4 rank ≤2

  function allowance(mpp) {
    for (var i = 0; i < SHOWN.length; i++) if (mpp > SHOWN[i]) return i;
    return 9;
  }

  function step(list) {
    var min = Infinity;
    for (var i = 1; i < list.length; i++) min = Math.min(min, list[i] - list[i - 1]);
    return min === Infinity ? 1 : min;
  }

  /* Worked out once per view, not once per frame: the crossings by id, and the best
     length-for-cost ratio on the map, which is what every street's width is measured against.
     A view() is shared by every frame of a run, so this runs once per run. */
  var memo = null, memoFor = null;
  function about(view) {
    if (memoFor === view) return memo;
    var by = {}, best = 0;
    view.nodes.forEach(function (n) { by[n.id] = n; });
    view.edges.forEach(function (e) {
      var p = by[e.a], q = by[e.b];
      if (p && q) best = Math.max(best, Math.hypot(q.x - p.x, q.y - p.y) / (e.w || 1));
    });
    memoFor = view;
    memo = { by: by, best: best };
    return memo;
  }

  window.CityDraw = {
    /* opts: { cam, from, to, blocks, cls, span, held } — the pins and the viewport are the
       page's state and not the trace's. `held` is a pin mid-drag, drawn under the cursor. */
    draw: function (s, frame, colours, opts) {
      if (!s || !frame || !frame.state || !frame.state.nodes.length) return;
      var view = frame.state, ctx = s.ctx, o = opts || {};
      var geo = o.cam.geometry(s, view), me = about(view), by = me.by;
      var lim = geo.bounds(60), cls = o.cls || {};
      var gap = 1;

      if (o.blocks) gap = blocks(ctx, colours, view, geo);
      var road = Math.max(1, Math.min(9, (o.blocks ? gap : geo.k * 0.004) * 0.24));
      var rank = allowance(geo.metresPerPixel(o.span));

      /* Every open street first, then the ones an algorithm is talking about — two passes,
         because a street ruled later would otherwise paint over the end of a coloured one they
         share a crossing with, and a route would come back nibbled. */
      ctx.lineCap = 'round';
      var live = [], width = {};
      view.edges.forEach(function (e) {
        var p = by[e.a], q = by[e.b];
        if (!p || !q) return;
        var role = R.at(frame.roles, e.key, 'idle');
        if (role === 'idle') {
          if ((RANK[cls[e.key]] == null ? 3 : RANK[cls[e.key]]) > rank) return;
          if (Math.max(p.x, q.x) < lim.x0 || Math.min(p.x, q.x) > lim.x1) return;
          if (Math.max(p.y, q.y) < lim.y0 || Math.min(p.y, q.y) > lim.y1) return;
        }
        live.push({ e: e, role: role, p: geo.at(p), q: geo.at(q) });
      });

      ctx.strokeStyle = window.Palette.mix(colours.ink, 76, colours.paper);
      live.forEach(function (it) {
        var flow = me.best ? Math.hypot(it.q.x - it.p.x, it.q.y - it.p.y) / geo.k / (it.e.w || 1) / me.best : 1;
        width[it.e.key] = road * (0.4 + 0.6 * flow);
        ctx.lineWidth = width[it.e.key];
        rule(ctx, it.p, it.q);
      });
      live.forEach(function (it) {
        if (it.role === 'idle') return;
        ctx.strokeStyle = colours[it.role];
        ctx.lineWidth = Math.max(2.4, width[it.e.key] * (it.role === 'path' ? 1.5 : 1.1));
        rule(ctx, it.p, it.q);
      });

      /* Crossings are marked only where an algorithm has an opinion about them. An untouched
         one is just where two streets meet, and a dot on every one of them buries the few that
         are actually being talked about — at thirteen thousand it would also be the map. */
      var dot = Math.max(2.2, road * 0.62);
      view.nodes.forEach(function (n) {
        var role = R.at(frame.roles, n.id, 'idle');
        if (role === 'idle') return;
        if (n.x < lim.x0 || n.x > lim.x1 || n.y < lim.y0 || n.y > lim.y1) return;
        var p = geo.at(n);
        ctx.fillStyle = colours[role];
        ctx.beginPath();
        ctx.arc(p.x, p.y, dot, 0, Math.PI * 2);
        ctx.fill();
      });

      window.CityPins.draw(ctx, colours, by, geo, o, Math.max(8, road * 1.1), s.w);
    },

    /* Where on the MAP is a point on the stage? The page turns a cursor into a place and asks
       js/city/source.js which crossing is nearest, so a pin lands where the student let go
       however far in the map has been zoomed. */
    where: function (s, view, cam, px, py) {
      return cam.geometry(s, view).world(px, py);
    },
    /* Is the cursor on a pin? Screen distance, because a pin is a fixed size on the stage
       however far the map is zoomed — which is the whole reason it is asked in stage units. */
    grab: function (s, view, cam, px, py, o) {
      return window.CityPins.grab(cam.geometry(s, view), about(view).by, px, py, o);
    },
  };

  function rule(ctx, p, q) {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }

  /* The built-up blocks, on the invented grid only. A cell is filled where all four of its
     corners are a real crossing, so the park — where they are not — is left as open paper and
     needs no colour of its own to be told apart from the buildings.

     The real map gets none of this, and not for want of trying: the lattice is worked out by
     finding each crossing's row and column, which is a fact about a GRID. Manhattan below 14th
     has no rows and no columns, and asking for them over thirteen thousand crossings is
     quadratic besides. A real city's blocks are the holes between its streets, and holes need
     no ink. */
  function blocks(ctx, colours, view, geo) {
    var lat = window.CityGrid.lattice(view);
    ctx.fillStyle = window.Palette.mix(colours.ink, 9, colours.paper);
    for (var i = 0; i + 1 < lat.xs.length; i++) {
      for (var j = 0; j + 1 < lat.ys.length; j++) {
        var tl = lat.at[i + ',' + j], br = lat.at[(i + 1) + ',' + (j + 1)];
        if (!tl || !br || !lat.at[(i + 1) + ',' + j] || !lat.at[i + ',' + (j + 1)]) continue;
        var a = geo.at(tl), b = geo.at(br);
        ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
      }
    }
    return Math.min(step(lat.xs), step(lat.ys)) * geo.k;
  }
})();
