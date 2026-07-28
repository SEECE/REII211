// ── quick-sort-bars.js — algorithm-specific code only ──────────────────────

const COLOR = {
  default:   '#8b5cf6',  // unsorted — purple
  sorted:    '#22c55e',  // final position — green
  pivot:     '#a855f7',  // pivot element — violet
  scanner:   '#38bdf8',  // i pointer — sky blue
  firsthigh: '#f472b6',  // firsthigh boundary — pink
  placed:    '#2dd4bf',  // confirmed < pivot — teal
  winner:    '#4ade80',  // just swapped — light green
};

let sortedSet  = new Set();  // indices confirmed in final position
let pivotIdx   = -1;
let scannerIdx = -1;
let fhIdx      = -1;         // firsthigh
let winnerIdx  = -1;         // just-swapped highlight (brief)

// ── required by Sort.js ────────────────────────────────────────────────────
function getBarColor(idx) {
  if (sortedSet.has(idx))  return COLOR.sorted;
  if (idx === winnerIdx)   return COLOR.winner;
  if (idx === pivotIdx)    return COLOR.pivot;
  if (idx === scannerIdx)  return COLOR.scanner;
  if (idx === fhIdx)       return COLOR.firsthigh;
  // everything left of firsthigh that isn't a pointer is confirmed < pivot
  if (fhIdx !== -1 && pivotIdx !== -1 && idx >= array.indexOf(array[pivotIdx]) && false) return COLOR.placed;
  return COLOR.default;
}

function resetLocalState() {
  sortedSet  = new Set();
  pivotIdx   = -1;
  scannerIdx = -1;
  fhIdx      = -1;
  winnerIdx  = -1;
}

function markAllSorted() {
  for (let i = 0; i < array.length; i++) sortedSet.add(i);
  pivotIdx = scannerIdx = fhIdx = winnerIdx = -1;
}

// ── partition (mirrors the pseudocode exactly) ─────────────────────────────
//   p = h  (pivot = last element)
//   firsthigh = l
//   for i = l to h-1:
//     if s[i] < s[p]: swap(s[i], s[firsthigh]); firsthigh++
//   swap(s[p], s[firsthigh])
//   return firsthigh

async function* quickSortGen() {
  const s   = array;
  const len = s.length;

  // iterative quicksort using an explicit stack so the generator yields cleanly
  const stack = [[0, len - 1]];

  while (stack.length) {
    const [l, h] = stack.pop();
    if (l >= h) {
      // single element or empty — mark sorted immediately
      if (l === h) sortedSet.add(l);
      draw(); yield;
      continue;
    }

    // ── partition ──────────────────────────────────────────────────────────
    const p         = h;           // pivot index
    let   firsthigh = l;

    pivotIdx   = p;
    fhIdx      = firsthigh;
    scannerIdx = -1;
    winnerIdx  = -1;
    updateStats(`Partitioning [${l}…${h}] — pivot = ${s[p]}`);
    draw(); yield;

    for (let i = l; i < h; i++) {
      scannerIdx = i;
      fhIdx      = firsthigh;
      comparisons++;
      updateStats(`s[${i}]=${s[i]} < pivot(${s[p]})? ${s[i] < s[p] ? 'YES' : 'NO'}`);
      draw(); yield;

      if (s[i] < s[p]) {
        // swap s[i] and s[firsthigh]
        winnerIdx = firsthigh;
        [s[i], s[firsthigh]] = [s[firsthigh], s[i]];
        swaps++;
        draw(); yield;

        firsthigh++;
        fhIdx     = firsthigh;
        winnerIdx = -1;
        draw(); yield;
      }
    }

    // place pivot at firsthigh
    scannerIdx = -1;
    winnerIdx  = firsthigh;
    [s[p], s[firsthigh]] = [s[firsthigh], s[p]];
    swaps++;
    pivotIdx = firsthigh;         // pivot is now at its final index
    fhIdx    = -1;
    updateStats(`Pivot ${s[firsthigh]} placed at index ${firsthigh} ✓`);
    draw(); yield;

    // pivot is sorted
    sortedSet.add(firsthigh);
    winnerIdx = -1;
    pivotIdx  = -1;
    draw(); yield;

    // push subarrays — push right first so left is processed first
    stack.push([firsthigh + 1, h]);
    stack.push([l, firsthigh - 1]);
  }

  scannerIdx = pivotIdx = fhIdx = winnerIdx = -1;
}

async function runSort() {
  running = true;
  setButtons(true);
  updateStats('Sorting…');
  const gen = quickSortGen();
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
  let cmp = 0, swc = 0;
  const ss = new Set();

  function snap(status, pi, si, fh, wi) {
    stepHistory.push({
      array:      [...s],
      sortedSet:  new Set(ss),
      pivotIdx:   pi,
      scannerIdx: si,
      fhIdx:      fh,
      winnerIdx:  wi,
      comparisons: cmp,
      swaps:       swc,
      status,
    });
  }

  snap('Ready — press Next Step to begin', -1, -1, -1, -1);

  const stack = [[0, len - 1]];

  while (stack.length) {
    const [l, h] = stack.pop();
    if (l >= h) {
      if (l === h) ss.add(l);
      snap(`Single element at index ${l} — already sorted`, -1, -1, -1, -1);
      continue;
    }

    const p         = h;
    let   firsthigh = l;

    snap(`Partitioning [${l}…${h}] — pivot = ${s[p]}`, p, -1, firsthigh, -1);

    for (let i = l; i < h; i++) {
      cmp++;
      snap(`s[${i}]=${s[i]} < pivot(${s[p]})? ${s[i] < s[p] ? 'YES — swap' : 'NO — skip'}`,
           p, i, firsthigh, -1);

      if (s[i] < s[p]) {
        snap(`Swapping s[${i}]=${s[i]} ↔ s[${firsthigh}]=${s[firsthigh]}`,
             p, i, firsthigh, firsthigh);
        [s[i], s[firsthigh]] = [s[firsthigh], s[i]];
        swc++;
        firsthigh++;
        snap(`Swapped ✓ — firsthigh advances to ${firsthigh}`, p, i, firsthigh, -1);
      }
    }

    snap(`Placing pivot ${s[p]} at firsthigh=${firsthigh}`, p, -1, firsthigh, firsthigh);
    [s[p], s[firsthigh]] = [s[firsthigh], s[p]];
    swc++;
    ss.add(firsthigh);
    snap(`Pivot ${s[firsthigh]} is now at its final position ${firsthigh} ✓`,
         -1, -1, -1, -1);

    stack.push([firsthigh + 1, h]);
    stack.push([l, firsthigh - 1]);
  }

  for (let i = 0; i < len; i++) ss.add(i);
  snap('Done ✓ — array fully sorted!', -1, -1, -1, -1);
}

function applySnapshot(snap) {
  array       = [...snap.array];
  sortedSet   = new Set(snap.sortedSet);
  pivotIdx    = snap.pivotIdx;
  scannerIdx  = snap.scannerIdx;
  fhIdx       = snap.fhIdx;
  winnerIdx   = snap.winnerIdx;
  comparisons = snap.comparisons;
  swaps       = snap.swaps;
  updateStats(snap.status);
  draw();
}