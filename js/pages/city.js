/* The Manhattan page. Plain script, one global `CityPage`.

   The same five algorithms as the node plane, on a map instead of a diagram — and the point of
   the page is that NOTHING about them changed. A street map is a graph, so js/graph/traverse.js,
   js/graph/shortest.js and js/graph/spanning.js run here exactly as they run there.

   Which map — the real streets or the invented grid — is js/city/source.js's business, not
   this file's. Both hand back an ordinary `Graph`, so everything below is written once.

   The city SURVIVES between runs, like the plane's graph does. Drop two pins, run BFS, then run
   Dijkstra on the same two pins, and the two answers are the page. Prim and Kruskal ignore the
   pins and answer the other question a city asks, which is the cheapest set of streets that
   still connects every corner.

   The real map is the WHOLE island — thirteen thousand crossings, resident the whole time — so
   the stage is a viewport over it (js/city/camera.js, js/city/controls.js) and none of that
   reached the Graph. The camera survives a REBUILD, which happens on every pin drop, and is
   reset only by a new map: being thrown back to the island every time would be unusable. */
(function () {
  'use strict';

  /* Which of the five are routing between the pins at all. Prim and Kruskal are not — they
     take the whole map and answer a different question about it. */
  var ROUTES = { bfs: true, dfs: true, dijkstra: true };

  /* Prim is the one algorithm that cannot walk the whole island: its narration shows every edge
     CROSSING OUT of the tree, a different set each step and growing with it. Measured, that is
     13,047 steps, 7.5 seconds and 3.8 GB — the frames, not the algorithm. The other four state
     their beats as deltas and finish; this one has nothing to state a delta ABOUT, because what
     it draws really did all change. So it is capped and says so. */
  var PRIM_STEPS = 1200;
  var PRIM_WHY = 'Prim rescans every street crossing out of the tree on every step, so the work ' +
    'and the drawing both grow with the tree — thirteen thousand crossings is more than a ' +
    'browser will finish. <b>Kruskal</b> answers the same question on the whole island, because ' +
    'it sorts the streets once and never looks back; or switch to the idealised grid and watch ' +
    'Prim reach the end.';
  var GRID_ONLY = ['cost', 'avenues', 'streets', 'closures', 'park', 'generate'];
  var OSM_ONLY = ['district', 'roads'];
  /* Where the pins start on the real map. Opposite ends of it is a five-mile errand and 26,000
     steps of Dijkstra — true, and a poor first thing to be shown. */
  var START = { from: 'midtown', to: 'village' };

  function algorithms() {
    return {
      bfs: window.GraphSearch.bfs, dfs: window.GraphSearch.dfs,
      dijkstra: window.GraphShortest,
      prim: window.GraphSpanning.prim, kruskal: window.GraphSpanning.kruskal,
    };
  }

  window.CityPage = function () {
    var city = null, from = null, to = null;
    var cam = window.CityCamera(), controls = null, blocks = false;
    var credit = document.querySelector('[data-credit]');

    function real(rail) { return rail.get('source') === 'osm'; }

    function fresh(rail) {
      city = window.CitySource.build({
        real: real(rail), district: rail.get('district'), span: rail.get('span'),
        roads: rail.get('roads'), avenues: rail.get('avenues'), streets: rail.get('streets'),
        park: rail.get('park'), closures: rail.get('closures'),
        traffic: rail.get('cost') === 'time',
      });
      /* On the island the pins start at two named places, because opposite ends of it is a
         five-mile errand. On a district — or on the grid — the two corners furthest apart are
         the walk the page wants to talk about, and they are a few hundred metres. */
      if (real(rail) && rail.get('district') === 'all') {
        from = atDistrict(START.from);
        to = atDistrict(START.to);
      } else {
        var two = window.CitySource.pins(city);
        from = two.from;
        to = two.to;
      }
      cam.reset();                  // a different map is a different thing to be looking at
    }

    /* A district centre, as a crossing. The list used to decide what was BUILT; it now decides
       where the pins start and where the viewport is pointed, which is the same list doing a
       job that no longer costs the rest of the island. */
    function atDistrict(id) {
      var d = window.OsmGraph.DISTRICTS.filter(function (x) { return x.id === id; })[0];
      if (!d || !d.lat || !city.place) return city.nodes()[0].id;
      var at = city.place(d.lat, d.lon);
      return window.CitySource.nearest(city, at.x, at.y);
    }

    function name(id) {
      var n = city.node(id);
      return n ? n.label : '?';
    }

    var page = window.Playground({
      title: 'Manhattan',
      legend: ['idle', 'frontier', 'focus', 'scan', 'move', 'reject', 'path', 'done'],
      legendNotes: Object.assign({}, window.GraphSearch.notes, window.GraphShortest.notes,
        window.GraphSpanning.prim.notes),

      fields: window.CityRail(),

      file: {
        kind: 'graph',
        empty: 'the real map is the whole island — thirteen thousand crossings called things ' +
          'like "Broadway × West 42nd Street" — and a .reii graph holds 64 nodes with ' +
          'three-letter labels. Switch the map to the idealised grid to save one.',
        name: function () { return 'city-' + city.nodes().length; },
        get: function () {
          return real(page.rail) || !city.nodes().length ? null : city.view();
        },
        open: function (data, saved, api) {
          if (!window.CityGrid.isCity(data)) {
            throw new Error('that is a graph, but it is not a street grid — every street on ' +
              'this page runs between two neighbouring crossings and that file has one that ' +
              'does not. It will open on the node plane.');
          }
          // set the source FIRST: it rebuilds a fresh grid, which the load then replaces
          api.rail.set('source', 'grid');
          city = window.Graph.load(data);
          var two = window.CitySource.pins(city);
          from = two.from;
          to = two.to;
        },
      },

      onField: function (id, value, api) {
        // only the algorithm leaves the map alone; everything else asks for a different one
        if (id === 'algo') return;
        fresh(api.rail);
      },

      build: function (rail) {
        if (!city) fresh(rail);
        var osm = real(rail);
        OSM_ONLY.forEach(function (f) { rail.show(f, osm); });
        GRID_ONLY.forEach(function (f) { rail.show(f, !osm); });
        // the window width means nothing until there is a window to be the width of
        rail.show('span', osm && rail.get('district') !== 'all');
        window.CitySource.credit(credit, city);
        city.resetCounters();
        /* Read here and not in render(): Playground draws its first frame while it is still
           being constructed, so `page` does not exist yet — but build() has always run first. */
        blocks = !osm;
        var which = rail.get('algo'), chosen = algorithms()[which];
        return {
          subject: city,
          gen: chosen.run(city, from, to),
          opts: osm && which === 'prim' ? { max: PRIM_STEPS, why: PRIM_WHY } : null,
          title: ROUTES[which]
            ? chosen.label + ' — ' + name(from) + ' to ' + name(to)
            : chosen.label + ' — every corner connected',
        };
      },

      render: function (surface, frame, colours) {
        if (!frame) return;
        // the first frame of a new map is where the whole of it is framed, and the only place
        // the camera is ever reset — a rebuild after a pin drop must not move the view
        if (!cam.placed()) cam.fit(frame.state);
        window.CityDraw.draw(surface, frame, colours, {
          from: from, to: to, cam: cam, held: controls && controls.held(),
          blocks: blocks, cls: city.cls, span: city.span,
        });
      },
    });

    /* The pointer is js/city/controls.js's business — one file for pan, zoom and the two
       draggable pins, so this one stays about the algorithms. It owns the pin in flight. */
    controls = window.CityControls({
      page: page, cam: cam,
      city: function () { return city; },
      pins: function () { return { from: from, to: to }; },
      drop: function (pin, id) {
        if (pin === 'From') from = id; else to = id;
        page.rebuild();
      },
    });

    return page;
  };
})();
