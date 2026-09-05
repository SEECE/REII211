/* The real city, whole. Plain script, one global `OsmGraph`.

   js/city/grid.js invents a city; this one hands over the one that js/city/osm-index.js has
   already read off the map. Both hand back the same thing — an ordinary js/graph/model.js
   `Graph` — so nothing downstream can tell them apart. That is the whole design: the source of
   the nodes and edges moved, and the contract did not.

   It builds either the WHOLE island or one district cut out of it, and the difference between
   those two is now a choice rather than a limit. It used to be a limit: a window was tightened
   until its crossings fitted a cap the runtime could walk. The cap is gone — nothing about the
   graph made it necessary, it was the frame cost of walking one and js/core/trace.js no longer
   pays it — so the island builds whole and what changes with the zoom is only what
   js/city/draw.js bothers to paint.

   The window stayed because it is not the same thing as zooming in. A district is a smaller
   PROBLEM — fewer crossings for an algorithm to settle, a route that finishes in a hundred
   steps instead of twenty thousand — where zooming is the same problem seen closer. Both are
   worth having and they answer different questions.

   Two jobs the index still leaves alone, because both are about presenting the map rather than
   reading it: reducing it to the one piece that is all connected, and projecting it into the
   unit square js/city/draw.js expects.

   Data © OpenStreetMap contributors, ODbL 1.0. */
