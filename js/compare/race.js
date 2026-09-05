/* The race — every chosen sort on ONE array at once. Plain script, one global `Race`.

   This is the first thing on the site that is not a walk through an algorithm. There is no
   narration to follow step by step: six sorts start from the same array and you watch which
   one is further along for the same money.

   That last phrase is the whole design. The obvious way to race generators is a beat each per
   tick, and it is wrong — a sort that explains itself twice per comparison would lose a race
   it actually wins, so the ranking would be a ranking of how chatty the narration is. A tick
   here is one unit of WORK instead: each lane is advanced until the tape it owns has billed
   more than the budget, so at every frame every lane has been charged the same amount and the
   only difference on screen is how much sorting that bought.

   The subject is the whole field of lanes; each lane still owns a plain `Tape`, so the counts
   are the same counts the single-sort pages show and nothing is counted twice or by hand.

       Race(values, ['merge', 'quick'], { pivot: 'last' })  →  subject, with .run() for the gen

   Cost is comparisons plus writes: the two things every one of these six pays for. Reads are
   not billed — insertion sort re-reads the key on every shift and charging for that would
   just be charging for how the loop was written. */
(function () {
  'use strict';

  function cost(tape) { var s = tape.stats(); return s.Comparisons + s.Writes; }
  function ord(k) { var s = ['th', 'st', 'nd', 'rd'], v = k % 100; return k + (s[(v - 20) % 10] || s[v] || s[0]); }

  window.Race = function (values, ids, opts) {
    var lanes = (ids || []).map(function (id) {
      var algo = window.Sorts.get(id);
      if (!algo) throw new Error('No sort registered as "' + id + '"');
      var tape = window.Tape(values);
      return {
        id: id, label: algo.label, tape: tape, gen: algo.run(tape, opts || {}),
        roles: {}, done: false, cost: 0, place: 0,
      };
    });
    var ops = 0, placed = 0;

    /* One unit of work for everyone still running. A lane whose generator ends inside this
       is home: its final cost is what it actually spent, not the budget it stopped on. */
    function tick() {
      var finished = [];
      ops++;
      lanes.forEach(function (l) {
        while (!l.done && cost(l.tape) <= ops) {
          var next = l.gen.next();
          if (next.done) {
            l.done = true;
            l.place = ++placed;
            finished.push(l);
            break;
          }
          l.roles = (next.value && next.value.roles) || {};
        }
        l.cost = cost(l.tape);
      });
      return finished;
    }

    return {
      lanes: lanes,
      running: function () { return placed < lanes.length; },
      tick: tick,
      ops: function () { return ops; },
      /* the beat's role map, one per lane — the renderer reads roles[laneId][index] */
      roles: function () {
        var out = {};
        lanes.forEach(function (l) { out[l.id] = l.roles; });
        return out;
      },
      /* the standings, cheapest first — the ranking the closing frame prints */
      order: function () {
        return lanes.slice().sort(function (a, b) { return a.cost - b.cost; });
      },

      /* the Trace subject contract. A lane's `state` is its tape's own snapshot, which the
         tape reuses until something is written, so a frame of pure comparisons allocates
         nothing but the wrapper. */
      view: function () {
        return {
          ops: ops,
          lanes: lanes.map(function (l) {
            var s = l.tape.stats();
            return {
              id: l.id, label: l.label, state: l.tape.view(), place: l.place, done: l.done,
              cost: l.cost, cmp: s.Comparisons, writes: s.Writes,
            };
          }),
        };
      },
      stats: function () {
        var first = lanes.filter(function (l) { return l.place === 1; })[0];
        return {
          Operations: ops,
          Home: placed + ' of ' + lanes.length,
          'First home': first ? first.label : '—',
        };
      },
    };
  };

  /* Everything below is prose, and prose is why this yields at all: the picture already says
     who is winning, so the narration's job is to say what the picture is measuring. */
  var RUNNING =
    'Every lane has now been charged the <b>same number of operations</b>. Nothing here is ' +
    'racing a clock — they are racing a budget, so the lane that looks furthest along is the ' +
    'one getting the most sorting done per comparison.';

  window.Race.run = function* (race) {
    var lanes = race.lanes;
    if (!lanes.length) {
      yield { tag: 'empty', note: 'Tick at least one algorithm in the panel on the left and they will all start from this array.' };
      return;
    }

    yield {
      tag: 'on your marks',
      note: '<b>' + lanes.length + ' sorts, one array.</b> Each lane holds its own copy of the ' +
        'same starting order, and every step of this run charges each of them one operation — ' +
        'one comparison or one write. Watch how far that same operation gets each algorithm.',
      roles: race.roles(),
    };

    while (race.running()) {
      var home = race.tick();
      if (!home.length) {
        yield { tag: 'running', note: RUNNING, roles: race.roles() };
        continue;
      }
      yield {
        tag: ord(home[0].place) + ' home',
        note: home.map(function (l) {
          var s = l.tape.stats();
          return '<b>' + l.label + '</b> is sorted after <b>' + l.cost.toLocaleString() +
            '</b> operations — ' + s.Comparisons.toLocaleString() + ' comparisons and ' +
            s.Writes.toLocaleString() + ' writes. It stops here; the rest keep paying.';
        }).join(' '),
        roles: race.roles(),
      };
    }

    var order = race.order();
    yield {
      tag: 'result',
      note: '<p><b>Everything is sorted.</b> The order they came home in is the order of what ' +
        'they cost on <i>this</i> array — change the starting order and it changes with it, ' +
        'which is the only honest way to compare these six.</p><ol>' +
        order.map(function (l) {
          return '<li><b>' + l.label + '</b> — ' + l.cost.toLocaleString() + ' operations (' +
            l.tape.stats().Comparisons.toLocaleString() + ' comparisons, ' +
            l.tape.stats().Writes.toLocaleString() + ' writes)</li>';
        }).join('') + '</ol>',
      roles: race.roles(),
    };
  };
})();
