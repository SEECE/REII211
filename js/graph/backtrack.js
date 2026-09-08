/* The depth-first backtrack trace — the run written out the way it is worked through on paper.
   Plain script, one global `Backtrack`; the drawing half is js/graph/backtrack-draw.js.

   BFS is marked as rings (js/graph/levels.js). DFS is not: what a student writes for it is the
   ORDER it went in, as a line running down the page that stops dead, jumps back to a node it
   has already been to, and starts again one step to the right:

        A
        C
        E          E has nowhere new to go
           B       so the walk resumes under C, which is where B was found
           D
              H
              G
                 F

   Read it top to bottom and it is the visit order. Read a column and it is one unbroken descent
   — the "linear part". Every step right is a jump back up, drawn as a dashed arrow to the node
   the walk resumes under.

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
        /* a jump back leaves the node before it stranded: that is the dead end, and the arrow
           runs from it to the node the walk resumes under */
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
          if (found[id] == null && byId[id] && id !== start) found[id] = focus;
        });
      }
      at[i] = { shown: seq.length, focus: focus };
    }
    if (seq.length) seq[seq.length - 1].dead = true;       // the walk stops there too

    var tree = {};
    seq.forEach(function (s) { if (s.from != null) tree[window.Graph.edgeKey(s.id, s.from)] = true; });

    return {
      seq: seq, index: index, at: at, start: start, cols: cols,
      // the edges the walk never travelled along — same idea as the level tree's leftovers
      cross: view.edges.filter(function (e) { return !tree[e.key]; }),
    };
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
