/* The trace — the model every page on this site shares. Plain script, one global `Trace`.

   An algorithm here is a GENERATOR that touches no DOM, owns no timer and knows nothing about
   colour. It walks a SUBJECT (an instrumented array, a graph, a tree) and yields a beat:

       yield { note: 'Comparing 12 and 9', tag: 'pass 3', roles: Roles.of({ scan: [j, j+1] }) };

   Trace.build drains the generator and, at every beat, records the subject's own view of
   itself and its own counters. That is the split that removes most of the old code: an
   algorithm no longer draws, no longer counts its comparisons by hand, no longer keeps a
   `running` flag, and no longer maintains a second stepwise copy of itself that could drift
   from the animated one. There is one path, and playing it is just walking it faster.

   A SUBJECT is any object with:
       view()   an immutable snapshot the renderer can draw — cheap, and may be shared between
                consecutive frames if nothing was written (see js/sorting/tape.js)
       stats()  the counters to pin in the workbench readout, as { Label: value }

   A FRAME is { note, tag, roles, state, stats, n }.

   A beat may state its roles in either of two ways, and the difference is the difference
   between a page that holds a district and a page that holds the island:

       roles: R.of({ done: everythingSoFar, focus: [here] })     the whole picture
       delta: R.of({ done: [wasFocused],    focus: [here] })     only what CHANGED

   A `delta` names the keys whose role moved and nothing else; the role `idle` in one means
   "back to nothing", which is what `Roles.at` already returns for a key that is absent, so
   there is no new vocabulary to learn. The trace keeps the delta as it was handed over and
   folds it into a full map only when a frame is actually DRAWN, keyframing every KEY frames so
   the fold is bounded however long the run is.

   Why it matters: a cumulative set restated every beat is O(n) memory AND O(n) time per frame,
   so a run over n nodes costs O(n²) of both. Measured on the whole of Manhattan, 3,000 frames
   of Dijkstra carried 4.6 million role entries and the full run would have carried about 345
   million. The same run stated as deltas carries a handful of keys per frame. Nothing else
   changed: an algorithm still yields one beat per step and still knows nothing about colour.

   The two forms mix freely, and the algorithms here do mix them. A beat that states the whole
   picture IS a keyframe — the accumulation restarts from it — so the summing-up frames at the
   start and end of a run are written exactly as they always were, and only the hot loop in
   between is a delta.

   The trace is finite and bounded: MAX exists because a badly-chosen input can produce
   millions of beats, and a browser tab that dies is worse than a walk that stops early and
   says so.

   `Trace.live` is the same list DISCOVERED as it is walked, for the one page where building it
   up front is not possible. It lives in js/core/trace-live.js. */
(function () {
  'use strict';

  var MAX = 40000;
  var KEY = 200;                 // frames between keyframes; the most deltas one fold walks

  /* Apply one delta to a role map, in place. `idle` erases rather than records: an absent key
     and a key marked idle mean the same thing to a renderer, and keeping the second would make
     a map grow without bound over a long run — which is the thing this exists to stop. */
  function apply(map, d) {
    for (var k in d) { if (d[k] === 'idle') delete map[k]; else map[k] = d[k]; }
    return map;
  }

  /* The full role map at frame k: the nearest keyframe at or before it, with the deltas since
     folded on. Frame 0 always carries one, so the walk back always terminates. */
  function fold(frames, k) {
    var i = k;
    while (!frames[i].full) i--;
    var out = Object.assign({}, frames[i].full);
    for (var j = i + 1; j <= k; j++) apply(out, frames[j].d);
    return out;
  }

  /* `roles` is a GETTER, so a frame nobody draws never pays for its map. Renderers read
     `frame.roles` exactly as they did — none of them can tell which kind of beat made it. */
  function record(frame, beat, frames) {
    if (beat.roles || !beat.delta) { frame.full = beat.roles || {}; }
    else {
      frame.d = beat.delta;
      // frame 0 has nothing behind it to fold from, so it becomes the first keyframe itself
      if (!frame.n) frame.full = apply({}, beat.delta);
      else if (frame.n % KEY === 0) frame.full = fold(frames, frame.n);
    }
    Object.defineProperty(frame, 'roles', {
      enumerable: true,
      get: function () { return frame.full || fold(frames, frame.n); },
    });
    return frame;
  }

  function build(gen, subject, opts) {
    var limit = (opts && opts.max) || MAX;
    var frames = [], truncated = false, beat;

    while (true) {
      var next = gen.next();
      if (next.done) break;
      beat = next.value || {};
      var frame = {
        n: frames.length,
        note: beat.note || '',
        tag: beat.tag || '',
        /* optional: how far through the run this is, when the generator knows better than the
           frame count does — a race reports how many lanes are home */
        progress: beat.progress,
        state: subject.view(),
        stats: subject.stats ? subject.stats() : null,
      };
      frames.push(frame);
      record(frame, beat, frames);
      if (frames.length >= limit) { truncated = true; break; }
    }

    // A trace always ends somewhere readable. An algorithm that yields nothing (an empty
    // input, an operation with no work to do) still gets one frame, so the workbench has
    // something to show and the renderer has a state to draw.
    if (!frames.length) {
      frames.push({
        n: 0, note: (opts && opts.empty) || 'Nothing to do.', tag: '', roles: {},
        state: subject.view(), stats: subject.stats ? subject.stats() : null,
      });
    }
    frames.truncated = truncated;
    if (truncated) {
      /* A page that knows WHY its run is too long should say so — "a smaller input" is the
         right answer for a sort and no answer at all for an algorithm that is quadratic in
         something the student cannot see. */
      frames[frames.length - 1].note +=
        '<p><b>Trace stopped at ' + limit.toLocaleString() + ' steps.</b> ' +
        ((opts && opts.why) || 'Run it again on a smaller input to see the end.') + '</p>';
    }
    return frames;
  }

  window.Trace = {
    MAX: MAX,
    build: build,
    apply: apply,               // js/core/trace-live.js folds deltas its own way; same rule
    /* Drain a generator for its result only — no frames kept. This is what the self-checks
       use to assert an algorithm is CORRECT without caring how it narrated itself. */
    run: function (gen) { var r; do { r = gen.next(); } while (!r.done); return r.value; },
  };
})();
