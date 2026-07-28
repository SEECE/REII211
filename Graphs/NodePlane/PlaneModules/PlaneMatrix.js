/* ═══════════════════════════════════════════════════════════════════════════
   PlaneMatrix.js  –  Adjacency-matrix view submodule
   Provides: buildMatrixTable
   Depends on: window.Plane.graph, window.Plane.canvas, window.Plane.ui
   Attaches to: window.Plane.matrix

   Layout  (rows = nodes, left-to-right):
     Col 0  : x coordinate  (editable)
     Col 1  : y coordinate  (editable)
     Col 2  : node name     (editable, bold, acts as row header)
     Col 3+ : weight columns, one per node
               – diagonal cell  → styled "0", not editable
               – lower triangle → editable (primary input)
               – upper triangle → read-only mirror
     Last row: {add new}  →  creates a node on Enter / blur

   Weight display: blank = 0  (only non-zero values are shown as numbers,
   matching the Excel reference).  Editing a blank or 0 removes the edge.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Build ───────────────────────────────────────────────────────────────── */
  function buildMatrixTable() {
    const { getNodes, adjacencyMatrix } = window.Plane.graph;
    const nodes     = getNodes();
    const container = document.getElementById('mat-container');

    if (nodes.length === 0) {
      container.innerHTML = buildEmptyState();
      return;
    }

    const n   = nodes.length;
    const mat = adjacencyMatrix();

    const wrap  = document.createElement('div');
    wrap.className = 'mat-wrap';

    const table = document.createElement('table');
    table.id    = 'mat-table';
    table.className = 'mat-table';

    /* ── thead: x | y | node | name1 | name2 … ── */
    const thead = table.createTHead();
    const hrow  = thead.insertRow();
    addTh(hrow, 'x',    'mat-hdr mat-coord');
    addTh(hrow, 'y',    'mat-hdr mat-coord');
    addTh(hrow, 'node', 'mat-hdr mat-node-hdr');
    for (let j = 0; j < n; j++) {
      addTh(hrow, nodes[j].name, 'mat-hdr mat-col-hdr');
    }

    /* ── tbody: one row per node ── */
    const tbody = table.createTBody();
    for (let i = 0; i < n; i++) {
      tbody.appendChild(buildNodeRow(nodes, mat, i, n));
    }

    /* ── add-new row ── */
    const addRow = tbody.insertRow();
    addRow.className = 'mat-add-row';
    const addCell = addRow.insertCell();
    addCell.colSpan = n + 3;
    addCell.className = 'mat-add-cell';
    const addInp = document.createElement('input');
    addInp.type        = 'text';
    addInp.placeholder = '{add new}';
    addInp.className   = 'mat-add-input';
    addInp.dataset.mtype = 'addnew';
    addInp.addEventListener('keydown', e => {
      if (e.key === 'Enter') commitAddNew(addInp);
    });
    addInp.addEventListener('blur', () => commitAddNew(addInp));
    addCell.appendChild(addInp);

    container.innerHTML = '';
    wrap.appendChild(table);
    container.appendChild(wrap);
  }

  /* ── Build one node row ──────────────────────────────────────────────────── */
  function buildNodeRow(nodes, mat, i, n) {
    const row = document.createElement('tr');
    row.dataset.nodeIdx = i;

    /* x cell */
    const xTd = row.insertCell();
    xTd.className = 'mat-coord-cell';
    xTd.appendChild(makeInput(nodes[i].x, 'x', i));

    /* y cell */
    const yTd = row.insertCell();
    yTd.className = 'mat-coord-cell';
    yTd.appendChild(makeInput(nodes[i].y, 'y', i));

    /* node name cell */
    const nameTd = row.insertCell();
    nameTd.className = 'mat-name-cell';
    nameTd.appendChild(makeInput(nodes[i].name, 'name', i));

    /* weight cells */
    for (let j = 0; j < n; j++) {
      const td = row.insertCell();
      if (i === j) {
        /* Diagonal */
        td.className   = 'mat-diag';
        td.textContent = '0';
      } else if (i > j) {
        /* Lower triangle — editable */
        td.className = 'mat-weight mat-lower' + (mat[i][j] === 0 ? ' mat-zero' : '');
        const inp = makeInput(mat[i][j] === 0 ? '' : mat[i][j], 'weight', i, j);
        td.appendChild(inp);
      } else {
        /* Upper triangle — read-only mirror */
        td.className = 'mat-weight mat-upper' + (mat[i][j] === 0 ? ' mat-zero' : '');
        const inp = makeInput(mat[i][j] === 0 ? '' : mat[i][j], 'mirror', i, j);
        inp.readOnly = true;
        inp.tabIndex = -1;
        td.appendChild(inp);
      }
    }

    return row;
  }

  /* ── Empty state with inline add-new ────────────────────────────────────── */
  function buildEmptyState() {
    return `
      <div class="mat-empty">
        <p>No nodes yet.</p>
        <div class="mat-empty-add">
          <input type="text" id="mat-empty-name" placeholder="Node name" maxlength="4" />
          <input type="number" id="mat-empty-x" placeholder="X (0–100)" min="0" max="100" />
          <input type="number" id="mat-empty-y" placeholder="Y (0–50)"  min="0" max="50"  />
          <button id="mat-empty-btn">+ Add first node</button>
        </div>
      </div>`;
    /* Note: button is wired via event delegation in onMatrixClick below */
  }

  /* ── DOM helpers ─────────────────────────────────────────────────────────── */
  function addTh(row, text, cls) {
    const th = document.createElement('th');
    th.textContent = text;
    th.className   = cls || '';
    row.appendChild(th);
    return th;
  }

  function makeInput(value, type, i, j) {
    const inp         = document.createElement('input');
    inp.type          = 'text';
    inp.value         = value;
    inp.dataset.mtype = type;
    inp.dataset.i     = i;
    if (j !== undefined) inp.dataset.j = j;
    inp.addEventListener('change', onMatrixInputChange);
    /* Only live-update for coord & name, not weight (avoid mid-type edge flapping) */
    if (type === 'name' || type === 'x' || type === 'y') {
      inp.addEventListener('input', onMatrixInputChange);
    }
    return inp;
  }

  /* ── Add-new commit ──────────────────────────────────────────────────────── */
  function commitAddNew(inp) {
    const name = inp.value.trim();
    if (!name) return;
    /* Use addNode which handles validation and refreshAll */
    const ok = window.Plane.graph.addNode(name, 50, 25);
    if (ok) inp.value = '';
    /* buildMatrixTable is called by refreshAll → setView path */
  }

  /* ── Input handler ───────────────────────────────────────────────────────── */
  function onMatrixInputChange(e) {
    const inp  = e.target;
    const type = inp.dataset.mtype;
    const i    = parseInt(inp.dataset.i, 10);
    const j    = inp.dataset.j !== undefined ? parseInt(inp.dataset.j, 10) : undefined;
    const raw  = inp.value.trim();

    const { getNodes, removeNode, _pushEdge, _filterEdges, _nextEid } = window.Plane.graph;
    const { redraw, WORLD_W, WORLD_H } = window.Plane.canvas;
    const { refreshInfo, refreshRemoveDropdowns } = window.Plane.ui;
    const nodes = getNodes();

    if (type === 'name') {
      if (raw === '') { removeNode(nodes[i].id); return; }
      if (nodes.some((n, idx) => idx !== i && n.name === raw)) {
        inp.style.outline = '2px solid #f87171'; return;
      }
      inp.style.outline = '';
      nodes[i].name = raw;
      syncColumnHeaders();
      syncRowLabels();
      refreshInfo();
      refreshRemoveDropdowns();
      redraw();
    }

    else if (type === 'x') {
      const v = parseFloat(raw);
      if (isNaN(v) || v < 0 || v > WORLD_W) { inp.style.outline = '2px solid #f87171'; return; }
      inp.style.outline = '';
      nodes[i].x = v;
      redraw();
    }

    else if (type === 'y') {
      const v = parseFloat(raw);
      if (isNaN(v) || v < 0 || v > WORLD_H) { inp.style.outline = '2px solid #f87171'; return; }
      inp.style.outline = '';
      nodes[i].y = v;
      redraw();
    }

    else if (type === 'weight') {
      const w  = parseFloat(raw);
      const nA = nodes[i];
      const nB = nodes[j];

      _filterEdges(ed =>
        !((ed.from === nA.id && ed.to === nB.id) ||
          (ed.from === nB.id && ed.to === nA.id))
      );

      if (!isNaN(w) && w > 0) {
        _pushEdge({ id: _nextEid(), from: nA.id, to: nB.id, weight: w });
      }

      /* Mirror into upper triangle */
      syncMirrorCell(i, j, isNaN(w) ? 0 : w);

      const td = inp.closest('td');
      td.className = 'mat-weight mat-lower' + (!isNaN(w) && w > 0 ? '' : ' mat-zero');

      refreshInfo();
      refreshRemoveDropdowns();
      redraw();
    }
  }

  /* ── Sync helpers ────────────────────────────────────────────────────────── */

  /* Update the <th> column headers when a name changes */
  function syncColumnHeaders() {
    const table = document.getElementById('mat-table');
    if (!table) return;
    const nodes = window.Plane.graph.getNodes();
    const ths   = table.tHead.rows[0].cells;
    /* cols 0=x,1=y,2=node then node names start at 3 */
    for (let j = 0; j < nodes.length; j++) {
      ths[j + 3].textContent = nodes[j].name;
    }
  }

  /* Update the name inputs in the name column when a name changes */
  function syncRowLabels() {
    const table = document.getElementById('mat-table');
    if (!table) return;
    const nodes = window.Plane.graph.getNodes();
    const rows  = table.tBodies[0].rows;
    for (let i = 0; i < nodes.length; i++) {
      const nameInp = rows[i].cells[2].querySelector('input');
      if (nameInp && nameInp !== document.activeElement) {
        nameInp.value = nodes[i].name;
      }
    }
  }

  /* Update the upper-triangle mirror cell at [j][i] when lower [i][j] changes */
  function syncMirrorCell(i, j, weight) {
    const table = document.getElementById('mat-table');
    if (!table) return;
    const rows = table.tBodies[0].rows;
    /* row j, weight column = j offset 3 + i → but i < j so it's upper triangle */
    if (j < rows.length) {
      /* In row j, node columns start at index 3.  Column for node i is at 3+i. */
      const cell = rows[j].cells[3 + i];
      if (!cell) return;
      const inp = cell.querySelector('input');
      if (inp) inp.value = weight > 0 ? weight : '';
      cell.className = 'mat-weight mat-upper' + (weight === 0 ? ' mat-zero' : '');
    }
  }

  /* ── Event delegation for empty-state button ────────────────────────────── */
  document.getElementById('mat-container').addEventListener('click', function (e) {
    if (e.target.id !== 'mat-empty-btn') return;
    const name = document.getElementById('mat-empty-name').value.trim();
    const x    = parseFloat(document.getElementById('mat-empty-x').value);
    const y    = parseFloat(document.getElementById('mat-empty-y').value);
    if (!name) return;
    window.Plane.graph.addNode(name, isNaN(x) ? 50 : x, isNaN(y) ? 25 : y);
    /* addNode calls refreshAll which calls buildMatrixTable */
  });

  /* ── Attach to namespace ─────────────────────────────────────────────────── */
  window.Plane.matrix = {
    buildMatrixTable,
  };

})();