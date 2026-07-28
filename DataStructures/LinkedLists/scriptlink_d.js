/* ── scriptlink_d.js ──────────────────────────────────────────────── */
/* Doubly Linked List - Fixed memory grid, holes reused on insert     */

// Own state (mirrors singly but separate so switching modes is clean)
let doublyMemory = new Array(GRID_SIZE).fill(null);
let doublyHead   = null;
let doublyNextFreeIndex = 0;

// ── Find first free slot ─────────────────────────────────────────────
function doublyFindFirstFreeSlot() {
    for (let i = 0; i < GRID_SIZE; i++) {
        if (doublyMemory[i] === null) return i;
    }
    return -1;
}

// ── Render ────────────────────────────────────────────────────────────
function renderDoublyGrid(snapshot = null) {
    const cells = dsDisplay.children;
    const toRender = snapshot || doublyMemory;

    for (let i = 0; i < GRID_SIZE; i++) {
        const cell = cells[i];
        if (!cell) continue;

        cell.querySelectorAll('.mem-ptr, .mem-value, .mem-addr').forEach(el => el.remove());
        cell.classList.remove(...STATE_CLASSES, 'occupied');
        cell.style.cssText = '';

        const addr = document.createElement('span');
        addr.className = 'mem-addr';
        addr.textContent = toHex(i + 1);
        cell.appendChild(addr);

        const node = toRender[i];
        if (node !== null) {
            cell.classList.add('occupied');
            cell.style.cssText = 'display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; overflow:visible;';

            const prevEl = document.createElement('span');
            prevEl.className = 'mem-ptr';
            prevEl.textContent = `← ${node.prev !== null ? toHex(node.prev) : 'NULL'}`;
            prevEl.style.cssText = 'display:block; font-size:0.58em; opacity:0.9; color:#a78bfa; line-height:1.1;';
            cell.appendChild(prevEl);

            const valEl = document.createElement('span');
            valEl.className = 'mem-value';
            valEl.textContent = node.value;
            valEl.style.display = '';
            cell.appendChild(valEl);

            const nextEl = document.createElement('span');
            nextEl.className = 'mem-ptr';
            nextEl.textContent = `→ ${node.next !== null ? toHex(node.next) : 'NULL'}`;
            nextEl.style.cssText = 'display:block; font-size:0.58em; opacity:0.9; line-height:1.1;';
            cell.appendChild(nextEl);
        } else {
            const valEl = document.createElement('span');
            valEl.className = 'mem-value';
            valEl.style.display = 'none';
            cell.appendChild(valEl);
        }
    }
}


// ── Apply step ────────────────────────────────────────────────────────
function applyDoublyStep(idx) {
    if (idx < 0 || idx >= allSteps.length) return;
    const s = allSteps[idx];

    renderDoublyGrid(s.snapshot || null);
    setStepMsg(s.msg);

    if (s.highlights) {
        const cells = dsDisplay.children;
        Object.keys(s.highlights).forEach(key => {
            const i = parseInt(key);
            if (cells[i]) cells[i].classList.add(s.highlights[i]);
        });
    }
}

