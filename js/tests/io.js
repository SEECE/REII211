/* Self-checks for the .reii file (js/io/reii.js).

   Two claims are being made and both have to be true or the feature is a data-loss bug:
   what comes back out of a file is what went in, and what should never come out of a file
   does not. Every round trip here goes through the REAL writer, the real validator and the
   real subject `load()`, then compares the subject's own view() — the snapshot the renderer
   draws — so "it opened" is not mistaken for "it opened as the same thing". */
(function () {
  'use strict';

  function refuses(name, fn) {
    var threw = false;
    try { fn(); } catch (e) { threw = true; }
    window.Check.ok(threw, 'refuses ' + name, 'it was accepted');
  }

  /* the BST hands out node ids as it builds, so a rebuilt tree numbers them in a different
     order — the SHAPE and the values are what a saved tree promises, not the ids */
  function shape(n) {
    return n ? { v: n.value, l: shape(n.left), r: shape(n.right) } : null;
  }

  window.Check.suite('files — the .reii round trip', function () {
    var C = window.Check, F = window.ReiiFile;

    function trip(kind, view, name) {
      var back = F.read(F.write(kind, view, name || kind), [kind]);
      C.equal(back.kind, kind, kind + ' comes back as the same kind');
      return back.data;
    }

    /* an array — the six sorting pages and both recursion trees */
    var values = window.Tape.build(24, 'shuffled');
    C.equal(trip('array', values), values, 'an array survives the round trip');

    /* a block of memory — where a value SITS is the lesson, so slots must come back identical */
    var store = window.Store(72);
    [40, 12, 91, 7].forEach(function (v) { window.Trace.run(window.ListOps.insert(store, v, false)); });
    var mem = JSON.parse(JSON.stringify(store.view()));
    var reopened = window.Store.load(trip('memory', mem));
    C.equal(reopened.view(), mem, 'a linked list comes back slot for slot');
    C.equal(reopened.order('singly'), store.order('singly'), 'and walks in the same order');
    C.equal(reopened.stats().Comparisons, 0, 'opening a file costs the student nothing');

    /* a tree — the shape is what the insertion order produced */
    var tree = window.BST();
    [50, 20, 70, 10, 30, 60, 80, 5].forEach(function (v) { window.Trace.run(window.BSTOps.insert(tree, v)); });
    var rebuilt = window.BST.load(trip('bst', JSON.parse(JSON.stringify(tree.view()))));
    C.equal(shape(rebuilt.view().root), shape(tree.view().root), 'a tree comes back with the same shape');
    C.equal(rebuilt.stats().Nodes, tree.stats().Nodes, 'and the same node count');
    C.equal(rebuilt.height(), tree.height(), 'and the same height');

    /* a graph — and the algorithms have to agree on it, not just the drawing */
    var graph = window.Graph.random(11, 4);
    var wire = JSON.parse(JSON.stringify(graph.view()));
    var opened = window.Graph.load(trip('graph', wire));
    C.equal(opened.view(), wire, 'a graph comes back node for node and edge for edge');
    graph.resetCounters(); opened.resetCounters();
    C.equal(window.Trace.run(window.GraphShortest.run(opened, 0)),
      window.Trace.run(window.GraphShortest.run(graph, 0)), 'and Dijkstra gives the same distances');

    /* a maze — the walls have to agree on both sides of every gap */
    var grid = window.MazeGrid(12, 9);
    window.Trace.run(window.MazeCarve.run(grid, 'backtracker'));
    var walls = JSON.parse(JSON.stringify(grid.view()));
    var maze = window.MazeGrid.load(trip('maze', walls));
    C.equal(maze.view(), walls, 'a maze comes back wall for wall');
    C.equal(maze.stats().Gaps, grid.stats().Gaps, 'with the same number of gaps carved');
    grid.resetCounters(); maze.resetCounters();
    C.equal(window.Trace.run(window.MazeSearch.bfs.run(maze)),
      window.Trace.run(window.MazeSearch.bfs.run(grid)), 'and the same route through it');

    /* points and offers */
    var points = window.PointSet.random(14);
    C.equal(window.PointSet.load(trip('points', points.view())).view(), points.view(),
      'a point set comes back point for point');
    var jobs = window.JobSet.random(4, 14);
    C.equal(window.JobSet.load(trip('jobs', jobs.view())).view(), jobs.view(),
      'an offer set comes back offer for offer');

    /* the file cannot be written in a shape it cannot be read in */
    refuses('writing a kind that does not exist', function () { F.write('spreadsheet', [1, 2], 'x'); });
    refuses('writing an array with a hole in it', function () { F.write('array', [1, null, 3], 'x'); });
  });

  window.Check.suite('files — what a .reii will not open', function () {
    var F = window.ReiiFile;
    var graph = F.write('graph', window.Graph.random(5, 1).view(), 'g');

    refuses('a file that is not JSON at all', function () { F.read('Version 4\nSHEET 1', null); });
    refuses('JSON that is not one of ours', function () { F.read('{"nodes":[]}', null); });
    refuses('a file from a newer version', function () {
      F.read(graph.replace('"version": 1', '"version": 99'), null);
    });
    refuses('a graph on a page that opens arrays', function () { F.read(graph, ['array']); });
    refuses('an array on a page that opens graphs', function () {
      F.read(F.write('array', [3, 1, 2], 'a'), ['graph']);
    });

    /* the checks that matter: a file edited by hand, or written by something that guessed */
    refuses('an edge to a node that is not there', function () {
      F.read(F.write('graph', { nodes: [{ id: 0, label: 'A', x: 0.5, y: 0.5 }], edges: [] }, 'g')
        .replace('"edges": []', '"edges": [{"a":0,"b":9,"w":1}]'), null);
    });
    refuses('a node label that is markup', function () {
      F.write('graph', { nodes: [{ id: 0, label: '<b>', x: 0.1, y: 0.1 }], edges: [] }, 'g');
    });
    refuses('a point off the plane', function () {
      F.write('points', { points: [{ x: 0.5, y: 44 }] }, 'p');
    });
    refuses('a coordinate that is not a number', function () {
      F.write('points', { points: [{ x: 0.5, y: 'NaN' }] }, 'p');
    });
    refuses('a maze whose cell count does not match its size', function () {
      F.write('maze', { cols: 4, rows: 4, cells: [{ n: true, e: true, s: true, w: true }] }, 'm');
    });
    refuses('a memory block pointing its head at an empty slot', function () {
      F.write('memory', { head: 3, cells: [null, null, null, null] }, 'm');
    });
    refuses('a pointer past the end of the block', function () {
      F.write('memory', { head: 0, cells: [{ value: 1, next: 40, prev: null }] }, 'm');
    });
    refuses('an offer that ends before it starts', function () {
      F.write('jobs', { span: 12, jobs: [{ studio: 'Aurora', row: 0, start: 8, end: 3 }] }, 'j');
    });
    refuses('an array longer than any page can draw', function () {
      F.write('array', window.Tape.build(600, 'sorted'), 'a');
    });

    /* a name is a filename and a heading, so it is stripped rather than trusted */
    window.Check.equal(F.clean('<script>alert(1)</script>'), 'scriptalert1script', 'a name is stripped to plain characters');
    window.Check.equal(F.clean(''), 'untitled', 'and an empty one gets a default');
  });
})();
