/* Self-checks for what the map DRAWS — js/city/camera.js, js/city/draw.js, js/city/pins.js.

   The island is thirteen thousand crossings and nineteen thousand blocks, and two filters keep
   that off the canvas: a street outside the frame is not drawn, and when a pixel is worth many
   metres the residential mesh is dropped and the avenues are left. Both are the kind of thing
   that fails silently and in the worst possible way — by hiding the answer — so both are
   checked here, against a context that records what it was asked to draw rather than a canvas.

   The camera is checked as an INVERSE. A pin is dragged by turning the cursor back into a place
   on the map, so `world(at(n)) === n` is not a nicety: it is the difference between a pin
   landing where it was dropped and landing somewhere else at every zoom but one. */
(function () {
  'use strict';

  /* A 2D context that remembers the lines. Everything a renderer sets is accepted and ignored;
     what is kept is the geometry, because that is the only part there is anything to say about. */
  function recorder() {
    var at = null;
    var rec = {
      lines: [], dots: [], rects: [],
      beginPath: function () {}, closePath: function () {}, fill: function () {},
      fillRect: function (x, y, w, h) { rec.rects.push([x, y, w, h]); },
      moveTo: function (x, y) { at = [x, y]; },
      lineTo: function (x, y) { rec.pending = [at[0], at[1], x, y]; },
      stroke: function () { if (rec.pending) rec.lines.push(rec.pending); rec.pending = null; },
      arc: function (x, y, r) { rec.dots.push([x, y, r]); },
      measureText: function (t) { return { width: t.length * 6 }; },
      fillText: function () {},
    };
    return rec;
  }

  function surface() { var s = { w: 900, h: 620 }; s.ctx = recorder(); return s; }

  var COLOURS = { ink: '#101010', paper: '#f8f8f8', path: '#cc2222', done: '#2244cc',
    focus: '#cc8800', frontier: '#22aa88', scan: '#8822cc', move: '#118844', reject: '#884444' };

  window.Check.suite('applications — what the map draws', function () {
    var C = window.Check, R = window.Roles;

    if (!window.OsmIndex || !window.OsmIndex.ready()) {
      C.ok(false, 'the OpenStreetMap extract is loaded', 'js/city/osm-manhattan.js is missing');
      return;
    }
    var g = window.OsmGraph.build({}), view = g.view(), s = surface();
    var cam = window.CityCamera();
    cam.fit(view);

    /* ── the camera ── */
    var geo = cam.geometry(s, view);
    var mid = geo.world(s.w / 2, s.h / 2);
    C.close(mid.x, geo.box.cx, 'fitting the map puts its middle in the middle of the stage', 1e-9);
    C.close(mid.y, geo.box.cy, 'on both axes', 1e-9);
    C.ok(g.nodes().every(function (n) {
      var p = geo.at(n);
      return p.x >= -1 && p.x <= s.w + 1 && p.y >= -1 && p.y <= s.h + 1;
    }), 'and the whole island is on the stage at that fit — nothing is off the edge');

    var offBy = 0;
    [1, 4, 30, 180].forEach(function (z) {
      cam.to(0.4, 0.5, z, view);
      var q = cam.geometry(s, view);
      g.nodes().slice(0, 400).forEach(function (n) {
        var p = q.at(n), back = q.world(p.x, p.y);
        offBy = Math.max(offBy, Math.abs(back.x - n.x), Math.abs(back.y - n.y));
      });
    });
    C.ok(offBy < 1e-12, 'screen and map are exact inverses at every zoom — a pin lands where it ' +
      'was dropped', 'worst ' + offBy.toExponential(2));

    /* Zooming about a point leaves that point where it was, which is the only zoom that does
       not feel like the map running away from the cursor. */
    cam.fit(view);
    var held = cam.geometry(s, view).world(300, 220);
    cam.zoom(1.18, 300, 220, s, view);
    cam.zoom(1.18, 300, 220, s, view);
    var still = cam.geometry(s, view).world(300, 220);
    C.close(still.x, held.x, 'zooming about a point keeps that point under the cursor', 1e-9);
    C.close(still.y, held.y, 'on both axes too', 1e-9);

    /* ── what actually gets drawn ── */
    function paint(frame, opts) {
      var st = surface();
      window.CityDraw.draw(st, frame, COLOURS, Object.assign({ cam: cam, span: g.span, cls: g.cls,
        from: g.nodes()[0].id, to: g.nodes()[900].id }, opts));
      return st.ctx;
    }
    var plain = { state: view, roles: {} };

    cam.fit(view);
    var whole = paint(plain, {});
    C.ok(whole.lines.length > 200, 'the whole island draws a map, not an empty stage',
      whole.lines.length + ' streets');
    C.ok(whole.lines.length < g.edges().length / 2,
      'but thins the residential mesh rather than inking the island solid',
      whole.lines.length + ' of ' + g.edges().length + ' blocks');

    cam.to(0.5, 0.5, 200, view);
    var close = paint(plain, {});
    C.ok(close.lines.length < whole.lines.length,
      'zoomed in, a street outside the frame is not drawn at all',
      close.lines.length + ' streets on screen');
    C.ok(close.lines.every(function (l) {
      return Math.max(l[0], l[2]) > -80 && Math.min(l[0], l[2]) < s.w + 80 &&
        Math.max(l[1], l[3]) > -80 && Math.min(l[1], l[3]) < s.h + 80;
    }), 'and everything that is drawn is on it, give or take the margin');

    /* The one thing neither filter may ever do. A route the student asked for that only appears
       if they zoom in is not an answer, so a street with a role is drawn whatever both say. */
    var picked = g.edges().filter(function (e) { return (g.cls[e.key] || '') === 'residential'; })
      .slice(0, 30).map(function (e) { return e.key; });
    C.ok(picked.length > 10, 'there are residential blocks to hide', picked.length + ' picked');
    cam.fit(view);
    var lit = paint({ state: view, roles: R.of({ path: picked }) }, {});
    /* Twice each: every open street is ruled first and the coloured ones are ruled again over
       the top, because a street drawn later would otherwise paint over the end of a coloured one
       they share a crossing with and the route would come back nibbled. */
    C.equal(lit.lines.length - whole.lines.length, picked.length * 2,
      'a street an algorithm is talking about is drawn at island zoom however minor it is');
  });
})();
