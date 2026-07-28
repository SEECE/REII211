/* ── scriptBST.js ─────────────────────────────────────────────────────────── */

// ── DOM refs ────────────────────────────────────────────────────────────────
const canvas      = document.getElementById('canvas');
const ctx         = canvas.getContext('2d');
const valueInput  = document.getElementById('valueInput');
const chkStep     = document.getElementById('chk-step');
const stepControls = document.getElementById('stepControls');
const btnPrev     = document.getElementById('btn-prev');
const btnNext     = document.getElementById('btn-next');
const stepMsg     = document.getElementById('stepMsg');
const stratSlider = document.getElementById('stratSlider');
const stratLabel  = document.getElementById('stratLabel');
const deleteOptions = document.getElementById('deleteOptions');
const sliderSpeed = document.getElementById('slider-speed');
const valSpeed    = document.getElementById('val-speed');
const statNodes   = document.getElementById('stat-nodes');
const statHeight  = document.getElementById('stat-height');
const statCmp     = document.getElementById('stat-cmp');
const statStatus  = document.getElementById('stat-status');

// ── Colour palette ───────────────────────────────────────────────────────────
const COLORS = {
  idle:       { fill: '#faf9ff', stroke: '#a78bfa', text: '#6b21a8' },
  traversing: { fill: '#f59e0b', stroke: '#b45309', text: '#fff'    },
  found:      { fill: '#22c55e', stroke: '#15803d', text: '#fff'    },
  inserted:   { fill: '#22c55e', stroke: '#15803d', text: '#fff'    },
  deleted:    { fill: '#ef4444', stroke: '#b91c1c', text: '#fff'    },
  successor:  { fill: '#38bdf8', stroke: '#0284c7', text: '#fff'    },
  replaced:   { fill: '#a855f7', stroke: '#7e22ce', text: '#fff'    },
  notfound:   { fill: '#94a3b8', stroke: '#64748b', text: '#fff'    },
  path:       { fill: '#fef9c3', stroke: '#f59e0b', text: '#92400e' },
};

// ── BST state ────────────────────────────────────────────────────────────────
let root      = null;   // BST root node: { val, left, right, id, x, y }
let nodeCount = 0;
let cmpCount  = 0;
let _uid      = 0;

function makeNode(val) {
  return { val, left: null, right: null, id: _uid++, x: 0, y: 0 };
}

// ── Step system ──────────────────────────────────────────────────────────────
let steps     = [];
let stepIndex = -1;
let animTimer = null;
let uiMode    = 'idle';   // 'idle' | 'playing' | 'stepwise' | 'paused' | 'done'

function stepDelay() {
  const s = parseInt(sliderSpeed.value);
  // map 1–20 → ~900ms–30ms
  return Math.round(900 * Math.pow(30 / 900, (s - 1) / 19));
}

// ── Deep clone the tree so each snapshot is fully independent ───────────────
function cloneTree(node) {
  if (!node) return null;
  return {
    val:   node.val,
    id:    node.id,
    x:     node.x,
    y:     node.y,
    left:  cloneTree(node.left),
    right: cloneTree(node.right),
  };
}

// A step snapshot:
//   states    Map<id, colorKey>  — highlight state for each node at this moment
//   treeRoot  cloned tree        — independent copy of the tree at this moment
//   msg       string

function snapState(stateMap, msg) {
  return { states: new Map(stateMap), treeRoot: cloneTree(root), msg };
}

// ── BST operations (build step arrays) ──────────────────────────────────────

