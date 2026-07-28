/* ═══════════════════════════════════════════════════════════════════════════
   PlaneCanvas.js  –  Canvas rendering submodule
   Provides: toCanvas, sizeCanvas, drawGrid, drawEdges, drawNodes, drawNode,
             redraw
   Depends on: window.Plane.graph  (getNodes, getEdges, nodeById)
   Attaches to: window.Plane.canvas
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Constants ───────────────────────────────────────────────────────────── */
  const WORLD_W = 100;
  const WORLD_H = 50;

  const PAD_L = 28;
  const PAD_B = 18;
  const PAD_R = 10;
  const PAD_T = 10;

  const GRID_STEP_X = 10;
  const GRID_STEP_Y = 5;

  const NODE_R       = 18;
  const GRID_COLOR   = '#e2e8f0';
  const AXIS_COLOR   = '#94a3b8';
  const EDGE_COLOR   = '#64748b';
  const NODE_FILL    = '#6366f1';
  const NODE_STROKE  = '#4338ca';
  const NODE_TEXT    = '#ffffff';
  const WEIGHT_COLOR = '#0f172a';
  const WEIGHT_BG    = '#f8fafc';

  /* ── Canvas element ──────────────────────────────────────────────────────── */
  const canvas = document.getElementById('plane');
  const ctx    = canvas.getContext('2d');

  /* ── Coordinate transform ────────────────────────────────────────────────── */
  function toCanvas(wx, wy) {
    const dW = canvas.width  - PAD_L - PAD_R;
    const dH = canvas.height - PAD_T - PAD_B;
    return {
      x: PAD_L + (wx / WORLD_W) * dW,
      y: PAD_T + dH - (wy / WORLD_H) * dH
    };
  }

  /* ── Canvas sizing ───────────────────────────────────────────────────────── */
  function sizeCanvas() {
    const area = document.getElementById('view-area');
    /* Anchor on viewport height so the canvas size is stable whether the
       controls panel is wide (plot mode) or narrow (matrix mode).        */
    const maxH = window.innerHeight * 0.82;
    const maxW = area.clientWidth - 24;
    /* World is 2:1, so ideal height = half the available width */
    let h = maxW / 2;
    if (h > maxH) h = maxH;
    const w = Math.min(h * 2, maxW);
    canvas.width  = Math.floor(w);
    canvas.height = Math.floor(h);
    redraw();

    const mv = document.getElementById('matrix-view');
    mv.style.minHeight = canvas.height + 'px';
  }

  /* ── Grid ────────────────────────────────────────────────────────────────── */
  function drawGrid() {
    const dW = canvas.width  - PAD_L - PAD_R;
    const dH = canvas.height - PAD_T - PAD_B;

    ctx.save();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth   = 0.5;

    for (let wx = 0; wx <= WORLD_W; wx += GRID_STEP_X) {
      const cx = toCanvas(wx, 0).x;
      ctx.beginPath(); ctx.moveTo(cx, PAD_T); ctx.lineTo(cx, PAD_T + dH); ctx.stroke();
    }
    for (let wy = 0; wy <= WORLD_H; wy += GRID_STEP_Y) {
      const cy = toCanvas(0, wy).y;
      ctx.beginPath(); ctx.moveTo(PAD_L, cy); ctx.lineTo(PAD_L + dW, cy); ctx.stroke();
    }

    ctx.fillStyle    = AXIS_COLOR;
    ctx.font         = `10px 'Segoe UI', sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    for (let wx = 0; wx <= WORLD_W; wx += GRID_STEP_X) {
      ctx.fillText(wx, toCanvas(wx, 0).x, PAD_T + dH + 3);
    }

    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    for (let wy = 0; wy <= WORLD_H; wy += GRID_STEP_Y) {
      ctx.fillText(wy, PAD_L - 4, toCanvas(0, wy).y);
    }

    ctx.restore();
  }

  /* ── Edges ───────────────────────────────────────────────────────────────── */
  function drawEdges() {
    const { getEdges, nodeById } = window.Plane.graph;

    ctx.save();
    ctx.strokeStyle = EDGE_COLOR;
    ctx.lineWidth   = 2;

    for (const e of getEdges()) {
      const nA = nodeById(e.from);
      const nB = nodeById(e.to);
      if (!nA || !nB) continue;

      const cA = toCanvas(nA.x, nA.y);
      const cB = toCanvas(nB.x, nB.y);

      ctx.beginPath();
      ctx.moveTo(cA.x, cA.y);
      ctx.lineTo(cB.x, cB.y);
      ctx.stroke();

      /* Weight badge */
      const mx  = (cA.x + cB.x) / 2;
      const my  = (cA.y + cB.y) / 2 -7;
      const lbl = String(e.weight);
      ctx.font  = `bold 11px 'Segoe UI', sans-serif`;
      const tw  = ctx.measureText(lbl).width;
      const p   = 3;

      ctx.fillStyle = WEIGHT_BG;
      ctx.beginPath(); ctx.roundRect(mx - tw/2 - p, my - 8, tw + p*2, 16, 3); ctx.fill();

      ctx.fillStyle    = WEIGHT_COLOR;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lbl, mx, my);
    }
    ctx.restore();
  }

  /* ── Nodes ───────────────────────────────────────────────────────────────── */
  function drawNodes() {
    for (const n of window.Plane.graph.getNodes()) {
      const c = toCanvas(n.x, n.y);
      drawNode(c.x, c.y, n.name, NODE_FILL, NODE_STROKE, NODE_TEXT);
    }
  }

  function drawNode(cx, cy, label, fill, stroke, text) {
    ctx.save();
    ctx.shadowColor   = 'rgba(99,102,241,0.25)';
    ctx.shadowBlur    = 8;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, NODE_R, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, NODE_R, 0, Math.PI * 2);
    ctx.strokeStyle = stroke;
    ctx.lineWidth   = 2;
    ctx.stroke();

    const fs = label.length > 2 ? 9 : 11;
    ctx.font         = `bold ${fs}px 'Segoe UI', sans-serif`;
    ctx.fillStyle    = text;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
  }

  /* ── Redraw ──────────────────────────────────────────────────────────────── */
  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawEdges();
    drawNodes();
  }

  /* ── Attach to namespace ─────────────────────────────────────────────────── */
  window.Plane.canvas = {
    canvas,
    ctx:       () => ctx,
    NODE_R,
    WORLD_W,
    WORLD_H,
    toCanvas,
    sizeCanvas,
    redraw,
    drawNode,
  };

})();