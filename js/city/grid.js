/* A city laid out on a street grid. Plain script, one global `CityGrid`.

   There is no new subject here and no new algorithm: a street map IS a graph, so this builds an
   ordinary js/graph/model.js `Graph` and every algorithm on the site runs on it unchanged. What
   the file contributes is the LAYOUT, and one number that makes the page worth having.

   That number is the block length. Manhattan's blocks are not square and its avenues are not
   evenly spaced — 5th to 6th is about 280 m, Park to Lexington about 130, and a street block
   north to south is about 80. So walking "one block" is not one distance, and the two questions
   a student assumes are the same question come apart:

     BFS       the fewest BLOCKS      — every hop counts one, whatever it cost
     Dijkstra  the fewest METRES      — every hop costs what it is

   On a complete grid those two agree far more often than a student expects, and they have to:
   every route that only goes towards the destination crosses each avenue gap exactly once, so
   all of them weigh the same. That is a fact about the MAP, not about the algorithms, and it is
   worth meeting. Round a park or a closed street there are two ways about, and then they can
   come apart.

   What separates them properly is the second cost the rail offers. Every street carries a
   delay — roadworks, a bus lane, a school run — and asking for TIME instead of DISTANCE changes
   nothing whatever about Dijkstra and everything about its answer. The weight is a modelling
   choice, and that is the lesson the two settings are here to make. */
(function () {
  'use strict';

  /* Metres between one avenue and the next, west to east. Real spacings, unevenly spaced on
     purpose — a uniform grid makes Dijkstra and BFS agree everywhere and teaches nothing. */
  var AVENUES = [280, 230, 175, 130, 250, 210, 175];
  var STREET = 80;                      // metres between one street and the next
  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  /* How much longer a street takes than its length says. Mostly clear, occasionally awful —
     which is what a map has to look like before the fastest route stops being the shortest. */
  var DELAYS = [1, 1, 1, 1.6, 2.2, 3.2];

  /* Is everything still reachable from everything? Closing a street that is the only way
     through would leave a corner no algorithm can answer for, so each closure is tried and
     taken back if it cuts the city in two. `peek` rather than `neighbours`: checking the map
     is the page's work, not the student's, and must not show up in their counters. */
  function whole(g) {
    var nodes = g.nodes();
    if (!nodes.length) return true;
    var seen = {}, stack = [nodes[0].id], found = 0;
    seen[nodes[0].id] = true;
    while (stack.length) {
      var at = stack.pop();
      found++;
      g.peek(at).forEach(function (e) { if (!seen[e.to]) { seen[e.to] = true; stack.push(e.to); } });
    }
    return found === nodes.length;
  }

  /* The park: a rectangle of crossings that simply are not there. It is kept strictly inside
     the boundary, so the ring of streets around the edge of the map always survives and no
     park can ever cut the city in two. */
  function park(cols, rows) {
    var w = Math.min(cols - 2, cols >= 7 ? 2 : 1);
    var h = Math.min(rows - 2, Math.max(1, Math.round(rows / 3)));
    if (w < 1 || h < 1) return null;
    return { c: Math.floor((cols - w) / 2), r: Math.floor((rows - h) / 2), w: w, h: h };
  }

  window.CityGrid = function (o) {
    var cols = Math.max(2, Math.min(8, o.avenues || 6));
    var rows = Math.max(2, Math.min(8, o.streets || 6));
    var g = window.Graph(), green = o.park ? park(cols, rows) : null, id = {};

    /* Positions are the real distances, scaled by ONE number so both axes keep the same metre.
       A long block is therefore drawn long, and the shortest route on the map is the shortest
       route on the page — the weights and the picture are the same statement. */
    var x = [0], y = [];
    for (var c = 1; c < cols; c++) x.push(x[c - 1] + AVENUES[(c - 1) % AVENUES.length]);
    for (var r = 0; r < rows; r++) y.push(r * STREET);
    var span = Math.max(x[cols - 1], y[rows - 1]) || 1;
    var ox = (1 - x[cols - 1] / span) / 2, oy = (1 - y[rows - 1] / span) / 2;

    /* Metres, or metres a delay has been charged against. Nothing downstream is told which —
       an algorithm is handed weights and has never wanted to know what they measure. */
    function cost(metres) {
      if (!o.traffic) return metres;
      return Math.round(metres * DELAYS[Math.floor(Math.random() * DELAYS.length)]);
    }

    /* Row by row, so the first crossing made is always the top-left and the last is always the
       bottom-right — which is where the page drops its two pins before anyone has clicked. */
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        if (green && c >= green.c && c < green.c + green.w && r >= green.r && r < green.r + green.h) continue;
        id[c + ',' + r] = g.addNode(LETTERS[c] + (r + 1), ox + x[c] / span, oy + y[r] / span);
      }
    }
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        var here = id[c + ',' + r];
        if (here == null) continue;
        var east = id[(c + 1) + ',' + r], south = id[c + ',' + (r + 1)];
        if (east != null) g.addEdge(here, east, cost(x[c + 1] - x[c]));
        if (south != null) g.addEdge(here, south, cost(STREET));
      }
    }

    var pool = g.edges().slice(), shut = 0;
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    for (i = 0; i < pool.length && shut < (o.closures || 0); i++) {
      g.removeEdge(pool[i].a, pool[i].b);
      if (whole(g)) shut++;
      else g.addEdge(pool[i].a, pool[i].b, pool[i].w);
    }

    g.closures = shut;                  // page furniture, not part of the Trace contract
    return g;
  };

  /* The lattice a set of crossings sits on: the avenue lines, the street lines, and what stands
     at each junction of the two. The renderer needs it to know where a block is; opening a file
     needs it to know whether the graph is a street grid at all. */
  window.CityGrid.lattice = function (view) {
    var xs = axis(view.nodes, 'x'), ys = axis(view.nodes, 'y'), at = {};
    view.nodes.forEach(function (n) { at[xs.indexOf(n.x) + ',' + ys.indexOf(n.y)] = n; });
    return { xs: xs, ys: ys, at: at };
  };

  /* A graph and a city are the same file kind, because a city IS a graph — so a node plane
     saved on the other page will happily arrive here and must be turned away by SHAPE rather
     than by kind. A street runs between two NEIGHBOURING crossings on the lattice, and one
     edge that does not is enough to say this is not a map. */
  window.CityGrid.isCity = function (view) {
    if (!view.nodes || view.nodes.length < 2 || !view.edges || !view.edges.length) return false;
    var lat = window.CityGrid.lattice(view), where = {};
    view.nodes.forEach(function (n) {
      where[n.id] = { c: lat.xs.indexOf(n.x), r: lat.ys.indexOf(n.y) };
    });
    return view.edges.every(function (e) {
      var a = where[e.a], b = where[e.b];
      if (!a || !b) return false;
      return (a.c === b.c && Math.abs(a.r - b.r) === 1) || (a.r === b.r && Math.abs(a.c - b.c) === 1);
    });
  };

  function axis(nodes, k) {
    var seen = {};
    nodes.forEach(function (n) { seen[n[k]] = true; });
    return Object.keys(seen).map(Number).sort(function (a, b) { return a - b; });
  }

  window.CityGrid.AVENUES = AVENUES;
  window.CityGrid.DELAYS = DELAYS;
  window.CityGrid.STREET = STREET;
})();
