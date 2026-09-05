/* The colour block — an array drawn as a picture. Plain script, one global `Spectrum`.

   Give every value a hue instead of a height and a sorted array stops being a staircase and
   becomes the spectrum itself. Shuffle it and the picture is static. A sort's progress is then
   legible from across the room, with no bars to read and no numbers to compare, because a
   half-sorted block looks like a photograph developing.

   **The block is filled along a HILBERT CURVE, not row by row**, and that is the whole look of
   the thing. A row-major fill sorts into horizontal stripes: neighbours in the array are
   neighbours on screen only sideways, so the picture reads as a scan line and the corners mean
   nothing. The Hilbert curve visits every cell of a 2ⁿ × 2ⁿ square without ever jumping, and it
   is self-similar — the square is four quadrants taken in order, each of which is itself four
   quadrants taken in order, all the way down. So a sorted block is four blocks of colour, each
   of which is four smaller blocks, each of which is four smaller ones again; unwrap it and it
   is one straight line of hue from red to magenta. Values that are close stay close on screen
   in BOTH directions, which is why a nearly-sorted region looks like a patch rather than a
   smear, and why the finished picture loops instead of scanning.

   **This is the one renderer on the site that puts a colour on the canvas that did not come
   from a role** — see structure/FRONTEND.md, which carries the test for whether anything else
   may. The hue is the VALUE, the same information a bar's height carries in js/sorting/bars.js;
   what an element is DOING is still a role and still comes from js/core/palette.js.

   Speed matters here in a way it does not on a bar graph: a block is thousands of cells and
   the page redraws all of them every frame. So the pixels go down as one ImageData blit off a
   cached palette, not as thousands of fillRect calls each preceded by parsing a colour string
   — that alone was several milliseconds a frame, which is most of a frame's budget. */
(function () {
  'use strict';

  var SWEEP = 300;              // 0° red round to 300° magenta — the rainbow, stopping before
                                // it wraps back to red, which would make the ends look equal
  var SAT = 0.82, LIGHT = 0.55; // saturated enough to read as hue, light enough to see a mark
  var STEPS = 16384;            // hue resolution, and therefore the largest block worth drawing

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

  /* The palette, built once: STEPS colours along the sweep, so a pixel is three array reads
     instead of an HSL conversion and a string. It never changes, so it is never rebuilt. */
  var ramp = null;
  function palette() {
    if (ramp) return ramp;
    ramp = new Uint8Array(STEPS * 3);
    for (var i = 0; i < STEPS; i++) {
      var c = hsl((i / (STEPS - 1)) * SWEEP / 360, SAT, LIGHT);
      ramp[i * 3] = c[0]; ramp[i * 3 + 1] = c[1]; ramp[i * 3 + 2] = c[2];
    }
    return ramp;
  }

  /* d → (x, y) on the Hilbert curve of a `side` × `side` square, the standard bit-twiddling
     walk: read two bits of d per level, rotate the quadrant into place, move up a level. Cached
     as a table of ImageData byte offsets, because the curve depends only on the side and the
     page asks for the same one thousands of times. */
  var curves = {};
  function curve(side) {
    if (curves[side]) return curves[side];
    var n = side * side, table = new Int32Array(n);
    for (var d = 0; d < n; d++) {
      var x = 0, y = 0, t = d, rx, ry, tmp;
      for (var s = 1; s < side; s *= 2) {
        rx = 1 & (t >> 1);
        ry = 1 & (t ^ rx);
        if (ry === 0) {
          if (rx === 1) { x = s - 1 - x; y = s - 1 - y; }
          tmp = x; x = y; y = tmp;
        }
        x += s * rx;
        y += s * ry;
        t >>= 2;
      }
      table[d] = (y * side + x) * 4;
    }
    curves[side] = table;
    return table;
  }

  /* the offscreen block — one canvas and one ImageData, reused by every lane of every frame */
  var pad = null;
  function scratch(side) {
    if (!pad || pad.side !== side) {
      var c = document.createElement('canvas');
      c.width = c.height = side;
      var g = c.getContext('2d');
      pad = { side: side, canvas: c, ctx: g, img: g.createImageData(side, side) };
      pad.img.data.fill(0);          // the tail of a curve a short array does not reach
    }
    return pad;
  }

  window.Spectrum = {
    SWEEP: SWEEP,
    STEPS: STEPS,

    /* The square a block of n values is drawn on: the smallest power of two that holds it, so
       the Hilbert curve is defined. A short array simply stops partway along the curve. */
    side: function (n) {
      var s = 1;
      while (s * s < n) s *= 2;
      return s;
    },

    /* where in the rainbow a value sits, in degrees */
    hue: function (v, lo, hi) { return pos(v, lo, hi) * SWEEP; },
    rgb: function (v, lo, hi) { return hsl(pos(v, lo, hi) * SWEEP / 360, SAT, LIGHT); },
    css: function (v, lo, hi) { return 'rgb(' + this.rgb(v, lo, hi).join(',') + ')'; },
    /* the hex a student would type into a stylesheet — what the picture is made of */
    hex: function (v, lo, hi) { return '#' + this.rgb(v, lo, hi).map(two).join(''); },

    /* the curve, as (x, y) — for the self-checks, which have no canvas to read it off */
    xy: function (side, d) { var o = curve(side)[d] / 4; return [o % side, Math.floor(o / side)]; },

    /* One lane's block. Signature matches js/sorting/bars.js so js/compare/lanes.js can hand
       either of them a cell without knowing which it has. */
    draw: function (s, frame, colours) {
      if (!s || !frame) return;
      var a = frame.state, n = a && a.length;
      if (!n) return;

      var lo = a[0], hi = a[0], i;
      for (i = 1; i < n; i++) { if (a[i] < lo) lo = a[i]; if (a[i] > hi) hi = a[i]; }

      var side = this.side(n), block = scratch(side);
      var at = curve(side), ramp = palette(), d = block.img.data;
      var span = hi > lo ? (STEPS - 1) / (hi - lo) : 0;

      for (i = 0; i < n; i++) {
        var c = (((a[i] - lo) * span + 0.5) | 0) * 3, p = at[i];
        d[p] = ramp[c]; d[p + 1] = ramp[c + 1]; d[p + 2] = ramp[c + 2]; d[p + 3] = 255;
      }
      block.ctx.putImageData(block.img, 0, 0);

      /* Whole-pixel scaling wherever there is room for it, so every cell is the same size and
         the grid stays square; below one screen pixel per cell there is nothing to keep square
         and the browser's own filtering is the honest answer. */
      var room = Math.min(s.w, s.h), zoom = room / side;
      var size = zoom >= 2 ? Math.floor(zoom) * side : room;
      var x0 = Math.round((s.w - size) / 2), y0 = Math.round((s.h - size) / 2);
      var ctx = s.ctx;
      ctx.imageSmoothingEnabled = zoom < 1;
      ctx.drawImage(block.canvas, 0, 0, side, side, x0, y0, size, size);

      /* No role marks here, unlike every other renderer: the hue IS the answer, and a stroked
         outline flashing over the block on every scan/write reads as noise rather than signal —
         the same reason `done` was already left unmarked below. */
    },
  };
})();