(function () {
  'use strict';

  var RAD = Math.PI / 180, R = 6371008.8;

  /* The crossings on the wanted classes of street — inside a box, if there is one — reduced to
     the LARGEST PIECE that is all one thing. A real street network is not connected: the
     extract's own edge cuts streets off, a slip road reaches nothing, a service spur is quoted
     by one way and no other, and cropping a window adds more of the same. Whole-island that is
     18,297 crossings and 25,905 blocks arriving and 13,048 and 19,133 surviving, and the ones
     that go are exactly the ones where a pin would have had no route to anywhere, which is a
     true answer to a question nobody asked. The synthetic grid never had the problem because it
     was connected by construction. */
  function piece(ix, classes, box) {
    var inside = {}, adj = {}, keep = [], id;
    for (id in ix.at) {
      var n = ix.at[id];
      if (box && (n.lat < box.south || n.lat > box.north ||
        n.lon < box.west || n.lon > box.east)) continue;
      inside[id] = n;
      adj[id] = [];
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
     reading like directions instead of like node ids.

     Abbreviated the way a street sign is. It is not only tidier: the searches pin their visit
     ORDER as a counter, and a crossing written out in full is "West Forty-Sixth Street" in a
     panel four inches wide. */
  var SHORT = [
    [/\bStreet\b/g, 'St'], [/\bAvenue\b/g, 'Ave'], [/\bBoulevard\b/g, 'Blvd'],
    [/\bPlace\b/g, 'Pl'], [/\bTerrace\b/g, 'Terr'], [/\bParkway\b/g, 'Pkwy'],
    [/\bDrive\b/g, 'Dr'], [/\bRoad\b/g, 'Rd'], [/\bSquare\b/g, 'Sq'],
    [/\bLane\b/g, 'Ln'], [/\bCourt\b/g, 'Ct'], [/\bBridge\b/g, 'Br'],
    [/\bTunnel\b/g, 'Tnl'], [/\bHighway\b/g, 'Hwy'],
    [/^West /, 'W '], [/^East /, 'E '], [/^North /, 'N '], [/^South /, 'S '],
  ];

  function short(name) {
    SHORT.forEach(function (rule) { name = name.replace(rule[0], rule[1]); });
    return name;
  }

  function label(n) {
    if (!n.names.length) return 'a corner';
    if (n.names.length === 1) return short(n.names[0]);
    return short(n.names[0]) + ' × ' + short(n.names[1]);
  }

  window.OsmGraph = {
    /* What can be built: the island, or one district cut out of it. */
    DISTRICTS: [
      { id: 'all', label: 'The whole island' },
      { id: 'midtown', label: 'Midtown', lat: 40.7561, lon: -73.9845 },
      { id: 'village', label: 'Greenwich Village', lat: 40.7336, lon: -74.0027 },
      { id: 'financial', label: 'Financial District', lat: 40.7075, lon: -74.0100 },
      { id: 'ues', label: 'Upper East Side', lat: 40.7736, lon: -73.9566 },
      { id: 'harlem', label: 'Harlem', lat: 40.8090, lon: -73.9460 },
    ],

    ready: function () { return window.OsmIndex.ready(); },

    /* build({ classes, at: { lat, lon }, span }) → a Graph, or null if the extract is missing.
       With no `at` it is the whole island; with one it is a `span`-metre window around it, and
       there is no cap on either — a window is a smaller problem because it was asked for, not
       because the runtime could not manage a bigger one. */
    build: function (o) {
      var ix = window.OsmIndex.get();
      if (!ix) return null;
      o = o || {};
      var classes = null, box = null;
      if (o.classes) { classes = {}; o.classes.forEach(function (c) { classes[c] = 1; }); }
      if (o.at) {
        var half = (o.span || 1200) / 2;
        var dLat = half / (R * RAD), dLon = half / (R * RAD * Math.cos(o.at.lat * RAD));
        box = { south: o.at.lat - dLat, north: o.at.lat + dLat,
          west: o.at.lon - dLon, east: o.at.lon + dLon };
      }
      var kept = piece(ix, classes, box);
      var ids = Object.keys(kept.at);
      if (!ids.length) return null;

      /* Equirectangular. Longitude is scaled by cos(latitude) so a degree of it gets the width
         it actually has here; latitude is used as it stands and flipped, because north is up and
         a canvas grows downwards. Both axes are then divided by ONE number and centred, exactly
         as CityGrid centres its grid — so a street that runs at 45° is drawn at 45°, and
         js/city/draw.js fits the result without knowing which city made it. Manhattan comes out
         a tall narrow sliver, which is what Manhattan is. */
      /* cos() of the MIDDLE of the island, not of whichever crossing happened to be indexed
         first: Manhattan spans a fifth of a degree and using an end tilts the whole projection. */
      var lats = ids.map(function (id) { return kept.at[id].lat; });
      var kx = Math.cos((Math.min.apply(null, lats) + Math.max.apply(null, lats)) / 2 * RAD);
      var xs = ids.map(function (id) { return kept.at[id].lon * kx; });
      var ys = ids.map(function (id) { return -kept.at[id].lat; });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
      var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      var scale = Math.max(x1 - x0, y1 - y0) || 1;
      var ox = (1 - (x1 - x0) / scale) / 2, oy = (1 - (y1 - y0) / scale) / 2;
      function place(lat, lon) {
        return { x: ox + (lon * kx - x0) / scale, y: oy + (-lat - y0) / scale };
      }

      var g = window.Graph(), made = {}, cls = {};
      ids.forEach(function (id, i) {
        made[id] = g.addNode(label(kept.at[id]), ox + (xs[i] - x0) / scale, oy + (ys[i] - y0) / scale);
      });
      kept.edges.forEach(function (e) {
        var made2 = g.addEdge(made[e.a], made[e.b], e.m);
        if (made2) cls[made2.key] = e.cls;
      });

      /* Page furniture, as CityGrid's `closures` is — not part of the Trace subject contract
         and not in view(), because none of it is the graph. `cls` is what js/city/draw.js thins
         by when the whole island is on screen; `place` is what moves the viewport to a district.
         Keeping the street class OUT of the Graph is deliberate: an edge is two ends and a
         weight on every other page, and it stays that way here. */
      g.span = Math.round(scale * RAD * R);
      g.cls = cls;
      g.place = place;
      return g;
    },
  };
})();
