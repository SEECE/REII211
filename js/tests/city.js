/* Self-checks for the city — the street grid and the claims the page makes on it.

   The page's whole argument is that the fewest BLOCKS and the fewest METRES are two different
   questions, so the check that matters is a map where they have two different answers. That one
   is built by hand rather than generated: a claim the narration makes has to be checked against
   a case that cannot drift out from under it. */
(function () {
  'use strict';

  /* Five avenues, two narrow gaps to the west and one wide one to the east, three streets, and
     the way straight down from C1 shut along with the short way round. Going east is two corners
     shorter; going west is 80 m less walking. */
  function handmade() {
    var g = window.Graph(), gaps = [120, 120, 280, 120], x = [0], id = {};
    gaps.forEach(function (d, i) { x.push(x[i] + d); });
    var span = x[4];
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 5; c++) id[c + ',' + r] = g.addNode('ABCDE'[c] + (r + 1), x[c] / span, 0.3 + r * 80 / span);
    }
    for (r = 0; r < 3; r++) {
      for (c = 0; c < 5; c++) {
        if (c < 4) g.addEdge(id[c + ',' + r], id[(c + 1) + ',' + r], gaps[c]);
        if (r < 2) g.addEdge(id[c + ',' + r], id[c + ',' + (r + 1)], 80);
      }
    }
    g.removeEdge(id['2,0'], id['2,1']);          // both blocks straight down from C1 are shut
    g.removeEdge(id['2,1'], id['2,2']);
    g.removeEdge(id['1,0'], id['1,1']);          // and so is the short way round to the west
    return { g: g, from: id['2,0'], to: id['2,2'] };
  }

  function reachable(g) {
    var seen = {}, stack = [g.nodes()[0].id], found = 0;
    seen[stack[0]] = true;
    while (stack.length) {
      var at = stack.pop();
      found++;
      g.peek(at).forEach(function (e) { if (!seen[e.to]) { seen[e.to] = true; stack.push(e.to); } });
    }
    return found;
  }

  window.Check.suite('applications — the street grid', function () {
    var C = window.Check, T = window.Trace;

    /* ── the map itself ── */
    [[3, 3], [6, 4], [8, 8]].forEach(function (dim) {
      [false, true].forEach(function (park) {
        var city = window.CityGrid({ avenues: dim[0], streets: dim[1], park: park, closures: 6 });
        var name = dim.join('x') + (park ? ' with a park' : '');

        C.equal(reachable(city), city.nodes().length,
          'every corner is still reachable after the closures (' + name + ')');
        C.ok(city.nodes().length <= dim[0] * dim[1],
          'a park removes crossings rather than adding them (' + name + ')');
        C.ok(window.CityGrid.isCity(city.view()),
          'every street runs between two neighbouring crossings (' + name + ')');
        C.ok(city.edges().every(function (e) { return e.w > 0 && e.w <= 999; }),
          'every block is a weight the file format will carry (' + name + ')');
        C.equal(city.nodes()[0].label, 'A1', 'the first crossing made is the top-left (' + name + ')');
      });
    });

    /* Closures are refused when they would cut the city in two, so asking for more than the map
       can spare must not strand anybody — the counter is what was actually shut. */
    var heavy = window.CityGrid({ avenues: 4, streets: 4, park: true, closures: 40 });
    C.equal(reachable(heavy), heavy.nodes().length, 'asking for 40 closures still leaves one city');
    C.ok(heavy.closures < 40, 'and reports how many it could actually shut, not how many were asked for');

    /* A node plane is the same file KIND and must still be turned away, because this page draws
       blocks between four corners and that graph has none. */
    C.ok(!window.CityGrid.isCity(window.Graph.random(9, 4).view()),
      'a graph that is not a street grid is not mistaken for one');

    /* ── what the algorithms find on it ── */
    var made = handmade(), g = made.g;

    g.resetCounters();
    var bfs = T.run(window.GraphSearch.bfs.run(g, made.from, made.to));
    g.resetCounters();
    var dij = T.run(window.GraphShortest.run(g, made.from, made.to));

    C.equal(bfs.hops, 4, 'BFS takes the route with the fewest blocks');
    C.equal(bfs.weight, 720, 'and it is 720 m of walking');
    C.equal(dij[made.to], 640, 'Dijkstra finds a route of 640 m instead');
    C.ok(bfs.weight > dij[made.to],
      'so fewest blocks and shortest distance really are different questions');

    g.resetCounters();
    var dfs = T.run(window.GraphSearch.dfs.run(g, made.from, made.to));
    C.ok(dfs.weight >= dij[made.to], 'and DFS never beats either of them');

    /* On a clean grid they must agree, and the reason is worth pinning: every route that only
       heads towards the destination crosses each avenue gap exactly once, so all of them weigh
       the same. Take the park and the closures away and the disagreement above disappears. */
    for (var trial = 0; trial < 8; trial++) {
      var clean = window.CityGrid({ avenues: 4 + (trial % 5), streets: 3 + (trial % 4), park: false, closures: 0 });
      var ns = clean.nodes(), a = ns[0].id, b = ns[ns.length - 1].id;
      clean.resetCounters();
      var quick = T.run(window.GraphSearch.bfs.run(clean, a, b));
      clean.resetCounters();
      var short = T.run(window.GraphShortest.run(clean, a, b));
      C.equal(quick.weight, short[b],
        'on a clean grid the fewest-blocks route is also the shortest one (trial ' + trial + ')');
    }

    /* With traffic charged, the weights stop being distances and the two come apart all over
       the map — but the ordering never inverts: BFS is counting blocks, so it can only ever
       match Dijkstra or lose to it. */
    var apart = 0;
    for (trial = 0; trial < 12; trial++) {
      var city = window.CityGrid({ avenues: 6, streets: 5, park: true, closures: 4, traffic: true });
      var list = city.nodes(), from = list[0].id, to = list[list.length - 1].id;
      city.resetCounters();
      var blocks = T.run(window.GraphSearch.bfs.run(city, from, to));
      city.resetCounters();
      var fastest = T.run(window.GraphShortest.run(city, from, to));
      C.ok(blocks.weight >= fastest[to],
        'the fewest-blocks route never costs less than the cheapest one (trial ' + trial + ')',
        blocks.weight + ' < ' + fastest[to]);
      if (blocks.weight > fastest[to]) apart++;

      city.resetCounters();
      var prim = T.run(window.GraphSpanning.prim.run(city, from));
      city.resetCounters();
      C.equal(prim, T.run(window.GraphSpanning.kruskal.run(city)),
        'the cheapest street network costs the same whichever way it is grown (trial ' + trial + ')');
    }
    C.ok(apart > 0, 'and charging for traffic makes them disagree somewhere', apart + ' of 12');
  });
})();
