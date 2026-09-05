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
   says so.

   `Trace.live` is the same list DISCOVERED as it is walked, for the one page where building it
   up front is not possible. A colour block of 16,384 pixels sorted one operation at a time is
   tens of millions of beats, each recording a 16,384-long snapshot — no browser holds that, and
   building even a small fraction of it froze the tab for seconds every time a slider moved. A
   live trace walks the generator only as far as the player has asked and keeps a window of
   recent frames, so memory is the window and not the run, and a rebuild is instant. */
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
        /* optional: how far through the run this is, when the generator knows better than the
           frame count does — a race reports how many lanes are home */
        progress: beat.progress,
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

  /* Trace.live(start, opts) — frames discovered on demand. `start()` returns a FRESH
     { subject, gen } and may be called again: a generator cannot be rewound, so stepping back
     past the window replays the run from the beginning. That is the whole trade — forward is
     free, and going a long way backwards costs what getting there cost.

     `total` is null until the run ends, which is how the workbench knows to show a step count
     rather than a fraction of a length nobody knows yet.

     `rewind` bounds that replay. Redoing a hundred thousand frames to answer one Prev press is
     a tab that stops responding, so past that budget the earliest reachable frame is simply the
     oldest one still in the window and `oldest` says so — the player will not offer to go
     further back than it can actually get. */
  function live(start, opts) {
    var win = Math.max(4, (opts && opts.window) || 240);
    var rewind = (opts && opts.rewind) || 20000;
    var run = null, cache = [], base = 0, done = false;

    var api = {
      length: 0,          // how many frames have been discovered
      total: null,        // how many there are, once that is known
      oldest: 0,          // the earliest frame still reachable
      truncated: false,   // a live trace has no cap to hit
      at: at,
      restart: reset,
    };

    function reset() {
      run = start();
      cache = [];
      base = 0;
      done = false;
      api.length = 0;
      api.total = null;
      api.oldest = 0;
    }

    /* Walk forward until frame `to` exists or the generator ends. Frames older than the window
       are dropped, which is the only reason this is affordable at all. */
    function advance(to) {
      while (!done && api.length <= to) {
        var next = run.gen.next();
        if (next.done) {
          done = true;
          api.total = api.length || 1;
          break;
        }
        var beat = next.value || {};
        cache.push({
          n: api.length,
          note: beat.note || '',
          tag: beat.tag || '',
          roles: beat.roles || {},
          progress: beat.progress,
          state: run.subject.view(),
          stats: run.subject.stats ? run.subject.stats() : null,
        });
        api.length++;
        while (cache.length > win) { cache.shift(); base++; }
        api.oldest = base > rewind ? base : 0;
      }
    }

    function at(k) {
      if (!run) reset();
      if (k < api.oldest) return null;
      if (k < base) reset();            // behind the window — the only way back is from the top
      advance(k);
      if (k >= api.length) {
        // A generator that yielded nothing still gets one frame, so the workbench has
        // something to show and the renderer has a state to draw — same as build().
        if (api.length || k > 0) return null;
        cache.push({
          n: 0, note: (opts && opts.empty) || 'Nothing to do.', tag: '', roles: {},
          state: run.subject.view(), stats: run.subject.stats ? run.subject.stats() : null,
        });
        api.length = 1;
        api.total = 1;
      }
      return cache[k - base] || null;
    }

    at(0);                              // so length and the first frame exist before anyone asks
    return api;
  }

  window.Trace = {
    MAX: MAX,
    build: build,
    live: live,
    /* Drain a generator for its result only — no frames kept. This is what the self-checks
       use to assert an algorithm is CORRECT without caring how it narrated itself. */
    run: function (gen) { var r; do { r = gen.next(); } while (!r.done); return r.value; },
  };
})();
