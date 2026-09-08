/* The self-check runner. Plain script, one global `Check`.

   Every algorithm on this site is a pure generator over a subject that touches no DOM, which
   is what makes checking it possible at all — a check runs the real file, drains the trace and
   asserts on the result. Nothing here mocks anything.

   Suites register themselves and test.html runs the lot. Because nothing is written during
   parsing, the same files also run under node with a two-line window shim, which is how they
   were used while the rewrite was being done. */
(function () {
  'use strict';

  var suites = [], results = [];

  function record(ok, name, detail) {
    results.push({ ok: ok, name: name, detail: detail || '' });
    if (!ok && typeof console !== 'undefined') console.error('FAIL ' + name + ' — ' + detail);
  }

  window.Check = {
    suite: function (name, fn) { suites.push({ name: name, fn: fn }); },

    ok: function (value, name, detail) { record(!!value, name, detail); return !!value; },
    equal: function (got, want, name) {
      var a = JSON.stringify(got), b = JSON.stringify(want);
      return record(a === b, name, a + ' != ' + b), a === b;
    },
    close: function (got, want, name, tol) {
      var near = Math.abs(got - want) <= (tol == null ? 1e-9 : tol);
      return record(near, name, got + ' != ' + want), near;
    },
    sorted: function (list, name) {
      var ok = list.every(function (v, i) { return i === 0 || list[i - 1] <= v; });
      return record(ok, name, list.join(',')), ok;
    },

    run: function (out) {
      results = [];
      var started = Date.now();
      suites.forEach(function (s) {
        var before = results.length;
        try { s.fn(); } catch (e) { record(false, s.name, 'threw: ' + (e && e.message)); }
        var mine = results.slice(before);
        var bad = mine.filter(function (r) { return !r.ok; });
        if (!out) return;
        out.insertAdjacentHTML('beforeend',
          '<p class="' + (bad.length ? 'bad' : 'good') + '"><b>' + s.name + '</b> — ' +
          (mine.length - bad.length) + ' / ' + mine.length + ' passed' +
          bad.map(function (r) { return '<br><span class="detail">' + r.name + ': ' + r.detail + '</span>'; }).join('') +
          '</p>');
      });
      var failed = results.filter(function (r) { return !r.ok; }).length;
      var line = failed
        ? failed + ' of ' + results.length + ' checks FAILED'
        : 'all ' + results.length + ' checks passed in ' + (Date.now() - started) + ' ms';
      if (out) out.insertAdjacentHTML('afterbegin', '<h2 class="' + (failed ? 'bad' : 'good') + '">' + line + '</h2>');
      return { total: results.length, failed: failed };
    },
  };
})();
