/* ── script.js ────────────────────────────────────────────────────── */
// Constants
const GRID_COLS = 12;
const GRID_ROWS = 6;
const GRID_SIZE = GRID_COLS * GRID_ROWS;
// Global state
let structure = 'array';        // 'array' | 'singly' | 'doubly'
let arrayData = [];
let singlyMemory = new Array(GRID_SIZE).fill(null);
let singlyHead = null;
let nextFreeIndex = 0;

// Step-by-step system
let allSteps = [];
let currentStep = 0;

// DOM references
const dsDisplay = document.getElementById('dsDisplay');
const valueInput = document.getElementById('valueInput');
const visualiseCheck = document.getElementById('visualiseCheck');
const stepControls = document.getElementById('stepControls');
const stepBackBtn = document.getElementById('stepBackBtn');
const stepForwardBtn = document.getElementById('stepForwardBtn');
const stepMsg = document.getElementById('stepMsg');



// ── Helpers ───────────────────────────────────────────────────────

function toHex(n) {
    return '0x' + n.toString(16).toUpperCase().padStart(2, '0');
}

function setStepMsg(msg) {
    stepMsg.textContent = msg || '';
}

function clearAll() {
    cancelAutoPlay();
    arrayData = [];
    singlyMemory = new Array(GRID_SIZE).fill(null);
    singlyHead = null;
    nextFreeIndex = 0;
    allSteps = [];
    currentStep = 0;
    // renderSinglyGrid cleans up .mem-ptr elements; plain renderGrid does not
    if (structure === 'doubly') {
        clearDoublyState();
        renderDoublyGrid();
    } else if (structure === 'singly') {
        renderSinglyGrid();
    } else {
        renderGrid([]);
    }
    updateStepButtons();
    setStepMsg('');
}

// ── Grid Management (Shared) ──────────────────────────────────────

function initGrid() {
    dsDisplay.innerHTML = '';   // Remove placeholder text

    for (let i = 0; i < GRID_SIZE; i++) {
        const cell = document.createElement('div');
        cell.className = 'mem-cell';

        const addr = document.createElement('span');
        addr.className = 'mem-addr';
        addr.textContent = toHex(i + 1);
        cell.appendChild(addr);

        const val = document.createElement('span');
        val.className = 'mem-value';
        val.style.display = 'none';
        cell.appendChild(val);

        dsDisplay.appendChild(cell);
    }
}

const STATE_CLASSES = ['state-comparing', 'state-swap', 'state-inserted', 'state-found', 'state-deleted'];

function renderGrid(data, highlights = {}) {
    const cells = dsDisplay.children;

    for (let i = 0; i < GRID_SIZE; i++) {
        const cell = cells[i];
        if (!cell) continue;

        const valEl = cell.querySelector('.mem-value');

        cell.classList.remove(...STATE_CLASSES);

        if (i < data.length) {
            cell.classList.add('occupied');
            valEl.textContent = data[i];
            valEl.style.display = '';

            if (highlights[i]) {
                cell.classList.add(highlights[i]);
            }
        } else {
            cell.classList.remove('occupied');
            valEl.style.display = 'none';
        }
    }
}

// ── Auto-play ─────────────────────────────────────────────────────

let autoPlayTimer = null;
const AUTO_STEP_MS = 75;

function cancelAutoPlay() {
    if (autoPlayTimer) {
        clearTimeout(autoPlayTimer);
        autoPlayTimer = null;
    }
}

function autoPlaySteps(steps) {
    cancelAutoPlay();
    allSteps = steps;
    currentStep = 0;
    applyStep(0);

    function advance() {
        if (currentStep < allSteps.length - 1) {
            currentStep++;
            applyStep(currentStep);
            autoPlayTimer = setTimeout(advance, AUTO_STEP_MS);
        } else {
            // Final commit
            if (structure === 'array') {
                arrayData = [...allSteps[currentStep].data];
            }
            // singlyNodes already committed inside buildSinglyInsertSteps;
            // do a clean final render so highlights are cleared
            if (structure === 'singly') {
                renderSinglyGrid();
            }
            if (structure === 'doubly') {
                renderDoublyGrid();
            }
            allSteps = [];
            currentStep = 0;
            autoPlayTimer = null;
        }
    }

    autoPlayTimer = setTimeout(advance, AUTO_STEP_MS);
}

