/* ═══════════════════════════════════════════════════════════════════════════
   PlaneScript.js  –  Shared Node-Plane engine  (orchestrator)
   Used by: BFS, DFS, Dijkstra, Kruskal, Prim
   COORDINATE SYSTEM
     World space : X ∈ [0, 100],  Y ∈ [0, 50]
     Canvas pixel : toCanvas() maps world → pixel (Y axis flipped)
   GRAPH DATA
     nodes : Array<{ id, name, x, y }>
     edges : Array<{ id, from, to, weight }>   (undirected – stored once)
   PUBLIC API  →  window.PlaneGraph
     getNodes / getEdges / adjacencyMatrix / adjacencyList
     nodeById / nodeByName / toCanvas / redraw / drawNode / ctx / canvas / NODE_R
   SUBMODULES (loaded first, same directory)
     PlaneCanvas.js  –  rendering
     PlaneGraph.js   –  data & mutations
     PlaneMatrix.js  –  adjacency-matrix view
     PlaneUI.js      –  dropdowns, info bar, view toggle
     PlaneEvents.js  –  button & keyboard wiring
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── 1. Create shared namespace ─────────────────────────────────────────── */
window.Plane = {};

/* ── 2. Load submodules sequentially, then boot ─────────────────────────── */
(function () {
  const currentScript = document.currentScript || document.scripts[document.scripts.length - 1];
  const src     = currentScript && currentScript.src ? currentScript.src : '';
  const baseDir = src.substring(0, src.lastIndexOf('/') + 1);

  const modules = [
    'PlaneCanvas.js',
    'PlaneGraph.js',
    'PlaneMatrix.js',
    'PlaneUI.js',
    'PlaneEvents.js',
  ];

  function loadModule(index) {
    if (index >= modules.length) {
      boot();
      return;
    }
    const script  = document.createElement('script');
    script.src    = baseDir + modules[index];
    script.async  = false;
    script.onload = function () { loadModule(index + 1); };
    (document.head || document.documentElement).appendChild(script);
  }

  function boot() {
    /* Size canvas & first draw */
    window.Plane.canvas.sizeCanvas();

    /* ── Public API (identical to original window.PlaneGraph) ────────────── */
    window.PlaneGraph = {
      getNodes:        window.Plane.graph.getNodes,
      getEdges:        window.Plane.graph.getEdges,
      adjacencyMatrix: window.Plane.graph.adjacencyMatrix,
      adjacencyList:   window.Plane.graph.adjacencyList,
      nodeById:        window.Plane.graph.nodeById,
      nodeByName:      window.Plane.graph.nodeByName,
      redraw:          window.Plane.canvas.redraw,
      drawNode:        window.Plane.canvas.drawNode,
      toCanvas:        window.Plane.canvas.toCanvas,
      ctx:             window.Plane.canvas.ctx,
      canvas:          window.Plane.canvas.canvas,
      NODE_R:          window.Plane.canvas.NODE_R,
    };
  }

  loadModule(0);
})();