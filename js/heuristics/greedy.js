/* Three greedy scheduling rules, and which of them is actually right. Plain script, one global
   `Scheduling`.

   All three do the same thing — sort the offers by some rule, then walk the list taking every
   job that still fits — and they differ only in the sort. That is what makes them worth putting
   on one page: the algorithm is identical, the rule is a one-line change, and only one of the
   three is correct.

     earliest start   take whatever begins soonest. Loses badly to one long early job that
                      blocks everything behind it.
     shortest first   take the shortest offers. Sounds right, and fails on a short job that
                      straddles the gap between two long ones and blocks both.
     earliest finish  take whatever FREES YOU SOONEST. Provably optimal for the number of jobs,
                      because after each choice you are left with the largest possible remainder
                      of the timeline and nothing was given up to get there.

   The page also measures COVERAGE — how much of the timeline is booked — because the two are
   different objectives and the rule that wins one usually loses the other. Earliest start often
   covers more months while taking fewer jobs. That is not a contradiction; it is a reminder to
   check what you are actually optimising for. */
(function () {
  'use strict';
  var R = window.Roles;

  var RULES = {
    start: { label: 'Earliest start time', sort: function (a, b) { return a.start - b.start; },
      why: 'whichever offer <b>begins</b> soonest' },
    shortest: { label: 'Shortest job first', sort: function (a, b) { return (a.end - a.start) - (b.end - b.start); },
      why: 'whichever offer is <b>shortest</b>' },
    finish: { label: 'Earliest finish time', sort: function (a, b) { return a.end - b.end; },
      why: 'whichever offer <b>frees you</b> soonest' },
  };

  function name(j) { return '<span class="val">' + j.studio + ' ' + j.start + '–' + j.end + '</span>'; }

  window.Scheduling = {
    rules: RULES,
    roles: ['idle', 'scan', 'path', 'reject'],
    notes: {
      idle: { label: 'On offer', desc: 'Not considered yet' },
      scan: { label: 'Deciding', desc: 'The offer being looked at right now' },
      path: { label: 'Accepted', desc: 'Taken — it fitted' },
      reject: { label: 'Turned down', desc: 'It overlapped something already accepted' },
    },

    run: function* (set, ruleId) {
      var rule = RULES[ruleId];
      var order = set.jobs().slice().sort(rule.sort);
      var taken = [], rejected = [], free = -Infinity, covered = 0;

      yield {
        tag: rule.label,
        note: 'Sort all <b>' + order.length + '</b> offers by ' + rule.why + ', then walk the ' +
          'list once and take every job that still fits. The walk is the same for all three ' +
          'rules — <b>only the sort changes</b>.',
        roles: {},
      };

      for (var i = 0; i < order.length; i++) {
        var job = order[i];
        var fits = set.fits(job.id, free);
        yield {
          tag: rule.label,
          note: 'Next by this rule: ' + name(job) + '. You are free from month <b>' +
            (free === -Infinity ? '0' : free) + '</b>, so it ' + (fits ? '<b>fits</b>.' :
              '<b>overlaps</b> something already accepted — turn it down.'),
          roles: R.of({ path: taken, reject: rejected, scan: [job.id] }),
        };
        if (fits) {
          taken.push(job.id);
          covered += job.end - job.start;
          free = job.end;
        } else {
          rejected.push(job.id);
        }
        set.track('Accepted', taken.length);
        set.track('Coverage', Math.round(covered / set.span * 100) + '%');
      }

      var best = window.JobSet.optimum(set);
      yield {
        tag: 'done',
        note: '<b>' + taken.length + '</b> job' + (taken.length === 1 ? '' : 's') + ' accepted, ' +
          'covering <b>' + Math.round(covered / set.span * 100) + '%</b> of the timeline. ' +
          (taken.length === best
            ? (ruleId === 'finish'
              ? 'That is the most possible — earliest finish time is <b>provably optimal</b> for ' +
                'the number of jobs, because each choice leaves you the largest remainder of the ' +
                'timeline and gives up nothing to do it.'
              : 'That happens to match the best possible <b>' + best + '</b> on these offers — ' +
                'but this rule is not guaranteed to. Generate again.')
            : 'The best possible is <b>' + best + '</b>, so this rule left <b>' + (best - taken.length) +
              '</b> on the table. Run <i>earliest finish time</i> on the same offers.') +
          ' Watch coverage as well as count: a rule can book more <i>months</i> while taking ' +
          'fewer <i>jobs</i>, and those are different questions.',
        roles: R.of({ path: taken, reject: rejected }),
      };
      return taken;
    },
  };
})();
