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

    /* the same colour at a lower weight — a fill behind a stroke, a bar that is off-focus.
       Returned as a colour-mix so it stays in the theme rather than being a second hex. */
    soft: function (name, amount) {
      return 'color-mix(in srgb, ' + this.get(name) + ' ' + (amount == null ? 26 : amount) + '%, transparent)';
    },
  };
})();
