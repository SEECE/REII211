/* The breadth-first level tree — the run written out the way it is drawn on paper. Plain
   script, one global `LevelTree`; the drawing half is js/graph/levels-draw.js.

   A plane of circles shows you the graph. It does not show what a student is asked to draw for
   BFS, which is the tree the queue built, one ROW per ring:

        L0                A
                        / | \
        L1            B   C   D
                     / \       \
        L2          E   F       G

   The start node goes on top. Every node hangs under the node that discovered it, and the
   nodes of a level sit left to right in the order the queue handed them out. Read a row and it
   is "everything exactly k edges from the start" — which is the whole claim BFS makes, and the
   reason its route is the fewest edges there are.

   **None of this is worked out here.** The tree is read straight off the frames the player is
   already walking: the visit beat says which node came out of the queue (`focus`), the beat
   after it says which nodes that node discovered (`move`), and a discovery hanging off the
   node being visited IS the parent link. Nothing decides anything — which node comes out and
   in what order is the algorithm's, and js/graph/traverse.js is not touched by any of this.
   Same rule as the Dijkstra marking table (js/graph/marks.js) and for the same reason: a
   second implementation could disagree with the first.

   The edges that are NOT in the tree are the interesting leftovers — a graph edge BFS never
   walked because both its ends were already seen. They are off by default and drawn dotted
   when asked for, because they are the ones that make a level tree look wrong until you know
   what they are. The check that the tree is a real BFS tree — every node's level is its true
   hop distance from the start — is in js/tests/graph-levels.js. */
(function () {
  'use strict';

  function pick(map, role) {
    for (var k in map) if (map[k] === role) return Number(k);
    return null;
  }

  function pickAll(map, role) {
    var out = [];
    for (var k in map) if (map[k] === role) out.push(Number(k));
    return out;
  }

  /* frames → the tree a student would draw, plus what is on the paper at each frame. Returns
     null for a run that is not breadth-first — the page draws a note instead. */
  function tabulate(frames) {
    var first = frames[0], view = first && first.state;
    if (!view || !view.nodes || !view.nodes.length) return null;
    if (first.tag !== 'BFS') return null;                 // DFS walks the same beats, not in rings
    var start = pick(first.roles, 'frontier');
    if (start == null) return null;

    var byId = {};
    view.nodes.forEach(function (n) { byId[n.id] = n; });
    if (!byId[start]) return null;

    /* `nodes` is the drawing order and the reveal order at once: a node is pushed the instant
       the run discovers it, so the first `shown` of them are exactly what is on the paper. */
    var nodes = [{ id: start, label: byId[start].label, level: 0, parent: null }];
    var index = {}, depth = {}, treeKey = {};
    index[start] = 0;
    depth[start] = 0;

    var at = new Array(frames.length);
    var focus = null, fresh = [start], shown = 1, deepest = 0;

    for (var i = 0; i < frames.length; i++) {
      var f = frames[i];
      var now = pick(f.roles, 'focus');
      // a new node came out of the queue: last beat's discoveries stop being new
      if (now != null && now !== focus) { focus = now; fresh = []; }

      if (focus != null && depth[focus] != null) {
        var found = pickAll(f.roles, 'move').filter(function (id) {
          return index[id] == null && byId[id];
        });
        if (found.length) {
          fresh = found;
          found.forEach(function (id) {
            index[id] = nodes.length;
            depth[id] = depth[focus] + 1;
            treeKey[window.Graph.edgeKey(id, focus)] = true;
            nodes.push({ id: id, label: byId[id].label, level: depth[id], parent: focus });
          });
          deepest = Math.max(deepest, depth[found[0]]);
          shown = nodes.length;
        }
      }
      at[i] = { shown: shown, focus: focus, fresh: fresh };
    }

    /* the edges BFS never walked: both ends were already seen, so the discovery that would
       have made the edge a parent link never happened */
    var cross = view.edges.filter(function (e) { return !treeKey[e.key]; });

    return {
      nodes: nodes, index: index, at: at, start: start, levels: deepest + 1,
      cross: cross, rows: rows(nodes, deepest + 1),
    };
  }

  /* one array per level, left to right in discovery order — which `nodes` is already in */
  function rows(nodes, levels) {
    var out = [];
    for (var i = 0; i < levels; i++) out.push([]);
    nodes.forEach(function (n, i) { out[n.level].push(i); });
    return out;
  }

  /* Memo of one. The page repaints sixty times a second off the same trace and the tree does
     not change between two frames of it. */
  var lastFrames = null, lastModel = null;

  window.LevelTree = {
    tabulate: tabulate,
    of: function (frames) {
      if (frames !== lastFrames) {
        lastFrames = frames;
        lastModel = frames && frames.length ? tabulate(frames) : null;
      }
      return lastModel;
    },
  };
})();
