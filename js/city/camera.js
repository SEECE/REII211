/* The viewport over the map. Plain script, one global `CityCamera`.

   The island is thirteen thousand crossings and twenty-one kilometres tall; a stage is eight
   hundred pixels. Something has to decide which part of it is on screen, and this is the only
   file that knows. It is a RENDERING concern and nothing else: the Graph is untouched, every
   node and every edge exists at every zoom, and an algorithm has no idea any of this is here.

   The camera is kept in MAP coordinates — a point that sits at the middle of the stage and a
   zoom multiplier over whatever scale fits the whole thing. Keeping it in map units rather than
   pixels is what makes it survive a resize: collapse a panel and the stage narrows, the fit
   changes, and the map stays looking at the same street corner.

       geometry(s, view) → { k, at(n), world(px, py), bounds(margin), metresPerPixel(span) }

   `at` is map → screen and `world` is screen → map, and they are exact inverses, which is what
   lets a pin be dragged: the cursor is turned back into a place on the map, not guessed at. */
(function () {
  'use strict';
  var PAD = 22;
  var MIN_Z = 1, MAX_Z = 600;

  /* The bounding box of the crossings, worked out once per view rather than once per frame. A
     view() is now shared by every frame of a run (js/graph/model.js), so this is once per run. */
  var boxOf = null, boxFor = null;
  function box(view) {
    if (boxFor === view) return boxOf;
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    view.nodes.forEach(function (n) {
      if (n.x < x0) x0 = n.x;
      if (n.x > x1) x1 = n.x;
      if (n.y < y0) y0 = n.y;
      if (n.y > y1) y1 = n.y;
    });
    boxFor = view;
    boxOf = { x0: x0, y0: y0, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
    return boxOf;
  }

  window.CityCamera = function () {
    var cx = 0.5, cy = 0.5, z = 1, placed = false;

    function geo(s, view) {
      var b = box(view);
      /* ONE scale for both axes: stretching the map to the stage would undo the block
         proportions the projection went to the trouble of getting right. Manhattan is a tall
         narrow sliver and is drawn as one. */
      var fit = Math.min((s.w - PAD * 2) / (b.w || 1), (s.h - PAD * 2) / (b.h || 1));
      var k = fit * z;
      return {
        k: k,
        box: b,
        at: function (n) { return { x: s.w / 2 + (n.x - cx) * k, y: s.h / 2 + (n.y - cy) * k }; },
        world: function (px, py) {
          return { x: cx + (px - s.w / 2) / k, y: cy + (py - s.h / 2) / k };
        },
        /* what is on screen, in map coordinates, with a margin so a street whose ends are both
           outside the frame but which crosses it is still drawn */
        bounds: function (m) {
          var hw = (s.w / 2 + (m || 0)) / k, hh = (s.h / 2 + (m || 0)) / k;
          return { x0: cx - hw, x1: cx + hw, y0: cy - hh, y1: cy + hh };
        },
        /* how coarse the drawing is, which is what decides how much of it is worth painting.
           `span` is the width of the whole map in metres — page furniture from the source. */
        metresPerPixel: function (span) { return span ? span / k : 0; },
      };
    }

    var api = {
      geometry: geo,
      /* Frame the whole map. Called once when a map arrives and never again, so a rebuild —
         which happens on every pin drop — does not throw away where the student was looking. */
      fit: function (view) {
        var b = box(view);
        cx = b.cx;
        cy = b.cy;
        z = 1;
        placed = true;
      },
      placed: function () { return placed; },
      reset: function () { placed = false; },
      pan: function (dxPx, dyPx, s, view) {
        var k = geo(s, view).k;
        cx -= dxPx / k;
        cy -= dyPx / k;
        clamp(view);
      },
      /* Zoom about a point on the stage: whatever was under the cursor stays under it, which is
         the only zoom that does not feel like the map is running away. */
      zoom: function (factor, px, py, s, view) {
        var before = geo(s, view).world(px, py);
        z = Math.max(MIN_Z, Math.min(MAX_Z, z * factor));
        var k = geo(s, view).k;
        cx = before.x - (px - s.w / 2) / k;
        cy = before.y - (py - s.h / 2) / k;
        clamp(view);
      },
      /* Put a place in the middle at a given zoom — what the "Where" list does now that it no
         longer decides what is BUILT. */
      to: function (x, y, zoom, view) {
        cx = x;
        cy = y;
        z = Math.max(MIN_Z, Math.min(MAX_Z, zoom || z));
        placed = true;
        clamp(view);
      },
      zoomLevel: function () { return z; },
    };

    /* The map may leave the stage but never entirely: half a screen past the edge in map units
       is far enough to look at a corner of it and near enough that it can always be found again. */
    function clamp(view) {
      var b = box(view);
      var mx = b.w / 2 + b.w / z, my = b.h / 2 + b.h / z;
      cx = Math.max(b.cx - mx, Math.min(b.cx + mx, cx));
      cy = Math.max(b.cy - my, Math.min(b.cy + my, cy));
    }

    return api;
  };
})();
