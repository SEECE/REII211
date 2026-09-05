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

    /* ── the island ──

       There is no window and no cap any more. What is built is everything that is CONNECTED:
       18,297 crossings and 25,905 blocks go in, 13,048 and 19,133 come out. The ones that go
       are the ones the extract's own edge cut off, and a pin dropped on one of those would
       have had no route to anywhere. */
    var g = window.OsmGraph.build({});
    C.ok(g && g.nodes().length > 12000, 'the whole island builds, with no cap on it',
      g ? g.nodes().length.toLocaleString() + ' crossings' : 'nothing built');
    C.ok(g.edges().length > g.nodes().length, 'and holds more blocks than crossings');
    C.equal(reachable(g), g.nodes().length, 'and comes back as one connected piece');
    C.ok(g.nodes().length < Object.keys(ix.at).length,
      'the pieces that connect to nothing are left out',
      (Object.keys(ix.at).length - g.nodes().length).toLocaleString() + ' crossings dropped');

    /* draw.js fits whatever box it is given, but CityGrid centres its map in the unit square
       and the projection has to land in the same place or the two sources would not be
       interchangeable. */
    C.ok(g.nodes().every(function (n) { return n.x >= 0 && n.x <= 1 && n.y >= 0 && n.y <= 1; }),
      'the island is projected into the unit square draw.js expects');
    C.ok(g.edges().every(function (e) { return e.w >= 1 && e.w < 3000; }),
      'and weighs every block in plausible metres');
    C.ok(g.nodes().some(function (n) { return / × /.test(n.label); }),
      'naming its crossings after the streets that meet there', (g.nodes()[0] || {}).label);
    C.ok(g.span > 15000 && g.span < 30000, 'and is about the size of Manhattan', g.span + ' m');

    /* Street class is PAGE FURNITURE and deliberately not on the Graph's edges — it is what
       js/city/draw.js thins by when the whole island is on screen, and an edge is two ends and
       a weight on every other page. */
    C.equal(Object.keys(g.cls).length, g.edges().length, 'every block knows what class of street it is');
    C.ok(g.cls[g.edges()[0].key], 'by name, out of the extract', g.cls[g.edges()[0].key]);

    /* The named places move the VIEWPORT now rather than deciding what exists, so what has to
       be true of them is only that they land on the island. */
    var placed = window.OsmGraph.DISTRICTS.filter(function (d) { return d.lat; });
    C.ok(placed.length >= 5, 'there are places to look at', placed.length + ' of them');
    C.ok(placed.every(function (d) {
      var at = g.place(d.lat, d.lon);
      return at.x > 0 && at.x < 1 && at.y > 0 && at.y < 1;
    }), 'and every one of them lands on the map');

    /* Main-roads-only is still a different GRAPH and not a drawing filter — it changes what a
       route may use, which is the point of offering it. */
    var main = window.OsmGraph.build({ classes: window.CitySource.MAIN });
    C.ok(main.nodes().length < g.nodes().length, 'main roads only is a smaller island',
      main.nodes().length.toLocaleString() + ' crossings');
    C.equal(reachable(main), main.nodes().length, 'and is connected in its own right');

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
         · The MEDIAN ratio is within 10%, over LOCAL errands. Measured 1.004–1.028 back when
           the page cropped a 1,200 m window and every pair in it was local by construction, so
           the bar sits at roughly four times the observed value: it catches a routing
           regression without being sensitive to a refetch of the extract.
         · At least 60% of those pairs are within 10%. Measured 71–80% over the same samples.

       There is no window any more, so LOCAL has to be asked for: half a kilometre apart, which
       is about what a pair drawn out of a 1,200 m box averaged. That sample measures a median
       of 1.014 and 73% within 10%, inside the range the thresholds were set from — the check
       is the one it always was, sampled the way it was always sampled.

       The pairs are drawn by a SEEDED generator rather than by striding the node list. Striding
       is not a uniform sample of the map: OSM ids cluster along the way that quoted them, so a
       fixed stride lands on the same kinds of street over and over. Measured, a stride of 163
       gave 52.5% where the population value is 73% — four standard deviations out, which is
       bias and not noise. Nothing here is random, but not everything ordered is fair either.

       What is new is that the island can now be asked the same question, and the answer moves
       with DISTANCE. Measured medians by how far apart the two pins are: 1.019 at 500 m, 1.090
       at 1 km, 1.094 at 2 km, 1.125 at 4 km, and about 1.11 from there to the length of the
       island, with the share within 10% falling from 73% to a little under half. So the two
       questions come apart as the errand grows and then SETTLE — they do not keep diverging,
       because a long route has to cross the island either way and the detours average out. That
       is the thing the page now exists to show, so it is asserted rather than described.

       The MEDIAN, not the maximum, is deliberate. The tail is real: the worst pair measured was
       2.48× — 865 m of fewest-corners route against a 349 m shortest one, in Harlem, where the
       grid meets the diagonal of St Nicholas Avenue. That is not an error to be bounded away,
       it is the thing the page exists to show, and asserting on the maximum would be asserting
       that it does not happen. */
    var ns = g.nodes(), local = [], far = [], lighter = 0;
    var seed = 1;
    function pick() {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return ns[Math.floor(seed / 0x7fffffff * ns.length)];
    }
    /* the crossing nearest a given distance away, ON THE MAP — which crossing the extract
       happened to list next means nothing at all about where it is */
    function away(a, metres) {
      var want = metres / g.span, best = null, off = Infinity;
      ns.forEach(function (n) {
        var d = Math.abs(Math.hypot(n.x - a.x, n.y - a.y) - want);
        if (d < off) { off = d; best = n; }
      });
      return best && best.id !== a.id ? best : null;
    }

    function pair(a, b, into) {
      g.resetCounters();
      var blocks = T.run(window.GraphSearch.bfs.run(g, a, b));
      g.resetCounters();
      var best = T.run(window.GraphShortest.run(g, a, b))[b];
      if (!blocks || !isFinite(best) || best === 0) return;
      if (blocks.weight < best) lighter++;
      into.push(blocks.weight / best);
    }

    /* 180 local errands and 16 long ones. The long ones settle most of the island apiece and
       are what this suite costs — a dozen is enough to separate 1.10 from 1.01, and forty would
       buy a third decimal place for another fifteen seconds of everybody's time. */
    for (var i = 0; i < 180; i++) {
      var a = pick(), b = away(a, 500);
      if (b) pair(a.id, b.id, local);
      if (i % 12) continue;
      var c = away(a, 8000);
      if (c) pair(a.id, c.id, far);
    }

    C.ok(local.length >= 150, 'the sample is big enough to say anything',
      local.length + ' local pairs and ' + far.length + ' long ones');
    C.equal(lighter, 0, 'BFS never routes lighter than Dijkstra — fewest edges cannot beat least weight');

    function mid(list) { return list.slice().sort(function (a, b) { return a - b; })[Math.floor(list.length / 2)]; }
    var m = mid(local), close = local.filter(function (r) { return r <= 1.1; }).length;
    C.ok(m <= 1.1, 'on a local errand the fewest-blocks route is usually within 10% of the shortest',
      'median ' + m.toFixed(4));
    C.ok(close / local.length >= 0.6, 'and most of those pairs are, not just the middle one',
      (100 * close / local.length).toFixed(1) + '% within 10%');
    C.ok(mid(far) > m, 'the two questions come further apart as the errand grows',
      'median ' + mid(far).toFixed(3) + ' at 8 km against ' + m.toFixed(3) + ' at 500 m, ' +
      (100 * far.filter(function (r) { return r <= 1.1; }).length / far.length).toFixed(0) +
      '% within 10% against ' + (100 * close / local.length).toFixed(0) + '%');
    C.ok(Math.max.apply(null, local.concat(far)) > 1.2,
      'and some pair is well outside it — the page would have nothing to show otherwise',
      'worst ' + Math.max.apply(null, local.concat(far)).toFixed(3));
  });
})();
