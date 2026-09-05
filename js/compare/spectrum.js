/* The colour block — an array drawn as a picture. Plain script, one global `Spectrum`.

   Give every value a hue instead of a height and a sorted array stops being a staircase and
   becomes the spectrum itself: red in the top-left corner, sweeping through the rainbow to
   magenta in the bottom-right. Shuffle it and the picture is static. That is the whole appeal
   of the thing — a sort's progress is legible from across the room, with no bars to read and
   no numbers to compare, because a half-sorted block looks like a photograph developing.

   **This is the one renderer on the site that puts a colour on the canvas that did not come
   from a role**, and it is worth saying why rather than letting somebody quietly copy it. A
   role answers "what is this element DOING right now" — being compared, being written — and
   every one of those still comes from js/core/palette.js here. The hue is not that: it is the
   VALUE, the same information a bar's height carries on js/sorting/bars.js. Reskinning the
   site must not change what 7 sorts before 8, so the hue cannot live in tokens.css.

   Colour comes from where the value sits between the block's smallest and largest, not from
   the number itself, so a hand-written .reii of arbitrary numbers still paints a clean sweep
   when it is sorted. */
(function () {
  'use strict';

  var SWEEP = 300;              // 0° red round to 300° magenta — the rainbow, stopping before
                                // it wraps back to red, which would make the ends look equal
  var SAT = 0.82, LIGHT = 0.55; // saturated enough to read as hue, light enough to see a stroke

  /* HSL → RGB, the compact form. Done in arithmetic rather than handing the canvas an
     `hsl(…)` string for the reason js/core/palette.js gives: a fillStyle the browser cannot
     parse is silently ignored and you get the previous colour with no error anywhere. */
  function hsl(h, s, l) {
    function f(n) {
      var k = (n + h * 12) % 12;
      return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    }
    return [f(0), f(8), f(4)].map(function (x) { return Math.round(x * 255); });
  }

  function pos(v, lo, hi) { return hi > lo ? (v - lo) / (hi - lo) : 0; }
  function two(n) { return (n < 16 ? '0' : '') + n.toString(16); }

  window.Spectrum = {
    SWEEP: SWEEP,

    /* What one step of a race over a block of n pixels should charge (js/compare/race.js).
       A frame is a tick, and the slowest of the six sorts costs about 1.5n² operations, so
       this spreads that over roughly 2,500 frames whatever the size — a bigger block is a
       sharper picture and not a longer walk, which is a claim js/tests/compare.js checks. */
    per: function (n) { return Math.max(1, Math.ceil(n * n / 1600)); },

    /* where in the rainbow a value sits, in degrees */
    hue: function (v, lo, hi) { return pos(v, lo, hi) * SWEEP; },
    rgb: function (v, lo, hi) { return hsl(pos(v, lo, hi) * SWEEP / 360, SAT, LIGHT); },
    css: function (v, lo, hi) { return 'rgb(' + this.rgb(v, lo, hi).join(',') + ')'; },
    /* the hex a student would type into a stylesheet — what the picture is made of */
    hex: function (v, lo, hi) { return '#' + this.rgb(v, lo, hi).map(two).join(''); },

    /* how many rows `cols` columns of `n` values need — the block is filled row by row, so
       reading the picture left-to-right, top-to-bottom is reading the array in order */
    rows: function (n, cols) { return Math.ceil(n / Math.max(1, cols)); },

    /* One lane's block. Signature matches js/sorting/bars.js so js/compare/lanes.js can hand
       either of them a cell without knowing which it has. */
    draw: function (s, frame, colours, cols) {
      if (!s || !frame) return;
      var a = frame.state, n = a && a.length;
      if (!n) return;
      var ctx = s.ctx, i;

      var lo = a[0], hi = a[0];
      for (i = 1; i < n; i++) { if (a[i] < lo) lo = a[i]; if (a[i] > hi) hi = a[i]; }

      var c = Math.max(1, Math.min(Math.round(cols) || Math.round(Math.sqrt(n)), n));
      var rows = this.rows(n, c);
      var size = Math.min(s.w / c, s.h / rows);
      var x0 = (s.w - size * c) / 2, y0 = (s.h - size * rows) / 2;

      /* Edges are rounded to whole pixels rather than each cell being drawn `size` wide: a
         fractional rect is antialiased, and a grid of them is a grid of pale hairlines. */
      function edge(k, o) { return Math.round(o + k * size); }

      for (i = 0; i < n; i++) {
        var col = i % c, row = Math.floor(i / c);
        var x = edge(col, x0), y = edge(row, y0);
        ctx.fillStyle = this.css(a[i], lo, hi);
        ctx.fillRect(x, y, edge(col + 1, x0) - x, edge(row + 1, y0) - y);
      }

      /* Marks go on afterwards so the next cell's fill cannot paint over one. `done` is
         deliberately not marked: on this page a settled block IS the rainbow, and outlining
         every finished cell would cover the answer with the working. */
      var w = Math.max(1, Math.min(3, size / 5));
      ctx.lineWidth = w;
      for (i = 0; i < n; i++) {
        var role = window.Roles.at(frame.roles, i);
        if (role === 'idle' || role === 'done') continue;
        var cx = i % c, cy = Math.floor(i / c);
        var mx = edge(cx, x0), my = edge(cy, y0);
        ctx.strokeStyle = colours[role];
        ctx.strokeRect(mx + w / 2, my + w / 2,
          edge(cx + 1, x0) - mx - w, edge(cy + 1, y0) - my - w);
      }
    },
  };
})();
