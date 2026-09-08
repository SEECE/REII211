/* The extract, turned into crossings and blocks. Plain script, one global `OsmIndex`.

   OSM does not store intersections. It stores WAYS — "West 42nd Street" is one way with a few
   hundred points along it — and a junction exists only implicitly, where two ways quote the
   same node ID. This file is the one that knows that.

   **Split.** A way is walked point by point with metres accumulating, and cut every time it
   reaches an ID some other way also uses. What comes out is a graph whose nodes are real
   crossings and whose edges are real blocks. Draw the raw ways instead and every algorithm on
   the site would be routing over a mesh where crossing streets never actually meet.

   **Measure.** Haversine along every point of the block rather than a straight line between its
   ends — Broadway bends, and a router that thinks it does not reports a distance nobody walks.

   The result indexes the WHOLE extract and is built once. js/city/osm-graph.js cuts windows out
   of it; nothing here knows what a window is.

   Data © OpenStreetMap contributors, ODbL 1.0. */
(function () {
  'use strict';

  var R = 6371008.8;                    // mean Earth radius, metres
  var RAD = Math.PI / 180;

  function metres(a, b) {
    var p1 = a.lat * RAD, p2 = b.lat * RAD;
    var dp = (b.lat - a.lat) * RAD / 2, dl = (b.lon - a.lon) * RAD / 2;
    var h = Math.sin(dp) * Math.sin(dp) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl) * Math.sin(dl);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  var index = null;

  /* Built from the raw response, which is then LET GO. The extract is 17.6 MB and 126 MB once
     parsed, nearly all of it tags — surface, cycleway, tiger:*, a hundred keys nothing here
     reads. What is kept is the crossings, the blocks between them and the street names: about
     6 MB, and the only thing any window will ever ask for. */
  function build() {
    var raw = window.OsmManhattanRaw;
    if (!raw || !raw.elements) return null;
    var ways = raw.elements, once = {}, junction = {};

    /* A node quoted by two ways is a crossing; the two ends of a way are crossings whether or
       not anything meets them, because a street that stops has to stop somewhere. Distinct WAYS
       rather than appearances: a way that returns to its own node — a loop, a turning circle —
       would otherwise look like a crossroads it is not. */
    ways.forEach(function (w) {
      var ns = w.nodes;
      if (!ns || !w.geometry) return;
      var here = {};
      for (var i = 0; i < ns.length; i++) {
        if (here[ns[i]]) continue;
        here[ns[i]] = 1;
        if (once[ns[i]]) junction[ns[i]] = 1; else once[ns[i]] = 1;
      }
      junction[ns[0]] = junction[ns[ns.length - 1]] = 1;
    });

    var at = {}, edges = [], pair = {};
    ways.forEach(function (w) {
      var ns = w.nodes, gs = w.geometry;
      if (!ns || !gs || ns.length !== gs.length) return;
      var cls = (w.tags && w.tags.highway) || 'road', name = (w.tags && w.tags.name) || '';
      var from = null, run = 0;
      for (var i = 0; i < ns.length; i++) {
        if (i) run += metres(gs[i - 1], gs[i]);
        if (!junction[ns[i]]) continue;
        var id = ns[i];
        if (!at[id]) at[id] = { lat: gs[i].lat, lon: gs[i].lon, names: [] };
        if (name && at[id].names.indexOf(name) < 0) at[id].names.push(name);
        if (from !== null && from !== id) {
          var key = from < id ? from + ':' + id : id + ':' + from;
          var m = Math.max(1, Math.round(run));
          /* Two ways can run between one pair of crossings — a dual carriageway, a slip road.
             Keep the shorter: it is the one a router would take, and drawing both would put one
             line exactly underneath another. */
          if (pair[key] == null) { pair[key] = edges.length; edges.push({ a: from, b: id, m: m, cls: cls }); }
          else if (m < edges[pair[key]].m) edges[pair[key]].m = m;
        }
        from = id;
        run = 0;
      }
    });

    var meta = raw.osm3s || {};
    window.OsmManhattanRaw = null;
    return { at: at, edges: edges, meta: meta };
  }

  window.OsmIndex = {
    ready: function () { return !!(index || window.OsmManhattanRaw); },
    /* Built on first use and kept, because every window asks the same question of it. */
    get: function () { if (!index) index = build(); return index; },
    meta: function () { var ix = window.OsmIndex.get(); return ix ? ix.meta : {}; },
    metres: metres,
    R: R,
    RAD: RAD,
  };
})();
