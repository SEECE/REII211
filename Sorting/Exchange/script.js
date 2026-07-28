// ── exchange-sort.js — algorithm-specific code only ────────────────────────

const COLOR = {
  default:   '#8b5cf6',
  sorted:    '#22c55e',
  swapping:  '#ef4444',
  comparing: '#60a5fa',
  outer:     '#f59e0b',
};

let sortedUpTo = -1;
let aPointer   = -1;
let bPointer   = -1;
let swapping   = false;

// ── required by Sort.js ────────────────────────────────────────────────────
function getBarColor(idx) {
  if (idx <= sortedUpTo) return COLOR.sorted;
  if (swapping && (idx === aPointer || idx === bPointer)) return COLOR.swapping;
  if (idx === aPointer)  return COLOR.outer;
  if (idx === bPointer)  return COLOR.comparing;
  return COLOR.default;
}

function resetLocalState() {
  sortedUpTo = -1;
  aPointer   = -1;
  bPointer   = -1;
  swapping   = false;
}

function markAllSorted() {
  sortedUpTo = array.length - 1;
  aPointer   = -1;
  bPointer   = -1;
  swapping   = false;
}

// ── animated sort ──────────────────────────────────────────────────────────
async function* exchangeSortGen() {
  const s   = array;
  const len = s.length;

  for (let a = 0; a < len - 1; a++) {
    aPointer = a;
    for (let b = a + 1; b < len; b++) {
      bPointer = b; swapping = false;
      comparisons++;
      updateStats(`a=${a}, b=${b} — comparing`);
      draw(); yield;

      if (s[a] > s[b]) {
        swapping = true;
        draw(); yield;
        [s[a], s[b]] = [s[b], s[a]];
        swaps++;
        swapping = false;
        draw(); yield;
      }
    }

    bPointer = -1; swapping = false;
    sortedUpTo = a;
    draw(); yield;
  }

  aPointer = -1; bPointer = -1; swapping = false;
  sortedUpTo = array.length - 1;
}

async function runSort() {
  running = true;
  setButtons(true);
  updateStats('Sorting…');
  const gen = exchangeSortGen();
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
  let su = -1, ap = -1, bp = -1, sw_ = false, cmp = 0, swc = 0;

  const snap = (status) => stepHistory.push({
    array: [...s], sortedUpTo: su,
    aPointer: ap, bPointer: bp, swapping: sw_,
    comparisons: cmp, swaps: swc, status,
  });

  snap('Ready — press Next Step to begin');

  for (let a = 0; a < len - 1; a++) {
    ap = a; bp = -1; sw_ = false;
    snap(`Outer a=${a}: comparing arr[${a}] against every b from ${a+1} to ${len-1}`);

    for (let b = a + 1; b < len; b++) {
      bp = b; sw_ = false; cmp++;
      snap(`Comparing arr[${a}]=${s[a]} vs arr[${b}]=${s[b]}`);
      if (s[a] > s[b]) {
        sw_ = true;
        snap(`arr[${a}]=${s[a]} > arr[${b}]=${s[b]} — swapping!`);
        [s[a], s[b]] = [s[b], s[a]];
        swc++; sw_ = false;
        snap(`Swapped ✓ — arr[${a}]=${s[a]}, arr[${b}]=${s[b]}`);
      }
    }

    bp = -1; sw_ = false; su = a;
    snap(`Pass a=${a} done — index ${a} (value ${s[a]}) is sorted ✓`);
  }

  su = len - 1;
  snap('Done ✓ — array fully sorted!');
}

function applySnapshot(snap) {
  array       = [...snap.array];
  sortedUpTo  = snap.sortedUpTo;
  aPointer    = snap.aPointer;
  bPointer    = snap.bPointer;
  swapping    = snap.swapping;
  comparisons = snap.comparisons;
  swaps       = snap.swaps;
  updateStats(snap.status);
  draw();
}