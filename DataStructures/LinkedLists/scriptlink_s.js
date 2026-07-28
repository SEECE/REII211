/* ── scriptlink_s.js ──────────────────────────────────────────────── */
/* Singly Linked List - Fixed memory with hole reuse on insert + append to logical end */

const MAX_NODES = GRID_SIZE;

// Global helpers (already in script.js): singlyMemory, singlyHead, nextFreeIndex

// ── Find first free slot (lowest index) ─────────────────────────────
function findFirstFreeSlot() {
    for (let i = 0; i < GRID_SIZE; i++) {
        if (singlyMemory[i] === null) return i;
    }
    return -1;
}

// ── Build steps for Insert (now reuses holes) ───────────────────────
function buildSinglyInsertSteps(value) {
    const steps = [];

    // Find slot for new node (prefer hole, else next free)
    let newIndex = findFirstFreeSlot();
    if (newIndex === -1) {
        if (nextFreeIndex < GRID_SIZE) {
            newIndex = nextFreeIndex;
        } else {
            steps.push({
                snapshot: singlyMemory.map(n => n ? {...n} : null),
                highlights: {},
                msg: "Grid is full!"
            });
            return steps;
        }
    }

    const newAddress = newIndex + 1;
    const newNode = { value: value, next: null };

    let workingMemory = singlyMemory.map(n => n ? {...n} : null);
    workingMemory[newIndex] = newNode;

    // Step 1: Create new node in its slot
    steps.push({
        snapshot: workingMemory.map(n => n ? {...n} : null),
        highlights: { [newIndex]: 'state-inserted' },
        msg: `Create new node with ${value} at address ${toHex(newAddress)}.`
    });

    // Step 2: Link it to the end of the list (if list not empty)
    if (singlyHead !== null) {
        // Find current tail
        let tailAddr = singlyHead;
        let tailIdx = tailAddr - 1;

        while (workingMemory[tailIdx].next !== null) {
            tailAddr = workingMemory[tailIdx].next;
            tailIdx = tailAddr - 1;
        }

        // Update tail pointer
        workingMemory[tailIdx].next = newAddress;

        steps.push({
            snapshot: workingMemory.map(n => n ? {...n} : null),
            highlights: { [tailIdx]: 'state-comparing', [newIndex]: 'state-inserted' },
            msg: `Append to end: Update pointer of last node (${workingMemory[tailIdx].value}) to ${toHex(newAddress)}.`
        });
    } else {
        // First node becomes head
        singlyHead = newAddress;   // will be committed below
    }

    // Commit changes
    singlyMemory = workingMemory;
    if (newIndex === nextFreeIndex) nextFreeIndex++;

    return steps;
}

// ── Render (unchanged - shows holes correctly) ─────────────────────
function renderSinglyGrid(snapshot = null) {
    const cells = dsDisplay.children;
    const toRender = snapshot || singlyMemory;

    for (let i = 0; i < GRID_SIZE; i++) {
        const cell = cells[i];
        if (!cell) continue;

        const valEl = cell.querySelector('.mem-value');
        let ptrEl = cell.querySelector('.mem-ptr');
        if (ptrEl) ptrEl.remove();

        cell.classList.remove(...STATE_CLASSES, 'occupied');

        const node = toRender[i];
        if (node !== null) {
            cell.classList.add('occupied');
            valEl.textContent = node.value;
            valEl.style.display = '';

            ptrEl = document.createElement('span');
            ptrEl.className = 'mem-ptr';
            const nextAddr = node.next !== null ? toHex(node.next) : 'NULL';
            ptrEl.textContent = `→ ${nextAddr}`;
            cell.appendChild(ptrEl);
        } else {
            valEl.style.display = 'none';
        }
    }
}

