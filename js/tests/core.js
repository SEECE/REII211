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

  /* The Open-or-Save control is the one part of the file feature that is DOM, so it is checked
     where the DOM is — in the browser, and skipped under node. Everything the control does to
     the FILE is checked in tests/io.js; what matters here is that it builds, that its wording
     comes out of the format rather than being typed twice, and that it opens and closes.
     Saving is not clicked: a passing self-check that downloads a file is a nuisance. */
  /* The speed slider promises a rate. It used to promise a delay, and above about 70 every
     setting asked for the same thing because a browser will not tick a nested timer faster
     than ~4 ms — the top third of the control did nothing at all. */
  window.Check.suite('core — the speed control', function () {
    var C = window.Check, player = window.Player({}), stride = [];
    for (var v = 1; v <= 100; v++) { player.setSpeed(v); stride.push(player.stride()); }
    C.ok(stride.every(function (s, i) { return i === 0 || s >= stride[i - 1]; }),
      'turning the slider up never advances fewer frames a tick');
    C.equal(stride[0], 1, 'the slowest setting is one frame a tick');
    C.equal(stride[44], 1, 'and so is the default the colour block opens on (45)');
    C.ok(stride[99] > 50, 'while the fastest advances in strides, since the timer cannot');
  });

  window.Check.suite('core — the Open-or-Save control', function () {
    var C = window.Check;
    if (typeof document === 'undefined' || !window.Files) return;

    var rail = document.createElement('div');
    var control = window.Files(rail, {
      kind: 'graph', accept: ['graph'],
      name: function () { return 'g'; },
      get: function () { return null; },              // nothing to save yet
      open: function () { C.ok(false, 'open was called by nothing'); },
    });
    C.ok(control, 'the control builds');

    var btn = rail.querySelector('[aria-expanded]');
    var list = rail.querySelector('.file-actions');
    var note = rail.querySelector('.field-note');
    C.ok(/a graph/.test(rail.textContent), 'it names the kind it opens, from js/io/reii.js');
    C.ok(list.hidden, 'it starts closed');
    btn.click();
    C.ok(!list.hidden && btn.getAttribute('aria-expanded') === 'true', 'the toggle opens it');
    btn.click();
    C.ok(list.hidden && btn.getAttribute('aria-expanded') === 'false', 'and closes it again');

    rail.querySelectorAll('.file-action')[1].click();
    C.ok(/nothing/.test(note.textContent), 'saving an empty page says so instead of writing a file');
    C.ok(note.classList.contains('field-note--error'), 'and says it as a problem');

    C.ok(window.Files(rail, { kind: 'not-a-thing' }) === null, 'it refuses a kind the format has never heard of');
  });
})();
