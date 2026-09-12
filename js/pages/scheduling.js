/* The scheduling page. Plain script, one global `SchedulingPage`.

   The offers survive between runs, which is the entire point: run all three rules on the SAME
   set and compare Accepted and Coverage. One of them is provably optimal and the other two
   are not, and on a single random set that difference is invisible. */
(function () {
  'use strict';

  window.SchedulingPage = function () {
    var set = window.JobSet.random(5, 12);

    var page = window.Playground({
      title: 'Job scheduling',
      legend: window.Scheduling.roles,
      legendNotes: window.Scheduling.notes,

      fields: [
        { id: 'rule', kind: 'choice', label: 'Greedy rule', value: 'start', options: [
          { value: 'start', label: 'Earliest start time' },
          { value: 'shortest', label: 'Shortest job first' },
          { value: 'finish', label: 'Earliest finish time' },
        ] },
        { id: 'studios', kind: 'range', label: 'Studios', min: 2, max: 10, value: 5 },
        { id: 'span', kind: 'range', label: 'Timeline (months)', min: 6, max: 36, value: 12 },
        { id: 'generate', kind: 'button', label: 'New offers', variant: 'primary' },
        { id: 'hint', kind: 'note', spacer: true, label:
          'Run all three rules on the same offers. Only earliest finish time is guaranteed to ' +
          'take the most jobs — and it is often not the one that books the most months.' },
      ],

      file: {
        kind: 'jobs',
        name: function () { return 'offers-' + set.count(); },
        get: function () { return set.count() ? set.view() : null; },
        open: function (data) { set = window.JobSet.load(data); },
      },

      /* The offers as a figure for a practical — the same Gantt chart, with or without the
         answer. This page keeps the choice the node plane drops: the offers alone are the
         question a student schedules by hand, and the offers with the taken ones drawn heavy
         are what they check their answer against. */
      latex: {
        name: function () { return 'offers-' + set.count(); },
        ask: 'The timeline as the rule leaves it — the offers it accepted, drawn heavy. Leave ' +
          'it off for the bare set of offers to schedule by hand.',
        empty: 'there are no offers to draw yet',
        get: function (opts) {
          if (!set.count()) return null;
          var run = page.frames();
          var end = opts.solution && run.length
            ? window.Latex.chosen(run[run.length - 1].roles) : null;
          return window.Latex.jobs({
            view: set.view(), chosen: end,
            title: end
              ? window.Scheduling.rules[page.rail.get('rule')].label + ' — the run as it ends'
              : 'Job scheduling — ' + set.count() + ' offers over ' + set.span + ' months',
          });
        },
      },

      onField: function (id, value, api) {
        // changing the rule re-runs on the same offers; anything else is a new problem
        if (id === 'rule') return;
        set = window.JobSet.random(api.rail.get('studios'), api.rail.get('span'));
      },

      build: function (rail) {
        set.resetCounters();
        return {
          subject: set,
          gen: window.Scheduling.run(set, rail.get('rule')),
          title: window.Scheduling.rules[rail.get('rule')].label,
        };
      },

      render: function (surface, frame, colours) { window.JobsDraw.draw(surface, frame, colours); },
    });

    return page;
  };
})();