// ── Delete (unchanged - leaves hole) ───────────────────────────────
function buildSinglyDeleteSteps(value) {
    const steps = [];
    let workingMemory = singlyMemory.map(n => n ? {...n} : null);

    if (singlyHead === null) {
        steps.push({ snapshot: workingMemory, highlights: {}, msg: "List is empty." });
        return steps;
    }

    let foundAddr = null;
    let prevAddr = null;
    let currentAddr = singlyHead;

    while (currentAddr !== null) {
        const currIdx = currentAddr - 1;
        steps.push({
            snapshot: workingMemory.map(n => n ? {...n} : null),
            highlights: { [currIdx]: 'state-comparing' },
            msg: `Checking node at ${toHex(currentAddr)}: value is ${workingMemory[currIdx].value}.`
        });

        if (workingMemory[currIdx].value === value) {
            foundAddr = currentAddr;
            steps.push({
                snapshot: workingMemory.map(n => n ? {...n} : null),
                highlights: { [currIdx]: 'state-found' },
                msg: `Found ${value} at ${toHex(currentAddr)}.`
            });
            break;
        }

        prevAddr = currentAddr;
        currentAddr = workingMemory[currIdx].next;
    }

    if (foundAddr === null) {
        steps.push({ snapshot: workingMemory, highlights: {}, msg: `${value} not found.` });
        return steps;
    }

    const foundIdx = foundAddr - 1;
    const nextAfter = workingMemory[foundIdx].next;

    if (prevAddr === null) {
        // Delete head
        steps.push({
            snapshot: workingMemory.map(n => n ? {...n} : null),
            highlights: { [foundIdx]: 'state-deleted' },
            msg: `Removing head. New head → ${nextAfter !== null ? toHex(nextAfter) : 'NULL'}.`
        });
    } else {
        const prevIdx = prevAddr - 1;
        workingMemory[prevIdx].next = nextAfter;
        steps.push({
            snapshot: workingMemory.map(n => n ? {...n} : null),
            highlights: { [prevIdx]: 'state-swap', [foundIdx]: 'state-deleted' },
            msg: `Skip deleted node: ${workingMemory[prevIdx].value} now points to ${nextAfter !== null ? toHex(nextAfter) : 'NULL'}.`
        });
    }

    workingMemory[foundIdx] = null;

    const remaining = workingMemory.filter(n => n !== null).length;
    steps.push({
        snapshot: workingMemory.map(n => n ? {...n} : null),
        highlights: {},
        msg: `Node deleted. ${remaining} node${remaining !== 1 ? 's' : ''} remain.`
    });

    singlyHead = (prevAddr === null) ? nextAfter : singlyHead;
    singlyMemory = workingMemory;

    return steps;
}

// Search remains the same (traverses via pointers)
function buildSinglySearchSteps(value) {
    const steps = [];
    const workingMemory = singlyMemory.map(n => n ? {...n} : null);

    if (singlyHead === null) {
        steps.push({ snapshot: workingMemory, highlights: {}, msg: 'List is empty.' });
        return steps;
    }

    let currentAddr = singlyHead;
    while (currentAddr !== null) {
        const currIdx = currentAddr - 1;
        const node = workingMemory[currIdx];

        steps.push({
            snapshot: workingMemory.map(n => n ? {...n} : null),
            highlights: { [currIdx]: 'state-comparing' },
            msg: `Checking ${toHex(currentAddr)}: ${node.value}`
        });

        if (node.value === value) {
            steps.push({
                snapshot: workingMemory.map(n => n ? {...n} : null),
                highlights: { [currIdx]: 'state-found' },
                msg: `Found ${value} at ${toHex(currentAddr)}!`
            });
            return steps;
        }

        if (node.next) {
            steps.push({
                snapshot: workingMemory.map(n => n ? {...n} : null),
                highlights: { [currIdx]: 'state-swap' },
                msg: `≠ ${value}. Follow pointer → ${toHex(node.next)}`
            });
        }
        currentAddr = node.next;
    }

    steps.push({ snapshot: workingMemory, highlights: {}, msg: `${value} not found.` });
    return steps;
}

// Apply step (unchanged)
function applySinglyStep(idx) {
    if (idx < 0 || idx >= allSteps.length) return;
    const s = allSteps[idx];

    if (s.snapshot) {
        renderSinglyGrid(s.snapshot);
    } else {
        renderSinglyGrid();
    }

    setStepMsg(s.msg);

    if (s.highlights) {
        const cells = dsDisplay.children;
        Object.keys(s.highlights).forEach(key => {
            const i = parseInt(key);
            if (cells[i]) cells[i].classList.add(s.highlights[i]);
        });
    }
}

// Setup handlers (unchanged)
function setupSinglyHandlers() {
    const run = (steps) => {
        if (!visualiseCheck.checked) {
            autoPlaySteps(steps);
        } else {
            cancelAutoPlay();
            allSteps = steps;
            currentStep = 0;
            applySinglyStep(0);
            updateStepButtons();
        }
    };

    window.currentInsertHandlerForStructure = (value) => run(buildSinglyInsertSteps(value));
    window.currentDeleteHandlerForStructure = (value) => {
        if (singlyHead === null) { setStepMsg('List is empty.'); return; }
        run(buildSinglyDeleteSteps(value));
    };
    window.currentSearchHandlerForStructure = (value) => {
        if (singlyHead === null) { setStepMsg('List is empty.'); return; }
        run(buildSinglySearchSteps(value));
    };
}