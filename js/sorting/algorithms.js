/* The sort registry. Plain script, one global `Sorts`.

   A sort registers itself here and the page reads it back by id, so js/pages/sort.js contains
   no list of algorithms and a seventh sort is a new file plus a sitemap entry — nothing else.

   An entry:
     { id, label, complexity, blurb,
       roles:   the role names its legend explains, in the order they should be read
       notes:   per-role caption overrides (what `scan` means for THIS sort)
       run(tape) -> generator yielding { note, tag, roles } }

   The `v()` helper below is the only formatting an algorithm does — everything else it yields
   is prose. Values are wrapped so the workbench can typeset a number differently from a word. */
(function () {
  'use strict';

  var registry = {};

  window.Sorts = {
    register: function (spec) { registry[spec.id] = spec; return spec; },
    get: function (id) { return registry[id]; },
    ids: function () { return Object.keys(registry); },

    /* a value, marked up so css/workbench-head.css can set it in the mono face */
    v: function (x) { return '<span class="val">' + x + '</span>'; },
    /* position i holding value x — the phrase every one of these sorts needs */
    at: function (i, x) { return '<span class="val">[' + i + ']</span>&thinsp;=&thinsp;<span class="val">' + x + '</span>'; },
  };
})();
