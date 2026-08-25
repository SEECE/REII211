/* A set of points on a plane — the SUBJECT the tour page traces. Plain script, one global
   `PointSet`.

   Positions are in the unit square; the renderer scales them. Every distance is measured
   through `dist`, which counts, because on this page the number of distance computations IS
   the algorithm's cost and the reason a heuristic gets used at all. */
(function () {
  'use strict';

  window.PointSet = function () {
    var points = [], measured = 0, extras = {}, snapshot = null;
    function dirty() { snapshot = null; }

    var api = {
      add: function (x, y) { points.push({ id: points.length, x: x, y: y }); dirty(); return points.length - 1; },
      removeAt: function (id) {
        points = points.filter(function (p) { return p.id !== id; });
        points.forEach(function (p, i) { p.id = i; });
        dirty();
      },
      clear: function () { points = []; dirty(); },
      points: function () { return points; },
      at: function (id) { return points[id]; },
      count: function () { return points.length; },

      /* the counted operation — a heuristic is only worth having because this is expensive */
      dist: function (a, b) {
        measured++;
        var p = points[a], q = points[b];
        return Math.hypot(p.x - q.x, p.y - q.y);
      },
      raw: function (a, b) {           // uncounted, for scoring a finished answer
        return Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);
      },
      track: function (k, v) { extras[k] = v; dirty(); },
      resetCounters: function () { measured = 0; extras = {}; dirty(); },

      view: function () {
        if (snapshot) return snapshot;
        snapshot = { points: points.map(function (p) { return { id: p.id, x: p.x, y: p.y }; }) };
        return snapshot;
      },
      stats: function () {
        var out = { Points: points.length, Distances: measured };
        for (var k in extras) out[k] = extras[k];
        return out;
      },
    };
    return api;
  };

  window.PointSet.load = function (saved) {
    var set = window.PointSet();
    (saved.points || []).forEach(function (p) { set.add(p.x, p.y); });
    return set;
  };

  /* Scatter, with a minimum separation so no two points land on top of each other — a pair a
     student cannot tell apart makes every answer on the page look wrong. */
  window.PointSet.random = function (n) {
    var set = window.PointSet(), guard = 0;
    while (set.count() < n && guard++ < n * 200) {
      var x = 0.06 + Math.random() * 0.88, y = 0.08 + Math.random() * 0.84;
      var clear = set.points().every(function (p) { return Math.hypot(p.x - x, p.y - y) > 0.055; });
      if (clear) set.add(x, y);
    }
    return set;
  };

  /* The length of a closed tour, uncounted — this is scoring, not searching. */
  window.PointSet.tourLength = function (set, order) {
    var total = 0;
    for (var i = 0; i < order.length; i++) total += set.raw(order[i], order[(i + 1) % order.length]);
    return total;
  };
})();
