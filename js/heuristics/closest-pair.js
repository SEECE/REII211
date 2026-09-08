/* Closest pair, extended into a tour. Plain script, one global `ClosestPair`.

   Nearest neighbour is greedy about WHERE YOU STAND: from here, go to the nearest place not
   yet visited. This is greedy about the CONNECTION instead — rank every possible pair by
   distance in one pass (1 to every point after it, 2 to every point after it that is not 1,
   and so on), then walk that ranked list top to bottom and take an edge unless it overloads a
   point past two legs or closes the loop before every point is on it. Whenever a point picks
   up its second leg, every remaining entry that touches it is dead — nothing more can attach
   there. The same greedy idea as nearest neighbour, spent on the cheapest connection anywhere
   on the plane rather than the cheapest one from wherever the walk last stood — usually a
   shorter tour for the same "no lookahead, no undo" honesty. */
(function () {
  'use strict';
  var R = window.Roles;

  var LIST_CAP = 200;      // ponytail: rows shown in the scroll list; raise if a page ever wants more than 40 points

  function label(id) { return '<span class="val">' + (id + 1) + '</span>'; }

  function find(parent, x) {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  }

  function pathEdges(list) { return list.map(function (e) { return 'e' + e.a + '-' + e.b; }); }
  function fullPoints(degree) {
    var out = [];
    for (var i = 0; i < degree.length; i++) if (degree[i] === 2) out.push(i);
    return out;
  }

  /* The ranked list, scrollable in the workbench note. `outcomes[i]` is set once an edge has
     been decided; a point that has already picked up two legs greys out every entry still
     waiting on it, decided or not. */
  function listHTML(edges, outcomes, degree, cur) {
    var rows = edges.slice(0, LIST_CAP).map(function (e, i) {
      var out = outcomes[i];
      var dead = !out && (degree[e.a] === 2 || degree[e.b] === 2);
      var text = label(e.a) + '–' + label(e.b) + ' <span class="val">' + e.d.toFixed(3) + '</span>';
      if (out === 'taken') text = '<b>' + text + ' — connected</b>';
      else if (out === 'loop') text = '<s>' + text + '</s> — would close the loop early';
      else if (dead) text = '<s>' + text + '</s> — an end already has two legs';
      var bg = i === cur ? 'background:rgba(127,127,127,.18);' : '';
      return '<div style="' + bg + 'padding:1px 4px;' + (dead && !out ? 'opacity:.45' : '') + '">' + text + '</div>';
    }).join('');
    var more = edges.length > LIST_CAP
      ? '<div style="opacity:.6;padding:1px 4px">… ' + (edges.length - LIST_CAP) + ' more, ranked the same way</div>' : '';
    return '<div style="max-height:200px;overflow-y:auto;font-size:.85em;line-height:1.5;' +
      'margin-top:8px;padding:4px 2px;border:1px solid currentColor;border-radius:8px;opacity:.92">' +
      rows + more + '</div>';
  }

  window.ClosestPair = {
    label: 'Closest pair — a closed loop',
    roles: ['idle', 'scan', 'focus', 'reject', 'path', 'done'],
    notes: {
      idle: { label: 'Not connected', desc: 'Not yet on the loop' },
      scan: { label: 'Ranked', desc: 'Waiting its turn on the list' },
      focus: { label: 'Just connected', desc: 'The pair the last accepted edge joined' },
      reject: { label: 'Skipped', desc: 'Would overload a point, or close the loop early' },
      path: { label: 'The loop', desc: 'Edges taken so far' },
      done: { label: 'Two legs', desc: 'Already has both its connections' },
    },

    run: function* (set) {
      var n = set.count();
      if (n < 3) { yield { note: 'A loop needs at least three points.', roles: {} }; return; }

      var edges = [];
      for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) edges.push({ a: i, b: j, d: set.dist(i, j) });
      edges.sort(function (x, y) { return x.d - y.d; });

      var degree = new Array(n).fill(0), parent = [], outcomes = [], taken = [], total = 0;
      for (i = 0; i < n; i++) parent.push(i);

      yield {
        tag: 'setup',
        note: 'Rank all <b>' + edges.length + '</b> possible connections by distance in one pass ' +
          '— that sort is the only up-front cost. Everything after it is a single walk down ' +
          'this list, taking an edge unless it would give a point a third leg or seal the loop ' +
          'while points are still stranded off it.' + listHTML(edges, outcomes, degree, -1),
        roles: {},
      };

      for (var k = 0; k < edges.length && taken.length < n; k++) {
        var e = edges[k];
        if (degree[e.a] === 2 || degree[e.b] === 2) continue;
        var ra = find(parent, e.a), rb = find(parent, e.b);
        if (ra === rb && taken.length < n - 1) {
          outcomes[k] = 'loop';
          yield {
            tag: 'skip',
            note: label(e.a) + ' to ' + label(e.b) + ' is next at <b>' + e.d.toFixed(3) + '</b>, ' +
              'but a chain already joins them — taking it would close the tour with points ' +
              'still left off it, so it is skipped.' + listHTML(edges, outcomes, degree, k),
            roles: R.of({ done: fullPoints(degree), path: pathEdges(taken), reject: [e.a, e.b] }),
          };
          continue;
        }
        outcomes[k] = 'taken';
        degree[e.a]++; degree[e.b]++;
        parent[ra] = rb;
        taken.push(e);
        total += e.d;
        set.track('Loop', total.toFixed(3));
        var maxed = (degree[e.a] === 2 ? label(e.a) + ' ' : '') + (degree[e.b] === 2 ? label(e.b) + ' ' : '');
        yield {
          tag: 'connect',
          note: label(e.a) + ' to ' + label(e.b) + ' is the shortest connection neither end has ' +
            'used up yet, at <b>' + e.d.toFixed(3) + '</b>. Connect it.' +
            (maxed ? ' ' + maxed + 'now has two legs, so every entry left that touches it is dead.' : '') +
            listHTML(edges, outcomes, degree, k),
          roles: R.of({ done: fullPoints(degree), path: pathEdges(taken), focus: [e.a, e.b] }),
        };
      }

      yield {
        tag: 'done',
        note: 'Every point has two legs, so the loop is closed. Total length <b>' +
          total.toFixed(3) + '</b> — the same greedy idea as nearest neighbour, spent on the ' +
          'cheapest connection anywhere rather than the cheapest one from wherever the walk last ' +
          'stood.',
        roles: R.of({ done: fullPoints(degree), path: pathEdges(taken) }),
      };
      return { edges: taken, length: total };
    },
  };
})();
