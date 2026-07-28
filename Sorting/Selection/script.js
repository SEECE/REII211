// ── selection-sort.js — algorithm-specific code only ───────────────────────

const COLOR = {
  default:   '#8b5cf6',
  sorted:    '#22c55e',
  minimum:   '#ef4444',
  comparing: '#60a5fa',
  outer:     '#f59e0b',
};

let sortedUpTo = -1;
let iPointer   = -1;
let jPointer   = -1;
let minPointer = -1;

// ── required by Sort.js ────────────────────────────────────────────────────
function getBarColor(idx) {
  if (idx <= sortedUpTo)  return COLOR.sorted;
  if (idx === iPointer)   return COLOR.outer;
  if (idx === minPointer) return COLOR.minimum;
  if (idx === jPointer)   return COLOR.comparing;
  return COLOR.default;
}

function resetLocalState() {
  sortedUpTo = -1;
  iPointer   = -1;
  jPointer   = -1;
  minPointer = -1;
}

function markAllSorted() {
  sortedUpTo = array.length - 1;
  iPointer   = -1;
  jPointer   = -1;
  minPointer = -1;
}

// ── animated sort ──────────────────────────────────────────────────────────
async function* selectionSortGen() {
  const s   = array;
  const len = s.length;

  for (let i = 0; i < len; i++) {
    iPointer = i; minPointer = i;

    for (let j = i + 1; j < len; j++) {
      jPointer = j; comparisons++;
      updateStats('Sorting…');
      draw(); yield;

      if (s[j] < s[minPointer]) {
        minPointer = j;
        draw(); yield;
      }
    }

    if (minPointer !== i) {
      [s[i], s[minPointer]] = [s[minPointer], s[i]];
      swaps++;
    }
    sortedUpTo = i; jPointer = -1; minPointer = -1;
    draw(); yield;
  }

  iPointer = -1; sortedUpTo = len - 1;
}

async function runSort() {
  running = true;
  setButtons(true);
  updateStats('Sorting…');
  const gen = selectionSortGen();
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
  let st = -1, ip = -1, jp = -1, mp = -1, cmp = 0, sw = 0;

  const snap = (status) => stepHistory.push({
    array: [...s], sortedUpTo: st,
    iPointer: ip, jPointer: jp, minPointer: mp,
    comparisons: cmp, swaps: sw, status,
  });

  snap('Ready — press Next Step to begin');

  for (let i = 0; i < len; i++) {
    ip = i; mp = i; jp = -1;
    snap(`Outer i=${i}: scanning for minimum starting at value ${s[i]}`);

    for (let j = i + 1; j < len; j++) {
      jp = j; cmp++;
      snap(`Comparing s[${j}]=${s[j]} vs current min s[${mp}]=${s[mp]}`);
      if (s[j] < s[mp]) {
        mp = j;
        snap(`New minimum! s[${mp}]=${s[mp]} at index ${mp}`);
      }
    }

    if (mp !== i) {
      snap(`Swapping s[${i}]=${s[i]} ↔ s[${mp}]=${s[mp]}`);
      [s[i], s[mp]] = [s[mp], s[i]];
      sw++;
    }

    st = i; ip = -1; jp = -1; mp = -1;
    snap(`Index ${i} sorted ✓ (value ${s[i]})`);
  }

  st = len - 1;
  snap('Done ✓ — array fully sorted!');
}

function applySnapshot(snap) {
  array       = [...snap.array];
  sortedUpTo  = snap.sortedUpTo;
  iPointer    = snap.iPointer;
  jPointer    = snap.jPointer;
  minPointer  = snap.minPointer;
  comparisons = snap.comparisons;
  swaps       = snap.swaps;
  updateStats(snap.status);
  draw();
}