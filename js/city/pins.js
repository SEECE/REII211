/* The two pins. Plain script, one global `CityPins`.

   The pins are the PAGE's state and not the trace's — an errand somebody set, not something an
   algorithm did — so they are drawn after the map is finished with and hit-tested on their own.
   Split out of js/city/draw.js at the 200-line ceiling, which is the honest place for them:
   everything else in that file is a street.

   A pin is GRABBED and DRAGGED rather than placed by a click. On the invented grid a click was
   unambiguous, because a click was always within a few pixels of one of sixty-four crossings.
   On thirteen thousand real ones it is not: the crossing nearest a click is frequently not the
   one under the cursor, and being told the pin went somewhere else is worse than having to aim.
   Dragging says which pin is moving and where it is going the whole time it is happening, and
   the drop snaps to the nearest crossing, which is the one under the pin's point. */
(function () {
  'use strict';
  var REACH = 18;                    // stage pixels; a pin is this big whatever the zoom is
  var BODY = 26;                     // how far the teardrop stands above the crossing

  window.CityPins = {
    draw: function (ctx, colours, by, geo, o, r, stage) {
      [[o.from, 'From'], [o.to, 'To']].forEach(function (pin) {
        var node = by[pin[0]];
        var held = o.held && o.held.pin === pin[1];
        if (!node && !held) return;
        var p = held ? { x: o.held.x, y: o.held.y } : geo.at(node);
        // a pin in the air is not standing on anything, so it has nothing to be named after
        marker(ctx, colours, p, r, pin[1] + (held || !node ? '' : ' ' + node.label), stage, held);
      });
    },

    /* The point of the teardrop stands ON the crossing and its body stands above, so the whole
       of the shape a student is looking at has to answer, not just the tip. */
    grab: function (geo, by, px, py, o) {
      var found = null;
      [[o.from, 'From'], [o.to, 'To']].forEach(function (pin) {
        var n = by[pin[0]];
        if (!n || found) return;
        var p = geo.at(n), dx = p.x - px;
        var dy = Math.max(0, p.y - py) - Math.max(0, p.y - py - BODY);
        if (Math.hypot(dx, dy) < REACH) found = pin[1];
      });
      return found;
    },
  };

  /* A pin: a teardrop standing on the crossing, and a label beside it saying which crossing
     that is and which end of the errand it is. The two pins look identical on purpose — what
     tells them apart is the word, not a colour a student has to look up. One being dragged
     loses its label, because until it is dropped it is not standing on anything. */
  function marker(ctx, colours, p, r, text, stage, held) {
    ctx.globalAlpha = held ? 0.72 : 1;
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
    ctx.globalAlpha = 1;
  }
})();