// --- INSERT ---
function buildInsertSteps(value) {
  const list   = [];
  const states = new Map();

  // Collect all current node ids → idle
  function markAllIdle(node) {
    if (!node) return;
    states.set(node.id, 'idle');
    markAllIdle(node.left);
    markAllIdle(node.right);
  }
  markAllIdle(root);

  // Empty tree
  if (root === null) {
    root = makeNode(value);
    nodeCount++;
    states.set(root.id, 'inserted');
    list.push(snapState(states, `Tree is empty. Place ${value} as the root.`));
    states.set(root.id, 'idle');
    list.push(snapState(states, `${value} is now the root of the BST.`));
    return list;
  }

  // Traverse to insertion point
  let current = root;
  const pathIds = [];

  while (true) {
    cmpCount++;
    pathIds.push(current.id);

    // Highlight path so far
    pathIds.forEach(id => states.set(id, 'path'));
    states.set(current.id, 'traversing');
    list.push(snapState(states, `Compare ${value} with ${current.val} at node [${current.val}].`));

    if (value === current.val) {
      states.set(current.id, 'found');
      list.push(snapState(states, `${value} already exists in the tree. No duplicates allowed.`));
      return list;
    }

    if (value < current.val) {
      list.push(snapState(states, `${value} < ${current.val} → go LEFT.`));
      if (current.left === null) {
        const newNode = makeNode(value);
        nodeCount++;
        current.left = newNode;
        states.set(newNode.id, 'inserted');
        list.push(snapState(states, `Left child is NULL. Insert ${value} here.`));
        states.set(newNode.id, 'idle');
        pathIds.forEach(id => states.set(id, 'idle'));
        list.push(snapState(states, `${value} inserted successfully.`));
        return list;
      }
      current = current.left;
    } else {
      list.push(snapState(states, `${value} > ${current.val} → go RIGHT.`));
      if (current.right === null) {
        const newNode = makeNode(value);
        nodeCount++;
        current.right = newNode;
        states.set(newNode.id, 'inserted');
        list.push(snapState(states, `Right child is NULL. Insert ${value} here.`));
        states.set(newNode.id, 'idle');
        pathIds.forEach(id => states.set(id, 'idle'));
        list.push(snapState(states, `${value} inserted successfully.`));
        return list;
      }
      current = current.right;
    }
  }
}

// --- SEARCH ---
function buildSearchSteps(value) {
  const list   = [];
  const states = new Map();
  function markAllIdle(node) {
    if (!node) return;
    states.set(node.id, 'idle');
    markAllIdle(node.left);
    markAllIdle(node.right);
  }
  markAllIdle(root);

  if (root === null) {
    list.push(snapState(states, 'Tree is empty. Nothing to search.'));
    return list;
  }

  let current = root;
  const pathIds = [];

  while (current !== null) {
    cmpCount++;
    pathIds.push(current.id);
    pathIds.forEach(id => states.set(id, 'path'));
    states.set(current.id, 'traversing');
    list.push(snapState(states, `Compare ${value} with ${current.val} at node [${current.val}].`));

    if (value === current.val) {
      states.set(current.id, 'found');
      list.push(snapState(states, `✓ Found ${value} at this node!`));
      return list;
    }

    if (value < current.val) {
      list.push(snapState(states, `${value} < ${current.val} → search LEFT subtree.`));
      current = current.left;
    } else {
      list.push(snapState(states, `${value} > ${current.val} → search RIGHT subtree.`));
      current = current.right;
    }
  }

  // Reset all to idle then mark not-found
  pathIds.forEach(id => states.set(id, 'notfound'));
  list.push(snapState(states, `${value} not found in the tree.`));
  return list;
}

