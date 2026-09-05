/* Self-checks for the real city — js/city/osm-index.js and js/city/osm-graph.js.

   These run against the committed extract, so nothing here is random and every number below was
   measured rather than guessed. js/tests/city.js is untouched: it checks the synthetic grid's
   known distances and those are still exactly what they were. */
(function () {
  'use strict';

  function reachable(g) {
    var ns = g.nodes();
    if (!ns.length) return 0;
    var seen = {}, stack = [ns[0].id], found = 0;
    seen[ns[0].id] = true;
    while (stack.length) {
      var at = stack.pop();
      found++;
      g.peek(at).forEach(function (e) { if (!seen[e.to]) { seen[e.to] = true; stack.push(e.to); } });
    }
    return found;
  }

  window.Check.suite('applications — Manhattan, off the map', function () {
    var C = window.Check, T = window.Trace;

    if (!window.OsmIndex || !window.OsmIndex.ready()) {
      C.ok(false, 'the OpenStreetMap extract is loaded', 'js/city/osm-manhattan.js is missing');
      return;
    }

    /* ── the split ── */
    var ix = window.OsmIndex.get();
    C.ok(Object.keys(ix.at).length > 10000, 'the extract splits into a city-sized set of crossings',
      Object.keys(ix.at).length + ' crossings');
    C.ok(ix.edges.length > Object.keys(ix.at).length,
      'and into more blocks than crossings, as a street network must be');
    C.equal(window.OsmManhattanRaw, null,
      'the raw response is let go once indexed — 126 MB of tags nothing reads');
    C.ok(/ODbL/.test(ix.meta.copyright || ''), 'the ODbL notice came through with the data');

    /* A block between two neighbouring crossings is a human distance. If the split had failed —
       if ways were joined end to end instead of cut at shared IDs — these would be kilometres. */
    var lens = ix.edges.map(function (e) { return e.m; }).sort(function (a, b) { return a - b; });
    var median = lens[Math.floor(lens.length / 2)];
    C.ok(median > 20 && median < 200, 'the median block is a block, not a whole street',
      median + ' m');

    /* ── the windows ── */
    var built = [];
    window.OsmGraph.DISTRICTS.forEach(function (d) {
      var g = window.OsmGraph.build({ lat: d.lat, lon: d.lon, span: 1200, limit: 320 });
      C.ok(g && g.nodes().length > 40, 'a window opens on ' + d.id,
        g ? g.nodes().length + ' crossings' : 'nothing built');
      if (!g) return;
      built.push({ id: d.id, g: g });

      /* Cropping a real network always leaves islands — a slip road cut off by the frame, a
         cul-de-sac reached only from outside. Keeping the largest piece is what stops a pin
         landing somewhere with no route to anywhere. */
      C.equal(reachable(g), g.nodes().length, d.id + ' comes back as one connected piece');
      C.ok(g.nodes().length <= 320, d.id + ' is inside the cap the runtime can walk',
        g.nodes().length + ' crossings');

      /* draw.js fits whatever box it is given, but CityGrid centres its map in the unit square
         and the projection has to land in the same place or the two sources would not be
         interchangeable. */
      C.ok(g.nodes().every(function (n) { return n.x >= 0 && n.x <= 1 && n.y >= 0 && n.y <= 1; }),
        d.id + ' is projected into the unit square draw.js expects');
      C.ok(g.edges().every(function (e) { return e.w >= 1 && e.w < 3000; }),
        d.id + ' weighs every block in plausible metres');
      C.ok(g.nodes().some(function (n) { return / × /.test(n.label); }),
        d.id + ' names its crossings after the streets that meet there',
        (g.nodes()[0] || {}).label);
    });

    /* ── BFS against Dijkstra, on real streets ──

       js/tests/city.js asserts that on a CLEAN synthetic grid the fewest-blocks route is also
       the shortest one, EXACTLY, and gives the reason: every route heading towards the
       destination crosses each avenue gap exactly once, so all of them weigh the same. That
       argument is a property of the abstraction, not of Manhattan. On the real mesh blocks
       differ in length, one-way pairs split, streets bend and the grid gives out below 14th, so
       two routes with the same number of corners can differ by half a kilometre and the theorem
       simply does not hold.

       What survives is weaker and still worth stating, so this checks three things:

         · EXACTLY, on every pair — BFS never comes back lighter than Dijkstra. BFS minimises
           edges and Dijkstra minimises weight, so the one can tie the other and never beat it.
           A failure here is a broken parse or a broken search, not a fact about streets.
         · The MEDIAN ratio is within 10%. Measured 1.004–1.028 over four sample sizes from 100
           to 780 pairs, so the bar sits at roughly four times the observed value: it catches a
           routing regression without being sensitive to a refetch of the extract.
         · At least 60% of pairs are within 10%. Measured 71–80% over the same samples.

       The MEDIAN, not the maximum, is deliberate. The tail is real: the worst pair measured was
       2.48× — 865 m of fewest-corners route against a 349 m shortest one, in Harlem, where the
       grid meets the diagonal of St Nicholas Avenue. That is not an error to be bounded away,
       it is the thing the page exists to show, and asserting on the maximum would be asserting
       that it does not happen. */
    var ratios = [], lighter = 0;
    built.forEach(function (w) {
      var g = w.g, ns = g.nodes(), step = Math.max(1, Math.floor(ns.length / 5));
      for (var i = 0; i < ns.length; i += step) {
        for (var j = 0; j < ns.length; j += step) {
          if (i === j) continue;
          var a = ns[i].id, b = ns[j].id;
          g.resetCounters();
          var blocks = T.run(window.GraphSearch.bfs.run(g, a, b));
          g.resetCounters();
          var best = T.run(window.GraphShortest.run(g, a, b))[b];
          if (!blocks || !isFinite(best) || best === 0) continue;
          if (blocks.weight < best) lighter++;
          ratios.push(blocks.weight / best);
        }
      }
    });

    C.ok(ratios.length >= 100, 'the sample is big enough to say anything',
      ratios.length + ' pairs');
    C.equal(lighter, 0, 'BFS never routes lighter than Dijkstra — fewest edges cannot beat least weight');

    ratios.sort(function (a, b) { return a - b; });
    var mid = ratios[Math.floor(ratios.length / 2)];
    var near = ratios.filter(function (r) { return r <= 1.1; }).length;
    C.ok(mid <= 1.1, 'the fewest-blocks route is usually within 10% of the shortest one',
      'median ' + mid.toFixed(4));
    C.ok(near / ratios.length >= 0.6, 'and most pairs are, not just the middle one',
      (100 * near / ratios.length).toFixed(1) + '% within 10%');
    C.ok(ratios[ratios.length - 1] > 1.2,
      'while some pair is well outside it — the page would have nothing to show otherwise',
      'worst ' + ratios[ratios.length - 1].toFixed(3));
  });
})();
