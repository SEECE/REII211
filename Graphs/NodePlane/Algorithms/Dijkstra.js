/* ═══════════════════════════════════════════════════════════════════════════
   Dijkstra.js  –  Dijkstra's Shortest Path visualiser
   Follows Skiena's algorithm (§6.3.2) — structurally identical to Prim
   but distance[v] accumulates the full path cost rather than just the
   edge weight:
     intree[v]    : bool   – v's shortest path is finalised
     distance[v]  : int    – shortest known path cost from source to v
     parent[v]    : int    – predecessor on that path
   Depends on: PlaneScript.js, ApplyAlgorithm.js
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const MAXINT = Infinity;

  /* ═══════════════════════════════════════════════════════════════════════════
     COLOUR HELPERS
     ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Colour nodes by finalised distance (0 = source = red, max dist = violet).
   * Nodes on the shortest path to target are highlighted separately.
   */
  function distToHsl(dist, maxDist) {
    if (maxDist <= 0) return { fill: 'hsl(0,70%,52%)', stroke: 'hsl(0,70%,35%)', text: '#fff' };
    const hue = Math.round((dist / maxDist) * 270);
    return {
      fill:   `hsl(${hue},70%,52%)`,
      stroke: `hsl(${hue},70%,35%)`,
      text:   '#ffffff',
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     SKIENA'S DIJKSTRA  (pure computation)

     Returns {
       order        : Step[]
       intree       : {id: bool}
       distance     : {id: number}
       parent       : {id: id|null}
       spEdges      : Set<"u-v">      – edges on shortest-path tree
       targetFound  : id | null
       shortestPath : id[]            – path from source → target (if found)
       maxDist      : number
     }
   ═══════════════════════════════════════════════════════════════════════════ */
  function runDijkstra(sourceId, targetId) {
    const { getNodes, adjacencyList } = window.PlaneGraph;
    const nodes   = getNodes();
    const adjList = adjacencyList();

    /* ── Initialise ───────────────────────────────────────────────────────── */
    const intree   = {};
    const distance = {};
    const parent   = {};

    for (const n of nodes) {
      intree[n.id]   = false;
      distance[n.id] = MAXINT;
      parent[n.id]   = null;
    }

    distance[sourceId] = 0;

    let   v            = sourceId;
    const order        = [];
    const spEdges      = new Set();
    let   targetFound  = null;

    /* Snapshot helper */
    const snap = (type, u, v, msg, extra = {}) => {
      order.push({
        type, u, v, msg,
        intree:   { ...intree   },
        distance: { ...distance },
        parent:   { ...parent   },
        spEdges:  new Set(spEdges),
        targetFound,
        ...extra,
      });
    };

    snap('init', sourceId, null,
      `Initialised. Source: ${name(sourceId)}. distance[${name(sourceId)}] = 0, all others = ∞.`);

    /* ── Main loop ────────────────────────────────────────────────────────── */
    while (!intree[v]) {
      intree[v] = true;

      /* Record SP-tree edge */
      if (parent[v] !== null) {
        spEdges.add(`${parent[v]}-${v}`);
        spEdges.add(`${v}-${parent[v]}`);
      }

      snap('finalise', v, null,
        `Finalised ${name(v)} — shortest distance = ${distance[v]}.`);

      /* Early exit if we just finalised the target */
      if (targetId && v === targetId) {
        targetFound = v;
        snap('found', v, null,
          `Target ${name(v)} reached! Shortest path cost = ${distance[v]}.`);
        break;
      }

      /* ── Relax neighbours ──────────────────────────────────────────────── */
      for (const { nodeId: w, weight: wt } of [...(adjList.get(v) || [])].sort((a, b) => name(a.nodeId).localeCompare(name(b.nodeId)))) {
        snap('examine', v, w,
          `Examining edge (${name(v)}, ${name(w)}) weight ${wt}. ` +
          `distance[${name(w)}] = ${distance[w] === MAXINT ? '∞' : distance[w]}.`);

        /* KEY DIFFERENCE FROM PRIM: accumulate full path cost */
        if (distance[v] + wt < distance[w] && !intree[w]) {
          distance[w] = distance[v] + wt;
          parent[w]   = v;
          snap('relax', v, w,
            `Relaxed: distance[${name(w)}] → ${distance[w]}, parent[${name(w)}] = ${name(v)}.`);
        }
      }

      /* ── Pick next: min distance outside tree ──────────────────────────── */
      let dist = MAXINT;
      let next = null;
      for (const n of [...nodes].sort((a, b) => name(a.id).localeCompare(name(b.id)))) {
        if (!intree[n.id] && distance[n.id] < dist) {
          dist = distance[n.id];
          next = n.id;
        }
      }

      if (next === null) break;

      snap('select', next, null,
        `Next vertex: ${name(next)} (distance = ${dist}).`);

      v = next;
    }

    /* ── Reconstruct path to target ───────────────────────────────────────── */
    let shortestPath = [];
    if (targetId) {
      if (targetFound) {
        let cur = targetId;
        while (cur !== null) { shortestPath.unshift(cur); cur = parent[cur]; }
      } else {
        snap('notfound', null, null,
          `${name(targetId)} is not reachable from ${name(sourceId)}.`);
      }
    }

    const maxDist = Math.max(
      ...Object.values(distance).filter(d => d < MAXINT && d >= 0)
    );

    if (!targetId) {
      const visited = Object.values(intree).filter(Boolean).length;
      snap('done', null, null,
        `Dijkstra complete. ${visited} nodes finalised.`);
    } else if (targetFound) {
      const pathStr = shortestPath.map(id => name(id)).join(' → ');
      snap('path', null, null,
        `Shortest path: ${pathStr} (cost ${distance[targetId]}).`);
    }

    return { order, intree, distance, parent, spEdges, targetFound, shortestPath, maxDist };
  }

  function name(id) {
    const n = window.PlaneGraph.nodeById(id);
    return n ? n.name : String(id);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     DRAWING
   ═══════════════════════════════════════════════════════════════════════════ */
  function drawDijkstra(step, result) {
    const { maxDist, shortestPath } = result;
    const pathSet = new Set(shortestPath || []);

    const PG = window.PlaneGraph;
    const { redraw, drawNode, toCanvas, ctx, NODE_R } = PG;

    redraw();

    const c     = ctx();
    const nodes = PG.getNodes();
    const edges = PG.getEdges();

    c.save();

    /* ── Tentative parent-pointer edges (live best-known paths) ──────────── */
    /*
     * Instead of drawing only finalised spEdges, we draw every current
     * parent[] pointer as a tentative edge.  When a relax step updates a
     * parent the old edge simply disappears and the new one appears — exactly
     * the behaviour Dijkstra should show.  Finalised edges get the indigo
     * colour; tentative (not-yet-finalised child) edges get a lighter purple.
     */
    for (const [childId, parentId] of Object.entries(step.parent)) {
      if (parentId === null) continue;

      const nA = PG.nodeById(Number(parentId));
      const nB = PG.nodeById(Number(childId));
      if (!nA || !nB) continue;

      const cA = toCanvas(nA.x, nA.y);
      const cB = toCanvas(nB.x, nB.y);

      /* Is this edge part of the final highlighted shortest-path? */
      const onPath = pathSet.has(Number(parentId)) && pathSet.has(Number(childId)) &&
        shortestPath.some((id, i) =>
          i + 1 < shortestPath.length &&
          ((shortestPath[i] === Number(parentId) && shortestPath[i + 1] === Number(childId)) ||
           (shortestPath[i] === Number(childId)  && shortestPath[i + 1] === Number(parentId))));

      /* Child finalised → solid indigo (confirmed SP-tree edge).
         Child still tentative → dashed lighter purple.              */
      const childFinalised = step.intree[Number(childId)];

      c.beginPath();
      c.moveTo(cA.x, cA.y);
      c.lineTo(cB.x, cB.y);

      if (onPath) {
        c.strokeStyle = '#fbbf24';   // gold — final shortest path
        c.lineWidth   = 5;
        c.setLineDash([]);
      } else if (childFinalised) {
        c.strokeStyle = '#6366f1';   // indigo — confirmed SP-tree
        c.lineWidth   = 3;
        c.setLineDash([]);
      } else {
        c.strokeStyle = '#a78bfa';   // light purple — tentative
        c.lineWidth   = 2;
        c.setLineDash([6, 4]);
      }

      c.stroke();
      c.setLineDash([]);
    }

    /* ── Currently examined edge (amber or green dashed) ─────────────────── */
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
      const pos  = toCanvas(n.x, n.y);
      const inT  = step.intree[n.id];
      const dist = step.distance[n.id];

      let fill, stroke, text;
      if (inT) {
        const col = distToHsl(dist, maxDist);
        fill   = col.fill;
        stroke = col.stroke;
        text   = col.text;
      } else {
        fill   = '#334155';
        stroke = '#1e293b';
        text   = '#94a3b8';
      }

      drawNode(pos.x, pos.y, n.name, fill, stroke, text);

      /* Candidate ring — known distance, not finalised */
      if (!inT && dist < MAXINT) {
        c.beginPath();
        c.arc(pos.x, pos.y, NODE_R + 4, 0, Math.PI * 2);
        c.strokeStyle = '#fbbf24';
        c.lineWidth   = 2.5;
        c.stroke();
      }

      /* Orange ring = currently being finalised */
      if (step.type === 'finalise' && n.id === step.u) {
        c.beginPath();
        c.arc(pos.x, pos.y, NODE_R + 5, 0, Math.PI * 2);
        c.strokeStyle = '#f97316';
        c.lineWidth   = 3;
        c.stroke();
      }

      /* Green dashed ring = target found */
      if (step.targetFound && n.id === step.targetFound) {
        c.beginPath();
        c.arc(pos.x, pos.y, NODE_R + 7, 0, Math.PI * 2);
        c.strokeStyle = '#22c55e';
        c.lineWidth   = 3;
        c.setLineDash([4, 3]);
        c.stroke();
        c.setLineDash([]);
      }

      /* Distance badge */
      const badge = dist === MAXINT ? '∞' : String(dist);
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
    const swatches = document.getElementById('dijkstra-legend-swatches');
    const pathEl   = document.getElementById('dijkstra-path-display');
    if (!swatches) return;

    swatches.innerHTML = '';
    const { distance, maxDist, shortestPath, targetFound } = result;

    /* Show finalised nodes sorted by distance */
    const finalised = Object.entries(result.intree)
      .filter(([, v]) => v)
      .map(([id]) => parseInt(id))
      .sort((a, b) => distance[a] - distance[b]);

    for (const id of finalised) {
      const col  = distToHsl(distance[id], maxDist);
      const node = window.PlaneGraph.nodeById(id);
      const lbl  = node ? node.name : id;
      const div  = document.createElement('div');
      div.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#cbd5e1;';
      div.innerHTML = `
        <span style="width:12px;height:12px;border-radius:50%;background:${col.fill};display:inline-block;flex-shrink:0;"></span>
        ${lbl} (d=${distance[id]})
      `;
      swatches.appendChild(div);
    }

    if (pathEl) {
      if (targetFound && shortestPath.length > 0) {
        const pathStr = shortestPath.map(id => {
          const n = window.PlaneGraph.nodeById(id);
          return n ? n.name : id;
        }).join(' → ');
        pathEl.textContent = `Path: ${pathStr} (cost ${distance[targetFound]})`;
        pathEl.style.color = '#fbbf24';
      } else if (targetFound === null && result.order.some(s => s.type === 'notfound')) {
        pathEl.textContent = 'Target unreachable.';
        pathEl.style.color = '#f87171';
      } else {
        pathEl.textContent = '';
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     REGISTER
   ═══════════════════════════════════════════════════════════════════════════ */
  window.AlgoShell.register({
    prefix: 'dijkstra',
    label:  'Dijkstra',

    panelExtra: `
      <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em;">Finalised nodes</div>
      <div id="dijkstra-legend-swatches" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;"></div>
      <div id="dijkstra-path-display" style="font-size:11px;font-weight:600;"></div>
      <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#64748b;">
          <span style="width:20px;height:3px;background:#fbbf24;display:inline-block;border-radius:2px;flex-shrink:0;"></span>
          Shortest path (final)
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#64748b;">
          <span style="width:20px;height:3px;background:#6366f1;display:inline-block;border-radius:2px;flex-shrink:0;"></span>
          SP-tree edge (confirmed)
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#64748b;">
          <span style="width:20px;height:2.5px;border-top:2.5px dashed #a78bfa;display:inline-block;flex-shrink:0;"></span>
          Tentative best path (may change)
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#64748b;">
          <span style="width:20px;height:2.5px;border-top:2.5px dashed #f59e0b;display:inline-block;flex-shrink:0;"></span>
          Edge being examined
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#64748b;">
          <span style="width:20px;height:2.5px;border-top:2.5px dashed #22c55e;display:inline-block;flex-shrink:0;"></span>
          Edge just relaxed
        </div>
      </div>
    `,

    run:         runDijkstra,
    draw:        drawDijkstra,
    buildLegend: buildLegend,
  });

})();