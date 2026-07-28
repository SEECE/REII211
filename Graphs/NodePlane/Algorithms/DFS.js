/* ═══════════════════════════════════════════════════════════════════════════
   DFS.js  –  Depth-First Search visualiser
   Follows Skiena's algorithm:
     state[u] ∈ { "undiscovered", "discovered", "processed" }
     entry[u] / exit[u]  = discovery / finish timestamps
     Edge classification : tree | back | forward | cross
   Depends on: PlaneScript.js, ApplyAlgorithm.js
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════════════
     COLOUR HELPERS
     ═══════════════════════════════════════════════════════════════════════════ */

  /** Map a DFS depth to an HSL colour spanning red → violet. */
  function depthToHsl(depth, maxDepth) {
    const maxHue = 270;
    const hue = maxDepth <= 0 ? 0 : Math.round((depth / maxDepth) * maxHue);
    return {
      fill:   `hsl(${hue},70%,52%)`,
      stroke: `hsl(${hue},70%,35%)`,
      text:   '#ffffff',
    };
  }

  /* Edge-type colours */
  const EDGE_COLOR = {
    tree:    '#a3e635',   /* lime green */
    back:    '#f87171',   /* red        */
    forward: '#60a5fa',   /* blue       */
    cross:   '#60a5fa',   /* blue       */
    none:    '#64748b',   /* slate      */
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     SKIENA'S DFS  (iterative explicit-stack to avoid call-stack limits)
     process_vertex_early(u)  → snap 'enter'
     process_edge(u,v)        → snap 'edge'
     process_vertex_late(u)   → snap 'exit'

     Edge classification (Skiena §5.8):
       tree    : state[v] == undiscovered
       back    : state[v] == discovered  (ancestor still on stack)
       forward/cross: state[v] == processed
     Returns: { order, depth, parent, treeEdges, edgeType, targetFound, maxDepth }
   ═══════════════════════════════════════════════════════════════════════════ */
  function runDFS(sourceId, targetId) {
    const { getNodes, adjacencyList, nodeById } = window.PlaneGraph;
    const nodes   = getNodes();
    const adjList = adjacencyList();

    function getSortedNeighbors(u) {
      const list = (adjList.get(u) || []).slice();
      return list.sort((a, b) => {
        const nameA = name(a.nodeId);
        const nameB = name(b.nodeId);
        return nameA.localeCompare(nameB);
      });
    }

    /* Initialise */
    const state    = {};
    const parent   = {};
    const entry    = {};
    const exitT    = {};
    const depth    = {};
    const edgeType = {};   /* "min-max" key → "tree"|"back"|"forward"|"cross" */

    for (const n of nodes) {
      state[n.id]  = 'undiscovered';
      parent[n.id] = null;
      entry[n.id]  = -1;
      exitT[n.id]  = -1;
      depth[n.id]  = -1;
    }

    let   timer       = 0;
    const order       = [];
    const treeEdges   = new Set();
    let   targetFound = null;
    let   maxDepth    = 0;

    /* Snapshot helper */
    const snap = (type, u, v, msg, extra = {}) => {
      order.push({
        type, u, v, msg,
        state:    { ...state    },
        parent:   { ...parent   },
        depth:    { ...depth    },
        entry:    { ...entry    },
        exit:     { ...exitT    },
        edgeType: { ...edgeType },
        targetFound,
        ...extra,
      });
    };

    snap('init', sourceId, null,
      `Initialised. Start node: ${name(sourceId)}. All vertices undiscovered.`);

    /* ── Iterative DFS from one source ──────────────────────────────────────── */
    function dfsFrom(startId) {
      state[startId]  = 'discovered';
      entry[startId]  = ++timer;
      depth[startId]  = 0;

      snap('enter', startId, null,
        `process_vertex_early(${name(startId)}) — entry time ${entry[startId]}`);

      if (targetId && startId === targetId) {
        targetFound = startId;
        snap('found', startId, null, `Target ${name(startId)} found!`);
      }

      /* UPDATED: neighbors are now sorted alphabetically */
      const stack = [{
        u: startId,
        neighbours: getSortedNeighbors(startId),
        idx: 0,
      }];

      while (stack.length > 0) {
        const frame = stack[stack.length - 1];
        const u     = frame.u;

        if (frame.idx < frame.neighbours.length) {
          const { nodeId: v } = frame.neighbours[frame.idx++];

          /* Classify edge (u, v) */
          let etype;
          if      (state[v] === 'undiscovered') etype = 'tree';
          else if (state[v] === 'discovered')   etype = 'back';
          else    etype = entry[u] < entry[v] ? 'forward' : 'cross';

          const ekey = `${Math.min(u, v)}-${Math.max(u, v)}`;
          if (!edgeType[ekey]) edgeType[ekey] = etype;

          snap('edge', u, v, `process_edge(${name(u)}, ${name(v)}) → ${etype} edge`);

          if (state[v] === 'undiscovered') {
            treeEdges.add(`${u}-${v}`);
            treeEdges.add(`${v}-${u}`);
            state[v]  = 'discovered';
            parent[v] = u;
            depth[v]  = depth[u] + 1;
            entry[v]  = ++timer;
            if (depth[v] > maxDepth) maxDepth = depth[v];

            snap('enter', v, u,
              `process_vertex_early(${name(v)}) — entry ${entry[v]}, depth ${depth[v]}`);

            if (targetId && v === targetId && !targetFound) {
              targetFound = v;
              snap('found', u, v, `Target ${name(v)} found at depth ${depth[v]}!`);
            }

            /* UPDATED: neighbors are now sorted alphabetically */
            stack.push({
              u: v,
              neighbours: getSortedNeighbors(v),
              idx: 0,
            });
          }
        } else {
          state[u]  = 'processed';
          exitT[u]  = ++timer;
          stack.pop();

          snap('exit', u, null,
            `process_vertex_late(${name(u)}) — exit time ${exitT[u]}`);
        }
      }
    }

    dfsFrom(sourceId);
    
    if (targetId && !targetFound) {
      snap('notfound', null, null,
        `Target ${name(targetId)} not reachable from ${name(sourceId)}.`);
    } else if (!targetId) {
      const visited = Object.values(state).filter(s => s === 'processed').length;
      snap('done', null, null,
        `DFS complete. ${visited} node${visited !== 1 ? 's' : ''} visited. Max depth: ${maxDepth}.`);
    }

    return { order, depth, parent, treeEdges, edgeType, targetFound, maxDepth };
  }

  function name(id) {
    const n = window.PlaneGraph.nodeById(id);
    return n ? n.name : String(id);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     DRAWING
     draw(step, result) — called by AlgoShell for every render
   ═══════════════════════════════════════════════════════════════════════════ */
  function drawDFS(step, result) {
    const { maxDepth } = result;
    const PG = window.PlaneGraph;
    const { redraw, drawNode, toCanvas, ctx, NODE_R } = PG;

    redraw();   /* clean slate */

    const c     = ctx();
    const nodes = PG.getNodes();
    const edges = PG.getEdges();

    c.save();

    /* ── Draw all edges with classification colour ──────────────────────────── */
    for (const e of edges) {
      const ekey  = `${Math.min(e.from, e.to)}-${Math.max(e.from, e.to)}`;
      const etype = step.edgeType[ekey] || 'none';
      const nA    = PG.nodeById(e.from);
      const nB    = PG.nodeById(e.to);
      if (!nA || !nB) continue;

      const cA = toCanvas(nA.x, nA.y);
      const cB = toCanvas(nB.x, nB.y);

      if (etype === 'tree') {
        /* Thick solid, coloured from child's depth */
        const childId  = step.parent[e.to] === e.from ? e.to : e.from;
        const childDep = step.depth[childId];
        const col = childDep >= 0
          ? depthToHsl(childDep, maxDepth).fill
          : EDGE_COLOR.tree;

        c.beginPath();
        c.moveTo(cA.x, cA.y);
        c.lineTo(cB.x, cB.y);
        c.strokeStyle = col;
        c.lineWidth   = 4;
        c.stroke();

      } else if (etype === 'back') {
        /* Dashed red */
        c.beginPath();
        c.moveTo(cA.x, cA.y);
        c.lineTo(cB.x, cB.y);
        c.strokeStyle = EDGE_COLOR.back;
        c.lineWidth   = 2;
        c.setLineDash([5, 4]);
        c.stroke();
        c.setLineDash([]);

      } else if (etype === 'forward' || etype === 'cross') {
        c.beginPath();
        c.moveTo(cA.x, cA.y);
        c.lineTo(cB.x, cB.y);
        c.strokeStyle = EDGE_COLOR.cross;
        c.lineWidth   = 2;
        c.stroke();
      }
      /* 'none': already drawn by redraw() in default slate colour */
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

    /* ── Draw nodes ─────────────────────────────────────────────────────────── */
    for (const n of nodes) {
      const pos = toCanvas(n.x, n.y);
      const dep = step.depth[n.id];
      const st  = step.state[n.id] || 'undiscovered';

      let fill, stroke, text;
      if (dep >= 0) {
        const col = depthToHsl(dep, maxDepth);
        fill   = col.fill;
        stroke = col.stroke;
        text   = col.text;
      } else {
        fill   = '#334155';
        stroke = '#1e293b';
        text   = '#94a3b8';
      }

      drawNode(pos.x, pos.y, n.name, fill, stroke, text);

      /* Amber ring = on the DFS stack (discovered, not yet finished) */
      if (st === 'discovered' && n.id !== step.u) {
        c.beginPath();
        c.arc(pos.x, pos.y, NODE_R + 4, 0, Math.PI * 2);
        c.strokeStyle = '#fbbf24';
        c.lineWidth   = 2.5;
        c.stroke();
      }

      /* Orange pulse ring = currently active node */
      if (n.id === step.u) {
        c.beginPath();
        c.arc(pos.x, pos.y, NODE_R + 5, 0, Math.PI * 2);
        c.strokeStyle = '#f97316';
        c.lineWidth   = 3;
        c.stroke();
      }

      /* Green dashed ring = target just found */
      if (step.type === 'found' && n.id === step.v) {
        c.beginPath();
        c.arc(pos.x, pos.y, NODE_R + 7, 0, Math.PI * 2);
        c.strokeStyle = '#22c55e';
        c.lineWidth   = 3;
        c.setLineDash([4, 3]);
        c.stroke();
        c.setLineDash([]);
      }

      /* Entry/exit timestamp badge */
      if (step.entry[n.id] > 0) {
        const exitVal = step.exit[n.id] > 0 ? step.exit[n.id] : '…';
        const badge   = `${step.entry[n.id]}/${exitVal}`;
        c.font         = `bold 8px 'Segoe UI', sans-serif`;
        c.fillStyle    = '#f1f5f9';
        c.textAlign    = 'center';
        c.textBaseline = 'middle';
        c.fillText(badge, pos.x, pos.y + NODE_R + 10);
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     LEGEND  –  depth colour swatches rendered below the canvas
     buildLegend(result) — called once after run()
   ═══════════════════════════════════════════════════════════════════════════ */
  function buildLegend(result) {
    const container = document.getElementById('dfs-canvas-legend');
    const swatches  = document.getElementById('dfs-legend-swatches');
    if (!container || !swatches) return;

    swatches.innerHTML = '';
    for (let d = 0; d <= result.maxDepth; d++) {
      const col = depthToHsl(d, result.maxDepth);
      const div = document.createElement('div');
      div.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#475569;';
      div.innerHTML = `
        <span style="width:12px;height:12px;border-radius:50%;background:${col.fill};display:inline-block;flex-shrink:0;"></span>
        D${d}
      `;
      swatches.appendChild(div);
    }

    container.classList.add('visible');

    /* Hide again when graph is reset (AlgoShell calls reset → PlaneGraph.redraw,
       but we also hook the reset path by observing class removal on the panel legend) */
    const observer = new MutationObserver(() => {
      const panelLegend = document.getElementById('dfs-legend');
      if (panelLegend && panelLegend.style.display === 'none') {
        container.classList.remove('visible');
        observer.disconnect();
      }
    });
    const panelLegend = document.getElementById('dfs-legend');
    if (panelLegend) observer.observe(panelLegend, { attributes: true, attributeFilter: ['style'] });
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     REGISTER WITH SHARED SHELL
   ═══════════════════════════════════════════════════════════════════════════ */
  window.AlgoShell.register({
    prefix: 'dfs',
    label:  'DFS',

    /*
     * panelExtra is injected inside the #dfs-legend div (shown after solve).
     * Depth colour swatches have moved below the canvas (#dfs-canvas-legend).
     * Only the static edge-type key stays here.
     */
    panelExtra: `
      <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;">Edge types</div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#64748b;">
          <span style="width:24px;height:3px;background:#a3e635;display:inline-block;border-radius:2px;flex-shrink:0;"></span>
          Tree edge
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#64748b;">
          <span style="width:24px;height:3px;border-top:3px dashed #f87171;display:inline-block;flex-shrink:0;"></span>
          Back edge
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#64748b;">
          <span style="width:24px;height:3px;background:#60a5fa;display:inline-block;border-radius:2px;flex-shrink:0;"></span>
          Cross / Fwd edge
        </div>
      </div>
    `,

    /* Also need paired Start / Find layout — injected via panelStartFindPaired */
    startFindPaired: true,

    run:         runDFS,
    draw:        drawDFS,
    buildLegend: buildLegend,
  });

})();