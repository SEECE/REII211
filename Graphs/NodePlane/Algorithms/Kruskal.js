/* ═══════════════════════════════════════════════════════════════════════════
   Kruskal.js  –  Kruskal's Minimum Spanning Tree visualiser
   Follows Skiena's algorithm exactly (§6.4):
     1. Collect all edges into an array and sort by weight ascending.
     2. Iterate: if the two endpoints are in different components
        (same_component check via Union-Find), add the edge to the MST
        and union the two sets.
   No target node (MST always spans the whole connected component).
   Depends on: PlaneScript.js, ApplyAlgorithm.js
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════════════
     UNION-FIND  (path-compressed, union-by-rank)
     Mirrors Skiena's union_find struct / union_find_init / same_component /
     union_sets interface.
   ═══════════════════════════════════════════════════════════════════════════ */
  function makeUF(ids) {
    const parent = {};
    const rank   = {};
    for (const id of ids) { parent[id] = id; rank[id] = 0; }

    function find(x) {
      if (parent[x] !== x) parent[x] = find(parent[x]);   /* path compression */
      return parent[x];
    }

    function sameComponent(x, y) { return find(x) === find(y); }

    function union(x, y) {
      const rx = find(x), ry = find(y);
      if (rx === ry) return;
      /* union by rank */
      if (rank[rx] < rank[ry])      parent[rx] = ry;
      else if (rank[rx] > rank[ry]) parent[ry] = rx;
      else { parent[ry] = rx; rank[rx]++; }
    }

    /* Return a snapshot of component roots keyed by node id */
    function snapshot() { return ids.reduce((o, id) => { o[id] = find(id); return o; }, {}); }

    return { find, sameComponent, union, snapshot };
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     COLOUR HELPERS
     Edges/nodes are coloured by the order they were added to the MST.
   ═══════════════════════════════════════════════════════════════════════════ */
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
     SKIENA'S KRUSKAL

     Returns {
       order        : Step[]          – snapshots for draw / shell
       mstEdges     : Set<"u-v">      – edges chosen for MST (both directions)
       edgeOrder    : {"u-v": number} – insertion sequence of each MST edge
       nodeComponent: {id: rootId}    – final UF component of every node
       addedOrder   : {id: number}    – sequence in which nodes first joined MST
       totalWeight  : number
       sortedEdges  : [{from,to,weight}] – edges in sorted order (for legend)
     }
   ═══════════════════════════════════════════════════════════════════════════ */
  function runKruskal(sourceId /*, _targetId ignored */) {
    const { getNodes, getEdges } = window.PlaneGraph;
    const nodes = getNodes();
    const edges = getEdges();

    const ids = nodes.map(n => n.id);
    const uf  = makeUF(ids);

    /* ── to_edge_array + qsort (weight_compare) ──────────────────────────── */
    /* De-duplicate undirected edges (keep the lighter copy if duplicated)    */
    const seen = new Set();
    const edgeArr = [];
    for (const e of edges) {
      const key = `${Math.min(e.from, e.to)}-${Math.max(e.from, e.to)}`;
      if (!seen.has(key)) { seen.add(key); edgeArr.push(e); }
    }
    edgeArr.sort((a, b) => a.weight - b.weight);   /* weight_compare */

    /* ── State ───────────────────────────────────────────────────────────── */
    const mstEdges    = new Set();
    const edgeOrder   = {};        /* "min-max" key → insertion sequence */
    const addedOrder  = {};        /* nodeId → sequence it first joined MST */
    let   totalWeight = 0;
    let   insertSeq   = 0;
    const order       = [];

    /* Snapshot helper */
    const snap = (type, u, v, msg, extra = {}) => {
      order.push({
        type, u, v, msg,
        mstEdges:      new Set(mstEdges),
        edgeOrder:     { ...edgeOrder },
        addedOrder:    { ...addedOrder },
        components:    uf.snapshot(),
        totalWeight,
        sortedEdges:   edgeArr,
        ...extra,
      });
    };

    snap('init', null, null,
      `Edges sorted by weight. ${edgeArr.length} edge(s) to examine.`);

    /* ── Main loop: for i = 0 .. nedges-1 ───────────────────────────────── */
    for (const e of edgeArr) {
      const { from: x, to: y, weight: w } = e;

      snap('examine', x, y,
        `Examining edge (${name(x)}, ${name(y)}) weight ${w}. ` +
        `Same component? ${uf.sameComponent(x, y) ? 'Yes — skip.' : 'No.'}`);

      if (!uf.sameComponent(x, y)) {
        /* Add edge to MST */
        const ekey = `${Math.min(x, y)}-${Math.max(x, y)}`;
        mstEdges.add(`${x}-${y}`);
        mstEdges.add(`${y}-${x}`);
        edgeOrder[ekey] = insertSeq;
        totalWeight += w;

        /* Track which nodes are newly entering the MST */
        for (const nid of [x, y]) {
          if (addedOrder[nid] === undefined) addedOrder[nid] = insertSeq;
        }

        uf.union(x, y);
        insertSeq++;

        snap('add_edge', x, y,
          `Added edge (${name(x)}, ${name(y)}) — weight ${w}. ` +
          `MST total: ${totalWeight}.`);
      }
    }

    /* Final summary */
    const inMST      = new Set();
    for (const key of mstEdges) { const [a] = key.split('-'); inMST.add(parseInt(a)); }
    for (const key of mstEdges) { const [,b] = key.split('-'); inMST.add(parseInt(b)); }
    const unreachable = nodes.filter(n => !inMST.has(n.id) && nodes.length > 1);

    if (unreachable.length > 0) {
      snap('done', null, null,
        `MST complete. Total weight: ${totalWeight}. ` +
        `${unreachable.length} isolated node(s): ${unreachable.map(n => n.name).join(', ')}.`);
    } else {
      snap('done', null, null,
        `MST complete. Total weight: ${totalWeight}. All ${nodes.length} node(s) spanned.`);
    }

    return { order, mstEdges, edgeOrder, nodeComponent: uf.snapshot(), addedOrder, totalWeight, sortedEdges: edgeArr };
  }

  function name(id) {
    const n = window.PlaneGraph.nodeById(id);
    return n ? n.name : String(id);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     DRAWING
   ═══════════════════════════════════════════════════════════════════════════ */
  function drawKruskal(step, result) {
    const PG = window.PlaneGraph;
    const { redraw, drawNode, toCanvas, ctx, NODE_R } = PG;

    redraw();

    const c     = ctx();
    const nodes = PG.getNodes();
    const edges = PG.getEdges();
    const total = Object.keys(step.edgeOrder).length;   /* number of MST edges added so far */

    c.save();

    /* ── MST edges (thick, coloured by insertion order) ──────────────────── */
    for (const e of edges) {
      const ekey = `${Math.min(e.from, e.to)}-${Math.max(e.from, e.to)}`;
      const k1   = `${e.from}-${e.to}`;
      const k2   = `${e.to}-${e.from}`;
      if (!step.mstEdges.has(k1) && !step.mstEdges.has(k2)) continue;

      const nA = PG.nodeById(e.from);
      const nB = PG.nodeById(e.to);
      if (!nA || !nB) continue;

      const ord = step.edgeOrder[ekey];
      const col = ord !== undefined ? orderToHsl(ord, Math.max(total - 1, 1)) : null;

      const cA = toCanvas(nA.x, nA.y);
      const cB = toCanvas(nB.x, nB.y);

      c.beginPath();
      c.moveTo(cA.x, cA.y);
      c.lineTo(cB.x, cB.y);
      c.strokeStyle = col ? col.fill : '#6366f1';
      c.lineWidth   = 4;
      c.stroke();
    }

    /* ── Currently examined edge (amber) / rejected edge (red dashed) ─────── */
    if (step.u !== null && step.v !== null &&
        (step.type === 'examine' || step.type === 'add_edge')) {
      const nA = PG.nodeById(step.u);
      const nB = PG.nodeById(step.v);
      if (nA && nB) {
        const cA = toCanvas(nA.x, nA.y);
        const cB = toCanvas(nB.x, nB.y);

        /* amber dashed = being examined; green dashed = just accepted */
        const isAdded = step.type === 'add_edge';
        c.beginPath();
        c.moveTo(cA.x, cA.y);
        c.lineTo(cB.x, cB.y);
        c.strokeStyle = isAdded ? '#22c55e' : '#f59e0b';
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
      const inMST = ord !== undefined;

      let fill, stroke, text;
      if (inMST) {
        const col = orderToHsl(ord, Math.max(Object.keys(step.addedOrder).length - 1, 1));
        fill   = col.fill;
        stroke = col.stroke;
        text   = col.text;
      } else {
        fill   = '#334155';
        stroke = '#1e293b';
        text   = '#94a3b8';
      }

      drawNode(pos.x, pos.y, n.name, fill, stroke, text);

      /* Highlight the two endpoints of the edge being examined */
      if ((step.type === 'examine') && (n.id === step.u || n.id === step.v)) {
        c.beginPath();
        c.arc(pos.x, pos.y, NODE_R + 5, 0, Math.PI * 2);
        c.strokeStyle = '#f59e0b';
        c.lineWidth   = 3;
        c.stroke();
      }

      /* Green ring = edge just accepted, highlight its endpoints */
      if (step.type === 'add_edge' && (n.id === step.u || n.id === step.v)) {
        c.beginPath();
        c.arc(pos.x, pos.y, NODE_R + 5, 0, Math.PI * 2);
        c.strokeStyle = '#22c55e';
        c.lineWidth   = 3;
        c.stroke();
      }

      /* Component badge: show root id so same-component check is visible */
      const root      = step.components[n.id];
      const rootNode  = window.PlaneGraph.nodeById(root);
      const rootLabel = rootNode ? rootNode.name : String(root);
      c.font         = `bold 8px 'Segoe UI', sans-serif`;
      c.fillStyle    = inMST ? '#86efac' : '#475569';
      c.textAlign    = 'center';
      c.textBaseline = 'middle';
      c.fillText(`[${rootLabel}]`, pos.x, pos.y + NODE_R + 11);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     LEGEND
   ═══════════════════════════════════════════════════════════════════════════ */
  function buildLegend(result) {
    const swatches = document.getElementById('kruskal-legend-swatches');
    const weightEl = document.getElementById('kruskal-total-weight');
    if (!swatches) return;

    /* Show MST edges in insertion order with their weights */
    swatches.innerHTML = '';
    const total   = Object.keys(result.edgeOrder).length;
    const entries = Object.entries(result.edgeOrder).sort((a, b) => a[1] - b[1]);

    for (const [ekey, ord] of entries) {
      const [aStr, bStr] = ekey.split('-');
      const nA  = window.PlaneGraph.nodeById(parseInt(aStr));
      const nB  = window.PlaneGraph.nodeById(parseInt(bStr));
      const lbl = (nA && nB) ? `${nA.name}–${nB.name}` : ekey;

      /* Find the weight of this edge from sortedEdges */
      const edgeData = result.sortedEdges.find(e =>
        Math.min(e.from, e.to) === parseInt(aStr) &&
        Math.max(e.from, e.to) === parseInt(bStr)
      );
      const w = edgeData ? edgeData.weight : '?';

      const col = orderToHsl(ord, Math.max(total - 1, 1));
      const div = document.createElement('div');
      div.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#cbd5e1;';
      div.innerHTML = `
        <span style="width:20px;height:3px;background:${col.fill};display:inline-block;border-radius:2px;flex-shrink:0;"></span>
        ${lbl} (w=${w})
      `;
      swatches.appendChild(div);
    }

    if (weightEl) weightEl.textContent = `Total MST weight: ${result.totalWeight}`;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     REGISTER
   ═══════════════════════════════════════════════════════════════════════════ */
  window.AlgoShell.register({
    prefix: 'kruskal',
    label:  "Kruskal's MST",

    panelExtra: `
      <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em;">MST edges (insertion order)</div>
      <div id="kruskal-legend-swatches" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;"></div>
      <div id="kruskal-total-weight" style="font-size:11px;color:#86efac;font-weight:600;"></div>
      <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#64748b;">
          <span style="width:20px;height:2.5px;border-top:2.5px dashed #f59e0b;display:inline-block;flex-shrink:0;"></span>
          Edge under examination
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#64748b;">
          <span style="width:20px;height:2.5px;border-top:2.5px dashed #22c55e;display:inline-block;flex-shrink:0;"></span>
          Edge accepted into MST
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#64748b;">
          <span style="font-size:10px;color:#86efac;font-weight:600;">[X]</span>
          Component root badge
        </div>
      </div>
    `,

    run:         runKruskal,
    draw:        drawKruskal,
    buildLegend: buildLegend,
  });

})();