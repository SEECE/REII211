/* The transport — play, pause, step and speed over a trace. Plain script, one global `Player`.

   Every old page reimplemented this, and each one differently: a `running` boolean, an async
   generator racing a setTimeout, a separate stepHistory array for the manual mode, and a set
   of buttons enabled by hand in four places. The trace made the two modes the same thing, and
   this is the one clock that walks it.

   Player({ onFrame, onState }) — onFrame(index) whenever the position moves, onState() whenever
   playing/position/length changes so the UI can re-enable its buttons. It owns no DOM.

   It reads its frames through `.at(k)` and never by index, which is what lets the colour block
   hand it a trace that is still being discovered (js/core/trace.js). A plain Array already has
   `.at()`, so the other fifteen pages hand it one exactly as before. Where a list ENDS is
   therefore "at(i + 1) gave nothing", not "i is the last index" — the second question has no
   answer while a trace is still growing. */
(function () {
  'use strict';

  /* The slider is a RATE, not a delay, and that distinction is the whole of this function.
     Mapping 1…100 straight onto 600 ms…2 ms looked fine and was a lie at the top: a browser
     clamps a nested setTimeout to about 4 ms, so every setting past roughly 70 asked for the
     same speed and the last third of the slider did nothing. It looked like the page being
     too slow to keep up, which on the colour block — millions of one-operation frames — is
     exactly what it felt like.

     So a rate is asked for, and once the timer cannot tick any faster the run advances several
     frames per tick instead. Nothing is skipped in the TRACE — Prev and Next still move one
     frame — it is only that not every frame gets painted, which is the honest trade when the
     screen refreshes 60 times a second and the run wants 30,000 steps in it. */
  var FLOOR = 8;                 // ms; below this the timer is fighting the browser, not the run

  function paceFor(speed) {
    var rate = 1.6 * Math.pow(30000 / 1.6, (Math.max(1, Math.min(100, speed)) - 1) / 99);
    var delay = Math.max(FLOOR, Math.round(1000 / rate));
    return { delay: delay, stride: Math.max(1, Math.round(rate * delay / 1000)) };
  }

  window.Player = function (o) {
    var frames = [], i = 0, speed = 30, timer = null;

    function announce() { if (o.onState) o.onState(api); }
    function show() { if (o.onFrame) o.onFrame(i, frames.at(i)); announce(); }
    function more() { return !!frames.at(i + 1); }

    /* The timer is armed BEFORE the frame is announced, and that order is load-bearing:
       `playing()` is "is there a timer", and everything that asks — the Play/Pause label, a
       disabled Restart — asks from inside show(). Announcing first meant every one of those
       questions was answered during the one instant of the cycle when the timer was null, so
       the button said Play for the whole of a run that was playing. */
    function tick() {
      if (!more()) { timer = null; pause(); return; }
      var pace = paceFor(speed), next = i + pace.stride;
      if (!frames.at(next)) next = Math.max(i + 1, frames.length - 1);   // the end, wherever it is
      i = next;
      timer = setTimeout(tick, pace.delay);
      show();
    }

    function play() {
      // "is there a second frame" rather than "is length >= 2": a live trace has discovered
      // only the first one at this point, and asking is what makes it find the next.
      if (timer || !frames.at(1)) return;
      if (!more()) i = 0;                     // replay rather than sit on a finished trace
      timer = setTimeout(tick, paceFor(speed).delay);
      show();
    }
    function pause() { if (timer) { clearTimeout(timer); timer = null; } announce(); }

    function goto(k) {
      var next = Math.max(frames.oldest || 0, k);
      if (!frames.at(next)) next = Math.max(0, frames.length - 1);   // past the end, wherever it is
      if (next === i) { announce(); return; }
      i = next;
      show();
    }

    var api = {
      /* load(frames) — a new trace. Position resets and playing stops: the old trace's clock
         must not keep running against a different list. */
      load: function (list) {
        pause();
        frames = list || [];
        i = 0;
        show();
        return api;
      },
      /* how many frames there ARE — null while a live trace is still discovering them, which
         is a different question from how many it has handed out so far (`length`) */
      total: function () { return frames.total === undefined ? frames.length : frames.total; },
      hasNext: more,
      /* not always frame zero: a live trace too long to replay can only go back as far as the
         window it kept, and offering a Prev that cannot be honoured is worse than not offering
         one (js/core/trace.js) */
      hasPrev: function () { return i > (frames.oldest || 0); },
      play: play,
      pause: pause,
      toggle: function () { if (timer) pause(); else play(); },
      /* stepping always pauses first — a Next press while playing otherwise fights the clock */
      step: function (d) { pause(); goto(i + d); },
      goto: function (k) { pause(); goto(k); },
      end: function () { pause(); goto(frames.length - 1); },
      setSpeed: function (s) { speed = s; },        // takes effect on the next tick
      speed: function () { return speed; },
      /* how many frames a tick will advance at the current setting — the workbench says so out
         loud, because a run that is painting one frame in twelve should not pretend otherwise */
      stride: function () { return paceFor(speed).stride; },
      playing: function () { return !!timer; },
      index: function () { return i; },
      length: function () { return frames.length; },
      frame: function () { return frames[i] || null; },
    };
    return api;
  };
})();
