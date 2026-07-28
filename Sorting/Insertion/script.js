// ── insertion-sort.js — algorithm-specific code only ───────────────────────

const COLOR = {
  default:   '#8b5cf6',
  sorted:    '#22c55e',
  outer:     '#f59e0b',
  comparing: '#60a5fa',
  neighbor:  '#ef4444',
};

let sortedUpTo = -1;
let iPointer   = -1;
let jPointer   = -1;

// ── required by Sort.js ────────────────────────────────────────────────────
function getBarColor(idx) {
  if (idx === jPointer)                            return COLOR.comparing;
  if (idx === jPointer - 1)                        return COLOR.neighbor;
  if (idx === iPointer && jPointer === -1)         return COLOR.outer;
  if (idx <= sortedUpTo)                           return COLOR.sorted;
  return COLOR.default;
}

function resetLocalState() {
  sortedUpTo = -1;
  iPointer   = -1;
  jPointer   = -1;
}

function markAllSorted() {
  sortedUpTo = array.length - 1;
  iPointer   = -1;
  jPointer   = -1;
}

// ── animated sort ──────────────────────────────────────────────────────────
async function* insertionSortGen() {
  const s   = array;
  const len = s.length;

  for (let i = 1; i < len; i++) {
    iPointer = i; jPointer = i; sortedUpTo = i - 1;
    updateStats('Sorting…');
    draw(); yield;

    let j = i;
    while (j > 0) {
      jPointer = j; comparisons++;
      updateStats('Sorting…');
      draw(); yield;

      if (s[j] < s[j - 1]) {
        [s[j], s[j - 1]] = [s[j - 1], s[j]];
        swaps++; j--;
        draw(); yield;
      } else {
        break;
      }
    }

    sortedUpTo = i; jPointer = -1; iPointer = -1;
    draw(); yield;
  }

  sortedUpTo = array.length - 1;
}

async function runSort() {
  running = true;
  setButtons(true);
  updateStats('Sorting…');
  const gen = insertionSortGen();
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
  let st = -1, ip = -1, jp = -1, cmp = 0, sw = 0;

  const snap = (status) => stepHistory.push({
    array: [...s], sortedUpTo: st,
    iPointer: ip, jPointer: jp,
    comparisons: cmp, swaps: sw, status,
  });

  snap('Ready — press Next Step to begin');

  for (let i = 1; i < len; i++) {
    ip = i; jp = i; st = i - 1;
    snap(`Outer i=${i}: picking up value ${s[i]} to insert`);

    let j = i;
    while (j > 0) {
      jp = j; cmp++;
      snap(`Comparing s[${j}]=${s[j]} with s[${j-1}]=${s[j-1]}`);
      if (s[j] < s[j - 1]) {
        snap(`s[${j}]=${s[j]} < s[${j-1}]=${s[j-1]} — swapping`);
        [s[j], s[j - 1]] = [s[j - 1], s[j]];
        sw++; j--;
      } else {
        snap(`s[${j}]=${s[j]} ≥ s[${j-1}]=${s[j-1]} — element in place, stopping`);
        break;
      }
    }

    st = i; ip = -1; jp = -1;
    snap(`Index 0..${i} sorted ✓`);
  }

  st = len - 1;
  snap('Done ✓ — array fully sorted!');
}

function applySnapshot(snap) {
  array       = [...snap.array];
  sortedUpTo  = snap.sortedUpTo;
  iPointer    = snap.iPointer;
  jPointer    = snap.jPointer;
  comparisons = snap.comparisons;
  swaps       = snap.swaps;
  updateStats(snap.status);
  draw();
}