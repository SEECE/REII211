/* ═══════════════════════════════════════════════════════════════════════════
   PlaneUI.js  –  DOM refresh & view-toggle submodule
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  let viewMode = 'plot';

  /* ── Refresh ─────────────────────────────────────────────────────────────── */
  function refreshAll() {
    refreshNodeDropdowns();
    refreshRemoveDropdowns();
    // refreshInfo() removed - no longer needed
    if (viewMode === 'matrix') {
      window.Plane.matrix.buildMatrixTable();
    } else {
      window.Plane.canvas.redraw();
    }
  }

  function refreshInfo() {
    // Removed because we deleted the info bar
    // (info-nodes and info-edges no longer exist)
  }

  function refreshNodeDropdowns() {
    const { getNodes } = window.Plane.graph;
    const fromSel = document.getElementById('edge-from');
    const toSel = document.getElementById('edge-to');
    const prevFrom = fromSel ? fromSel.value : '';
    const prevTo = toSel ? toSel.value : '';

    if (fromSel && toSel) {
      [fromSel, toSel].forEach(sel => {
        sel.innerHTML = '<option value="">– select node –</option>';
        for (const n of getNodes()) {
          const opt = document.createElement('option');
          opt.value = n.id;
          opt.textContent = n.name;
          sel.appendChild(opt);
        }
      });

      if (prevFrom) fromSel.value = prevFrom;
      if (prevTo) toSel.value = prevTo;
    }
  }

  function refreshRemoveDropdowns() {
    const { getNodes, getEdges, nodeById } = window.Plane.graph;

    /* Remove Node */
    const rnSel = document.getElementById('remove-node-sel');
    if (rnSel) {
      const prevRN = rnSel.value;
      rnSel.innerHTML = '<option value="">– select node –</option>';
      for (const n of getNodes()) {
        const opt = document.createElement('option');
        opt.value = n.id;
        opt.textContent = `${n.name} (${n.x}, ${n.y})`;
        rnSel.appendChild(opt);
      }
      if (prevRN) rnSel.value = prevRN;
    }

    /* Remove Edge */
    const reSel = document.getElementById('remove-edge-sel');
    if (reSel) {
      const prevRE = reSel.value;
      reSel.innerHTML = '<option value="">– select edge –</option>';
      for (const e of getEdges()) {
        const nA = nodeById(e.from);
        const nB = nodeById(e.to);
        if (!nA || !nB) continue;
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = `${nA.name} — ${nB.name}  [${e.weight}]`;
        reSel.appendChild(opt);
      }
      if (prevRE) reSel.value = prevRE;
    }
  }

  /* ── View toggle ─────────────────────────────────────────────────────────── */
  function setView(mode) {
    viewMode = mode;
    const track = document.getElementById('view-toggle-track');
    const lblPlot = document.getElementById('lbl-plot');
    const lblMat = document.getElementById('lbl-matrix');
    const plotEl = document.getElementById('plane');
    const matEl = document.getElementById('matrix-view');
    const controls = document.querySelectorAll('.controls > :not(.view-toggle-group)');

    if (mode === 'matrix') {
      if (mode === 'matrix') {
        if (track) track.classList.add('on');
        // ...
      } else {
        if (track) track.classList.remove('on');
        // ...
      }
      if (lblPlot) { lblPlot.style.fontWeight = '400'; lblPlot.style.color = ''; }
      if (lblMat) { lblMat.style.fontWeight = '600'; lblMat.style.color = '#6366f1'; }
      if (plotEl) plotEl.style.display = 'none';
      if (matEl) matEl.classList.add('active');

      controls.forEach(el => el.classList.add('matrix-hidden'));
      window.Plane.matrix.buildMatrixTable();
    } else {
      if (track) track.classList.remove('on');
      if (lblPlot) { lblPlot.style.fontWeight = '600'; lblPlot.style.color = '#6366f1'; }
      if (lblMat) { lblMat.style.fontWeight = '400'; lblMat.style.color = ''; }
      if (plotEl) plotEl.style.display = 'block';
      if (matEl) matEl.classList.remove('active');

      controls.forEach(el => el.classList.remove('matrix-hidden'));
      window.Plane.canvas.redraw();
    }
  }

  function getViewMode() { return viewMode; }

  /* ── Attach to namespace ─────────────────────────────────────────────────── */
  window.Plane.ui = {
    refreshAll,
    refreshInfo,
    refreshNodeDropdowns,
    refreshRemoveDropdowns,
    setView,
    getViewMode,
  };

})();