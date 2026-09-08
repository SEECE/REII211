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

    C.ok(window.OsmGraph.DISTRICTS.filter(function (d) { return d.lat; }).every(function (d) {
      var at = g.place(d.lat, d.lon);
      return at.x > 0 && at.x < 1 && at.y > 0 && at.y < 1;
    }), 'every named district lands on the island');

    /* ── a district on its own ──

       Still a real crop and not a zoom level: a smaller PROBLEM, a few hundred crossings for an
       algorithm to settle rather than thirteen thousand. What has to be true of one is what
       always had to be true — it is one connected piece, because cropping a real network leaves
       islands and a pin on one of those has no route to anywhere. What is no longer true is the
       cap: a 3,000 m window comes back with up to 1,192 crossings, which the old limit of 320
       would have refused by shrinking the window until it fitted. */
    window.OsmGraph.DISTRICTS.filter(function (d) { return d.lat; }).forEach(function (d) {
      var w = window.OsmGraph.build({ at: d, span: 1200 });
      C.ok(w && w.nodes().length > 100, 'a window opens on ' + d.id,
        w ? w.nodes().length + ' crossings' : 'nothing built');
      if (!w) return;
      C.equal(reachable(w), w.nodes().length, d.id + ' comes back as one connected piece');
      C.ok(w.nodes().length < g.nodes().length, d.id + ' is a piece of the island, not all of it');
      C.ok(w.span > 900 && w.span < 1400, d.id + ' is about as wide as it was asked to be',
        w.span + ' m');
      C.ok(w.nodes().every(function (n) { return n.x >= 0 && n.x <= 1 && n.y >= 0 && n.y <= 1; }),
        d.id + ' is projected into the unit square too');
    });
    var wide = window.OsmGraph.build({ at: window.OsmGraph.DISTRICTS[1], span: 3000 });
    C.ok(wide.nodes().length > 320, 'and a wide window is no longer cut down to a cap',
      wide.nodes().length + ' crossings, where the old limit was 320');

    /* Main-roads-only is still a different GRAPH and not a drawing filter — it changes what a
       route may use, which is the point of offering it. */
    var main = window.OsmGraph.build({ classes: window.CitySource.MAIN });
    C.ok(main.nodes().length < g.nodes().length, 'main roads only is a smaller island',
      main.nodes().length.toLocaleString() + ' crossings');
    C.equal(reachable(main), main.nodes().length, 'and is connected in its own right');
  });
})();
