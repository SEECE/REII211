/* ═══════════════════════════════════════════════════════════════════════════
   Prim.js  –  Prim's Minimum Spanning Tree visualiser
   Follows Skiena's algorithm exactly (§6.3):
     intree[v]    : bool  – v has been permanently added to the MST
     distance[v]  : int   – cheapest known edge weight connecting v to the MST
     parent[v]    : int   – which MST node offered that cheapest edge
   No target node (MST always spans the whole connected component).
   Depends on: PlaneScript.js, ApplyAlgorithm.js
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const MAXINT = Infinity;

  /* ═══════════════════════════════════════════════════════════════════════════
     COLOUR HELPERS
     ═══════════════════════════════════════════════════════════════════════════ */

  /** Nodes are coloured by the order they were added to the MST (warm→cool). */
  function orderToHsl(addOrder, total) {
    const maxHue = 270;
    const hue = total <= 1 ? 0 : Math.round((addOrder / (total - 1)) * maxHue);
    return {
      fill:   `hsl(${hue},70%,52%)`,
      stroke: `hsl(${hue},70%,35%)`,
      text:   '#ffffff',
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     SKIENA'S PRIM  (pure computation, no drawing)

     Returns {
       order       : Step[]          – snapshots consumed by draw / shell
       intree      : {id: bool}      – final intree membership
       distance    : {id: number}    – final key values
       parent      : {id: id|null}   – MST parent of each node
       mstEdges    : Set<"u-v">      – edges in the MST (both directions)
       addedOrder  : {id: number}    – insertion sequence (0 = start)
       totalWeight : number          – sum of MST edge weights
     }
   ═══════════════════════════════════════════════════════════════════════════ */
  function runPrim(sourceId /*, _targetId ignored */) {
    const { getNodes, adjacencyList } = window.PlaneGraph;
    const nodes   = getNodes();
    const adjList = adjacencyList();

    /* ── Initialise (Skiena: for i = 1..nvertices) ────────────────────────── */
    const intree     = {};
    const distance   = {};
    const parent     = {};
    const addedOrder = {};   /* insertion sequence number */

    for (const n of nodes) {
      intree[n.id]   = false;
      distance[n.id] = MAXINT;
      parent[n.id]   = null;
    }

    distance[sourceId] = 0;

    let   v           = sourceId;
    let   totalWeight = 0;
    let   insertSeq   = 0;
    const order       = [];
    const mstEdges    = new Set();

    /* Snapshot helper */
    const snap = (type, u, v, msg, extra = {}) => {
      order.push({
        type, u, v, msg,
        intree:     { ...intree     },
        distance:   { ...distance   },
        parent:     { ...parent     },
        addedOrder: { ...addedOrder },
        mstEdges:   new Set(mstEdges),
        totalWeight,
        ...extra,
      });
    };

    snap('init', sourceId, null,
      `Initialised. Start: ${name(sourceId)}. distance[${name(sourceId)}] = 0, all others = ∞.`);

    /* ── Main loop: while (!intree[v]) ───────────────────────────────────── */
    while (!intree[v]) {
      intree[v]        = true;
      addedOrder[v]    = insertSeq++;

      if (v !== sourceId) {
        mstEdges.add(`${parent[v]}-${v}`);
        mstEdges.add(`${v}-${parent[v]}`);
        totalWeight += distance[v];

        snap('add_edge', parent[v], v,
          `Added edge (${name(parent[v])}, ${name(v)}) — weight ${distance[v]}. ` +
          `MST total: ${totalWeight}.`);
      } else {
        snap('add_start', v, null,
          `Added start node ${name(v)} to MST.`);
      }

      /* ── Relax neighbours of v (Skiena: p = g->edges[v]) ─────────────── */
      for (const { nodeId: w, weight: wt } of (adjList.get(v) || [])) {
        snap('examine', v, w,
          `Examining edge (${name(v)}, ${name(w)}) weight ${wt}. ` +
          `distance[${name(w)}] = ${distance[w] === MAXINT ? '∞' : distance[w]}.`);

        if (wt < distance[w] && !intree[w]) {
          distance[w] = wt;
          parent[w]   = v;
          snap('relax', v, w,
            `Relaxed: distance[${name(w)}] → ${wt}, parent[${name(w)}] = ${name(v)}.`);
        }
      }

      /* ── Find next vertex: min distance outside tree ──────────────────── */
      let dist = MAXINT;
      let next = null;
      for (const n of nodes) {
        if (!intree[n.id] && distance[n.id] < dist) {
          dist = distance[n.id];
          next = n.id;
        }
      }

      if (next === null) break;   /* remaining nodes unreachable */

      snap('select', next, null,
        `Next vertex: ${name(next)} (distance = ${dist}).`);

      v = next;
    }

    /* Snap any unreachable nodes */
    const unreachable = nodes.filter(n => !intree[n.id]);
    if (unreachable.length > 0) {
      snap('done', null, null,
        `MST complete. Total weight: ${totalWeight}. ` +
        `${unreachable.length} node(s) unreachable: ${unreachable.map(n => n.name).join(', ')}.`);
    } else {
      snap('done', null, null,
        `MST complete. Total weight: ${totalWeight}. All ${nodes.length} nodes spanned.`);
    }

    return { order, intree, distance, parent, mstEdges, addedOrder, totalWeight };
  }

  function name(id) {
    const n = window.PlaneGraph.nodeById(id);
    return n ? n.name : String(id);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     DRAWING
   ═══════════════════════════════════════════════════════════════════════════ */
  function drawPrim(step, result) {
    const PG = window.PlaneGraph;
    const { redraw, drawNode, toCanvas, ctx, NODE_R } = PG;

    redraw();

    const c     = ctx();
    const nodes = PG.getNodes();
    const edges = PG.getEdges();
    const total = Object.keys(step.intree).length;

    c.save();

    /* ── MST edges (thick, coloured by child insertion order) ─────────────── */
    for (const e of edges) {
      const k1 = `${e.from}-${e.to}`;
      const k2 = `${e.to}-${e.from}`;
      if (!step.mstEdges.has(k1) && !step.mstEdges.has(k2)) continue;

      const nA = PG.nodeById(e.from);
      const nB = PG.nodeById(e.to);
      if (!nA || !nB) continue;

      /* Colour by the child's insertion order */
      const childId  = step.parent[e.to] === e.from ? e.to : e.from;
      const ord      = step.addedOrder[childId];
      const col      = ord !== undefined ? orderToHsl(ord, total) : null;

      const cA = toCanvas(nA.x, nA.y);
      const cB = toCanvas(nB.x, nB.y);

      c.beginPath();
      c.moveTo(cA.x, cA.y);
      c.lineTo(cB.x, cB.y);
      c.strokeStyle = col ? col.fill : '#6366f1';
      c.lineWidth   = 4;
      c.stroke();
    }

    /* ── Currently examined edge (amber dashed) ───────────────────────────── */
    if ((step.type === 'examine' || step.type === 'relax') && step.u !== null && step.v !== null) {
      const nA = PG.nodeById(step.u);
      const nB = PG.nodeById(step.v);
      if (nA && nB) {
        const cA = toCanvas(nA.x, nA.y);
        const cB = toCanvas(nB.x, nB.y);
        c.beginPath();
        c.moveTo(cA.x, cA.y);
        c.lineTo(cB.x, cB.y);
        c.strokeStyle = step.type === 'relax' ? '#22c55e' : '#f59e0b';
        c.lineWidth   = 3;
        c.setLineDash([6, 4]);
        c.stroke();
        c.setLineDash([]);
      }
    }

    c.restore();

    /* ── Draw nodes ────────────────────────────────────────────────────────── */
    for (const n of nodes) {
      const pos = toCanvas(n.x, n.y);
      const ord = step.addedOrder[n.id];
      const inT = step.intree[n.id];

      let fill, stroke, text;
      if (inT && ord !== undefined) {
        const col = orderToHsl(ord, total);
        fill   = col.fill;
        stroke = col.stroke;
        text   = col.text;
      } else {
        fill   = '#334155';
        stroke = '#1e293b';
        text   = '#94a3b8';
      }

      drawNode(pos.x, pos.y, n.name, fill, stroke, text);

      /* Candidate ring (has a known distance, not yet in tree) */
      if (!inT && step.distance[n.id] < MAXINT) {
        c.beginPath();
        c.arc(pos.x, pos.y, NODE_R + 4, 0, Math.PI * 2);
        c.strokeStyle = '#fbbf24';
        c.lineWidth   = 2.5;
        c.stroke();
      }

      /* Orange ring = next vertex about to be added */
      if (step.type === 'select' && n.id === step.u) {
        c.beginPath();
        c.arc(pos.x, pos.y, NODE_R + 5, 0, Math.PI * 2);
        c.strokeStyle = '#f97316';
        c.lineWidth   = 3;
        c.stroke();
      }

      /* Distance badge below each node */
      const dist = step.distance[n.id];
      const badge = inT ? '✓' : (dist === MAXINT ? '∞' : String(dist));
      c.font         = `bold 9px 'Segoe UI', sans-serif`;
      c.fillStyle    = inT ? '#86efac' : '#94a3b8';
      c.textAlign    = 'center';
      c.textBaseline = 'middle';
      c.fillText(badge, pos.x, pos.y + NODE_R + 11);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     LEGEND
   ═══════════════════════════════════════════════════════════════════════════ */
  function buildLegend(result) {
    const swatches = document.getElementById('prim-legend-swatches');
    const weightEl = document.getElementById('prim-total-weight');
    if (!swatches) return;

    swatches.innerHTML = '';
    const total = Object.keys(result.addedOrder).length;
    const sorted = Object.entries(result.addedOrder).sort((a, b) => a[1] - b[1]);
    for (const [id, ord] of sorted) {
      const col  = orderToHsl(ord, total);
      const node = window.PlaneGraph.nodeById(parseInt(id));
      const lbl  = node ? node.name : id;
      const div  = document.createElement('div');
      div.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#cbd5e1;';
      div.innerHTML = `
        <span style="width:12px;height:12px;border-radius:50%;background:${col.fill};display:inline-block;flex-shrink:0;"></span>
        ${lbl} (#${ord + 1})
      `;
      swatches.appendChild(div);
    }

    if (weightEl) weightEl.textContent = `Total MST weight: ${result.totalWeight}`;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     REGISTER
   ═══════════════════════════════════════════════════════════════════════════ */
  window.AlgoShell.register({
    prefix: 'prim',
    label:  "Prim's MST",

    panelExtra: `
      <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em;">Insertion order</div>
      <div id="prim-legend-swatches" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;"></div>
      <div id="prim-total-weight" style="font-size:11px;color:#86efac;font-weight:600;"></div>
      <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#64748b;">
          <span style="width:20px;height:2.5px;border-top:2.5px dashed #fbbf24;display:inline-block;flex-shrink:0;"></span>
          Candidate (queued)
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#64748b;">
          <span style="width:20px;height:2.5px;border-top:2.5px dashed #22c55e;display:inline-block;flex-shrink:0;"></span>
          Edge relaxed
        </div>
      </div>
    `,

    run:         runPrim,
    draw:        drawPrim,
    buildLegend: buildLegend,
  });

})();