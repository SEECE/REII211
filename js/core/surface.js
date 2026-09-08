/* The drawing surface — a canvas that is always exactly the size of its stage track, in
   device pixels. Plain script, one global `Surface`.

   The old pages set `canvas.width` from a getBoundingClientRect on load and again on window
   resize, which meant every drawing was blurry on a HiDPI screen and none of them noticed the
   stage changing width when a panel collapsed. A ResizeObserver on the stage fixes both: the
   LAYOUT owns the box, the canvas follows it, and no page ever writes a pixel dimension.

   Surface(canvas, redraw) → { ctx, w, h, clear(), draw() }. `w`/`h` are CSS pixels: the
   context is pre-scaled by devicePixelRatio, so a renderer draws in CSS units and never sees
   the ratio. Call draw() to repaint; the observer calls it on every resize. */
(function () {
  'use strict';

  window.Surface = function (canvas, redraw) {
    var ctx = canvas.getContext('2d');
    var api = { ctx: ctx, canvas: canvas, w: 0, h: 0 };

    function measure() {
      var box = canvas.parentElement || canvas;
      var style = window.getComputedStyle(box);
      var pad = { l: parseFloat(style.paddingLeft) || 0, r: parseFloat(style.paddingRight) || 0,
        t: parseFloat(style.paddingTop) || 0, b: parseFloat(style.paddingBottom) || 0 };
      var rect = box.getBoundingClientRect();
      var w = Math.max(1, Math.round(rect.width - pad.l - pad.r));
      var h = Math.max(1, Math.round(rect.height - pad.t - pad.b));
      var dpr = Math.min(window.devicePixelRatio || 1, 2);   // 2 is plenty; 3 costs fill rate
      if (api.w === w && api.h === h && canvas.width === Math.round(w * dpr)) return false;
      api.w = w;
      api.h = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }

    api.clear = function () { ctx.clearRect(0, 0, api.w, api.h); };
    api.draw = function () { measure(); api.clear(); if (redraw) redraw(api); };

    /* A canvas whose box is not laid out yet reports 0×0, so the first draw would size to
       nothing. The observer fires once on observe(), which is that first real measurement. */
    if (window.ResizeObserver) {
      new window.ResizeObserver(function () { api.draw(); }).observe(canvas.parentElement || canvas);
    } else {
      window.addEventListener('resize', api.draw);
      api.draw();
    }
    return api;
  };
})();
