// ── merge-sort.js — algorithm-specific code only ───────────────────────────

const COLOR = {
  default: '#8b5cf6',
  left:    '#facc15',
  right:   '#f472b6',
  merging: '#fb923c',
  sorted:  '#22c55e',
};

let leftPtr   = -1;
let rightPtr  = -1;
let mergeIdx  = -1;
let sortedSet = new Set();

// ── required by Sort.js ────────────────────────────────────────────────────
function getBarColor(idx) {
  if (idx === leftPtr)    return COLOR.left;
  if (idx === rightPtr)   return COLOR.right;
  if (idx === mergeIdx)   return COLOR.merging;
  if (sortedSet.has(idx)) return COLOR.sorted;
  return COLOR.default;
}

function resetLocalState() {
  leftPtr   = -1;
  rightPtr  = -1;
  mergeIdx  = -1;
  sortedSet = new Set();
}

function markAllSorted() {
  leftPtr  = -1; rightPtr = -1; mergeIdx = -1;
  for (let i = 0; i < array.length; i++) sortedSet.add(i);
}

// ── animated sort (bottom-up) ──────────────────────────────────────────────
async function* mergeSortGen() {
  const s   = array;
  const len = s.length;
  const aux = [...s];

  for (let size = 1; size < len; size *= 2) {
    const isFinalPass = (size * 2 >= len);

    for (let left = 0; left < len; left += 2 * size) {
      const mid   = Math.min(left + size - 1, len - 1);
      const right = Math.min(left + 2 * size - 1, len - 1);
      if (mid >= right) continue;

      merges++;
      updateStats('Merging…');
      for (let k = left; k <= right; k++) aux[k] = s[k];

      let i = left, j = mid + 1, k = left;

      while (i <= mid && j <= right) {
        comparisons++;
        leftPtr = i; rightPtr = j; mergeIdx = -1;
        draw(); yield;

        if (aux[i] <= aux[j]) {
          mergeIdx = k; s[k] = aux[i++];
          if (isFinalPass) sortedSet.add(k);
          k++;
        } else {
          mergeIdx = k; s[k] = aux[j++];
          if (isFinalPass) sortedSet.add(k);
          k++;
        }
        draw(); yield;
      }
      while (i <= mid) {
        leftPtr = i; rightPtr = -1; mergeIdx = k;
        s[k] = aux[i++];
        if (isFinalPass) sortedSet.add(k);
        k++;
        draw(); yield;
      }
      while (j <= right) {
        rightPtr = j; leftPtr = -1; mergeIdx = k;
        s[k] = aux[j++];
        if (isFinalPass) sortedSet.add(k);
        k++;
        draw(); yield;
      }

      leftPtr = rightPtr = mergeIdx = -1;
      draw(); yield;
    }
  }
}

async function runSort() {
  running = true;
  setButtons(true);
  updateStats('Sorting…');
  const gen = mergeSortGen();
  const delay = () => new Promise(res => setTimeout(res, getDelay()));
  let result = gen.next();
  while (!result.done) {
    if (!running) break;
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
  let cmp = 0, mrg = 0;
  const ss = new Set();

  function snap(status, lp, rp, mi) {
    stepHistory.push({
      array: [...s],
      leftPtr: lp, rightPtr: rp, mergeIdx: mi,
      sortedSet: new Set(ss),
      comparisons: cmp, merges: mrg, status,
    });
  }

  snap('Ready — press Next Step to begin', -1, -1, -1);

  for (let size = 1; size < len; size *= 2) {
    const isFinalPass = (size * 2 >= len);

    for (let left = 0; left < len; left += 2 * size) {
      const mid   = Math.min(left + size - 1, len - 1);
      const right = Math.min(left + 2 * size - 1, len - 1);
      if (mid >= right) continue;

      mrg++;
      snap(`Merging window [${left}…${mid}] + [${mid+1}…${right}]`, -1, -1, -1);

      const aux = [...s];
      let i = left, j = mid + 1, k = left;

      while (i <= mid && j <= right) {
        cmp++;
        snap(`Comparing s[${i}]=${aux[i]} vs s[${j}]=${aux[j]}`, i, j, -1);
        if (aux[i] <= aux[j]) {
          s[k] = aux[i];
          if (isFinalPass) ss.add(k);
          snap(`${aux[i]} ≤ ${aux[j]} — place ${aux[i]} at position ${k}`, i, j, k);
          i++; k++;
        } else {
          s[k] = aux[j];
          if (isFinalPass) ss.add(k);
          snap(`${aux[j]} < ${aux[i]} — place ${aux[j]} at position ${k}`, i, j, k);
          j++; k++;
        }
      }
      while (i <= mid) {
        s[k] = aux[i];
        if (isFinalPass) ss.add(k);
        snap(`Right exhausted — copy ${aux[i]} to position ${k}`, i, -1, k);
        i++; k++;
      }
      while (j <= right) {
        s[k] = aux[j];
        if (isFinalPass) ss.add(k);
        snap(`Left exhausted — copy ${aux[j]} to position ${k}`, -1, j, k);
        j++; k++;
      }

      snap(`Window [${left}…${right}] merged ✓`, -1, -1, -1);
    }
  }

  for (let i = 0; i < len; i++) ss.add(i);
  snap('Done ✓ — array fully sorted!', -1, -1, -1);
}

function applySnapshot(snap) {
  array       = [...snap.array];
  leftPtr     = snap.leftPtr;
  rightPtr    = snap.rightPtr;
  mergeIdx    = snap.mergeIdx;
  sortedSet   = new Set(snap.sortedSet);
  comparisons = snap.comparisons;
  merges      = snap.merges;
  updateStats(snap.status);
  draw();
}