// ── Insert ────────────────────────────────────────────────────────────
function buildDoublyInsertSteps(value) {
    const steps = [];

    let newIndex = doublyFindFirstFreeSlot();
    if (newIndex === -1) {
        if (doublyNextFreeIndex < GRID_SIZE) {
            newIndex = doublyNextFreeIndex;
        } else {
            steps.push({
                snapshot: doublyMemory.map(n => n ? {...n} : null),
                highlights: {},
                msg: 'Grid is full!'
            });
            return steps;
        }
    }

    const newAddress = newIndex + 1;
    const newNode = { value, next: null, prev: null };

    let wm = doublyMemory.map(n => n ? {...n} : null);
    wm[newIndex] = { ...newNode };

    // Step 1 – allocate node
    steps.push({
        snapshot: wm.map(n => n ? {...n} : null),
        highlights: { [newIndex]: 'state-inserted' },
        msg: `Allocate new node (${value}) at ${toHex(newAddress)}. prev = NULL, next = NULL.`
    });

    if (doublyHead !== null) {
        // Walk to tail
        let tailAddr = doublyHead;
        let tailIdx  = tailAddr - 1;

        while (wm[tailIdx].next !== null) {
            tailAddr = wm[tailIdx].next;
            tailIdx  = tailAddr - 1;
        }

        // Step 2 – highlight tail
        steps.push({
            snapshot: wm.map(n => n ? {...n} : null),
            highlights: { [tailIdx]: 'state-comparing', [newIndex]: 'state-inserted' },
            msg: `Found tail node (${wm[tailIdx].value}) at ${toHex(tailAddr)}. Will link forward to new node.`
        });

        // Link tail → new
        wm[tailIdx].next = newAddress;

        steps.push({
            snapshot: wm.map(n => n ? {...n} : null),
            highlights: { [tailIdx]: 'state-swap', [newIndex]: 'state-inserted' },
            msg: `Set tail's next pointer: ${wm[tailIdx].value} → ${toHex(newAddress)}.`
        });

        // Link new → tail (prev)
        wm[newIndex].prev = tailAddr;

        steps.push({
            snapshot: wm.map(n => n ? {...n} : null),
            highlights: { [tailIdx]: 'state-swap', [newIndex]: 'state-inserted' },
            msg: `Set new node's prev pointer: ${toHex(newAddress)} ← ${toHex(tailAddr)} (back-link to tail).`
        });

    } else {
        // First node
        doublyHead = newAddress;

        steps.push({
            snapshot: wm.map(n => n ? {...n} : null),
            highlights: { [newIndex]: 'state-inserted' },
            msg: `List was empty. ${toHex(newAddress)} is now the head. prev = NULL.`
        });
    }

    // Final settled step
    steps.push({
        snapshot: wm.map(n => n ? {...n} : null),
        highlights: { [newIndex]: 'state-inserted' },
        msg: `${value} inserted at ${toHex(newAddress)}. Both links established.`
    });

    // Commit
    doublyMemory = wm;
    if (newIndex === doublyNextFreeIndex) doublyNextFreeIndex++;

    return steps;
}

// ── Delete ────────────────────────────────────────────────────────────
function buildDoublyDeleteSteps(value) {
    const steps = [];
    let wm = doublyMemory.map(n => n ? {...n} : null);

    if (doublyHead === null) {
        steps.push({ snapshot: wm, highlights: {}, msg: 'List is empty.' });
        return steps;
    }

    // Traverse to find node
    let currentAddr = doublyHead;
    let foundAddr   = null;

    while (currentAddr !== null) {
        const currIdx = currentAddr - 1;
        steps.push({
            snapshot: wm.map(n => n ? {...n} : null),
            highlights: { [currIdx]: 'state-comparing' },
            msg: `Checking ${toHex(currentAddr)}: value = ${wm[currIdx].value}.`
        });

        if (wm[currIdx].value === value) {
            foundAddr = currentAddr;
            steps.push({
                snapshot: wm.map(n => n ? {...n} : null),
                highlights: { [currIdx]: 'state-found' },
                msg: `Found ${value} at ${toHex(currentAddr)}.`
            });
            break;
        }
        currentAddr = wm[currIdx].next;
    }

    if (foundAddr === null) {
        steps.push({ snapshot: wm, highlights: {}, msg: `${value} not found.` });
        return steps;
    }

    const foundIdx  = foundAddr - 1;
    const prevAddr  = wm[foundIdx].prev;
    const nextAddr  = wm[foundIdx].next;

    // Update next-node's prev pointer
    if (nextAddr !== null) {
        const nextIdx = nextAddr - 1;
        wm[nextIdx].prev = prevAddr;
        steps.push({
            snapshot: wm.map(n => n ? {...n} : null),
            highlights: { [nextIdx]: 'state-swap', [foundIdx]: 'state-deleted' },
            msg: `Update next node (${wm[nextIdx].value})'s prev → ${prevAddr !== null ? toHex(prevAddr) : 'NULL'}.`
        });
    }

    // Update prev-node's next pointer
    if (prevAddr !== null) {
        const prevIdx = prevAddr - 1;
        wm[prevIdx].next = nextAddr;
        steps.push({
            snapshot: wm.map(n => n ? {...n} : null),
            highlights: { [prevIdx]: 'state-swap', [foundIdx]: 'state-deleted' },
            msg: `Update prev node (${wm[prevIdx].value})'s next → ${nextAddr !== null ? toHex(nextAddr) : 'NULL'}.`
        });
    } else {
        // Deleted head
        doublyHead = nextAddr;
        steps.push({
            snapshot: wm.map(n => n ? {...n} : null),
            highlights: { [foundIdx]: 'state-deleted' },
            msg: `Removed head. New head → ${nextAddr !== null ? toHex(nextAddr) : 'NULL'}.`
        });
    }

    // Free slot
    wm[foundIdx] = null;

    const remaining = wm.filter(n => n !== null).length;
    steps.push({
        snapshot: wm.map(n => n ? {...n} : null),
        highlights: {},
        msg: `Node deleted. ${remaining} node${remaining !== 1 ? 's' : ''} remain.`
    });

    doublyMemory = wm;
    return steps;
}