// --- DELETE ---
// useSuccessor = true  → in-order successor (leftmost of right subtree)
// useSuccessor = false → in-order predecessor (rightmost of left subtree)
function buildDeleteSteps(value, useSuccessor) {
  const list   = [];
  const states = new Map();
  function markAllIdle(node) {
    if (!node) return;
    states.set(node.id, 'idle');
    markAllIdle(node.left);
    markAllIdle(node.right);
  }
  markAllIdle(root);

  if (root === null) {
    list.push(snapState(states, 'Tree is empty. Nothing to delete.'));
    return list;
  }

  // Phase 1: search for the node
  let current = root;
  let parent  = null;
  let dir     = null;   // 'left' | 'right'
  const pathIds = [];

  while (current !== null) {
    cmpCount++;
    pathIds.push(current.id);
    pathIds.forEach(id => states.set(id, 'path'));
    states.set(current.id, 'traversing');
    list.push(snapState(states, `Compare ${value} with ${current.val} at node [${current.val}].`));

    if (value === current.val) break;

    if (value < current.val) {
      list.push(snapState(states, `${value} < ${current.val} → go LEFT.`));
      parent = current; dir = 'left';
      current = current.left;
    } else {
      list.push(snapState(states, `${value} > ${current.val} → go RIGHT.`));
      parent = current; dir = 'right';
      current = current.right;
    }
  }

  if (current === null) {
    pathIds.forEach(id => states.set(id, 'notfound'));
    list.push(snapState(states, `${value} not found. No deletion performed.`));
    return list;
  }

  states.set(current.id, 'deleted');
  list.push(snapState(states, `Found ${value}. Determining deletion case…`));

  // ── CASE 1: leaf node ──
  if (current.left === null && current.right === null) {
    list.push(snapState(states, `[${current.val}] is a leaf node. Simply remove it.`));
    if (parent === null) { root = null; }
    else                 { parent[dir] = null; }
    states.delete(current.id);
    nodeCount--;
    pathIds.forEach(id => { if (states.has(id)) states.set(id, 'idle'); });
    list.push(snapState(states, `Node ${value} removed.`));
    return list;
  }

  // ── CASE 2: one child ──
  if (current.left === null || current.right === null) {
    const child = current.left !== null ? current.left : current.right;
    list.push(snapState(states, `[${current.val}] has one child [${child.val}]. Replace it with its child.`));
    states.set(child.id, 'replaced');
    list.push(snapState(states, `Child [${child.val}] will take the place of [${current.val}].`));
    if (parent === null) { root = child; }
    else                 { parent[dir] = child; }
    states.delete(current.id);
    nodeCount--;
    states.set(child.id, 'idle');
    pathIds.forEach(id => { if (states.has(id)) states.set(id, 'idle'); });
    list.push(snapState(states, `Node ${value} removed. Child promoted.`));
    return list;
  }

  // ── CASE 3: two children ──
  const stratName = useSuccessor ? 'in-order successor (leftmost of right subtree)'
                                  : 'in-order predecessor (rightmost of left subtree)';
  list.push(snapState(states, `[${current.val}] has two children. Using ${stratName}.`));

  let replacer, replacerParent, replacerDir;

  if (useSuccessor) {
    // Leftmost node of right subtree
    replacerParent = current; replacerDir = 'right';
    replacer = current.right;
    states.set(replacer.id, 'successor');
    list.push(snapState(states, `Go to right child [${replacer.val}], then find leftmost.`));
    while (replacer.left !== null) {
      states.set(replacer.id, 'path');
      replacerParent = replacer; replacerDir = 'left';
      replacer = replacer.left;
      states.set(replacer.id, 'successor');
      list.push(snapState(states, `Move left → [${replacer.val}].`));
    }
    list.push(snapState(states, `In-order successor is [${replacer.val}]. Copy its value to the target node.`));
  } else {
    // Rightmost node of left subtree
    replacerParent = current; replacerDir = 'left';
    replacer = current.left;
    states.set(replacer.id, 'successor');
    list.push(snapState(states, `Go to left child [${replacer.val}], then find rightmost.`));
    while (replacer.right !== null) {
      states.set(replacer.id, 'path');
      replacerParent = replacer; replacerDir = 'right';
      replacer = replacer.right;
      states.set(replacer.id, 'successor');
      list.push(snapState(states, `Move right → [${replacer.val}].`));
    }
    list.push(snapState(states, `In-order predecessor is [${replacer.val}]. Copy its value to the target node.`));
  }

  // Copy replacer's value into current node
  const oldVal = current.val;
  current.val  = replacer.val;
  states.set(current.id, 'replaced');
  states.set(replacer.id, 'deleted');
  list.push(snapState(states, `Copied ${replacer.val} → node previously holding ${oldVal}. Now delete [${replacer.val}] from its original position.`));

  // Remove replacer (it has at most one child — the right child for successor, left for predecessor)
  const replacerChild = useSuccessor ? replacer.right : replacer.left;
  if (replacerParent === current) {
    replacerParent[replacerDir] = replacerChild;
  } else {
    replacerParent[replacerDir] = replacerChild;
  }
  states.delete(replacer.id);
  nodeCount--;

  // Re-mark all idle
  function reIdle(node) {
    if (!node) return;
    states.set(node.id, 'idle');
    reIdle(node.left);
    reIdle(node.right);
  }
  reIdle(root);
  list.push(snapState(states, `Deletion complete. Tree remains a valid BST.`));
  return list;
}

// ── Layout ───────────────────────────────────────────────────────────────────
// Assign (x, y) positions to each node using a simple in-order x-counter.
// Returns array of all positioned nodes for drawing.

function layoutTree(node, depth, counter, levelGap, nodeR) {
  if (!node) return;
  layoutTree(node.left, depth + 1, counter, levelGap, nodeR);
  node.x = counter.val++ * (nodeR * 2 + 18) + nodeR + 10;
  node.y = depth * levelGap + nodeR + 20;
  layoutTree(node.right, depth + 1, counter, levelGap, nodeR);
}

function collectAll(node, arr = []) {
  if (!node) return arr;
  collectAll(node.left, arr);
  arr.push(node);
  collectAll(node.right, arr);
  return arr;
}

