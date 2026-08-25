/* The bar graph — the one renderer all six sorts share. Plain script, one global `Bars`.

   It draws a FRAME, not an algorithm: the array is frame.state and every bar's colour comes
   from frame.roles via js/core/roles.js. It knows nothing about pivots, passes or minimums,
   which is why adding a seventh sort needs no drawing code at all.

   The old site had a `draw()` and a `getBarColor()` pair copied into each of eight files, each
   with its own hardcoded hex table. */
(function () {
  'use strict';

  window.Bars = {
    draw: function (s, frame, colours) {
      if (!frame || !s) return;
      var a = frame.state, n = a.length;
      if (!n) return;
      var ctx = s.ctx, W = s.w, H = s.h;
      var max = 0;
      for (var k = 0; k < n; k++) if (a[k] > max) max = a[k];

      var gap = n > 90 ? 1 : Math.max(1, Math.min(6, Math.floor(W / n / 7)));
      var barW = (W - gap * (n + 1)) / n;
      var floor = 18;                       // room under the bars for the index ruler
      var usable = H - floor - 6;
      var labels = barW >= 22;              // only where a number actually fits

      ctx.textAlign = 'center';
      ctx.font = '600 10px ' + 'ui-sans-serif, system-ui, sans-serif';

      for (var i = 0; i < n; i++) {
        var h = Math.max(2, (a[i] / max) * usable);
        var x = gap + i * (barW + gap);
        var y = H - floor - h;
        ctx.fillStyle = colours[window.Roles.at(frame.roles, i)];
        this.bar(ctx, x, y, barW, h);
        if (labels) {
          ctx.fillStyle = colours.ink;
          ctx.fillText(String(a[i]), x + barW / 2, y - 4);
        }
      }

      // the baseline the bars stand on — without it a short bar looks like it is floating
      ctx.strokeStyle = colours.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H - floor + 0.5);
      ctx.lineTo(W, H - floor + 0.5);
      ctx.stroke();

      if (labels) {
        ctx.fillStyle = colours['ink-faint'];
        ctx.font = '500 9.5px ui-sans-serif, system-ui, sans-serif';
        for (var m = 0; m < n; m++) {
          ctx.fillText(String(m), gap + m * (barW + gap) + barW / 2, H - 5);
        }
      }
    },

    /* a bar with the top two corners rounded, falling back to a rectangle when it is too
       narrow for a radius to be visible */
    bar: function (ctx, x, y, w, h) {
      var r = Math.min(3, w / 2);
      ctx.beginPath();
      if (w < 4) { ctx.rect(x, y, Math.max(w, 1), h); ctx.fill(); return; }
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.fill();
    },
  };
})();
