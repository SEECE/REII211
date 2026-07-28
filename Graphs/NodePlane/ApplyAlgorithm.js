/* ═══════════════════════════════════════════════════════════════════════════
   ApplyAlgorithm.js  –  Shared shell for graph-algorithm visualisers
   ─────────────────────────────────────────────────────────────────────────
   Usage (from any algorithm file):

     window.AlgoShell.register({
       prefix,          // string  – short lowercase id, e.g. "bfs" or "dfs"
       label,           // string  – display name shown in the panel heading
       panelExtra,      // string  – extra HTML injected inside the panel (legend
                        //           section, extra controls, etc.)  May be "".
       run(sourceId, targetId) → result,
                        // Pure algorithm function. Returns an object that MUST
                        // contain:  { order: Step[] }
                        // Any other fields (maxLevel, treeEdges, edgeType …)
                        // are passed straight through to draw / buildLegend.
       draw(step, result),
                        // Draws one step onto the canvas. Receives the current
                        // step object and the full result from run().
       buildLegend(result),
                        // Called once after run() to populate the legend area.
                        // Receives the full result object.
     });

   The shell handles:
     • Waiting for PlaneGraph to be ready
     • DOM injection (panel with start/target dropdowns, stepwise checkbox,
       solve/reset buttons, prev/next buttons, status bar, legend wrapper)
     • Dropdown sync on graph mutations
     • solve / reset / showStep logic
     • Keyboard arrow-key navigation
     • Stepwise ↔ instant mode switching
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Public namespace ───────────────────────────────────────────────────── */
  window.AlgoShell = { register };

  /* ═══════════════════════════════════════════════════════════════════════════
     REGISTER
     ═══════════════════════════════════════════════════════════════════════════ */
  function register(cfg) {
    const { prefix, label, panelExtra = '', run, draw, buildLegend } = cfg;

    /* Validate required fields */
    if (!prefix || !label || !run || !draw) {
      console.error('[AlgoShell] register() is missing required fields:', cfg);
      return;
    }

    /* IDs derived from prefix so multiple algorithms never clash */
    const id = (suffix) => `${prefix}-${suffix}`;

    waitForPlane(() => init(prefix, label, panelExtra, id, run, draw, buildLegend));
  }

  /* ── Wait for PlaneGraph to be ready ─────────────────────────────────────── */
  function waitForPlane(cb) {
    if (window.PlaneGraph && window.PlaneGraph.getNodes) { cb(); return; }
    setTimeout(() => waitForPlane(cb), 50);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     DOM INJECTION
     ═══════════════════════════════════════════════════════════════════════════ */
  function injectPanel(prefix, label, panelExtra, id) {
    const clearGroup = document.querySelector('#clear-btn').closest('.control-group');

    const panel = document.createElement('div');
    panel.className = 'control-group';
    panel.id = id('panel');
    panel.innerHTML = `
      <h3>${label}</h3>

      <div class="input-row">
        <label>Start</label>
        <select id="${id('start')}"><option value="">– node –</option></select>
      </div>

      <div class="input-row">
        <label>Find</label>
        <select id="${id('target')}">
          <option value="">– any (full ${label}) –</option>
        </select>
      </div>

      <div class="checkbox-row" style="margin:6px 0 10px;">
        <input type="checkbox" id="${id('stepwise')}" />
        <label for="${id('stepwise')}">Stepwise mode</label>
      </div>

      <div class="btn-group" id="${id('btn-group')}">
        <button id="${id('solve-btn')}">▶ Solve</button>
        <button id="${id('reset-btn')}" style="background:#64748b;">✕ Reset</button>
      </div>

      <div class="btn-group" id="${id('step-btns')}" style="display:none;">
        <button id="${id('prev-btn')}">◀ Prev</button>
        <button id="${id('next-btn')}">▶ Next</button>
      </div>

      <div class="stats" id="${id('status')}" style="margin-top:8px;min-height:36px;"></div>

      <div id="${id('legend')}" style="margin-top:10px;display:none;">
        ${panelExtra}
      </div>
    `;

    clearGroup.parentElement.insertBefore(panel, clearGroup);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     DROPDOWN SYNC
     ═══════════════════════════════════════════════════════════════════════════ */
  function syncDropdowns(id) {
    const nodes     = window.PlaneGraph.getNodes();
    const startSel  = document.getElementById(id('start'));
    const targetSel = document.getElementById(id('target'));
    if (!startSel || !targetSel) return;

    const prevStart  = startSel.value;
    const prevTarget = targetSel.value;

    startSel.innerHTML  = '<option value="">– node –</option>';
    targetSel.innerHTML = `<option value="">– any (full) –</option>`;

    for (const n of nodes) {
      const o1 = document.createElement('option');
      o1.value = n.id; o1.textContent = n.name;
      startSel.appendChild(o1);

      const o2 = document.createElement('option');
      o2.value = n.id; o2.textContent = n.name;
      targetSel.appendChild(o2);
    }

    if (prevStart)  startSel.value  = prevStart;
    if (prevTarget) targetSel.value = prevTarget;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     STATUS BAR
     ═══════════════════════════════════════════════════════════════════════════ */
  function setStatus(id, html) {
    const el = document.getElementById(id('status'));
    if (el) el.innerHTML = html;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     INIT  –  wires everything up for one algorithm
     ═══════════════════════════════════════════════════════════════════════════ */
  function init(prefix, label, panelExtra, id, run, draw, buildLegend) {
    injectPanel(prefix, label, panelExtra, id);
    syncDropdowns(id);

    /* ── Per-instance state ─────────────────────────────────────────────────── */
    let result     = null;   /* last full run() result */
    let stepIdx    = 0;
    let inStepMode = false;

    /* ── Helpers ────────────────────────────────────────────────────────────── */
    function showStep(idx) {
      if (!result) return;
      const steps = result.order;
      idx = Math.max(0, Math.min(steps.length - 1, idx));
      stepIdx = idx;

      const step = steps[idx];
      draw(step, result);

      setStatus(id, `
        <span style="color:#94a3b8;font-size:10px;">Step ${idx + 1} / ${steps.length}</span><br/>
        ${step.msg || ''}
      `);

      const prevBtn = document.getElementById(id('prev-btn'));
      const nextBtn = document.getElementById(id('next-btn'));
      if (prevBtn) prevBtn.disabled = (idx === 0);
      if (nextBtn) nextBtn.disabled = (idx === steps.length - 1);
    }

    function jumpToLast() {
      if (!result) return;
      const last = result.order[result.order.length - 1];
      draw(last, result);
      setStatus(id, last.msg || `${label} complete.`);
    }

    function enterStepMode() {
      stepIdx = 0;
      showStep(0);
      document.getElementById(id('step-btns')).style.display = 'flex';
      document.getElementById(id('btn-group')).style.display = 'none';
    }

    function exitStepMode() {
      inStepMode = false;
      jumpToLast();
      document.getElementById(id('step-btns')).style.display = 'none';
      document.getElementById(id('btn-group')).style.display  = 'flex';
    }

    /* ── Solve ──────────────────────────────────────────────────────────────── */
    function solve() {
      const sourceId = parseInt(document.getElementById(id('start')).value, 10);
      if (!sourceId) {
        setStatus(id, '<span style="color:#f87171">Select a start node.</span>');
        return;
      }

      const targetRaw = document.getElementById(id('target')).value;
      const targetId  = targetRaw ? parseInt(targetRaw, 10) : null;

      if (targetId && targetId === sourceId) {
        setStatus(id, '<span style="color:#f87171">Start and target cannot be the same node.</span>');
        return;
      }

      result = run(sourceId, targetId);

      if (buildLegend) {
        buildLegend(result);
        document.getElementById(id('legend')).style.display = 'block';
      }

      inStepMode = document.getElementById(id('stepwise')).checked;

      if (inStepMode) {
        enterStepMode();
      } else {
        jumpToLast();
        document.getElementById(id('step-btns')).style.display = 'none';
        document.getElementById(id('btn-group')).style.display  = 'flex';
      }
    }

    /* ── Reset ──────────────────────────────────────────────────────────────── */
    function reset() {
      result     = null;
      stepIdx    = 0;
      inStepMode = false;
      document.getElementById(id('step-btns')).style.display = 'none';
      document.getElementById(id('btn-group')).style.display  = 'flex';
      document.getElementById(id('legend')).style.display     = 'none';
      setStatus(id, '');
      window.PlaneGraph.redraw();
    }

    /* ── Monkey-patch refreshAll so graph mutations stay in sync ────────────── */
    const origRefreshAll = window.Plane.ui.refreshAll.bind(window.Plane.ui);
    window.Plane.ui.refreshAll = function () {
      origRefreshAll();
      syncDropdowns(id);
      if (result) reset();
    };

    /* ── Button wiring ──────────────────────────────────────────────────────── */
    document.getElementById(id('solve-btn')).addEventListener('click', solve);
    document.getElementById(id('reset-btn')).addEventListener('click', reset);
    document.getElementById(id('prev-btn')).addEventListener('click', () => showStep(stepIdx - 1));
    document.getElementById(id('next-btn')).addEventListener('click', () => showStep(stepIdx + 1));

    /* ── Stepwise checkbox: toggle mid-session ──────────────────────────────── */
    document.getElementById(id('stepwise')).addEventListener('change', e => {
      if (!result) return;
      if (e.target.checked && !inStepMode) {
        inStepMode = true;
        enterStepMode();
      } else if (!e.target.checked && inStepMode) {
        exitStepMode();
      }
    });

    /* ── Keyboard arrow navigation ──────────────────────────────────────────── */
    document.addEventListener('keydown', e => {
      if (!result || !inStepMode) return;
      if (e.key === 'ArrowLeft')  showStep(stepIdx - 1);
      if (e.key === 'ArrowRight') showStep(stepIdx + 1);
    });
  }

})();