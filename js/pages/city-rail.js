/* What the Manhattan page's rail asks for. Plain script, one global `CityRail`.

   A field list and nothing else — js/core/rail.js turns it into controls and js/pages/city.js
   turns the answers into a map. Split out of that file at the 200-line ceiling, along the line
   the whole site is already drawn on: the rail is the INPUT and it is its own region.

   Three of these fields are about the real map and do not exist on the invented one, and six
   are the other way round; js/pages/city.js hides whichever set does not apply, and hides the
   window width unless a district has actually been picked. */
(function () {
  'use strict';

  window.CityRail = function () {
    return [

        { id: 'source', kind: 'choice', label: 'Map', value: 'osm', options: [
          { value: 'osm', label: 'Manhattan — the real streets' },
          { value: 'grid', label: 'An idealised grid' },
        ] },
        { id: 'algo', kind: 'choice', label: 'Algorithm', value: 'dijkstra', options: [
          { value: 'bfs', label: 'Breadth-first — fewest blocks' },
          { value: 'dfs', label: 'Depth-first — any route at all' },
          { value: 'dijkstra', label: 'Dijkstra — the cheapest route' },
          { value: 'prim', label: "Prim's — cheapest network" },
          { value: 'kruskal', label: "Kruskal's — cheapest network" },
        ] },
        /* Which map gets BUILT: the whole island, or one district cut out of it. Those are
           two different problems and not two zoom levels — a district is a few hundred
           crossings for an algorithm to settle and the island is thirteen thousand. */
        { id: 'district', kind: 'select', label: 'Look at', value: 'all',
          options: (window.OsmGraph ? window.OsmGraph.DISTRICTS : []).map(function (d) {
            return { value: d.id, label: d.label };
          }) },
        { id: 'span', kind: 'range', label: 'Window', min: 500, max: 3000, step: 100,
          value: 1200, settle: true, format: function (v) { return v + ' m'; } },
        { id: 'roads', kind: 'select', label: 'Streets', value: 'all', options: [
          { value: 'all', label: 'Every street' },
          { value: 'main', label: 'Main roads only' },
        ] },
        { id: 'cost', kind: 'choice', label: 'A block costs', value: 'distance', options: [
          { value: 'distance', label: 'Distance — metres walked' },
          { value: 'time', label: 'Time — metres and traffic' },
        ] },
        { id: 'avenues', kind: 'range', label: 'Avenues', min: 3, max: 8, value: 5 },
        { id: 'streets', kind: 'range', label: 'Streets', min: 3, max: 8, value: 8 },
        { id: 'closures', kind: 'range', label: 'Closed streets', min: 0, max: 10, value: 3 },
        { id: 'park', kind: 'check', label: 'Put a park in the middle', value: true },
        { id: 'generate', kind: 'button', label: 'New city', variant: 'primary' },
        { id: 'hint', kind: 'note', spacer: true, label:
          'Drag a pin to move it — it snaps to the crossing you drop it on. Drag the map to ' +
          'pan it and scroll to zoom. Then run one algorithm at a time on the same two pins ' +
          'and compare what each of them came back with.' },
    ];
  };
})();
