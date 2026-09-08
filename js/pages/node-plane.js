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
    var selected = null, editor = null, marks = null, spoken = null;
    /* The stage holds two things and shows one: the canvas, and the marking table's DOM. Which
       is which is css/marks.css reading this attribute, so the swap is a class change and not
       a second layout.

       The rail offers ONE "Marking view", not one button per algorithm: what a student writes
       out for Dijkstra is a table and what they draw for BFS is a tree, but that is a fact
       about the algorithm and not a second thing to choose. So the rail asks "drawing or
       marking?" and the ALGORITHM decides which marking — which is also why the button does
       not go stale when you switch algorithms with it already pressed. */
    var stage = document.querySelector('.stage');
    var MARKING = { bfs: 'levels', dfs: 'branches' };   // the rest are marked as a table
    function viewOf(rail) {
      var v = rail.get('view');
      return v === 'marks' ? MARKING[rail.get('algo')] || v : v;
    }
    function setView(v) { if (stage) stage.dataset.view = v; }
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

    function* announce(text) { yield { tag: 'edit', note: text, roles: {} }; }

    /* What just happened, in the rail's note. Editing the graph used to REPLACE the run with a
       one-frame announcement saying so, which threw away the run you were watching: add a node
       mid-play and the algorithm was gone until you pressed one again, and every marking view
       went blank because a one-beat 'edit' trace is not a run of anything. The edit now
       restarts the algorithm on the edited graph — which is the only thing an edit can honestly
       mean — and the sentence about it goes here instead. */
    function say(text) {
      var note = rails && rails.el('hint');
      if (note) note.innerHTML = text;
    }
    var GUIDE = {
      plane: 'Click empty space for a node, then one node and another to connect them. Run BFS ' +
        'and Dijkstra on the same graph and compare the routes.',
      matrix: 'A cell is an edge: click one to fill it in or clear it, and its mirror image ' +
        'goes with it. The + row and column past the last node add a node.',
      marks: 'A marking view is read-only — it is the answer being written out. Edit the graph ' +
        'on the plane or the matrix.',
    };

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
        /* A strip and not a dropdown. Algorithm and Pointer either side of it show every
           option at once, so a closed select reading "Plane" looks like a label rather than a
           choice — the marking table was in it and invisible. */
        { id: 'view', kind: 'choice', label: 'View', value: 'plane', options: [
          { value: 'plane', label: 'Plane' },
          { value: 'matrix', label: 'Adjacency matrix' },
          { value: 'marks', label: 'Marking view' },
        ] },
        /* Off by default: the edges the search never walked are the ones that make either
           marking look wrong until a student knows what they are, so they are on request. */
        { id: 'cross', kind: 'check', label: 'Show the edges the search never took', value: false },
        { id: 'tool', kind: 'choice', label: 'Pointer', value: 'build', options: [
          { value: 'build', label: 'Build — add, connect, drag' },
          { value: 'erase', label: 'Erase — remove a node' },
        ] },
        { id: 'weight', kind: 'range', label: 'New edge weight', min: 1, max: 9, value: 4 },
        { id: 'size', kind: 'range', label: 'Generate size', min: 3, max: 20, value: 9 },
        { id: 'generate', kind: 'button', label: 'Generate graph', variant: 'primary' },
        // replaced on every view change, and by whatever the last edit did — see say()
        { id: 'hint', kind: 'note', spacer: true, label: GUIDE.plane },
      ],

      file: {
        kind: 'graph',
        name: function () { return 'graph-' + graph.nodes().length; },
        get: function () { return graph.nodes().length ? graph.view() : null; },
        open: function (data, name, api) {
          graph = window.Graph.load(data);
          refreshStarts(api.rail);
          say('Opened <b>' + name + '</b> — ' + graph.nodes().length + ' nodes and ' +
            graph.edges().length + ' edges, running the algorithm on it now.');
        },
      },

      onField: function (id, value, api) {
        if (id === 'generate') {
          graph = window.Graph.random(api.rail.get('size'), Math.round(api.rail.get('size') / 2));
          refreshStarts(api.rail);
          spoken = null;                 // a new graph, so the note goes back to the guidance
          return;
        }
        // the marking view is the algorithm's, so only `algo` changing needs a rebuild
        if (id === 'view') { refreshView(api.rail); api.repaint(); return false; }
        if (id === 'cross') { api.repaint(); return false; }
        if (id === 'tool' || id === 'weight') { if (editor) editor.clear(); return false; }
      },

      build: function (rail) {
        rails = rail;
        var chosen = algo(rail);
        graph.resetCounters();
        rail.show('start', chosen.needsStart !== false && rail.get('algo') !== 'kruskal');
        refreshView(rail);
        /* An empty plane is the one thing no algorithm can be run on — every other edit, the
           run is simply rebuilt and starts again from the top. */
        if (!graph.nodes().length) {
          return { subject: graph, title: 'Graph',
            gen: announce('The plane is empty. Click it to put a node down, or press Generate ' +
              'graph for one to run an algorithm on.') };
        }
        return {
          subject: graph,
          gen: chosen.run(graph, startNode(rail)),
          title: chosen.label,
        };
      },

      render: function (surface, frame, colours) {
        if (!rails || !frame) return;
        /* The table is the whole run at once, so walking it moves a column rather than
           redrawing anything — and there is nothing to draw on the canvas while it is hidden.
           `marks` is still null during the first render, which happens inside Playground. */
        var view = viewOf(rails);
        if (view === 'marks') {
          if (marks) marks.paint(page.player.index());
          return;
        }
        /* The tree is the whole run at once too, but it is a DRAWING and so it goes on the
           canvas rather than into the table's box — which is why this view keeps the plane's
           stage rather than swapping to the marks one. */
        if (view === 'levels' || view === 'branches') {
          var of = view === 'levels' ? window.LevelTree : window.Backtrack;
          var model = of.of(page.frames());
          (view === 'levels' ? window.LevelDraw : window.BacktrackDraw)
            .draw(surface, frame, colours, {
              model: model,
              step: model && model.at[Math.max(0,
                Math.min(model.at.length - 1, page.player.index()))],
              cross: !!rails.get('cross'),
            });
          return;
        }
        /* The node waiting to be connected is a UI state, not part of the trace, so it is
           overlaid on a COPY — writing it into frame.roles would make it permanent.

           Object.assign and not Object.create: `roles` is an ACCESSOR on a frame now, because a
           beat may state only what changed and the map is folded on demand (js/core/trace.js).
           Inheriting from the frame and assigning over it throws in strict mode — there is a
           getter and no setter — and the map the getter hands back may be a keyframe's own, so
           it has to be copied before anything is written into it. */
        var shown = frame;
        if (selected != null) {
          shown = Object.assign({}, frame);
          shown.roles = Object.assign({}, frame.roles);
          shown.roles[selected] = 'focus';
        }
        (view === 'matrix' ? window.MatrixDraw : window.GraphDraw)
          .draw(surface, shown, colours, { weighted: !!algo(rails).weighted, editable: true });
      },
    });

    /* The stage attribute and the level tree's own option follow from View and Algorithm
       together, so they are set in one place and from both. */
    function refreshView(rail) {
      var v = viewOf(rail);
      setView(v);
      rail.show('cross', v === 'levels' || v === 'branches');
      /* A marking is an answer being written out — there is nothing on it to point at, so the
         controls that only make sense with a pointer go with it. */
      var editing = v === 'plane' || v === 'matrix';
      rail.show('tool', editing);
      rail.show('weight', editing);
      if (!editing && editor) editor.clear();
      /* only when the VIEW moved — otherwise the guidance would wipe the sentence an edit just
         wrote, on the rebuild that edit itself asked for */
      if (v !== spoken) { spoken = v; say(GUIDE[editing ? v : 'marks']); }
    }

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
      // what the click MEANS: the plane's geometry, the matrix's, or nothing at all
      mode: function () { return viewOf(page.rail); },
      /* Where a node added from the matrix lands on the plane. The matrix has no positions in
         it, so one has to be invented — a golden-angle spiral from the centre, which spreads
         without ever putting two nodes in the same place however many are added. */
      nextSpot: function () {
        var k = graph.nodes().length, a = k * 2.399963;
        var rad = Math.min(0.46, 0.09 + 0.035 * Math.sqrt(k));
        return { x: 0.5 + Math.cos(a) * rad, y: 0.5 + Math.sin(a) * rad };
      },
      // the first letter nobody is using — counting the nodes hands out a duplicate label
      // as soon as one has been erased, and the Start-at dropdown resolves nodes BY label
      nextLabel: function () {
        var used = {};
        graph.nodes().forEach(function (n) { used[n.label] = true; });
        for (var i = 0; i < 26; i++) if (!used[LETTERS[i]]) return LETTERS[i];
        return String(graph.nodes().length + 1);
      },
      repaint: function () { page.repaint(); },
      select: function (id) { selected = id; page.repaint(); },
      commit: function (text) {
        selected = null;
        say(text + ' The algorithm is running again from the top on the graph as it stands.');
        refreshStarts(page.rail);
        page.rebuild();
      },
    });

    marks = window.GraphMarks.view(page);
    refreshView(page.rail);
    refreshStarts(page.rail);
    page.rebuild();
    return page;
  };
})();