// ── Step System ───────────────────────────────────────────────────

function applyStep(idx) {
    if (idx < 0 || idx >= allSteps.length) return;
    const s = allSteps[idx];

    if (structure === 'singly') {
        applySinglyStep(idx);
    } else if (structure === 'doubly') {
        applyDoublyStep(idx);
    } else {
        renderGrid(s.data, s.highlights);
        setStepMsg(s.msg);
    }

    if (idx === allSteps.length - 1) {
        if (structure === 'array') {
            arrayData = [...s.data];
        }
    }
}

function updateStepButtons() {
    const active = allSteps.length > 0;
    stepBackBtn.disabled = !active || currentStep === 0;
    stepForwardBtn.disabled = !active || currentStep >= allSteps.length - 1;
}

// Step button listeners
stepForwardBtn.addEventListener('click', () => {
    if (currentStep < allSteps.length - 1) {
        currentStep++;
        applyStep(currentStep);
        updateStepButtons();
    }
});

stepBackBtn.addEventListener('click', () => {
    if (currentStep > 0) {
        currentStep--;
        applyStep(currentStep);
        updateStepButtons();
    }
});

// Visualise checkbox
visualiseCheck.addEventListener('change', () => {
    cancelAutoPlay();
    stepControls.style.display = visualiseCheck.checked ? 'block' : 'none';
    allSteps = [];
    currentStep = 0;
    updateStepButtons();
    setStepMsg('');
});

// ── Centralized Operation Handlers ────────────────────────────────

let currentInsertHandler = null;
let currentDeleteHandler = null;

function setupOperationHandlers() {
    const insertBtn = document.getElementById('insertBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const searchBtn = document.getElementById('searchBtn'); // Added this

    // Clear old listeners
    const newInsert = () => handleAction('insert');
    const newDelete = () => handleAction('delete');
    const newSearch = () => handleAction('search');

    insertBtn.onclick = newInsert;
    deleteBtn.onclick = newDelete;
    searchBtn.onclick = newSearch;
}
function handleAction(type) {
    const raw = valueInput.value.trim();
    if (raw === '') { valueInput.focus(); return; }
    const val = parseInt(raw, 10);
    if (isNaN(val)) { valueInput.focus(); return; }

    valueInput.value = '';
    valueInput.focus();

    // Route to the specific structure handler
    if (type === 'insert' && window.currentInsertHandlerForStructure) {
        window.currentInsertHandlerForStructure(val);
    } else if (type === 'delete' && window.currentDeleteHandlerForStructure) {
        window.currentDeleteHandlerForStructure(val);
    } else if (type === 'search' && window.currentSearchHandlerForStructure) {
        window.currentSearchHandlerForStructure(val);
    }
}
// Structure radio buttons
document.querySelectorAll('input[name="structure"]').forEach(radio => {
    radio.addEventListener('change', () => {
        structure = radio.value;
        clearAll();

        if (structure === 'array') {
            setStepMsg('Array mode ready. Insert values to begin.');
        } else if (structure === 'singly') {
            singlyMemory = new Array(GRID_SIZE).fill(null);
            singlyHead = null;
            nextFreeIndex = 0;
            setStepMsg('Singly Linked List mode – Insert values to build the list');
        } else if (structure === 'doubly') {
            clearDoublyState();
            setStepMsg('Doubly Linked List mode – Insert values to build the list');
        }

        refreshOperationHandlers();
    });
});

function refreshOperationHandlers() {
    setupOperationHandlers();   // re-wires button onclick

    // Swap in the correct window handlers for the active structure
    if (structure === 'array') {
        setupArrayHandlers();
    } else if (structure === 'singly') {
        setupSinglyHandlers();
    } else if (structure === 'doubly') {
        setupDoublyHandlers();
    }
}

// Enter key support
valueInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('insertBtn').click();
    }
});

// Clear button
document.getElementById('clearBtn').addEventListener('click', clearAll);

// ── INITIALIZATION ────────────────────────────────────────────────

window.addEventListener('load', () => {
    initGrid();
    renderGrid([]);
    updateStepButtons();
    setStepMsg('Array mode ready. Insert values to begin.');

    setupOperationHandlers();     // Important: Set up insert/delete listeners
});