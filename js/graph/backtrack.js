/* The depth-first backtrack trace — the run written out the way it is worked through on paper.
   Plain script, one global `Backtrack`; the drawing half is js/graph/backtrack-draw.js.

   BFS is marked as rings (js/graph/levels.js). DFS is not: what a student writes for it is the
   ORDER it went in, as a line running down the page that stops dead, jumps back to a node it
   has already been to, and starts again one step to the right:

        A
        C
        B
        D          D has nowhere new to go, so the walk retreats — through B, which is where
     ↰     H       H was found — and carries on there, one column to the right
     ↰     F
              G

   Read it top to bottom and it is the visit order. Read a column and it is one unbroken descent
   — the "linear part". New branches go RIGHT and every retreat goes LEFT, into a gutter of its
   own, so the two directions never share a line.

   A retreat is drawn NODE BY NODE and not as one jump to wherever the walk ends up: coming out
   of D, a recursive search returns through every node between D and B in turn, and "it went
   back four" is the thing being taught. They are all one occasion, though, so they share one
   unbroken line — and two retreats whose rows overlap take different lanes in the gutter, or
   they would draw on top of each other and read as one.

   **None of this is worked out here.** The line is read straight off the frames: the visit beat
   says which node came off the stack (`focus`), the beat after it says which nodes that node
   discovered (`move`), and a node's discoverer is where its line hangs from. Nothing decides
   anything; js/graph/traverse.js is not touched by any of this. Same rule as the Dijkstra
   marking table (js/graph/marks.js) and for the same reason.

   ── What the jump back MEANS here ── js/graph/traverse.js marks a node the moment it is pushed
   rather than when it is popped, which is what stops the same node being stacked twice. So the
   node the walk resumes at was not sitting on a call stack waiting to be returned to: it was
   put in the container earlier and has been waiting there ever since. The arrow is therefore
   "the stack handed back something older", which is exactly what a stack does and exactly what
   the run is. It is drawn dashed and not solid for that reason — the walk did not travel along
   it, it jumped. */
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

  /* frames → the line a student would draw, plus what is on the paper at each frame. Returns
     null for a run that is not depth-first — the page draws a note instead. */
  function tabulate(frames) {
    var first = frames[0], view = first && first.state;
    if (!view || !view.nodes || !view.nodes.length) return null;
    if (first.tag !== 'DFS') return null;                 // BFS walks the same beats, in rings
    var start = pick(first.roles, 'frontier');
    if (start == null) return null;

    var byId = {};
    view.nodes.forEach(function (n) { byId[n.id] = n; });
    if (!byId[start]) return null;

    /* `found[x]` is the node x was discovered from — recorded when it goes into the container,
       which is beats before it comes back out. Where its line hangs from is that node. */
    var found = {}, seq = [], index = {}, cols = 1;
    var at = new Array(frames.length), focus = null;

    function visit(id) {
      if (index[id] != null) return;                      // one line per node, however often shown
      var last = seq[seq.length - 1];
      var branch = last && found[id] !== last.id;
      index[id] = seq.length;
      seq.push({
        id: id, label: byId[id].label, from: found[id] == null ? null : found[id],
        row: seq.length, col: last ? (branch ? last.col + 1 : last.col) : 0,
        /* a jump back leaves the node before it stranded: that is the dead end, and the
           retreat runs from it up to the node the walk resumes under. `via` is filled in below,
           once the whole line exists to walk back up. */
        back: branch ? { from: last.id, to: found[id] } : null,
      });
      if (branch) last.dead = true;
      cols = Math.max(cols, seq[seq.length - 1].col + 1);
    }

    visit(start);
    for (var i = 0; i < frames.length; i++) {
      var f = frames[i];
      var now = pick(f.roles, 'focus');
      if (now != null && now !== focus) { focus = now; visit(now); }
      if (focus != null) {
        pickAll(f.roles, 'move').forEach(function (id) {
          // the LAST node to push it is the one the walk arrives from, so this keeps writing
          // until the node is actually taken off and put on the line
          if (index[id] == null && byId[id] && id !== start) found[id] = focus;
        });
      }
      at[i] = { shown: seq.length, focus: focus };
    }
    if (seq.length) seq[seq.length - 1].dead = true;       // the walk stops there too
    var lanes = route(seq, index);

    var tree = {};
    seq.forEach(function (s) { if (s.from != null) tree[window.Graph.edgeKey(s.id, s.from)] = true; });

    return {
      seq: seq, index: index, at: at, start: start, cols: cols, lanes: lanes,
      // the edges the walk never travelled along — same idea as the level tree's leftovers
      cross: view.edges.filter(function (e) { return !tree[e.key]; }),
    };
  }

  /* Every retreat, filled out node by node and given a lane in the gutter. Returns how many
     lanes the gutter needs.

     `via` is the dead end, then every node between it and where the walk resumes, then that
     node — which is the chain of `from` links, because the node a walk resumes under is always
     an ancestor of the one it just gave up on. That is the depth-first property stated from the
     other end, and js/tests/graph.js checks it on the walk itself.

     A lane is free for a retreat if the last retreat put in it finished above this one starts.
     Lane 0 is the one nearest the nodes, so the common shallow retreat keeps the short stub and
     only the ones that overlap it are pushed out. */
  function route(seq, index) {
    var bottom = [];
    seq.forEach(function (n) {
      if (!n.back) return;
      var path = [n.back.from], at = n.back.from, guard = seq.length;
      while (at !== n.back.to && guard-- > 0) {
        var up = seq[index[at]];
        if (!up || up.from == null) break;
        at = up.from;
        path.push(at);
      }
      // a resume node that is not an ancestor would be a broken tree; draw the one hop and say so
      n.back.via = path[path.length - 1] === n.back.to ? path : [n.back.from, n.back.to];
      var top = index[n.back.to], low = index[n.back.from], lane = 0;
      while (lane < bottom.length && bottom[lane] >= top) lane++;
      bottom[lane] = low;
      n.back.lane = lane;
    });
    return bottom.length;
  }

  /* Memo of one — the page repaints off the same trace sixty times a second. */
  var lastFrames = null, lastModel = null;

  window.Backtrack = {
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
