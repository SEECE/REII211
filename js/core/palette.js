/* Role colours, resolved once. Plain script, one global `Palette`.

   A canvas cannot read a custom property, so the old pages each carried their own hex table —
   `const COLOR = { default: '#8b5cf6', … }` repeated in twelve files, none of them agreeing.
   This reads the --role-* names out of css/tokens.css exactly once and hands the renderers the
   values, which is what makes tokens.css the single point of reskin for the canvas pages too.

   Roles are semantic, not decorative: `scan` is "being compared right now" on a sorting page
   and "being relaxed right now" on Dijkstra. A renderer asks for a role, never for a colour. */
(function () {
  'use strict';

  var ROLES = ['idle', 'scan', 'focus', 'move', 'done', 'reject', 'path', 'frontier', 'wall'];
  var SURFACE = ['paper', 'ink', 'ink-soft', 'ink-faint', 'grid', 'line', 'line-hi'];

  var cache = null;

  function read() {
    var css = window.getComputedStyle(document.documentElement);
    var out = {};
    ROLES.forEach(function (r) { out[r] = (css.getPropertyValue('--role-' + r) || '').trim() || '#94b8c8'; });
    SURFACE.forEach(function (s) { out[s] = (css.getPropertyValue('--' + s) || '').trim() || '#000'; });
    return out;
  }

  /* One object, built on first use. Nothing on the site changes theme at runtime, so there is
     no invalidation to get wrong — call Palette.refresh() if that ever stops being true. */
  window.Palette = {
    roles: ROLES,
    get: function (name) {
      if (!cache) cache = read();
      return cache[name] || cache.idle;
    },
    all: function () { if (!cache) cache = read(); return cache; },
    refresh: function () { cache = null; return this.all(); },

    /* The same colour at a lower weight — a fill behind a stroke, a node that is off-focus.
       Blended numerically rather than with CSS color-mix(): a canvas fillStyle goes through the
       CSS colour parser, and a value the browser cannot parse is silently IGNORED, leaving the
       previous fill in place. A wrong colour that only appears on older browsers is exactly the
       bug nobody finds, so this returns a plain rgb(). */
    mix: function (colour, percent, onto) {
      var a = rgb(colour), b = rgb(onto || this.get('paper'));
      if (!a || !b) return colour;
      var w = Math.max(0, Math.min(100, percent)) / 100;
      return 'rgb(' + [0, 1, 2].map(function (i) {
        return Math.round(a[i] * w + b[i] * (1 - w));
      }).join(',') + ')';
    },
  };

  /* #rgb / #rrggbb / rgb(…) → [r, g, b]. Every value in tokens.css is a hex literal, so this
     covers what Palette actually reads; anything else falls through and is used unchanged. */
  function rgb(value) {
    if (!value) return null;
    var hex = String(value).trim();
    if (hex.charAt(0) === '#') {
      if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      if (hex.length !== 7) return null;
      return [1, 3, 5].map(function (i) { return parseInt(hex.substr(i, 2), 16); });
    }
    var m = hex.match(/rgba?\(([^)]+)\)/);
    return m ? m[1].split(',').slice(0, 3).map(function (n) { return parseInt(n, 10); }) : null;
  }
})();
