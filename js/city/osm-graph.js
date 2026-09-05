/* A window on the real city. Plain script, one global `OsmGraph`.

   js/city/grid.js invents a city; this one cuts a piece out of the real one that
   js/city/osm-index.js has already read off the map. Both hand back the same thing — an
   ordinary js/graph/model.js `Graph` — so nothing downstream can tell them apart and nothing
   downstream had to change. That is the whole design: the source of the nodes and edges moved,
   and the contract did not.

   Two jobs the index leaves alone, because both are about the WINDOW rather than about the map:
   reducing a crop to the one piece that is all connected, and projecting it into the unit
   square js/city/draw.js already expects.

   Data © OpenStreetMap contributors, ODbL 1.0. */
(function () {
  'use strict';

  var RAD = Math.PI / 180, R = 6371008.8;

  /* The crossings inside a window, on the wanted classes of street, reduced to the LARGEST
     PIECE that is all one thing. Cropping a real street network always leaves islands — a slip
     road cut off by the frame, a cul-de-sac reachable only from outside — and a pin dropped on
     one of those has no route to anywhere, which is a true answer to a question nobody asked.
     The synthetic grid never had the problem because it was connected by construction. */
  function crop(ix, box, classes) {
    var inside = {}, adj = {}, keep = [], id;
    for (id in ix.at) {
      var n = ix.at[id];
      if (n.lat >= box.south && n.lat <= box.north && n.lon >= box.west && n.lon <= box.east) {
        inside[id] = n;
        adj[id] = [];
      }
    }
    ix.edges.forEach(function (e) {
      if (!inside[e.a] || !inside[e.b] || (classes && !classes[e.cls])) return;
      keep.push(e);
      adj[e.a].push(e.b);
      adj[e.b].push(e.a);
    });

    var seen = {}, best = [];
    for (id in inside) {
      if (seen[id]) continue;
      var part = [], stack = [id];
      seen[id] = 1;
      while (stack.length) {
        var here = stack.pop();
        part.push(here);
        adj[here].forEach(function (to) { if (!seen[to]) { seen[to] = 1; stack.push(to); } });
      }
      if (part.length > best.length) best = part;
    }
    var live = {};
    best.forEach(function (kept) { live[kept] = inside[kept]; });
    return { at: live, edges: keep.filter(function (e) { return live[e.a] && live[e.b]; }) };
  }

  /* What a crossing is called: the streets that meet at it. OSM has no name for the junction
     itself, and "Broadway × W 42nd St" is what a person would say — so the narration comes out
     reading like directions instead of like node ids. */
  function label(n) {
    if (!n.names.length) return 'a corner';
    if (n.names.length === 1) return n.names[0];
    return n.names[0] + ' × ' + n.names[1];
  }

  window.OsmGraph = {
    /* Windows worth looking at. They are here rather than in the page because which parts of
       this extract are interesting is a fact about the extract. */
    DISTRICTS: [
      { id: 'midtown', label: 'Midtown — the grid at its most regular', lat: 40.7561, lon: -73.9845 },
      { id: 'village', label: 'Greenwich Village — where the grid gives up', lat: 40.7336, lon: -74.0027 },
      { id: 'financial', label: 'Financial District — streets older than the grid', lat: 40.7075, lon: -74.0100 },
      { id: 'ues', label: 'Upper East Side — long avenues, short blocks', lat: 40.7736, lon: -73.9566 },
      { id: 'harlem', label: 'Harlem — the grid, turned', lat: 40.8090, lon: -73.9460 },
    ],

    ready: function () { return window.OsmIndex.ready(); },

    /* build({ lat, lon, span, classes, limit }) → a Graph, or null if the extract is missing.
       `span` is the width of the window in metres. `limit` is the most crossings the runtime is
       willing to walk: the window is tightened around its centre until it fits, rather than
       handing the player a trace that would take the tab down with it. */
    build: function (o) {
      var ix = window.OsmIndex.get();
      if (!ix) return null;
      var classes = null;
      if (o.classes) { classes = {}; o.classes.forEach(function (c) { classes[c] = 1; }); }

      var span = o.span || 1200, limit = o.limit || 320, piece = null;
      for (var tries = 0; tries < 40; tries++) {
        var half = span / 2;
        var dLat = half / (R * RAD), dLon = half / (R * RAD * Math.cos(o.lat * RAD));
        piece = crop(ix, { south: o.lat - dLat, north: o.lat + dLat,
          west: o.lon - dLon, east: o.lon + dLon }, classes);
        if (Object.keys(piece.at).length <= limit) break;
        span *= 0.92;
      }

      /* Equirectangular. Longitude is scaled by cos(latitude) so a degree of it gets the width
         it actually has here; latitude is used as it stands and flipped, because north is up and
         a canvas grows downwards. Both axes are then divided by ONE number and centred, exactly
         as CityGrid centres its grid — so a street that runs at 45° is drawn at 45°, and
         js/city/draw.js fits the result without knowing which city made it. */
      var ids = Object.keys(piece.at);
      if (!ids.length) return null;
      var kx = Math.cos(o.lat * RAD);
      var xs = ids.map(function (id) { return piece.at[id].lon * kx; });
      var ys = ids.map(function (id) { return -piece.at[id].lat; });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
      var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      var scale = Math.max(x1 - x0, y1 - y0) || 1;
      var ox = (1 - (x1 - x0) / scale) / 2, oy = (1 - (y1 - y0) / scale) / 2;

      var g = window.Graph(), made = {};
      ids.forEach(function (id, i) {
        made[id] = g.addNode(label(piece.at[id]),
          ox + (xs[i] - x0) / scale, oy + (ys[i] - y0) / scale);
      });
      piece.edges.forEach(function (e) { g.addEdge(made[e.a], made[e.b], e.m); });
      g.span = Math.round(span);            // page furniture, as CityGrid's `closures` is
      return g;
    },
  };
})();
