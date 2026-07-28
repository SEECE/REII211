/* ═══════════════════════════════════════════════════════════════════════════
   BFS.js  –  Breadth-First Search visualiser
   Follows Skiena's algorithm exactly:
     state[u] ∈ { "undiscovered", "discovered", "processed" }
     p[u]     = parent in BFS tree (null initially)
   Depends on: PlaneScript.js, ApplyAlgorithm.js
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════════════
     COLOUR HELPERS
     ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Map a BFS level (0-based) to an HSL colour spanning red → violet.
   * With only 1 level the single colour is red (hue 0).
   * With N levels we fan from hue 0° (red) to 270° (violet).
   */
  function levelToHsl(level, totalLevels) {
    const maxHue = 270;
    const hue = totalLevels <= 1 ? 0 : Math.round((level / (totalLevels - 1)) * maxHue);
    return {
      fill:   `hsl(${hue},70%,52%)`,
      stroke: `hsl(${hue},70%,35%)`,
      text:   '#ffffff',
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     SKIENA'S BFS  (pure computation, no drawing)
     Returns: { order, level, parent, treeEdges, targetFound, maxLevel }
       order              : Array of step snapshots (consumed by draw / shell)
       level[nodeId]      : BFS distance from source (-1 = unreachable)
       parent[nodeId]     : parent id in BFS tree (null = root / unreachable)
       treeEdges          : Set of "fromId-toId" strings (both directions)
       targetFound        : node id that matched the target (null if not found)
       maxLevel           : highest level reached
   ═══════════════════════════════════════════════════════════════════════════ */
  function runBFS(sourceId, targetId) {
    const { getNodes, adjacencyList } = window.PlaneGraph;
    const nodes   = getNodes();
    const adjList = adjacencyList();

    /* Initialise all vertices */
    const state  = {};   /* "undiscovered" | "discovered" | "processed" */
    const parent = {};
    const level  = {};

    for (const n of nodes) {
      state[n.id]  = 'undiscovered';
      parent[n.id] = null;
      level[n.id]  = -1;
    }

    /* Seed source */
    state[sourceId] = 'discovered';
    level[sourceId] = 0;

    const queue       = [sourceId];
    const order       = [];
    const treeEdges   = new Set();
    let   targetFound = null;

    /* Snapshot helper – deep-copies mutable state for the stepwise renderer */
    const snap = (type, u, v, msg, extra = {}) => {
      order.push({
        type, u, v, msg,
        state:  { ...state  },
        parent: { ...parent },
        level:  { ...level  },
        targetFound,
        ...extra,
      });
    };

    snap('init', sourceId, null,
      `Initialised. Start node: ${nodeName(sourceId)}. Queue: [${nodeName(sourceId)}]`);

    /* Main loop */
    while (queue.length > 0) {
      const u = queue.shift();

      snap('dequeue', u, null,
        `Dequeued ${nodeName(u)} — processing its neighbours.`);

      for (const { nodeId: v } of [...(adjList.get(u) || [])].sort((a, b) => nodeName(a.nodeId).localeCompare(nodeName(b.nodeId)))) {
        snap('edge', u, v,
          `Edge (${nodeName(u)}, ${nodeName(v)}) — state[${nodeName(v)}] = ${state[v]}`);

        if (state[v] === 'undiscovered') {
          state[v]  = 'discovered';
          parent[v] = u;
          level[v]  = level[u] + 1;
          treeEdges.add(`${u}-${v}`);
          treeEdges.add(`${v}-${u}`);
          queue.push(v);

          snap('discover', u, v,
            `Discovered ${nodeName(v)} (level ${level[v]}) via ${nodeName(u)}. ` +
            `Queue: [${queue.map(id => nodeName(id)).join(', ')}]`);

          if (targetId && v === targetId) {
            targetFound = v;
            snap('found', u, v,
              `Target ${nodeName(v)} found at level ${level[v]}!`);
          }
        }
      }

      state[u] = 'processed';
      snap('process', u, null, `${nodeName(u)} fully processed.`);
    }

    if (targetId && !targetFound) {
      snap('notfound', null, null,
        `Target ${nodeName(targetId)} not reachable from ${nodeName(sourceId)}.`);
    } else if (!targetId) {
      const visited = nodes.filter(n => level[n.id] >= 0).length;
      snap('done', null, null, `BFS complete. ${visited} nodes visited.`);
    }

    const maxLevel = Math.max(...Object.values(level).filter(l => l >= 0));
    return { order, level, parent, treeEdges, targetFound, maxLevel };
  }

  function nodeName(id) {
    const n = window.PlaneGraph.nodeById(id);
    return n ? n.name : String(id);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     DRAWING
     draw(step, result) — called by AlgoShell for every render
   ═══════════════════════════════════════════════════════════════════════════ */
  function drawBFS(step, result) {
    const { maxLevel, treeEdges } = result;
    const PG = window.PlaneGraph;
    const { redraw, drawNode, toCanvas, ctx, NODE_R } = PG;

    redraw();   /* clean slate – grid + plain edges */

    const c           = ctx();
    const nodes       = PG.getNodes();
    const edges       = PG.getEdges();
    const totalLevels = maxLevel + 1;

    c.save();

    /* ── Highlight tree edges ──────────────────────────────────────────────── */
    for (const e of edges) {
      const key1 = `${e.from}-${e.to}`;
      const key2 = `${e.to}-${e.from}`;
      if (!treeEdges.has(key1) && !treeEdges.has(key2)) continue;

      const nA = PG.nodeById(e.from);
      const nB = PG.nodeById(e.to);
      if (!nA || !nB) continue;

      const cA = toCanvas(nA.x, nA.y);
      const cB = toCanvas(nB.x, nB.y);

      /* Colour from the child node's level */
      const childId  = step.parent[e.to] === e.from ? e.to : e.from;
      const childLvl = step.level[childId];
      const col      = childLvl >= 0 ? levelToHsl(childLvl, totalLevels) : null;

      c.beginPath();
      c.moveTo(cA.x, cA.y);
      c.lineTo(cB.x, cB.y);
      c.strokeStyle = col ? col.fill : '#6366f1';
      c.lineWidth   = 4;
      c.stroke();
    }

    /* ── Active edge being examined (amber dashed) ─────────────────────────── */
    if (step.type === 'edge' && step.u !== null && step.v !== null) {
      const nA = PG.nodeById(step.u);
      const nB = PG.nodeById(step.v);
      if (nA && nB) {
        const cA = toCanvas(nA.x, nA.y);
        const cB = toCanvas(nB.x, nB.y);
        c.beginPath();
        c.moveTo(cA.x, cA.y);
        c.lineTo(cB.x, cB.y);
        c.strokeStyle = '#f59e0b';
        c.lineWidth   = 3;
        c.setLineDash([6, 4]);
        c.stroke();
        c.setLineDash([]);
      }
    }

    c.restore();

    /* ── Draw nodes with level colours ────────────────────────────────────── */
    for (const n of nodes) {
      const pos      = toCanvas(n.x, n.y);
      const lvl      = step.level[n.id];
      const st       = step.state[n.id] || 'undiscovered';
      const isActive = (n.id === step.u);
      const isTarget = (n.id === step.v && step.type === 'discover');

      let fill, stroke, text;
      if (lvl >= 0) {
        const col = levelToHsl(lvl, totalLevels);
        fill   = col.fill;
        stroke = col.stroke;
        text   = col.text;
      } else {
        fill   = '#334155';
        stroke = '#1e293b';
        text   = '#94a3b8';
      }

      drawNode(pos.x, pos.y, n.name, fill, stroke, text);

      /* Amber ring = discovered (in queue) but not yet active */
      if (st === 'discovered' && !isActive) {
        c.beginPath();
        c.arc(pos.x, pos.y, NODE_R + 4, 0, Math.PI * 2);
        c.strokeStyle = '#fbbf24';
        c.lineWidth   = 2.5;
        c.stroke();
      }

      /* Orange pulse ring = node currently being dequeued */
      if (isActive) {
        c.beginPath();
        c.arc(pos.x, pos.y, NODE_R + 5, 0, Math.PI * 2);
        c.strokeStyle = '#f97316';
        c.lineWidth   = 3;
        c.stroke();
      }

      /* Green dashed ring = target just found */
      if (isTarget && step.targetFound) {
        c.beginPath();
        c.arc(pos.x, pos.y, NODE_R + 7, 0, Math.PI * 2);
        c.strokeStyle = '#22c55e';
        c.lineWidth   = 3;
        c.setLineDash([4, 3]);
        c.stroke();
        c.setLineDash([]);
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     LEGEND
     buildLegend(result) — called once after run(), before first draw
   ═══════════════════════════════════════════════════════════════════════════ */
  function buildLegend(result) {
    const legendEl  = document.getElementById('bfs-legend');
    const swatches  = document.getElementById('bfs-legend-swatches');
    if (!legendEl || !swatches) return;

    swatches.innerHTML = '';
    const total = result.maxLevel + 1;
    for (let l = 0; l <= result.maxLevel; l++) {
      const col = levelToHsl(l, total);
      const div = document.createElement('div');
      div.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#cbd5e1;';
      div.innerHTML = `
        <span style="width:12px;height:12px;border-radius:50%;background:${col.fill};display:inline-block;flex-shrink:0;"></span>
        L${l}
      `;
      swatches.appendChild(div);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     REGISTER WITH SHARED SHELL
     ═══════════════════════════════════════════════════════════════════════════ */
  window.AlgoShell.register({
    prefix: 'bfs',
    label:  'BFS',

    /* Extra HTML injected inside the legend wrapper div */
    panelExtra: `
      <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;">Level colours</div>
      <div id="bfs-legend-swatches" style="display:flex;flex-wrap:wrap;gap:4px;"></div>
    `,

    run:         runBFS,
    draw:        drawBFS,
    buildLegend: buildLegend,
  });

})();