function treeHeight(node) {
  if (!node) return 0;
  return 1 + Math.max(treeHeight(node.left), treeHeight(node.right));
}

// ── Draw ─────────────────────────────────────────────────────────────────────

function drawEdge(parent, child) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(parent.x, parent.y);
  ctx.lineTo(child.x, child.y);
  ctx.strokeStyle = 'rgba(139,92,246,0.35)';
  ctx.lineWidth   = 2;
  ctx.stroke();
  ctx.restore();
}

function drawNode(node, colorKey) {
  const r  = nodeRadius();
  const c  = COLORS[colorKey] || COLORS.idle;

  // Shadow
  ctx.save();
  ctx.shadowColor  = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur   = 8;
  ctx.shadowOffsetY = 3;
  ctx.beginPath();
  ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
  ctx.fillStyle = c.fill;
  ctx.fill();
  ctx.restore();

  // Border
  ctx.beginPath();
  ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
  ctx.strokeStyle = c.stroke;
  ctx.lineWidth   = 2.5;
  ctx.stroke();

  // Value text
  const fs = Math.max(10, Math.min(16, r * 0.7));
  ctx.fillStyle = c.text;
  ctx.font      = `bold ${fs}px 'Segoe UI', sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(node.val, node.x, node.y);
}

function nodeRadius() {
  // Scale radius with canvas size, capped between 18–30
  return Math.max(18, Math.min(30, canvas.width / 28));
}

function countNodes(node) {
  if (!node) return 0;
  return 1 + countNodes(node.left) + countNodes(node.right);
}

// Draw from a live root + statemap (used for idle/clear redraws)
function draw(stateMap) {
  drawTree(root, stateMap);
}

// Draw from a step snapshot's own cloned tree
function drawFromSnapshot(snap) {
  drawTree(snap.treeRoot, snap.states);
}

function drawTree(treeRef, stateMap) {
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  if (!treeRef) {
    ctx.fillStyle = '#c4b5fd';
    ctx.font      = 'bold 15px "Segoe UI", sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Insert a value to begin building the BST', W / 2, H / 2);
    return;
  }

  const h        = treeHeight(treeRef);
  const levelGap = Math.min(90, (H - 60) / Math.max(h, 1));
  const r        = nodeRadius();
  const counter  = { val: 0 };
  layoutTree(treeRef, 0, counter, levelGap, r);

  const allNodes = collectAll(treeRef);

  // Centre the tree horizontally
  const minX = Math.min(...allNodes.map(n => n.x));
  const maxX = Math.max(...allNodes.map(n => n.x));
  const treeW = maxX - minX + r * 2;
  const offsetX = (W - treeW) / 2 - minX + r;

  allNodes.forEach(n => { n.x += offsetX; });

  // Edges first
  allNodes.forEach(node => {
    if (node.left)  drawEdge(node, node.left);
    if (node.right) drawEdge(node, node.right);
  });

  // Nodes on top
  allNodes.forEach(node => {
    const key = stateMap ? (stateMap.get(node.id) || 'idle') : 'idle';
    drawNode(node, key);
  });
}

// ── Step engine ──────────────────────────────────────────────────────────────

function applyStep(idx) {
  stepIndex = Math.max(0, Math.min(idx, steps.length - 1));
  const s   = steps[stepIndex];

  // Draw using the snapshot's own tree clone — never overwrite the live root mid-animation
  drawFromSnapshot(s);
  setStepMsg(s.msg);

  // Commit the final tree to root only on the last step
  if (stepIndex === steps.length - 1) {
    root      = s.treeRoot;
    nodeCount = countNodes(root);
  }

  updateStats();
  btnPrev.disabled = stepIndex <= 0;
  btnNext.disabled = stepIndex >= steps.length - 1;
}

function autoPlay() {
  if (stepIndex >= steps.length - 1) { setMode('done'); return; }
  applyStep(stepIndex + 1);
  animTimer = setTimeout(autoPlay, stepDelay());
}

function stopAnim() {
  if (animTimer) { clearTimeout(animTimer); animTimer = null; }
}

function runSteps(newSteps) {
  stopAnim();
  steps     = newSteps;
  stepIndex = 0;
  applyStep(0);

  if (chkStep.checked) {
    setMode('stepwise');
  } else {
    setMode('playing');
    autoPlay();
  }
}

function setMode(mode) {
  uiMode = mode;

  const showStepBtns = ['stepwise', 'paused', 'done'].includes(mode);
  stepControls.style.display = showStepBtns ? 'flex' : 'none';

  if (showStepBtns) {
    btnPrev.disabled = stepIndex <= 0;
    btnNext.disabled = stepIndex >= steps.length - 1;
  }

  if (mode === 'done') {
    statStatus.textContent = 'Done ✓';
    stepMsg.textContent    = steps[steps.length - 1]?.msg || '';
  }
}

function setStepMsg(msg) {
  stepMsg.textContent = msg || '';
}

function updateStats() {
  // During animation use the snapshot tree for height; after commit, use root
  const displayRoot = steps[stepIndex] ? steps[stepIndex].treeRoot : root;
  statNodes.textContent  = countNodes(displayRoot);
  statHeight.textContent = displayRoot ? treeHeight(displayRoot) : '—';
  statCmp.textContent    = cmpCount;
}

// ── UI wiring ────────────────────────────────────────────────────────────────

// Operation radio → show/hide correct button & delete options
document.querySelectorAll('input[name="operation"]').forEach(radio => {
  radio.addEventListener('change', () => {
    document.getElementById('btn-insert').style.display = 'none';
    document.getElementById('btn-delete').style.display = 'none';
    document.getElementById('btn-search').style.display = 'none';
    document.getElementById('btn-' + radio.value).style.display = 'block';
    deleteOptions.classList.toggle('visible', radio.value === 'delete');
  });
});

// Successor/Predecessor slider label
stratSlider.addEventListener('input', () => {
  stratLabel.textContent = stratSlider.value === '0' ? 'In-order Successor'
                                                      : 'In-order Predecessor';
});

// Speed slider
sliderSpeed.addEventListener('input', () => {
  valSpeed.textContent = sliderSpeed.value + '×';
});

// Step controls
btnPrev.addEventListener('click', () => {
  stopAnim();
  if (stepIndex > 0) applyStep(stepIndex - 1);
  setMode('paused');
});

btnNext.addEventListener('click', () => {
  stopAnim();
  if (stepIndex < steps.length - 1) {
    applyStep(stepIndex + 1);
    setMode(chkStep.checked ? 'stepwise' : 'paused');
  } else {
    setMode('done');
  }
});

chkStep.addEventListener('change', () => {
  stepControls.style.display = chkStep.checked ? 'flex' : 'none';
  setStepMsg('');
  if (chkStep.checked && uiMode === 'playing') {
    stopAnim();
    setMode('stepwise');
  }
});

// Action buttons
function getVal() {
  const raw = valueInput.value.trim();
  if (raw === '') return null;
  const v = parseInt(raw, 10);
  return isNaN(v) ? null : v;
}

document.getElementById('btn-insert').addEventListener('click', () => {
  const v = getVal(); if (v === null) { valueInput.focus(); return; }
  valueInput.value = '';
  runSteps(buildInsertSteps(v));
});

document.getElementById('btn-delete').addEventListener('click', () => {
  const v = getVal(); if (v === null) { valueInput.focus(); return; }
  if (!root) { setStepMsg('Tree is empty.'); return; }
  valueInput.value = '';
  const useSuccessor = stratSlider.value === '0';
  runSteps(buildDeleteSteps(v, useSuccessor));
});

document.getElementById('btn-search').addEventListener('click', () => {
  const v = getVal(); if (v === null) { valueInput.focus(); return; }
  if (!root) { setStepMsg('Tree is empty.'); return; }
  valueInput.value = '';
  runSteps(buildSearchSteps(v));
});

valueInput.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const op = document.querySelector('input[name="operation"]:checked').value;
  document.getElementById('btn-' + op).click();
});

document.getElementById('btn-clear').addEventListener('click', () => {
  stopAnim();
  root      = null;
  nodeCount = 0;
  cmpCount  = 0;
  steps     = [];
  stepIndex = -1;
  setMode('idle');
  setStepMsg('');
  updateStats();
  statStatus.textContent = 'Ready';
  draw(null);
});

// ── Canvas resize ────────────────────────────────────────────────────────────
function resizeCanvas() {
  const vis    = document.getElementById('visualizer');
  canvas.width  = vis.clientWidth;
  canvas.height = vis.clientHeight;
  // Re-draw current state
  const s = steps[stepIndex];
  draw(s ? s.states : null);
}

window.addEventListener('resize', resizeCanvas);

// ── Boot ─────────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  resizeCanvas();
  updateStats();
  statStatus.textContent = 'Ready';
});