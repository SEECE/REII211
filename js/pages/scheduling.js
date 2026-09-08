/* The scheduling page. Plain script, one global `SchedulingPage`.

   The offers survive between runs, which is the entire point: run all three rules on the SAME
   set and compare Accepted and Coverage. One of them is provably optimal and the other two
   are not, and on a single random set that difference is invisible. */
(function () {
  'use strict';

  window.SchedulingPage = function () {
    var set = window.JobSet.random(5, 12);

    return window.Playground({
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
  };
})();
