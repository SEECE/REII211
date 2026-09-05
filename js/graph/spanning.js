/* Minimum spanning trees — Prim and Kruskal. Plain script, one global `GraphSpanning`.

   The pair is the point. Both are greedy, both always produce a minimum spanning tree, and
   they disagree completely about what "greedy" means:

     Prim     grows ONE tree. At every step, the cheapest edge leaving the tree it has so far.
     Kruskal  grows a FOREST. At every step, the cheapest edge left anywhere, taken unless it
              would close a cycle.

   Run them on the same graph and they usually pick the edges in a different order and end up
   with the same total weight, which is the surprising part and the reason to watch both.
   Prim needs a start node; Kruskal does not care where you begin. */
(function () {
  'use strict';
  var R = window.Roles;

  function label(g, id) { return '<span class="val">' + g.node(id).label + '</span>'; }
  function edgeName(g, e) { return label(g, e.a) + '–' + label(g, e.b) + ' (<b>' + e.w + '</b>)'; }

  var NOTES = {
    frontier: { label: 'Crossing', desc: 'An edge leaving the tree — a candidate' },
    focus: { label: 'Chosen', desc: 'The cheapest candidate, taken this step' },
    reject: { label: 'Rejected', desc: 'It would close a cycle' },
    path: { label: 'In the tree', desc: 'An edge of the spanning tree' },
    done: { label: 'Connected', desc: 'Already in the tree' },
  };

  function* prim(g, start) {
    var inTree = {}, tree = [], total = 0;
    inTree[start] = true;
    yield {
      tag: 'Prim',
      note: 'Start the tree at ' + label(g, start) + '. From now on the rule never changes: ' +
        'take the <b>cheapest edge with exactly one end in the tree</b>.',
      roles: R.of({ done: [start] }),
    };

    while (true) {
      var members = Object.keys(inTree).map(Number);
      var crossing = [];
      members.forEach(function (id) {
        g.neighbours(id).forEach(function (n) { if (!inTree[n.to]) crossing.push({ from: id, n: n }); });
      });
      if (!crossing.length) break;

      crossing.sort(function (a, b) { return a.n.w - b.n.w; });
      var pick = crossing[0];

      yield {
        tag: 'Prim',
        note: '<b>' + crossing.length + '</b> edge' + (crossing.length === 1 ? '' : 's') +
          ' cross out of the tree. The cheapest costs <b>' + pick.n.w + '</b>, to ' +
          label(g, pick.n.to) + '.',
        roles: R.of({ path: tree, done: members, frontier: crossing.map(function (c) { return c.n.key; }) }),
      };

      inTree[pick.n.to] = true;
      tree.push(pick.n.key);
      total += pick.n.w;
      g.settle();
      g.track('Weight', total);

      yield {
        tag: 'Prim',
        note: 'Take it. ' + label(g, pick.n.to) + ' joins the tree and every edge that used to ' +
          'cross to it now runs <i>inside</i> the tree, so it can never be chosen again.',
        roles: R.of({ path: tree, done: Object.keys(inTree).map(Number), focus: [pick.n.key] }),
      };
    }

    var reached = Object.keys(inTree).map(Number);
    yield {
      tag: 'done',
      note: reached.length === g.nodes().length
        ? 'Every node is in the one tree. Total weight <b>' + total + '</b>.'
        : 'Nothing crosses out of the tree any more, but only <b>' + reached.length + '</b> of ' +
          '<b>' + g.nodes().length + '</b> nodes are in it. This graph is not connected, and ' +
          'Prim can only ever span the component it was started in — pick a start node in the ' +
          'other piece and it will build that one instead. Kruskal finds the same forest ' +
          'without being told where to begin.',
      roles: R.of({ path: tree, done: reached }),
    };
    return total;
  }

  function* kruskal(g) {
    var parent = {};
    g.nodes().forEach(function (n) { parent[n.id] = n.id; });
    function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }

    var sorted = g.edges().slice().sort(function (a, b) { return a.w - b.w; });
    var tree = [], rejected = [], total = 0;

    yield {
      tag: 'Kruskal',
      note: 'Sort every edge by weight: ' + sorted.slice(0, 6).map(function (e) { return e.w; }).join(', ') +
        (sorted.length > 6 ? ', …' : '') + '. Then walk the list in order and take each edge ' +
        'unless it would close a cycle. There is no start node — this builds a <b>forest</b> ' +
        'that merges into one tree.',
      roles: {},
    };

    for (var i = 0; i < sorted.length && tree.length < g.nodes().length - 1; i++) {
      var e = sorted[i], ra = find(e.a), rb = find(e.b);
      var cycle = ra === rb;
      if (!cycle) { parent[ra] = rb; tree.push(e.key); total += e.w; g.settle(); }
      else rejected.push(e.key);
      g.track('Weight', total);

      yield {
        tag: 'Kruskal',
        note: 'Next cheapest is ' + edgeName(g, e) + '. Its ends are ' +
          (cycle
            ? '<b>already in the same component</b>, so adding it would close a cycle. Reject it.'
            : 'in <b>different</b> components, so it joins two pieces of the forest. Take it.'),
        roles: R.of({ path: tree, reject: rejected, focus: cycle ? [] : [e.key], frontier: cycle ? [e.key] : [] }),
      };
    }

    yield {
      tag: 'done',
      note: tree.length === g.nodes().length - 1
        ? 'The forest has merged into one tree of <b>' + tree.length + '</b> edges, total weight <b>' +
          total + '</b> — the same total Prim reaches, usually by picking the edges in a ' +
          'different order.'
        : 'The edges ran out with the forest still in pieces: this graph is not connected, so ' +
          'there is no spanning tree — only a spanning <i>forest</i>.',
      roles: R.of({ path: tree, reject: rejected, done: g.nodes().map(function (n) { return n.id; }) }),
    };
    return total;
  }

  window.GraphSpanning = {
    prim: { label: "Prim's minimum spanning tree", weighted: true, needsStart: true,
      roles: ['idle', 'frontier', 'focus', 'path', 'done'], notes: NOTES, run: prim },
    kruskal: { label: "Kruskal's minimum spanning tree", weighted: true, needsStart: false,
      roles: ['idle', 'frontier', 'reject', 'focus', 'path'], notes: NOTES,
      run: function (g) { return kruskal(g); } },
  };
})();
