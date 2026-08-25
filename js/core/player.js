/* The transport — play, pause, step and speed over a trace. Plain script, one global `Player`.

   Every old page reimplemented this, and each one differently: a `running` boolean, an async
   generator racing a setTimeout, a separate stepHistory array for the manual mode, and a set
   of buttons enabled by hand in four places. The trace made the two modes the same thing, and
   this is the one clock that walks it.

   Player({ onFrame, onState }) — onFrame(index) whenever the position moves, onState() whenever
   playing/position/length changes so the UI can re-enable its buttons. It owns no DOM. */
(function () {
  'use strict';

  // 1 (slow) … 100 (fast) mapped onto 600 ms … 2 ms. Geometric, so the slider feels even.
  function delayFor(speed) {
    return Math.round(600 * Math.pow(2 / 600, (Math.max(1, Math.min(100, speed)) - 1) / 99));
  }

  window.Player = function (o) {
    var frames = [], i = 0, speed = 30, timer = null;

    function announce() { if (o.onState) o.onState(api); }
    function show() { if (o.onFrame) o.onFrame(i, frames[i]); announce(); }

    function tick() {
      timer = null;
      if (i >= frames.length - 1) { pause(); return; }
      i++;
      show();
      timer = setTimeout(tick, delayFor(speed));
    }

    function play() {
      if (timer || frames.length < 2) return;
      if (i >= frames.length - 1) i = 0;      // replay rather than sit on a finished trace
      show();
      timer = setTimeout(tick, delayFor(speed));
    }
    function pause() { if (timer) { clearTimeout(timer); timer = null; } announce(); }

    function goto(k) {
      var next = Math.max(0, Math.min(frames.length - 1, k));
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
      play: play,
      pause: pause,
      toggle: function () { if (timer) pause(); else play(); },
      /* stepping always pauses first — a Next press while playing otherwise fights the clock */
      step: function (d) { pause(); goto(i + d); },
      goto: function (k) { pause(); goto(k); },
      end: function () { pause(); goto(frames.length - 1); },
      setSpeed: function (s) { speed = s; },        // takes effect on the next tick
      speed: function () { return speed; },
      playing: function () { return !!timer; },
      index: function () { return i; },
      length: function () { return frames.length; },
      frame: function () { return frames[i] || null; },
    };
    return api;
  };
})();