// ── Search ────────────────────────────────────────────────────────────
function buildDoublySearchSteps(value) {
    const steps = [];
    const wm = doublyMemory.map(n => n ? {...n} : null);

    if (doublyHead === null) {
        steps.push({ snapshot: wm, highlights: {}, msg: 'List is empty.' });
        return steps;
    }

    let currentAddr = doublyHead;
    while (currentAddr !== null) {
        const currIdx = currentAddr - 1;
        const node    = wm[currIdx];

        steps.push({
            snapshot: wm.map(n => n ? {...n} : null),
            highlights: { [currIdx]: 'state-comparing' },
            msg: `Checking ${toHex(currentAddr)}: value = ${node.value}.`
        });

        if (node.value === value) {
            steps.push({
                snapshot: wm.map(n => n ? {...n} : null),
                highlights: { [currIdx]: 'state-found' },
                msg: `Found ${value} at ${toHex(currentAddr)}! prev = ${node.prev !== null ? toHex(node.prev) : 'NULL'}, next = ${node.next !== null ? toHex(node.next) : 'NULL'}.`
            });
            return steps;
        }

        if (node.next) {
            steps.push({
                snapshot: wm.map(n => n ? {...n} : null),
                highlights: { [currIdx]: 'state-swap' },
                msg: `≠ ${value}. Follow next pointer → ${toHex(node.next)}.`
            });
        }
        currentAddr = node.next;
    }

    steps.push({ snapshot: wm, highlights: {}, msg: `${value} not found.` });
    return steps;
}

// ── Clear helper (called by clearAll in script.js) ────────────────────
function clearDoublyState() {
    doublyMemory        = new Array(GRID_SIZE).fill(null);
    doublyHead          = null;
    doublyNextFreeIndex = 0;
    // Reset any inline styles applied to cells during doubly rendering
    const cells = dsDisplay.children;
    for (let i = 0; i < GRID_SIZE; i++) {
        if (cells[i]) cells[i].style.cssText = '';
    }
}

// ── Wire up handlers ──────────────────────────────────────────────────
function setupDoublyHandlers() {
    const run = (steps) => {
        if (!visualiseCheck.checked) {
            autoPlaySteps(steps);
        } else {
            cancelAutoPlay();
            allSteps    = steps;
            currentStep = 0;
            applyDoublyStep(0);
            updateStepButtons();
        }
    };

    window.currentInsertHandlerForStructure = (value) => run(buildDoublyInsertSteps(value));

    window.currentDeleteHandlerForStructure = (value) => {
        if (doublyHead === null) { setStepMsg('List is empty.'); return; }
        run(buildDoublyDeleteSteps(value));
    };

    window.currentSearchHandlerForStructure = (value) => {
        if (doublyHead === null) { setStepMsg('List is empty.'); return; }
        run(buildDoublySearchSteps(value));
    };
}