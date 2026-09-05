/* Where the map comes from. Plain script, one global `CitySource`.

   Two maps answer to the same contract, so the page can hold both without knowing anything
   about either:

     real       js/city/osm-graph.js — a window on Manhattan as OpenStreetMap has it
     invented   js/city/grid.js — the idealised grid, with block lengths and a traffic model

   Keeping both is not indecision. The invented grid is where fewest-blocks and shortest-route
   are provably the same answer; the real one is where that stops being true. You need the first
   to notice the second, and js/tests/city.js and js/tests/osm.js assert exactly that pair. */
(function () {
  'use strict';

  window.CitySource = {
    /* what "main roads only" means, in OSM's classes */
    MAIN: ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'],

    /* Always returns a Graph. If the extract is missing, or a window came back empty, it falls
       back to the invented grid rather than handing the stage nothing to draw. */
    build: function (o) {
      var g = null;
      if (o.real && window.OsmGraph && window.OsmGraph.ready()) {
        var where = (window.OsmGraph.DISTRICTS.filter(function (d) {
          return d.id === o.district;
        })[0]) || window.OsmGraph.DISTRICTS[0];
        g = window.OsmGraph.build({
          lat: where.lat, lon: where.lon, span: o.span,
          classes: o.roads === 'main' ? window.CitySource.MAIN : null,
        });
      }
      return g || window.CityGrid({
        avenues: o.avenues, streets: o.streets, park: o.park,
        closures: o.closures, traffic: o.traffic,
      });
    },

    /* The two crossings furthest apart along the diagonal — the top-left and the bottom-right
       of whatever was built. On the grid that is A1 and the far corner; on a real window it is
       a walk right across the district, rather than the two crossings that happened to be
       indexed first and last, which is all an OSM id would have told you. */
    pins: function (g) {
      var all = g.nodes(), lo = all[0], hi = all[0];
      all.forEach(function (n) {
        if (n.x + n.y < lo.x + lo.y) lo = n;
        if (n.x + n.y > hi.x + hi.y) hi = n;
      });
      return { from: lo.id, to: hi.id };
    },

    /* ODbL asks for the credit where the data is shown, so it goes over the stage rather than
       in the rail, which folds away on a narrow screen. It also has to be TRUE: the invented
       grid is not map data and must never be presented as though it were. */
    credit: function (el, g) {
      if (!el) return;
      el.innerHTML = g && g.span
        ? 'Streets: &copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener" ' +
          'target="_blank">OpenStreetMap</a> contributors, <a rel="noopener" target="_blank" ' +
          'href="https://opendatacommons.org/licenses/odbl/">ODbL</a> &middot; ' +
          g.span + '&thinsp;m across'
        : 'An idealised grid &mdash; invented, not map data';
    },
  };
})();
