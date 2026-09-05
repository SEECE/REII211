/* Script loader — the one place that knows which files a page needs.

   The site has no build step and no ES modules (it must open over file://), so every script
   is a plain <script> exposing one global. The old pages listed their scripts by hand, which
   is why one of them loaded four files in an order that only worked by accident. A page now
   names the BUNDLES it wants and this file expands them:

     <script src="../../js/deps.js" data-load="sorting"></script>

   Bundles are expanded in order, de-duplicated, and appended as ordinary <script> elements
   with `async = false`, which keeps them in order. A page's own init call therefore goes
   inside a `load` listener rather than a bare inline script — by then the whole bundle has run.

   A bundle entry is either a path relative to js/ or the name of another bundle. Splitting a
   file is an edit HERE and in no page's markup — which is what keeps the 200-line ceiling
   cheap to hold. */
(function () {
  'use strict';

  var BUNDLES = {
    /* the runtime every visualiser page is built on */
    core: [
      'core/palette.js', 'core/roles.js', 'core/trace.js', 'core/player.js',
      'core/surface.js', 'core/rail.js', 'core/legend.js', 'core/workbench.js',
      'core/page.js', 'io/reii.js', 'core/files.js', 'ui/shell.js',
    ],

    /* the six bar-graph sorts: one instrumented array, one renderer, one file per algorithm */
    sorting: ['core', 'sorting/tape.js', 'sorting/bars.js', 'sorting/algorithms.js',
      'sorting/selection.js', 'sorting/insertion.js', 'sorting/bubble.js',
      'sorting/exchange.js', 'sorting/merge.js', 'sorting/quick.js', 'pages/sort.js'],

    /* comparison: the six sorts side by side on one array — as bar graphs, or as a block of
       hues where the sorted answer is the rainbow itself */
    race: ['sorting', 'compare/race.js', 'compare/lanes.js', 'pages/race.js'],
    spectrum: ['sorting', 'compare/race.js', 'compare/lanes.js', 'compare/spectrum.js',
      'pages/spectrum.js'],

    /* the same two sorts drawn as their call tree */
    recursion: ['core', 'sorting/tape.js', 'recursion/tree.js', 'recursion/layout.js',
      'recursion/draw.js', 'recursion/merge.js', 'recursion/quick.js', 'pages/recursion.js'],

    /* containers: the array/list memory model, and the binary search tree */
    lists: ['core', 'structures/store.js', 'structures/list-array.js',
      'structures/list-linked.js', 'structures/list-draw.js', 'pages/lists.js'],
    bst: ['core', 'sorting/tape.js', 'structures/bst.js', 'structures/bst-ops.js',
      'structures/bst-draw.js', 'pages/bst.js'],

    /* graphs: the shared model and renderer, then the plane over it */
    graph: ['core', 'graph/model.js', 'graph/draw.js', 'graph/traverse.js',
      'graph/shortest.js', 'graph/spanning.js'],
    'node-plane': ['graph', 'graph/editor.js', 'graph/matrix.js', 'pages/node-plane.js'],
    /* applications: the same graph algorithms on something not drawn as a graph */
    maze: ['core', 'graph/model.js', 'graph/traverse.js', 'maze/grid.js', 'maze/carve.js',
      'maze/draw.js', 'maze/search.js', 'pages/maze.js'],
    /* the extract goes first: js/city/osm-index.js reads the global it defines */
    manhattan: ['graph', 'city/grid.js', 'city/osm-manhattan.js', 'city/osm-index.js',
      'city/osm-graph.js', 'city/source.js', 'city/camera.js', 'city/pins.js', 'city/draw.js',
      'city/controls.js', 'pages/city.js'],

    /* heuristics: points on a plane, and intervals on a timeline */
    tour: ['core', 'heuristics/points.js', 'heuristics/tour-draw.js', 'heuristics/nearest.js',
      'heuristics/closest-pair.js', 'pages/tour.js'],
    scheduling: ['core', 'heuristics/jobs.js', 'heuristics/greedy.js',
      'heuristics/jobs-draw.js', 'pages/scheduling.js'],

    /* browser-run self-checks (test.html) */
    tests: ['core', 'sorting/tape.js', 'recursion/tree.js', 'recursion/layout.js',
      'recursion/merge.js', 'recursion/quick.js',
      'sorting/algorithms.js', 'sorting/selection.js',
      'sorting/insertion.js', 'sorting/bubble.js', 'sorting/exchange.js', 'sorting/merge.js',
      'sorting/quick.js', 'graph/model.js', 'graph/traverse.js', 'graph/shortest.js',
      'graph/spanning.js', 'heuristics/points.js', 'heuristics/nearest.js',
      'heuristics/closest-pair.js', 'heuristics/jobs.js', 'heuristics/greedy.js',
      'structures/store.js', 'structures/list-array.js', 'structures/list-linked.js',
      'structures/bst.js', 'structures/bst-ops.js',
      'maze/grid.js', 'maze/carve.js', 'maze/search.js',
      'city/grid.js', 'city/osm-manhattan.js', 'city/osm-index.js', 'city/osm-graph.js',
      'city/source.js', 'city/camera.js', 'city/pins.js', 'city/draw.js',
      'compare/race.js', 'compare/lanes.js', 'compare/spectrum.js',
      'tests/kit.js', 'tests/sorting.js', 'tests/graph.js', 'tests/heuristics.js',
      'tests/structures.js', 'tests/io.js', 'tests/core.js', 'tests/compare.js',
      'tests/maze.js', 'tests/frames.js', 'tests/view.js',
      'tests/spectrum.js', 'tests/city.js', 'tests/osm.js'],
  };

  var me = document.currentScript;
  var base = me.src.replace(/deps\.js(\?.*)?$/, '');
  var files = [], seen = {};

  function add(name) {
    if (seen[name]) return;
    seen[name] = true;
    if (BUNDLES[name]) BUNDLES[name].forEach(add);
    else files.push(name);
  }
  (me.getAttribute('data-load') || '').split(/[\s,]+/).filter(Boolean).forEach(add);

  files.forEach(function (f) {
    var s = document.createElement('script');
    s.src = base + f;
    s.async = false;                 // in order, and `load` waits for the lot
    (document.head || document.documentElement).appendChild(s);
  });
})();
