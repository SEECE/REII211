/* The node plane. Plain script, one global `NodePlanePage`.

   Five algorithms over one editable graph. The graph SURVIVES between runs — that is the point
   of the page: build a graph once, then run BFS on it, then Dijkstra, then Prim, and compare
   what each one does with the same edges. Editing the graph reruns whatever is selected.

   The old version of this page was 1,900 lines across ten files with the algorithms, the
   editor, the matrix and the DOM wiring all reaching into each other's globals. */
(function () {
  'use strict';

  function algorithms() {
    return {
      bfs: window.GraphSearch.bfs, dfs: window.GraphSearch.dfs,
      dijkstra: window.GraphShortest,
      prim: window.GraphSpanning.prim, kruskal: window.GraphSpanning.kruskal,
    };
  }

  window.NodePlanePage = function () {
    var graph = window.Graph.random(9, 4);
    var message = null, selected = null, editor = null;
    /* Playground hands `rail` to build(), and build() always runs before the first render, so
       this is how render gets at it — `page` does not exist yet during that first pass. */
    var rails = null;
    var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    function algo(rail) { return algorithms()[rail.get('algo')]; }
    function startNode(rail) {
      // read the element, not the cached value: refreshStarts() rewrites the options directly
      var want = String((rail.el('start') || {}).value || '').toUpperCase();
      var found = graph.nodes().filter(function (n) { return n.label === want; })[0];
      return found ? found.id : (graph.nodes()[0] || {}).id;
    }

    function* announce(text, roles) { yield { tag: 'edit', note: text, roles: roles || {} }; }

    var page = window.Playground({
      title: 'Graph',
      legend: ['idle', 'frontier', 'focus', 'scan', 'move', 'reject', 'path', 'done'],
      legendNotes: Object.assign({}, window.GraphSearch.notes, window.GraphShortest.notes,
        window.GraphSpanning.prim.notes),

      fields: [
        { id: 'algo', kind: 'choice', label: 'Algorithm', value: 'bfs', options: [
          { value: 'bfs', label: 'Breadth-first search' },
          { value: 'dfs', label: 'Depth-first search' },
          { value: 'dijkstra', label: 'Dijkstra — shortest path' },
          { value: 'prim', label: "Prim's MST" },
          { value: 'kruskal', label: "Kruskal's MST" },
        ] },
        { id: 'start', kind: 'select', label: 'Start at', options: [{ value: 'A', label: 'A' }] },
        { id: 'view', kind: 'select', label: 'View', value: 'plane', options: [
          { value: 'plane', label: 'Plane' },
          { value: 'matrix', label: 'Adjacency matrix' },
        ] },
        { id: 'tool', kind: 'choice', label: 'Pointer', value: 'build', options: [
          { value: 'build', label: 'Build — add, connect, drag' },
          { value: 'erase', label: 'Erase — remove a node' },
        ] },
        { id: 'weight', kind: 'range', label: 'New edge weight', min: 1, max: 9, value: 4 },
        { id: 'size', kind: 'range', label: 'Generate size', min: 3, max: 20, value: 9 },
        { id: 'generate', kind: 'button', label: 'Generate graph', variant: 'primary' },
        { id: 'hint', kind: 'note', spacer: true, label:
          'Click empty space for a node, then one node and another to connect them. Run BFS and ' +
          'Dijkstra on the same graph and compare the routes.' },
      ],

      onField: function (id, value, api) {
        if (id === 'generate') {
          graph = window.Graph.random(api.rail.get('size'), Math.round(api.rail.get('size') / 2));
          message = null;
          refreshStarts(api.rail);
          return;
        }
        if (id === 'view') { api.repaint(); return false; }
        if (id === 'tool' || id === 'weight') { if (editor) editor.clear(); return false; }
        message = null;
      },

      build: function (rail) {
        rails = rail;
        var chosen = algo(rail);
        graph.resetCounters();
        rail.show('start', chosen.needsStart !== false && rail.get('algo') !== 'kruskal');
        if (message) return { subject: graph, gen: announce(message), title: 'Graph' };
        return {
          subject: graph,
          gen: chosen.run(graph, startNode(rail)),
          title: chosen.label,
        };
      },

      render: function (surface, frame, colours) {
        if (!rails || !frame) return;
        /* The node waiting to be connected is a UI state, not part of the trace, so it is
           overlaid on a COPY — writing it into frame.roles would make it permanent. */
        var shown = frame;
        if (selected != null) {
          shown = Object.create(frame);
          shown.roles = Object.assign({}, frame.roles);
          shown.roles[selected] = 'focus';
        }
        (rails.get('view') === 'matrix' ? window.MatrixDraw : window.GraphDraw)
          .draw(surface, shown, colours, { weighted: !!algo(rails).weighted });
      },
    });

    /* The start-node dropdown is a view of the graph, so it is rebuilt whenever the graph is. */
    function refreshStarts(rail) {
      var select = rail.el('start');
      var keep = select.value;
      select.innerHTML = '';
      graph.nodes().forEach(function (n) {
        var opt = document.createElement('option');
        opt.value = opt.textContent = n.label;
        select.appendChild(opt);
      });
      select.value = graph.nodes().some(function (n) { return n.label === keep; })
        ? keep : (graph.nodes()[0] || { label: '' }).label;
    }

    editor = window.GraphEditor(page.surface.canvas, {
      surface: function () { return page.surface; },
      view: function () { return graph.view(); },
      graph: function () { return graph; },
      tool: function () { return page.rail.get('tool'); },
      weight: function () { return page.rail.get('weight'); },
      nextLabel: function () { return LETTERS[graph.nodes().length % 26] || String(graph.nodes().length + 1); },
      repaint: function () { page.repaint(); },
      select: function (id) { selected = id; page.repaint(); },
      commit: function (text) {
        selected = null;
        message = text + ' Press an algorithm to run it on the graph as it stands.';
        refreshStarts(page.rail);
        page.rebuild();
      },
    });

    refreshStarts(page.rail);
    page.rebuild();
    return page;
  };
})();
