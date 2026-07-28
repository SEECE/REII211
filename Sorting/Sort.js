// ── Sort.js — shared across all algorithm visualizers ──────────────────────
//
// Responsibilities:
//   • Canvas + common DOM refs
//   • Array construction  (reset = 1…n, shuffle, reverse)
//   • Reset / state wipe
//   • Button enable/disable (setButtons, syncStepwiseUI, updateStepButtons)
//   • Stats display
//   • Drawing (bar graph, barColor delegated to local script via getBarColor())
//   • Speed → delay
//   • Resize handler
//
// Each local script.js must define:
//   - getBarColor(idx)   → CSS colour string for bar at index idx
//   - resetLocalState()  → zero out algorithm-specific pointers/flags
//   - runSort()          → start the animated sort
//   - buildStepHistory() → populate stepHistory[]
//   - applySnapshot(s)   → restore array + pointers + stats from a snapshot

// ── Canvas & common DOM refs ───────────────────────────────────────────────
const canvas      = document.getElementById('canvas');
const ctx         = canvas.getContext('2d');

const sliderN     = document.getElementById('slider-n');
const sliderSpeed = document.getElementById('slider-speed');
const valN        = document.getElementById('val-n');
const valSpeed    = document.getElementById('val-speed');
const chkStepwise = document.getElementById('chk-stepwise');

const btnReset    = document.getElementById('btn-reset');
const btnShuffle  = document.getElementById('btn-shuffle');
const btnReverse  = document.getElementById('btn-reverse');
const btnSolve    = document.getElementById('btn-solve');
const btnPrev     = document.getElementById('btn-prev');
const btnNext     = document.getElementById('btn-next');

// Stats elements — not all algorithms use all three; guard with ?. below
const statCmp     = document.getElementById('stat-cmp');
const statSwaps   = document.getElementById('stat-swaps');
const statMerges  = document.getElementById('stat-merges');
const statStatus  = document.getElementById('stat-status');

// ── Shared runtime state ───────────────────────────────────────────────────
let array       = [];
let original    = [];   // saved on every non-reverse build; reset restores it
let n           = parseInt(sliderN.value);
let running     = false;
let comparisons = 0;
let swaps       = 0;
let merges      = 0;

// Stepwise
let stepHistory = [];
let stepCursor  = -1;

// ── Array construction ─────────────────────────────────────────────────────
function buildArray(mode = 'reset') {
  if (mode === 'reverse') {
    array = [...array].reverse();
  } else if (mode === 'reset') {
    array = [...original];          // restore snapshot taken at last new/shuffle
  } else {
    // 'new' or 'shuffle' — build a fresh 1…n sequence
    array = Array.from({ length: n }, (_, i) => i + 1);
    if (mode === 'shuffle') {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    }
    original = [...array];          // save for future resets
  }
  resetState();
  draw();
}

// ── State reset ────────────────────────────────────────────────────────────
function resetState() {
  comparisons = 0;
  swaps       = 0;
  merges      = 0;
  running     = false;
  stepHistory = [];
  stepCursor  = -1;
  resetLocalState();              // algorithm clears its own pointers/flags
  updateStats('Ready');
  setButtons(false);
  syncStepwiseUI();
}

// ── Stats ──────────────────────────────────────────────────────────────────
function updateStats(status) {
  if (statCmp)    statCmp.textContent    = comparisons;
  if (statSwaps)  statSwaps.textContent  = swaps;
  if (statMerges) statMerges.textContent = merges;
  if (statStatus) statStatus.textContent = status;
}

// ── Button state ───────────────────────────────────────────────────────────
function setButtons(sorting) {
  btnSolve.disabled   = sorting;
  btnShuffle.disabled = sorting;
  btnReverse.disabled = sorting;
  sliderN.disabled    = sorting;
  btnReset.disabled   = false;    // reset always available (stops a running sort)
}

function syncStepwiseUI() {
  const sw = chkStepwise.checked;
  btnSolve.style.display = sw ? 'none' : '';
  btnPrev.style.display  = sw ? ''     : 'none';
  btnNext.style.display  = sw ? ''     : 'none';
  if (sw) updateStepButtons();
}

function updateStepButtons() {
  const built = stepHistory.length > 0;
  btnPrev.disabled    = !built || stepCursor <= 0;
  btnNext.disabled    = built && stepCursor >= stepHistory.length - 1;
  btnReset.disabled   = false;
  btnShuffle.disabled = false;
  btnReverse.disabled = false;
  sliderN.disabled    = false;
}

// ── Drawing ────────────────────────────────────────────────────────────────
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width  = rect.width;
  canvas.height = rect.height;
}

function draw() {
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (!array.length) return;

  const gap  = Math.max(1, Math.floor(W / array.length / 8));
  const barW = (W - gap * (array.length + 1)) / array.length;
  const usH  = H - 4;

  for (let i = 0; i < array.length; i++) {
    const barH = Math.max(2, (array[i] / n) * usH);
    const x    = gap + i * (barW + gap);
    const y    = H - barH;

    ctx.fillStyle = getBarColor(i);   // ← provided by local script
    ctx.beginPath();
    if (barW >= 4) {
      const r = Math.min(2, barW / 2);
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, H);
      ctx.lineTo(x, H);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
    } else {
      ctx.rect(x, y, Math.max(barW, 1), barH);
    }
    ctx.fill();
  }
}

// ── Speed → delay ──────────────────────────────────────────────────────────
function getDelay() {
  const s = parseInt(sliderSpeed.value);
  return Math.round(600 * Math.pow(2 / 600, (s - 1) / 99));
}

// ── Finish helper (called by local script when sort completes) ─────────────
function finishSort() {
  running = false;
  markAllSorted();              // local script sets its sorted indicators
  draw();
  updateStats('Done ✓');
  setButtons(false);
}

// ── Shared event listeners ─────────────────────────────────────────────────
sliderN.addEventListener('input', () => {
  n = parseInt(sliderN.value);
  valN.textContent = n;
  buildArray('new');
});

sliderSpeed.addEventListener('input', () => {
  valSpeed.textContent = sliderSpeed.value + '×';
});

chkStepwise.addEventListener('change', () => {
  buildArray('reset');
  syncStepwiseUI();
});

btnReset.addEventListener('click', () => {
  running = false;              // stops any running animation cleanly
  buildArray('reset');
});

btnShuffle.addEventListener('click', () => {
  n = parseInt(sliderN.value);
  buildArray('shuffle');
});

btnReverse.addEventListener('click', () => {
  n = parseInt(sliderN.value);
  buildArray('reverse');
});

btnSolve.addEventListener('click', () => {
  if (!array.length || chkStepwise.checked) return;
  runSort();                    // defined in local script
});

btnNext.addEventListener('click', () => {
  if (stepHistory.length === 0) {
    buildStepHistory();         // defined in local script
    stepCursor = 0;
  } else {
    stepCursor = Math.min(stepCursor + 1, stepHistory.length - 1);
  }
  applySnapshot(stepHistory[stepCursor]);   // defined in local script
  updateStepButtons();
});

btnPrev.addEventListener('click', () => {
  if (stepHistory.length === 0 || stepCursor <= 0) return;
  stepCursor = Math.max(stepCursor - 1, 0);
  applySnapshot(stepHistory[stepCursor]);
  updateStepButtons();
});

window.addEventListener('resize', () => {
  resizeCanvas();
  draw();
});

// ── Init (runs after local script has loaded) ──────────────────────────────
resizeCanvas();
buildArray('new');
syncStepwiseUI();