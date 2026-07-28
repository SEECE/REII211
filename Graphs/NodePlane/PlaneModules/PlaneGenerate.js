/* ═══════════════════════════════════════════════════════════════════════════
   PlaneGenerate.js  –  Random graph generator submodule
   Provides: generateSmall, generateLarge
   Attaches to: window.Plane.generate
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Geometry helpers ────────────────────────────────────────────────────── */

  /* Do segments (p1→p2) and (p3→p4) properly intersect?
     "Properly" = interior crossing; shared endpoints don't count.          */
  function segmentsIntersect(p1, p2, p3, p4) {
    const d1 = direction(p3, p4, p1);
    const d2 = direction(p3, p4, p2);
    const d3 = direction(p1, p2, p3);
    const d4 = direction(p1, p2, p4);

    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
      return true;
    }
    /* Collinear / on-segment cases – treat as non-crossing for our purposes */
    return false;
  }

  function direction(pi, pj, pk) {
    return (pk.x - pi.x) * (pj.y - pi.y) - (pj.x - pi.x) * (pk.y - pi.y);
  }
  function pointNearSegment(p, a, b, threshold) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return false;
    // Project p onto the segment, clamped to [0,1]
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
    const closestX = a.x + t * dx;
    const closestY = a.y + t * dy;
    const dist = Math.hypot(p.x - closestX, p.y - closestY);
    return dist < threshold;
  }
  /* Does the candidate edge (nodeA → nodeB) cross any already-placed edge? */
  function crossesAny(nA, nB, edges, nodeMap) {
    const allNodes = window.Plane.graph.getNodes();

    // Check if any non-endpoint node lies on (or very near) the segment
    for (const n of allNodes) {
      if (n.id === nA.id || n.id === nB.id) continue;
      if (pointNearSegment(n, nA, nB, 6)) return true;
    }

    // Check edge-vs-edge crossings as before
    for (const e of edges) {
      const eA = nodeMap[e.from];
      const eB = nodeMap[e.to];
      if (e.from === nA.id || e.to === nA.id ||
          e.from === nB.id || e.to === nB.id) continue;
      if (segmentsIntersect(nA, nB, eA, eB)) return true;
    }
    return false;
  }

  /* ── Random weight ───────────────────────────────────────────────────────── */
  function rw() { return Math.floor(Math.random() * 19) + 1; } // 1–19

  /* ── Shuffle ─────────────────────────────────────────────────────────────── */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function isFullyConnected(nodes, edges) {
    if (nodes.length === 0) return true;
    const adj = new Map();
    for (const n of nodes) adj.set(n.id, []);
    for (const e of edges) {
      adj.get(e.from).push(e.to);
      adj.get(e.to).push(e.from);
    }
    const visited = new Set();
    const stack = [nodes[0].id];
    while (stack.length) {
      const cur = stack.pop();
      if (visited.has(cur)) continue;
      visited.add(cur);
      for (const nb of adj.get(cur)) stack.push(nb);
    }
    return visited.size === nodes.length;
  }

  /* ── Build graph from node list + edge candidates ────────────────────────── */
  function buildGraph(nodeDefs, pairCandidates) {
    const { clear, addNode, _pushEdge, _nextEid, getNodes } = window.Plane.graph;

    /* Clear existing graph */
    clear();

    /* Add nodes */
    for (const nd of nodeDefs) {
      addNode(nd.name, nd.x, nd.y);
    }

    /* Retry until all nodes are in one connected component */
    let placed, connected;
    do {
      placed = [];
      connected = new Set();
      const nodeMap = {};
      for (const n of getNodes()) nodeMap[n.id] = n;

      /* Remove any edges from a previous attempt */
      window.Plane.graph._filterEdges(() => false);

      const candidateCopy = shuffle([...pairCandidates]);

      for (const [nameA, nameB] of candidateCopy) {
        const nA = getNodes().find(n => n.name === nameA);
        const nB = getNodes().find(n => n.name === nameB);
        if (!nA || !nB) continue;
        const key = [nA.id, nB.id].sort().join('-');
        if (connected.has(key)) continue;
        if (Math.random() > 0.35) continue;
        if (!crossesAny(nA, nB, placed, nodeMap)) {
          _pushEdge({ id: _nextEid(), from: nA.id, to: nB.id, weight: rw() });
          placed.push({ from: nA.id, to: nB.id });
          connected.add(key);
        }
      }

    } while (!isFullyConnected(getNodes(), placed));

    window.Plane.ui.refreshAll();
  }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /* ── Small graph: fixed diamond layout ──────────────────────────────────── */
  function generateSmall() {
    const nodes = [
      { name: 'A', x: 50, y: 45 },
      { name: 'B', x: 40, y: 35 },
      { name: 'C', x: 60, y: 35 },
      { name: 'D', x: 25, y: 25 },
      { name: 'E', x: 75, y: 25 },
      { name: 'F', x: 40, y: 15 },
      { name: 'G', x: 60, y: 15 },
      { name: 'H', x: 50, y: 5 },
    ];

    /* All possible pairs — we'll greedily pick non-crossing ones */
    const names = nodes.map(n => n.name);
    const pairs = [];
    for (let i = 0; i < names.length; i++)
      for (let j = i + 1; j < names.length; j++)
        pairs.push([names[i], names[j]]);

    buildGraph(nodes, pairs);
  }

  /* ── Large graph: denser grid fill ──────────────────────────────────────── */
  function generateLarge() {
    /* 5 × 4 grid of nodes placed in world-space centre band */
    const cols = 5, rows = 4;
    const xStart = 15, xEnd = 85;
    const yStart = 8, yEnd = 42;
    const xStep = (xEnd - xStart) / (cols - 1);
    const yStep = (yEnd - yStart) / (rows - 1);

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nodes = [];
    let idx = 0;

    /* Stagger alternate rows slightly for a more interesting layout */
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const stagger = (r % 2 === 1) ? xStep * 0.15 : 0;
        nodes.push({
          name: letters[idx++],
          x: Math.round(xStart + c * xStep + stagger),
          y: Math.round(yStart + r * yStep),
        });
      }
    }

    const names = nodes.map(n => n.name);
    const pairs = [];
    for (let i = 0; i < names.length; i++)
      for (let j = i + 1; j < names.length; j++)
        pairs.push([names[i], names[j]]);

    buildGraph(nodes, pairs);
  }

  /* ── Attach to namespace ─────────────────────────────────────────────────── */
  window.Plane.generate = {
    generateSmall,
    generateLarge,
  };

})();
