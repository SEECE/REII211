/* Role maps — which role each element of a frame is in. Plain script, one global `Roles`.

   A frame does not carry colours; it carries a map from an element's key (an array index, a
   node id) to a ROLE name (css/tokens.css --role-*). The renderer looks the key up and paints
   the role. That indirection is the whole reason a page can be reskinned from tokens.css and
   the reason "which colour means comparing" is answered once for the entire site.

   Roles.of() takes the readable form an algorithm wants to write —

       Roles.of({ scan: [j, j + 1], done: Roles.range(k, n) })

   — and flattens it to { '3': 'scan', '4': 'scan', … }. Later keys win, so an algorithm can
   list the broad set first and the specific one after it. */
(function () {
  'use strict';

  function of(spec) {
    var out = {};
    for (var role in spec) {
      var keys = spec[role];
      if (keys == null) continue;
      if (!Array.isArray(keys)) keys = [keys];
      for (var i = 0; i < keys.length; i++) if (keys[i] != null) out[keys[i]] = role;
    }
    return out;
  }

  window.Roles = {
    of: of,
    /* [from, to) as an array of keys — the sorted tail of an array, a run of visited cells */
    range: function (from, to) {
      var out = [];
      for (var i = Math.max(0, from); i < to; i++) out.push(i);
      return out;
    },
    /* what a renderer calls per element; unknown keys are idle, which is the point — an
       algorithm marks only what it is touching and never has to list the rest */
    at: function (map, key, fallback) { return (map && map[key]) || fallback || 'idle'; },
  };
})();
