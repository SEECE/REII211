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

   The real map is now the WHOLE island — thirteen thousand crossings, resident the entire time
   — so the stage is a viewport over it rather than the whole of it (js/city/camera.js,
   js/city/controls.js). None of that reached the Graph, which is the same object it always was.
   The camera survives a REBUILD, which happens on every pin drop, and is reset only by a new
   map: being thrown back to the whole island on every drop would make the page unusable. */
(function () {
  'use strict';

  /* Which of the five are routing between the pins at all. Prim and Kruskal are not — they
     take the whole map and answer a different question about it. */
  var ROUTES = { bfs: true, dfs: true, dijkstra: true };
  var GRID_ONLY = ['cost', 'avenues', 'streets', 'closures', 'park', 'generate'];
  var OSM_ONLY = ['district', 'roads'];
  /* Where the two pins start on the real map. Opposite ends of the island is a five-mile errand
     and around 26,000 steps of Dijkstra — true, and a poor first thing to be shown. */
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
        real: real(rail),
        roads: rail.get('roads'), avenues: rail.get('avenues'), streets: rail.get('streets'),
        park: rail.get('park'), closures: rail.get('closures'),
        traffic: rail.get('cost') === 'time',
      });
      if (real(rail)) {
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

      fields: [
        { id: 'source', kind: 'choice', label: 'Map', value: 'osm', options: [
          { value: 'osm', label: 'Manhattan — the real streets' },
          { value: 'grid', label: 'An idealised grid' },
        ] },
        { id: 'algo', kind: 'choice', label: 'Algorithm', value: 'dijkstra', options: [
          { value: 'bfs', label: 'Breadth-first — fewest blocks' },
          { value: 'dfs', label: 'Depth-first — any route at all' },
          { value: 'dijkstra', label: 'Dijkstra — the cheapest route' },
          { value: 'prim', label: "Prim's — cheapest network" },
          { value: 'kruskal', label: "Kruskal's — cheapest network" },
        ] },
        /* This moves the VIEWPORT. It used to decide which few hundred crossings existed at
           all, and the whole island existing instead is the point of the page now. */
        { id: 'district', kind: 'select', label: 'Look at', value: 'all',
          options: (window.OsmGraph ? window.OsmGraph.DISTRICTS : []).map(function (d) {
            return { value: d.id, label: d.label };
          }) },
        { id: 'roads', kind: 'select', label: 'Streets', value: 'all', options: [
          { value: 'all', label: 'Every street' },
          { value: 'main', label: 'Main roads only' },
        ] },
        { id: 'cost', kind: 'choice', label: 'A block costs', value: 'distance', options: [
          { value: 'distance', label: 'Distance — metres walked' },
          { value: 'time', label: 'Time — metres and traffic' },
        ] },
        { id: 'avenues', kind: 'range', label: 'Avenues', min: 3, max: 8, value: 5 },
        { id: 'streets', kind: 'range', label: 'Streets', min: 3, max: 8, value: 8 },
        { id: 'closures', kind: 'range', label: 'Closed streets', min: 0, max: 10, value: 3 },
        { id: 'park', kind: 'check', label: 'Put a park in the middle', value: true },
        { id: 'generate', kind: 'button', label: 'New city', variant: 'primary' },
        { id: 'hint', kind: 'note', spacer: true, label:
          'Drag a pin to move it — it snaps to the crossing you drop it on. Drag the map to ' +
          'pan it and scroll to zoom. Then run one algorithm at a time on the same two pins ' +
          'and compare what each of them came back with.' },
      ],

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
        /* Three kinds of field now. `algo` asks a different question of the same map; `district`
           asks nothing at all and only points the camera somewhere, so it repaints rather than
           re-running; everything else asks for a different map. */
        if (id === 'algo') return;
        if (id === 'district') { controls.look(value); return false; }
        fresh(api.rail);
      },

      build: function (rail) {
        if (!city) fresh(rail);
        var osm = real(rail);
        OSM_ONLY.forEach(function (f) { rail.show(f, osm); });
        GRID_ONLY.forEach(function (f) { rail.show(f, !osm); });
        window.CitySource.credit(credit, city);
        city.resetCounters();
        /* Read here and not in render(): Playground draws its first frame while it is still
           being constructed, so `page` does not exist yet — but build() has always run first. */
        blocks = !osm;
        var which = rail.get('algo'), chosen = algorithms()[which];
        return {
          subject: city,
          gen: chosen.run(city, from, to),
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
