/* ── quick-sort.js ── */

const canvas      = document.getElementById('canvas');
const ctx         = canvas.getContext('2d');
const sliderN     = document.getElementById('slider-n');
const sliderSpeed = document.getElementById('slider-speed');
const valN        = document.getElementById('val-n');
const valSpeed    = document.getElementById('val-speed');
const btnShuffle  = document.getElementById('btn-shuffle');
const btnReverse  = document.getElementById('btn-reverse');
const btnSolve    = document.getElementById('btn-solve');
const btnReset    = document.getElementById('btn-reset');
const btnPrev     = document.getElementById('btn-prev');
const btnNext     = document.getElementById('btn-next');
const chkStep     = document.getElementById('chk-stepwise');
const statCmp     = document.getElementById('stat-cmp');
const statSwaps   = document.getElementById('stat-swaps');
const statDepth   = document.getElementById('stat-depth');
const statStatus  = document.getElementById('stat-status');

// ── colour palette ────────────────────────────────────────────────────────
// idle       pale purple    not yet reached / untouched
// active     amber          subarray currently being partitioned
// pivot      purple         the chosen pivot element
// scanner    sky blue       i-pointer scanning through
// firsthigh  pink           firsthigh boundary marker
// winner     yellow-green   element just swapped into place
// placed     teal           element confirmed in correct region (< pivot)
// sorted     emerald        element in its final sorted position
// done       grey           subarray fully sorted, faded out
// inplace    orange         pivot being swapped to final position

const COLORS = {
  idle:      { fill: '#ddd6fe', stroke: '#a78bfa', text: '#5b21b6' },
  active:    { fill: '#f59e0b', stroke: '#b45309', text: '#fff'    },
  pivot:     { fill: '#a855f7', stroke: '#6d28d9', text: '#fff'    },
  scanner:   { fill: '#38bdf8', stroke: '#0284c7', text: '#fff'    },
  firsthigh: { fill: '#f472b6', stroke: '#be185d', text: '#fff'    },
  winner:    { fill: '#4ade80', stroke: '#15803d', text: '#1a1a1a' },
  placed:    { fill: '#2dd4bf', stroke: '#0f766e', text: '#fff'    },
  sorted:    { fill: '#22c55e', stroke: '#15803d', text: '#fff'    },
  done:      { fill: '#94a3b8', stroke: '#64748b', text: '#fff'    },
  inplace:   { fill: '#fb923c', stroke: '#c2410c', text: '#fff'    },
};

// ── app state ─────────────────────────────────────────────────────────────
let array      = [];
let treeRoot   = null;
let steps      = [];
let stepIndex  = -1;
let animTimer  = null;
let uiMode     = 'idle';
let cmpCount   = 0;
let swapCount  = 0;
let maxDepth   = 0;

// ── helpers ───────────────────────────────────────────────────────────────
function freshArray(n) {
  return Array.from({ length: n }, (_, i) => i + 1);
}

