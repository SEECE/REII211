/* The point plane — nearest-neighbour tour and closest pair. Plain script, one global
   `TourPage`.

   Click the stage to add a point, click a point to remove it. The set survives between runs so
   the two algorithms can be compared on the same points, which is the only way the tour's
   verdict against the exact answer means anything. */
(function () {
  'use strict';

  window.TourPage = function () {
    var set = window.PointSet.random(8), rails = null;

    function* announce(text) { yield { tag: 'edit', note: text, roles: {} }; }

    /* What just happened, in the rail's note. Editing the plane used to REPLACE the run with a
       one-frame announcement saying so, which threw away the run you were watching — add a
       point mid-play and the algorithm was gone until you pressed one again. The edit now
       restarts it on the edited set, and the sentence about it goes here. Same fix as
       js/pages/node-plane.js, which had the same bug. */
    var GUIDE = 'Click the plane to add a point, click a point to remove it. At eight points ' +
      'or fewer the tour is also solved exactly, so you can see how far off greedy was.';
    function say(text) {
      var note = rails && rails.el('hint');
      if (note) note.innerHTML = text || GUIDE;
    }

    var page = window.Playground({
      title: 'Point plane',
      legend: ['idle', 'scan', 'focus', 'reject', 'path', 'done'],
      legendNotes: Object.assign({}, window.NearestTour.notes, window.ClosestPair.notes),

      fields: [
        { id: 'algo', kind: 'choice', label: 'Algorithm', value: 'tour', options: [
          { value: 'tour', label: 'Nearest neighbour — closed tour' },
          { value: 'pair', label: 'Closest pair — a closed loop' },
        ] },
        { id: 'start', kind: 'number', label: 'Tour starts at point', min: 1, max: 99, value: 1 },
        { id: 'size', kind: 'range', label: 'Generate points', min: 3, max: 40, value: 8 },
        { id: 'generate', kind: 'button', label: 'New points', variant: 'primary' },
        { id: 'clear', kind: 'button', label: 'Clear the plane', variant: 'ghost' },
        { id: 'hint', kind: 'note', spacer: true, label: GUIDE },
      ],

      file: {
        kind: 'points',
        name: function () { return 'points-' + set.count(); },
        get: function () { return set.count() ? set.view() : null; },
        open: function (data, name) {
          set = window.PointSet.load(data);
          say('Opened <b>' + name + '</b> — ' + set.count() +
            ' points, running the algorithm on them now.');
        },
      },

      onField: function (id, value, api) {
        say(null);
        if (id === 'generate') { set = window.PointSet.random(api.rail.get('size')); return; }
        if (id === 'clear') { set = window.PointSet(); return; }
        if (id === 'size') return false;
      },

      build: function (rail) {
        rails = rail;
        set.resetCounters();
        var tour = rail.get('algo') === 'tour';
        rail.show('start', tour);
        /* An empty plane is the one thing neither algorithm can be run on; every other edit,
           the run is rebuilt and starts again from the top. */
        if (!set.count()) {
          return { subject: set, title: 'Point plane',
            gen: announce('The plane is empty. Click it to place a point, or press New points.') };
        }
        if (tour) {
          var start = Math.min(Math.max(1, rail.get('start')), Math.max(1, set.count())) - 1;
          return { subject: set, gen: window.NearestTour.run(set, start), title: window.NearestTour.label };
        }
        return { subject: set, gen: window.ClosestPair.run(set), title: window.ClosestPair.label };
      },

      render: function (surface, frame, colours) { window.PointDraw.draw(surface, frame, colours); },
    });

    /* Editing the plane. One handler: on a point removes it, on empty space adds one. */
    page.surface.canvas.addEventListener('pointerdown', function (e) {
      var box = page.surface.canvas.getBoundingClientRect();
      var px = e.clientX - box.left, py = e.clientY - box.top;
      var hit = window.PointDraw.hit(page.surface, set.view(), px, py);
      if (hit != null) {
        set.removeAt(hit);
        say('Removed point ' + (hit + 1) + '. The rest were renumbered and the algorithm is ' +
          'running again from the top.');
      } else {
        var at = window.PointDraw.place(page.surface, px, py);
        set.add(at.x, at.y);
        say('Added point ' + set.count() + '. The algorithm is running again from the top on ' +
          'the plane as it stands.');
      }
      page.rebuild();
    });

    return page;
  };
})();
