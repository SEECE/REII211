/* The city, drawn. Plain script, one global `CityDraw`.

   A street map, not a node diagram: blocks are a solid mass and the streets are cut back out of
   it, which is the one drawing decision that makes the rest fall out for free.

     · a CLOSED street is simply not cut, so the two blocks it used to separate read as one mass
     · the PARK has no crossings, so no block is filled there and it stays open paper
     · a crossing is where two cuts meet and needs no mark of its own

   Nothing here is black or white literally — it is `ink` on `paper` from css/tokens.css, so the
   map reskins with the rest of the site and reads the same in either theme.

   Street width is the only thing drawn from a weight: a street's width is its length divided by
   what it costs, against the best ratio on the map. On a map priced in metres every street comes
   out the same width, and on one priced in time the jammed ones narrow — with no extra field
   anywhere, because the view already carries both numbers. */
(function () {
  'use strict';
  var R = window.Roles;
  var PAD = 22;

  function step(list) {
    var min = Infinity;
    for (var i = 1; i < list.length; i++) min = Math.min(min, list[i] - list[i - 1]);
    return min === Infinity ? 1 : min;
  }

  /* The stage in map coordinates. The bounding box of the crossings is fitted at ONE scale for
     both axes — stretching it to the stage would undo the block proportions the grid went to
     the trouble of getting right. */
  function geometry(s, view) {
    var lat = window.CityGrid.lattice(view);
    var xs = lat.xs, ys = lat.ys;
    var w = xs[xs.length - 1] - xs[0], h = ys[ys.length - 1] - ys[0];
    var scale = Math.min((s.w - PAD * 2) / (w || 1), (s.h - PAD * 2) / (h || 1));
    var ox = (s.w - w * scale) / 2 - xs[0] * scale;
    var oy = (s.h - h * scale) / 2 - ys[0] * scale;
    var gap = Math.min(step(xs), step(ys)) * scale;
    return {
      lat: lat,
      road: Math.max(3, Math.min(16, gap * 0.34)),
      at: function (n) { return { x: ox + n.x * scale, y: oy + n.y * scale }; },
    };
  }

  window.CityDraw = {
    /* opts: { from, to } — the two pins, which are the page's state and not the trace's */
    draw: function (s, frame, colours, opts) {
      if (!s || !frame || !frame.state || !frame.state.nodes.length) return;
      var view = frame.state, ctx = s.ctx, o = opts || {};
      var geo = geometry(s, view), lat = geo.lat, road = geo.road;
      var at = {}, best = 0;
      view.nodes.forEach(function (n) { at[n.id] = geo.at(n); });

      /* The built-up blocks, grown by half a road each way so the streets around the edge of
         the map come out the same width as the ones inside it. */
      ctx.fillStyle = window.Palette.mix(colours.ink, 13, colours.paper);
      for (var i = 0; i + 1 < lat.xs.length; i++) {
        for (var j = 0; j + 1 < lat.ys.length; j++) {
          var tl = lat.at[i + ',' + j], br = lat.at[(i + 1) + ',' + (j + 1)];
          if (!tl || !br || !lat.at[(i + 1) + ',' + j] || !lat.at[i + ',' + (j + 1)]) continue;
          var a = at[tl.id], b = at[br.id];
          ctx.fillRect(a.x - road / 2, a.y - road / 2, b.x - a.x + road, b.y - a.y + road);
        }
      }

      view.edges.forEach(function (e) {
        var p = at[e.a], q = at[e.b];
        if (p && q) best = Math.max(best, Math.hypot(q.x - p.x, q.y - p.y) / (e.w || 1));
      });

      /* Every open street first, then the ones an algorithm is talking about — two passes,
         because a street cut later would otherwise paint over the end of a coloured one they
         share a crossing with, and a route would come back nibbled. */
      ctx.lineCap = 'round';
      var open = view.edges.filter(function (e) { return at[e.a] && at[e.b]; });
      var width = {};
      open.forEach(function (e) {
        var p = at[e.a], q = at[e.b];
        var flow = best ? Math.hypot(q.x - p.x, q.y - p.y) / (e.w || 1) / best : 1;
        width[e.key] = road * (0.45 + 0.55 * flow);
        ctx.strokeStyle = colours.paper;
        ctx.lineWidth = width[e.key];
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      });
      open.forEach(function (e) {
        var role = R.at(frame.roles, e.key, 'idle');
        if (role === 'idle') return;
        ctx.strokeStyle = colours[role];
        ctx.lineWidth = width[e.key] * (role === 'path' ? 0.92 : 0.6);
        ctx.beginPath();
        ctx.moveTo(at[e.a].x, at[e.a].y);
        ctx.lineTo(at[e.b].x, at[e.b].y);
        ctx.stroke();
      });

      /* Crossings are marked only where an algorithm has an opinion about them. An untouched
         one is just where two streets meet, and a dot on every one of them buries the few that
         are actually being talked about. */
      var dot = Math.max(2.5, road * 0.44);
      view.nodes.forEach(function (n) {
        var role = R.at(frame.roles, n.id, 'idle');
        if (role === 'idle') return;
        ctx.fillStyle = colours[role];
        ctx.beginPath();
        ctx.arc(at[n.id].x, at[n.id].y, dot, 0, Math.PI * 2);
        ctx.fill();
      });

      [[o.from, 'From'], [o.to, 'To']].forEach(function (pin) {
        var p = at[pin[0]];
        if (!p) return;
        var node = view.nodes.filter(function (n) { return n.id === pin[0]; })[0];
        marker(ctx, colours, p, Math.max(7, road * 0.72), pin[1] + ' ' + node.label, s.w);
      });
    },

    /* Which crossing is under a point? The page hit-tests against the geometry the drawing
       used, so the pin lands where the student aimed however the stage has been resized. */
    hit: function (s, view, px, py) {
      if (!view.nodes.length) return null;
      var geo = geometry(s, view), near = geo.road * 3, found = null;
      view.nodes.forEach(function (n) {
        var p = geo.at(n), d = Math.hypot(p.x - px, p.y - py);
        if (d < near) { near = d; found = n.id; }
      });
      return found;
    },
  };

  /* A pin: a teardrop standing on the crossing, and a label beside it saying which crossing
     that is and which end of the errand it is. The two pins look identical on purpose — what
     tells them apart is the word, not a colour a student has to look up. */
  function marker(ctx, colours, p, r, text, stage) {
    ctx.fillStyle = colours.ink;
    ctx.beginPath();
    ctx.arc(p.x, p.y - r * 1.5, r, Math.PI * 0.75, Math.PI * 0.25);
    ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = colours.paper;
    ctx.beginPath();
    ctx.arc(p.x, p.y - r * 1.5, r * 0.38, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '700 11px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    var w = ctx.measureText(text).width;
    var x = p.x + r * 1.1, y = p.y - r * 1.9;
    // the surface's own width, in the CSS pixels a renderer draws in — canvas.width is device
    if (x + w + 8 > stage) x = p.x - r * 1.1 - w - 8;
    ctx.fillStyle = colours.ink;
    ctx.fillRect(x, y - 8, w + 8, 16);
    ctx.fillStyle = colours.paper;
    ctx.fillText(text, x + 4, y + 0.5);
  }
})();
