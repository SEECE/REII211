/* A set of jobs on a timeline — the SUBJECT the scheduling page traces. Plain script, one
   global `JobSet`.

   The problem, in the course's framing: studios offer you films, each running from one month to
   another, and you can only shoot one at a time. Take as many as you can.

   Each job is a half-open interval [start, end): a job ending in month 6 and one starting in
   month 6 do NOT overlap, which is the convention the whole page depends on and the one that
   is easy to get wrong by one. */
(function () {
  'use strict';

  var STUDIOS = ['Aurora', 'Bellweather', 'Cinemark', 'Delta', 'Everest', 'Foxglove',
    'Grantham', 'Halcyon', 'Ironwood', 'Juniper'];

  window.JobSet = function (jobs, span) {
    var considered = 0, extras = {}, snapshot = null;
    function dirty() { snapshot = null; }

    var api = {
      span: span,
      jobs: function () { return jobs; },
      job: function (id) { return jobs[id]; },
      count: function () { return jobs.length; },
      /* the counted operation: does this job fit after everything taken so far? */
      fits: function (id, freeFrom) { considered++; return jobs[id].start >= freeFrom; },
      track: function (k, v) { extras[k] = v; dirty(); },
      resetCounters: function () { considered = 0; extras = {}; dirty(); },

      view: function () {
        if (snapshot) return snapshot;
        snapshot = { span: span, jobs: jobs.map(function (j) {
          return { id: j.id, studio: j.studio, row: j.row, start: j.start, end: j.end };
        }) };
        return snapshot;
      },
      stats: function () {
        var out = { Offers: jobs.length, Checked: considered };
        for (var k in extras) out[k] = extras[k];
        return out;
      },
    };
    return api;
  };

  /* Rebuild an offer set from a saved view(). Ids are renumbered from the file's order, since
     every rule reports the jobs it took by id and a gap in them would read as a missing offer. */
  window.JobSet.load = function (saved) {
    return window.JobSet(saved.jobs.map(function (j, i) {
      return { id: i, studio: j.studio, row: j.row, start: j.start, end: j.end };
    }), saved.span);
  };

  /* Offers from the SAME studio never overlap each other — a studio doesn't hand you two
     conflicting slots for its own film. The overlap that makes the problem worth solving is
     between studios, which this leaves untouched. */
  window.JobSet.random = function (studios, span) {
    var jobs = [];
    for (var s = 0; s < studios; s++) {
      var offers = 2 + Math.floor(Math.random() * 3);
      var cursor = Math.floor(Math.random() * Math.max(1, Math.round(span / offers)));
      for (var k = 0; k < offers && cursor < span; k++) {
        var length = 1 + Math.floor(Math.random() * Math.max(1, Math.round(span / 4)));
        var end = Math.min(span, cursor + length);
        jobs.push({ id: jobs.length, studio: STUDIOS[s % STUDIOS.length], row: s,
          start: cursor, end: end });
        cursor = end + Math.floor(Math.random() * Math.max(1, Math.round(span / offers)));
      }
    }
    return window.JobSet(jobs, span);
  };

  /* The true optimum for "most jobs". Earliest-finish-time is provably optimal, so running it
     silently IS the optimum — which is what lets the page mark the other two rules right or
     wrong instead of just describing them. */
  window.JobSet.optimum = function (set) {
    var order = set.jobs().slice().sort(function (a, b) { return a.end - b.end; });
    var free = -Infinity, taken = 0;
    order.forEach(function (j) { if (j.start >= free) { free = j.end; taken++; } });
    return taken;
  };
})();
