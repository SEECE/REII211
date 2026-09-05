/* The site map — the ONE place a page is named. Plain script, one global `SiteMap`.

   Two things render from it and nothing else knows the page list:
     js/ui/nav.js    the ribbon drop-downs on every page
     js/ui/cards.js  the card sections on home
   Adding a visualiser is therefore one entry here plus its own topic folder. The old site
   spelled its links out by hand in index.html, so a new page meant editing the index AND
   remembering that no other page linked anywhere at all.

   A group is one ribbon drop-down and one home section. `short` is the ribbon label under
   620px; `note` is the line under an item — the same job the card blurb does on home. */
(function () {
  'use strict';

  window.SiteMap = [
    {
      id: 'sorting', label: 'Sorting', short: 'Sort',
      blurb: 'Six elementary sorts on the same bar graph, so the difference between them is the only thing that changes.',
      items: [
        { id: 'selection-sort', label: 'Selection Sort', note: 'Scan for the minimum, then place it' },
        { id: 'insertion-sort', label: 'Insertion Sort', note: 'Grow a sorted prefix one card at a time' },
        { id: 'bubble-sort', label: 'Bubble Sort', note: 'Swap neighbours until a pass makes none' },
        { id: 'exchange-sort', label: 'Exchange Sort', note: 'Compare each element against every later one' },
        { id: 'merge-sort', label: 'Merge Sort', note: 'Split to single elements, then merge back up' },
        { id: 'quick-sort', label: 'Quick Sort', note: 'Partition around a pivot, then recurse' },
      ],
    },
    {
      id: 'recursion', label: 'Recursion Trees', short: 'Trees',
      blurb: 'The same two sorts again, drawn as the call tree instead of the array — where the O(n log n) actually comes from.',
      items: [
        { id: 'merge-tree', label: 'Merge Sort Tree', note: 'Every split and every merge, as a tree' },
        { id: 'quick-tree', label: 'Quick Sort Tree', note: 'Partition depth, and what an unlucky pivot costs' },
      ],
    },
    {
      id: 'structures', label: 'Data Structures', short: 'Data',
      blurb: 'What a container costs you: the memory it occupies and the pointers you have to walk to reach an element.',
      items: [
        { id: 'linked-lists', label: 'Arrays &amp; Linked Lists', note: 'Contiguous blocks against chased pointers' },
        { id: 'binary-search-trees', label: 'Binary Search Trees', note: 'Insert, search, delete — and how the tree leans' },
      ],
    },
    {
      id: 'graphs', label: 'Graphs', short: 'Graph',
      blurb: 'Traversal, shortest path and minimum spanning trees, on a plane you draw yourself — nodes and edges and nothing else, which is what all five algorithms actually see.',
      items: [
        { id: 'node-plane', label: 'Node Plane', note: 'BFS · DFS · Dijkstra · Prim · Kruskal' },
      ],
    },
    {
      id: 'applied', label: 'Applications', short: 'Apply',
      blurb: 'The same graph algorithms again, on something that is not drawn as a graph. A maze and a street map are both nodes and edges wearing a disguise, and finding that out is most of the lesson.',
      items: [
        { id: 'manhattan', label: 'Manhattan', note: 'Two pins on a street grid — fewest blocks against shortest route' },
        { id: 'maze-search', label: 'Maze Search', note: 'BFS against DFS on a generated maze' },
      ],
    },
    {
      id: 'heuristics', label: 'Heuristics', short: 'Heur',
      blurb: 'Problems where the exact answer is too expensive, and a rule of thumb has to be good enough.',
      items: [
        { id: 'tour-heuristics', label: 'Closed Route Finding', note: 'Nearest neighbour · closest pair' },
        { id: 'job-scheduling', label: 'Job Scheduling', note: 'Three greedy rules, three different answers' },
      ],
    },
    {
      id: 'compare', label: 'Comparisons', short: 'Vs',
      blurb: 'No walkthrough and nothing to follow step by step — the same input handed to several algorithms at once, to see what choosing between them is actually worth.',
      items: [
        { id: 'sorting-race', label: 'The Sorting Race', note: 'All six sorts, one array, one budget' },
        { id: 'colour-sort', label: 'The Colour Sort', note: 'The same race over a Hilbert block of hues, one operation at a time' },
      ],
    },
  ];

  /* Every visualiser lives at topics/<id>/index.html, so no entry carries an href. About and
     home are the two exceptions and they are named here rather than in either renderer. */
  window.SiteMap.href = function (id) {
    if (id === 'home') return 'index.html';
    if (id === 'about') return 'about.html';
    return 'topics/' + id + '/index.html';
  };

  window.SiteMap.extra = [
    { id: 'about', label: 'About', note: 'What this is, and what it is not' },
  ];
})();
