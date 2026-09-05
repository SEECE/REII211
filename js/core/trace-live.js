/* `Trace.live` — a trace discovered as it is walked. Plain script; it adds one method to the
   `Trace` in js/core/trace.js, which must load first.

   For the one page where building the list up front is not merely slow but impossible. A colour
   block of 16,384 pixels sorted one operation at a time is tens of millions of beats, each
   recording a 16,384-long snapshot — no browser holds that, and building even a small fraction
   of it froze the tab for seconds every time a slider moved. A live trace walks the generator
   only as far as the player has asked and keeps a window of recent frames, so memory is the
   window and not the run, and a rebuild is instant.

   Split out of trace.js at the 200-line ceiling. It is the honest cut: `build` and `live` share
   the shape of a frame and nothing else — one keeps everything and can look backwards for free,
   the other keeps a window and pays to. */
(function () {
  'use strict';
  var apply = window.Trace.apply;

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
    var run = null, cache = [], base = 0, done = false, carried = {};

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
      carried = {};
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
        /* A live trace drops old frames, so it cannot keyframe: the keyframe a fold needed
           would be the first thing thrown away. It carries the running map instead and stores
           the folded copy, which costs what a full map costs — the window, not the run. No page
           that uses `live` yields deltas today; this is here so that one would still be right. */
        carried = beat.roles ? Object.assign({}, beat.roles)
          : beat.delta ? apply(carried, beat.delta) : carried;
        cache.push({
          n: api.length,
          note: beat.note || '',
          tag: beat.tag || '',
          roles: beat.delta && !beat.roles ? Object.assign({}, carried) : (beat.roles || {}),
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

  window.Trace.live = live;
})();
