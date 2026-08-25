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

   The trace is finite and bounded: MAX exists because a badly-chosen input can produce
   millions of beats, and a browser tab that dies is worse than a walk that stops early and
   says so. */
(function () {
  'use strict';

  var MAX = 40000;

  function build(gen, subject, opts) {
    var limit = (opts && opts.max) || MAX;
    var frames = [], truncated = false, beat;

    while (true) {
      var next = gen.next();
      if (next.done) break;
      beat = next.value || {};
      frames.push({
        n: frames.length,
        note: beat.note || '',
        tag: beat.tag || '',
        roles: beat.roles || {},
        state: subject.view(),
        stats: subject.stats ? subject.stats() : null,
      });
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
      frames[frames.length - 1].note +=
        '<p><b>Trace stopped at ' + limit.toLocaleString() +
        ' steps.</b> Run it again on a smaller input to see the end.</p>';
    }
    return frames;
  }

  window.Trace = {
    MAX: MAX,
    build: build,
    /* Drain a generator for its result only — no frames kept. This is what the self-checks
       use to assert an algorithm is CORRECT without caring how it narrated itself. */
    run: function (gen) { var r; do { r = gen.next(); } while (!r.done); return r.value; },
  };
})();
