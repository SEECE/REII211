/* The Manhattan page. Plain script, one global `CityPage`.

   The same five algorithms as the node plane, on a map instead of a diagram — and the point of
   the page is that NOTHING about them changed. A street map is a graph, so js/graph/traverse.js,
   js/graph/shortest.js and js/graph/spanning.js run here exactly as they run there.

   The city SURVIVES between runs, like the plane's graph does. Drop two pins, run BFS, then run
   Dijkstra on the same two pins, and the two answers are the page: BFS routes you through the
   fewest blocks and Dijkstra through the least of whatever the map is priced in. Prim and
   Kruskal are not routing at all and ignore the pins — they answer the other question a city
   asks, which is the cheapest set of streets that still connects every corner to every other.

   Clicking the map moves a pin, and moving a pin re-runs whatever is selected. That is the
   whole editor: there is nothing else to build here, because the map is generated. */
(function () {
  'use strict';

  /* Which of the five are routing between the pins at all. Prim and Kruskal are not — they
     take the whole map and answer a different question about it. */
  var ROUTES = { bfs: true, dfs: true, dijkstra: true };

  function algorithms() {
    return {
      bfs: window.GraphSearch.bfs, dfs: window.GraphSearch.dfs,
      dijkstra: window.GraphShortest,
      prim: window.GraphSpanning.prim, kruskal: window.GraphSpanning.kruskal,
    };
  }

  window.CityPage = function () {
    var city = null, from = null, to = null, next = 'from';

    function pins() {
      /* CityGrid builds row by row, so the first crossing is the top-left and the last is the
         bottom-right — the two furthest apart, which is where an errand wants to start. */
      var all = city.nodes();
      from = all[0].id;
      to = all[all.length - 1].id;
      next = 'from';
    }

    function fresh(rail) {
      city = window.CityGrid({
        avenues: rail.get('avenues'), streets: rail.get('streets'),
        park: rail.get('park'), closures: rail.get('closures'),
        traffic: rail.get('cost') === 'time',
      });
      pins();
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
        { id: 'algo', kind: 'choice', label: 'Algorithm', value: 'dijkstra', options: [
          { value: 'bfs', label: 'Breadth-first — fewest blocks' },
          { value: 'dfs', label: 'Depth-first — any route at all' },
          { value: 'dijkstra', label: 'Dijkstra — the cheapest route' },
          { value: 'prim', label: "Prim's — cheapest network" },
          { value: 'kruskal', label: "Kruskal's — cheapest network" },
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
          'Click a crossing to move a pin — first the From, then the To. Then run one algorithm ' +
          'at a time on the same two pins and compare what each of them came back with.' },
      ],

      file: {
        kind: 'graph',
        name: function () { return 'city-' + city.nodes().length; },
        get: function () { return city && city.nodes().length ? city.view() : null; },
        open: function (data) {
          if (!window.CityGrid.isCity(data)) {
            throw new Error('that is a graph, but it is not a street grid — every street on ' +
              'this page runs between two neighbouring crossings and that file has one that ' +
              'does not. It will open on the node plane.');
          }
          city = window.Graph.load(data);
          pins();
        },
      },

      onField: function (id, value, api) {
        // only the algorithm and the pins leave the map alone; everything else is a new city
        if (id === 'algo') return;
        fresh(api.rail);
      },

      build: function (rail) {
        if (!city) fresh(rail);
        city.resetCounters();
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
        window.CityDraw.draw(surface, frame, colours, { from: from, to: to });
      },
    });

    /* Moving a pin is a new errand, so it re-runs — unlike the node plane, where an edit is
       announced and waits, because here there is only one thing a click can mean. */
    if (page.surface) {
      page.surface.canvas.addEventListener('pointerdown', function (e) {
        var box = page.surface.canvas.getBoundingClientRect();
        var id = window.CityDraw.hit(page.surface, city.view(), e.clientX - box.left, e.clientY - box.top);
        if (id == null) return;
        if (next === 'from') { from = id; next = 'to'; } else { to = id; next = 'from'; }
        page.rebuild();
      });
    }

    return page;
  };
})();
