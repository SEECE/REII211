/* Self-checks for the runtime itself — the trace model, roles and the palette blend. */
(function () {
  'use strict';

  window.Check.suite('core — trace, roles, palette', function () {
    var C = window.Check, R = window.Roles, T = window.Trace;

    var map = R.of({ done: R.range(0, 3), scan: [3, 4], focus: null });
    C.equal(map[0], 'done', 'range fills a role');
    C.equal(map[3], 'scan', 'a later key wins over an earlier one');
    C.equal(R.at(map, 99), 'idle', 'an unmarked key is idle');
    C.equal(R.at(map, 99, 'wall'), 'wall', 'a caller can change the fallback');
    C.equal(R.range(5, 5), [], 'an empty range is empty');

    var subject = { view: function () { return [1, 2]; }, stats: function () { return { Steps: 2 }; } };
    var frames = T.build((function* () { yield { note: 'a' }; yield { note: 'b', tag: 't' }; })(), subject);
    C.equal(frames.length, 2, 'a two-beat generator makes two frames');
    C.equal(frames[1].tag, 't', 'the tag survives');
    C.equal(frames[0].stats.Steps, 2, 'the subject stats are recorded per frame');

    var empty = T.build((function* () {})(), subject);
    C.equal(empty.length, 1, 'a generator that yields nothing still gets one frame');

    var capped = T.build((function* () { while (true) yield {}; })(), subject, { max: 5 });
    C.equal(capped.length, 5, 'the trace stops at its cap');
    C.ok(capped.truncated, 'and says it was truncated');
    C.ok(/Trace stopped/.test(capped[4].note), 'and the last frame explains why');

    if (window.Palette) {
      C.equal(window.Palette.mix('#ff0000', 50, '#000000'), 'rgb(128,0,0)', 'palette blends hex');
      C.equal(window.Palette.mix('#fff', 100, '#000'), 'rgb(255,255,255)', 'palette expands short hex');
    }
  });
})();
