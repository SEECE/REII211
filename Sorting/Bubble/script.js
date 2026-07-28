// ── bubble-sort.js — algorithm-specific code only ──────────────────────────

const COLOR = {
  default:   '#8b5cf6',
  sorted:    '#22c55e',
  swapping:  '#ef4444',
  comparing: '#60a5fa',
  j1:        '#f59e0b',
};

let sortedFrom = Infinity;
let jPointer   = -1;
let j1Pointer  = -1;
let swapping   = false;

// ── required by Sort.js ────────────────────────────────────────────────────
function getBarColor(idx) {
  if (idx >= sortedFrom) return COLOR.sorted;
  if (swapping && (idx === jPointer || idx === j1Pointer)) return COLOR.swapping;
  if (idx === jPointer)  return COLOR.comparing;
  if (idx === j1Pointer) return COLOR.j1;
  return COLOR.default;
}

function resetLocalState() {
  sortedFrom = Infinity;
  jPointer   = -1;
  j1Pointer  = -1;
  swapping   = false;
}

function markAllSorted() {
  sortedFrom = 0;
  jPointer   = -1;
  j1Pointer  = -1;
  swapping   = false;
}

// ── animated sort ──────────────────────────────────────────────────────────
async function* bubbleSortGen() {
  const s   = array;
  const len = s.length;

  for (let i = 0; i < len; i++) {
    let swappedThisPass = false;

    for (let j = 0; j < len - i - 1; j++) {
      jPointer  = j;
      j1Pointer = j + 1;
      swapping  = false;
      comparisons++;
      updateStats(`Pass ${i} — comparing [${j}] vs [${j+1}]`);
      draw(); yield;

      if (s[j] > s[j + 1]) {
        swapping = true;
        draw(); yield;
        [s[j], s[j + 1]] = [s[j + 1], s[j]];
        swaps++;
        swappedThisPass = true;
        swapping = false;
        draw(); yield;
      }
    }

    jPointer = -1; j1Pointer = -1; swapping = false;
    sortedFrom = len - i - 1;
    draw(); yield;

    if (!swappedThisPass) { sortedFrom = 0; break; }
  }

  jPointer = -1; j1Pointer = -1; swapping = false; sortedFrom = 0;
}

async function runSort() {
  running = true;
  setButtons(true);
  updateStats('Sorting…');
  const gen = bubbleSortGen();
  const delay = () => new Promise(res => setTimeout(res, getDelay()));
  let result = gen.next();
  while (!result.done) {
    if (!running) break;
    draw();
    await delay();
    result = gen.next();
  }
  if (running) finishSort();
}

// ── stepwise ──────────────────────────────────────────────────────────────
function buildStepHistory() {
  const s   = [...array];
  const len = s.length;
  stepHistory = [];
  let sf = Infinity, jp = -1, j1p = -1, sw_ = false, cmp = 0, swc = 0;

  const snap = (status) => stepHistory.push({
    array: [...s], sortedFrom: sf,
    jPointer: jp, j1Pointer: j1p, swapping: sw_,
    comparisons: cmp, swaps: swc, status,
  });

  snap('Ready — press Next Step to begin');

  for (let i = 0; i < len; i++) {
    let swappedThisPass = false;
    jp = -1; j1p = -1; sw_ = false;
    snap(`Pass i=${i}: bubbling through indices 0 → ${len - i - 1}`);

    for (let j = 0; j < len - i - 1; j++) {
      jp = j; j1p = j + 1; sw_ = false; cmp++;
      snap(`Comparing s[${j}]=${s[j]} vs s[${j+1}]=${s[j+1]}`);
      if (s[j] > s[j + 1]) {
        sw_ = true;
        snap(`s[${j}]=${s[j]} > s[${j+1}]=${s[j+1]} — swapping!`);
        [s[j], s[j + 1]] = [s[j + 1], s[j]];
        swc++; swappedThisPass = true; sw_ = false;
        snap(`Swapped ✓ — s[${j}]=${s[j]}, s[${j+1}]=${s[j+1]}`);
      }
    }

    jp = -1; j1p = -1; sw_ = false;
    sf = len - i - 1;
    snap(`Pass ${i} done — index ${len - i - 1} (value ${s[len - i - 1]}) is sorted ✓`);

    if (!swappedThisPass) {
      sf = 0;
      snap('No swaps this pass — array is fully sorted! Early exit ✓');
      break;
    }
  }

  sf = 0;
  snap('Done ✓ — array fully sorted!');
}

function applySnapshot(snap) {
  array       = [...snap.array];
  sortedFrom  = snap.sortedFrom;
  jPointer    = snap.jPointer;
  j1Pointer   = snap.j1Pointer;
  swapping    = snap.swapping;
  comparisons = snap.comparisons;
  swaps       = snap.swaps;
  updateStats(snap.status);
  draw();
}