function reverseArr(arr) {
  return [...arr].reverse();
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function stepDelay() {
  const s = parseInt(sliderSpeed.value);
  return Math.round(1800 * Math.pow(60 / 1800, (s - 1) / 19));
}

// ── tree node ─────────────────────────────────────────────────────────────
// Each node represents a subarray call: quicksort(s, l, h)
// node.indices = the GLOBAL indices this call is responsible for
// node.values  = current values at those indices (mutated as we go)

let _uid = 0;
function makeNode(globalArr, indices, depth) {
  return {
    id: _uid++,
    origValues: indices.map(i => globalArr[i]),
    values:     indices.map(i => globalArr[i]),
    indices,
    depth,
    left:  null,   // filled in during step generation
    right: null,
  };
}

// ── step generator ────────────────────────────────────────────────────────
function generateSteps(initArray) {
  const list     = [];
  const allNodes = new Map();

  // Working copy of the array — mutated in place like the real algorithm
  const arr = [...initArray];

  const visible  = new Set();
  const nStates  = new Map();
  const bColors  = new Map();
  const nValues  = new Map();

  function snap(label, extraStats = {}) {
    list.push({
      visibleIds:  new Set(visible),
      nodeStates:  new Map(nStates),
      blockColors: new Map(bColors),
      nodeValues:  new Map(Array.from(nValues.entries()).map(([k, v]) => [k, [...v]])),
      label,
      ...extraStats,
    });
  }

  function registerNode(node) {
    allNodes.set(node.id, node);
    visible.add(node.id);
    nStates.set(node.id, 'idle');
    bColors.set(node.id, null);
    nValues.set(node.id, [...node.values]);
  }

  // Pre-build the entire tree structure first (needed for layout)
  // We do this with a dry-run to know where pivots land, then we'll
  // build nodes as we go during step generation. Instead we build
  // a skeleton: just build the node tree structure up-front.

  // Actually we build nodes lazily during quicksort execution so
  // we capture the real partition indices.

  function quicksort(node, l, h, depth) {
    if (depth > maxDepth) maxDepth = depth;

    if (l > h) {
      // Empty subarray — mark immediately sorted
      nStates.set(node.id, 'sorted');
      bColors.set(node.id, []);
      nValues.set(node.id, []);
      snap(`Empty subarray — nothing to sort`, { depth: maxDepth });
      return;
    }

    if (l === h) {
      // Single element — base case
      nStates.set(node.id, 'active');
      nValues.set(node.id, [arr[l]]);
      snap(`[${arr[l]}] — single element, already sorted`, { depth: maxDepth });
      nStates.set(node.id, 'sorted');
      snap(`[${arr[l]}] ✓`, { depth: maxDepth });
      return;
    }

    // ── SHOW THIS SUBARRAY AS ACTIVE ──────────────────────────────────────
    const subVals = arr.slice(l, h + 1);
    nValues.set(node.id, [...subVals]);
    nStates.set(node.id, 'active');
    snap(`Partitioning [${subVals.join(', ')}] — pivot = ${arr[h]} (last element)`, { depth: maxDepth });

    // ── PARTITION ─────────────────────────────────────────────────────────
    const pivotIdx = h;
    let firsthigh  = l;

    // Highlight pivot
    const showPivot = () => {
      const colors = arr.slice(l, h + 1).map((_, ri) => {
        const gi = l + ri; // global index
        if (gi === pivotIdx)  return 'pivot';
        if (gi === firsthigh) return 'firsthigh';
        if (gi < firsthigh)   return 'placed';
        return 'active';
      });
      nValues.set(node.id, arr.slice(l, h + 1));
      bColors.set(node.id, colors);
    };

    showPivot();
    snap(`Pivot = ${arr[pivotIdx]} (index ${pivotIdx - l} from left, firsthigh = 0)`, { depth: maxDepth });

    for (let i = l; i < h; i++) {
      cmpCount++;
      // Highlight scanner at i
      const colorsI = arr.slice(l, h + 1).map((_, ri) => {
        const gi = l + ri;
        if (gi === pivotIdx)  return 'pivot';
        if (gi === i)         return 'scanner';
        if (gi === firsthigh) return 'firsthigh';
        if (gi < firsthigh)   return 'placed';
        return 'active';
      });
      nValues.set(node.id, arr.slice(l, h + 1));
      bColors.set(node.id, colorsI);
      snap(`Compare s[${i - l}]=${arr[i]} < pivot(${arr[pivotIdx]})? ${arr[i] < arr[pivotIdx] ? 'YES — swap with firsthigh' : 'NO — skip'}`,
           { cmp: cmpCount, depth: maxDepth });

      if (arr[i] < arr[pivotIdx]) {
        // swap(arr[i], arr[firsthigh])
        [arr[i], arr[firsthigh]] = [arr[firsthigh], arr[i]];
        swapCount++;

        // Highlight the swap
        const colorsSwap = arr.slice(l, h + 1).map((_, ri) => {
          const gi = l + ri;
          if (gi === pivotIdx)  return 'pivot';
          if (gi === firsthigh) return 'winner';
          if (gi === i)         return 'active';
          if (gi < firsthigh)   return 'placed';
          return 'active';
        });
        nValues.set(node.id, arr.slice(l, h + 1));
        bColors.set(node.id, colorsSwap);
        snap(`Swapped → ${arr[firsthigh]} moves left of firsthigh`, { cmp: cmpCount, swaps: swapCount, depth: maxDepth });

        firsthigh++;
        showPivot();
        snap(`firsthigh advances to position ${firsthigh - l}`, { cmp: cmpCount, swaps: swapCount, depth: maxDepth });
      }
    }

    // Final pivot swap: place pivot at firsthigh
    [arr[pivotIdx], arr[firsthigh]] = [arr[firsthigh], arr[pivotIdx]];
    swapCount++;

    const pivotFinal = firsthigh; // pivot's final global index

    const colorsFinal = arr.slice(l, h + 1).map((_, ri) => {
      const gi = l + ri;
      if (gi === pivotFinal) return 'inplace';
      if (gi < pivotFinal)   return 'placed';
      return 'active';
    });
    nValues.set(node.id, arr.slice(l, h + 1));
    bColors.set(node.id, colorsFinal);
    snap(`Pivot ${arr[pivotFinal]} swapped to position ${pivotFinal - l} — its final place!`,
         { cmp: cmpCount, swaps: swapCount, depth: maxDepth });

    // Mark pivot as permanently sorted
    const colorsPivot = arr.slice(l, h + 1).map((_, ri) => {
      const gi = l + ri;
      if (gi === pivotFinal) return 'sorted';
      if (gi < pivotFinal)   return 'placed';
      return 'active';
    });
    bColors.set(node.id, colorsPivot);
    snap(`Pivot ${arr[pivotFinal]} is now in its FINAL sorted position ✓`,
         { cmp: cmpCount, swaps: swapCount, depth: maxDepth });

    // ── RECURSE: build child nodes ─────────────────────────────────────────
    const leftIndices  = [];
    for (let k = l; k < pivotFinal; k++) leftIndices.push(k);

    const rightIndices = [];
    for (let k = pivotFinal + 1; k <= h; k++) rightIndices.push(k);

    const leftNode  = makeNode(arr, leftIndices,  depth + 1);
    const rightNode = makeNode(arr, rightIndices, depth + 1);

    node.left  = leftNode;
    node.right = rightNode;

    registerNode(leftNode);
    registerNode(rightNode);

    // Show split into children
    nStates.set(node.id, 'done');
    nValues.set(leftNode.id,  leftIndices.map(i => arr[i]));
    nValues.set(rightNode.id, rightIndices.map(i => arr[i]));
    bColors.set(leftNode.id,  null);
    bColors.set(rightNode.id, null);

    snap(`Split: left [${leftIndices.map(i=>arr[i]).join(', ')||'∅'}]  pivot=${arr[pivotFinal]}  right [${rightIndices.map(i=>arr[i]).join(', ')||'∅'}]`,
         { cmp: cmpCount, swaps: swapCount, depth: maxDepth });

    // ── RECURSE LEFT ──────────────────────────────────────────────────────
    quicksort(leftNode,  l,             pivotFinal - 1, depth + 1);

    // ── RECURSE RIGHT ─────────────────────────────────────────────────────
    quicksort(rightNode, pivotFinal + 1, h,             depth + 1);

    // ── DONE: mark whole subarray sorted ─────────────────────────────────
    const fullSorted = arr.slice(l, h + 1);
    nValues.set(node.id, [...fullSorted]);
    bColors.set(node.id, fullSorted.map(() => 'sorted'));
    nStates.set(node.id, 'sorted');
    nStates.set(leftNode.id,  'done');
    nStates.set(rightNode.id, 'done');
    if (leftNode.left)  nStates.set(leftNode.left.id,  'done');
    if (leftNode.right) nStates.set(leftNode.right.id, 'done');
    if (rightNode.left) nStates.set(rightNode.left.id, 'done');
    if (rightNode.right)nStates.set(rightNode.right.id,'done');

    snap(`Subarray [${fullSorted.join(', ')}] fully sorted ✓`,
         { cmp: cmpCount, swaps: swapCount, depth: maxDepth });
  }

  // Seed root node
  const rootIndices = arr.map((_, i) => i);
  const root = makeNode(arr, rootIndices, 0);
  registerNode(root);

  // Step 0: show unsorted array
  nValues.set(root.id, [...arr]);
  snap('Array ready — click Solve to begin');

  quicksort(root, 0, arr.length - 1, 0);

  // Final all-sorted
  nValues.set(root.id, [...arr]);
  bColors.set(root.id, arr.map(() => 'sorted'));
  nStates.set(root.id, 'sorted');
  snap('Array fully sorted! ✓', { cmp: cmpCount, swaps: swapCount, depth: maxDepth });

  return { list, root, allNodes };
}

// ── layout ────────────────────────────────────────────────────────────────
function treeDepthOf(node) {
  if (!node) return 0;
  return 1 + Math.max(treeDepthOf(node.left), treeDepthOf(node.right));
}

function layoutTree(root, W, H) {
  const depth   = treeDepthOf(root);
  const TOP_PAD = 24, BOT_PAD = 16;
  const n       = root.origValues.length;
  const BASE_W  = Math.max(22, Math.min(52, (W * 0.86) / (n * 1.28)));
  const levelH  = (H - TOP_PAD - BOT_PAD) / Math.max(depth, 1);

  const levels = [];
  let cur = [root];
  while (cur.length) {
    levels.push(cur);
    const nxt = [];
    cur.forEach(nd => {
      if (nd.left)  nxt.push(nd.left);
      if (nd.right) nxt.push(nd.right);
    });
    cur = nxt;
  }

  levels.forEach((levelNodes, li) => {
    const scale = Math.max(0.52, 1 - li * 0.09);
    const bW    = BASE_W * scale;
    const bH    = bW;
    const bGap  = Math.max(3, bW * 0.20);
    const y     = TOP_PAD + li * levelH;

    const nodeWidths = levelNodes.map(nd =>
      Math.max(1, nd.origValues.length) * bW +
      Math.max(0, nd.origValues.length - 1) * bGap
    );
    const totalNodeW = nodeWidths.reduce((s, w) => s + w, 0);
    const padding    = W * 0.06;
    const free       = W - 2 * padding - totalNodeW;
    const nodeGap    = levelNodes.length > 1 ? free / (levelNodes.length - 1) : 0;

    let cx = padding;
    levelNodes.forEach((nd, ni) => {
      const gW   = nodeWidths[ni];
      nd._cx     = cx + gW / 2;
      nd._y      = y;
      nd._bW     = bW;
      nd._bH     = bH;
      nd._groupX = cx;
      nd._bGap   = bGap;
      cx += gW + Math.max(12, nodeGap);
    });
  });

  return { levels };
}

// ── draw helpers ──────────────────────────────────────────────────────────
function blockMetrics(n, W) {
  const rawW   = (W * 0.88) / (n * 1.25);
  const blockW = Math.max(28, Math.min(64, rawW));
  const gap    = blockW * 0.22;
  return { blockW, blockH: blockW, gap,
           startX: (W - (n * blockW + (n - 1) * gap)) / 2 };
}

function drawBlock(x, y, w, h, val, colorKey) {
  const c = COLORS[colorKey] || COLORS.idle;
  const r = Math.max(3, w * 0.14);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.13)';
  ctx.shadowBlur  = 6; ctx.shadowOffsetY = 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = c.fill; ctx.fill();
  ctx.restore();

  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  ctx.strokeStyle = c.stroke; ctx.lineWidth = 1.5; ctx.stroke();

  const fs = Math.max(7, Math.min(13, w * 0.36));
  ctx.fillStyle = c.text;
  ctx.font = `bold ${fs}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(val, x + w / 2, y + h / 2);
}

function drawConnectors(levels, visibleIds, nodeStates) {
  ctx.save();
  ctx.setLineDash([4, 4]);
  for (let li = 0; li < levels.length - 1; li++) {
    levels[li].forEach(parent => {
      [parent.left, parent.right].forEach(child => {
        if (!child) return;
        if (!visibleIds.has(parent.id) || !visibleIds.has(child.id)) return;

        const ps    = nodeStates.get(parent.id);
        const alpha = (ps === 'done') ? 0.10 : 0.28;
        ctx.strokeStyle = `rgba(139,92,246,${alpha})`;
        ctx.lineWidth   = 1.5;

        const x1 = parent._cx, y1 = parent._y + parent._bH + 4;
        const x2 = child._cx,  y2 = child._y  - 4;
        const m  = (y2 - y1) * 0.42;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(x1, y1 + m, x2, y2 - m, x2, y2);
        ctx.stroke();
      });
    });
  }
  ctx.restore();
}

function draw() {
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (array.length === 0) return;

  if (!treeRoot) {
    const { blockW, blockH, gap, startX } = blockMetrics(array.length, W);
    array.forEach((val, i) =>
      drawBlock(startX + i * (blockW + gap), 28, blockW, blockH, val, 'idle')
    );
    return;
  }

  const { levels } = layoutTree(treeRoot, W, H);
  const step       = steps[stepIndex] || steps[0];
  if (!step) return;

  const { visibleIds, nodeStates, blockColors, nodeValues } = step;

  drawConnectors(levels, visibleIds, nodeStates);

  levels.forEach(levelNodes => {
    levelNodes.forEach(nd => {
      if (!visibleIds.has(nd.id)) return;

      const vals   = nodeValues.get(nd.id) || nd.origValues;
      const bcArr  = blockColors.get(nd.id);
      const defKey = nodeStates.get(nd.id) || 'idle';

      if (vals.length === 0) {
        // Empty subarray — draw a small ∅ placeholder
        const x = nd._groupX, y = nd._y;
        const sz = nd._bW || 24;
        ctx.save();
        ctx.font = `bold ${Math.max(10, sz * 0.4)}px 'Segoe UI', sans-serif`;
        ctx.fillStyle = 'rgba(139,92,246,0.4)';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('∅', x + sz / 2, y + sz / 2);
        ctx.restore();
        return;
      }

      vals.forEach((val, vi) => {
        const colorKey = (bcArr && bcArr[vi] != null) ? bcArr[vi] : defKey;
        const x = nd._groupX + vi * (nd._bW + nd._bGap);
        drawBlock(x, nd._y, nd._bW, nd._bH, val, colorKey);
      });
    });
  });
}

// ── animation ─────────────────────────────────────────────────────────────
function applyStep(idx) {
  stepIndex = Math.max(0, Math.min(idx, steps.length - 1));
  const step = steps[stepIndex];

  statStatus.textContent = step.label;
  if (step.cmp   !== undefined) statCmp.textContent   = step.cmp;
  if (step.swaps !== undefined) statSwaps.textContent = step.swaps;
  if (step.depth !== undefined) statDepth.textContent = step.depth;

  btnPrev.disabled = stepIndex <= 0;
  btnNext.disabled = stepIndex >= steps.length - 1;
  draw();
}

function autoPlay() {
  if (stepIndex >= steps.length - 1) { setMode('done'); return; }
  applyStep(stepIndex + 1);
  animTimer = setTimeout(autoPlay, stepDelay());
}

function stopAnim() {
  if (animTimer) { clearTimeout(animTimer); animTimer = null; }
}

// ── UI mode ───────────────────────────────────────────────────────────────
function setMode(mode) {
  uiMode = mode;
  btnSolve.textContent = (mode === 'playing') ? '⏸ Pause' : '▶ Solve';
  btnShuffle.disabled  = (mode === 'playing');
  btnReverse.disabled  = (mode === 'playing');
  sliderN.disabled     = (mode === 'playing');

  const showStep = ['stepwise','paused','done'].includes(mode);
  btnPrev.style.display = showStep ? 'block' : 'none';
  btnNext.style.display = showStep ? 'block' : 'none';
  if (showStep) {
    btnPrev.disabled = stepIndex <= 0;
    btnNext.disabled = stepIndex >= steps.length - 1;
  }
  if (mode === 'done') statStatus.textContent = 'Fully sorted ✓';
}

// ── reset ─────────────────────────────────────────────────────────────────
function resetState() {
  stopAnim();
  treeRoot  = null;
  steps     = [];
  stepIndex = -1;
  _uid      = 0;
  cmpCount  = 0;
  swapCount = 0;
  maxDepth  = 0;
  statCmp.textContent    = '0';
  statSwaps.textContent  = '0';
  statDepth.textContent  = '0';
  statStatus.textContent = 'Ready';
  setMode('idle');
}

function resizeCanvas() {
  const vis = document.getElementById('visualizer');
  canvas.width  = vis.clientWidth;
  canvas.height = vis.clientHeight;
  draw();
}

// ── events ────────────────────────────────────────────────────────────────
sliderN.addEventListener('input', () => {
  resetState();
  const n = parseInt(sliderN.value);
  valN.textContent = n;
  array = freshArray(n);
  draw();
});

sliderSpeed.addEventListener('input', () => {
  valSpeed.textContent = sliderSpeed.value + '×';
});

btnShuffle.addEventListener('click', () => {
  resetState();
  array = shuffleArr(array);
  draw();
});

btnReverse.addEventListener('click', () => {
  resetState();
  array = reverseArr(array);
  draw();
});

btnReset.addEventListener('click', () => {
  resetState();
  array = freshArray(parseInt(sliderN.value));
  valN.textContent = sliderN.value;
  draw();
});

btnSolve.addEventListener('click', () => {
  if (uiMode === 'playing') {
    stopAnim();
    setMode(chkStep.checked ? 'stepwise' : 'paused');
    statStatus.textContent = 'Paused';
    return;
  }

  if (!treeRoot) {
    _uid      = 0;
    cmpCount  = 0;
    swapCount = 0;
    maxDepth  = 0;
    const result = generateSteps([...array]);
    treeRoot  = result.root;
    steps     = result.list;
    stepIndex = 0;
    statDepth.textContent = maxDepth;
  }

  if (chkStep.checked) {
    if (stepIndex < steps.length - 1) applyStep(stepIndex + 1);
    setMode('stepwise');
  } else {
    setMode('playing');
    autoPlay();
  }
});

btnPrev.addEventListener('click', () => {
  if (stepIndex > 0) applyStep(stepIndex - 1);
  setMode(chkStep.checked ? 'stepwise' : 'paused');
});

btnNext.addEventListener('click', () => {
  if (stepIndex < steps.length - 1) {
    applyStep(stepIndex + 1);
    setMode(chkStep.checked ? 'stepwise' : 'paused');
  } else {
    setMode('done');
  }
});

chkStep.addEventListener('change', () => {
  if (chkStep.checked && uiMode === 'playing') {
    stopAnim();
    setMode('stepwise');
  }
});

window.addEventListener('resize', resizeCanvas);

// ── boot ──────────────────────────────────────────────────────────────────
sliderN.value        = 8;
sliderSpeed.value    = 10;
valSpeed.textContent = '10×';
valN.textContent     = '8';
array = freshArray(8);
resizeCanvas();