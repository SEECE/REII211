/* ── scriptarray.js ───────────────────────────────────────────────── */

// Array-specific step builders (moved from main file)

function buildInsertSteps(arr, value) {
    const steps = [];
    const working = [...arr];

    // Step 0: append at the end
    working.push(value);
    const newIdx = working.length - 1;

    steps.push({
        data: [...working],
        highlights: { [newIdx]: 'state-comparing' },
        msg: `Append ${value} at address ${toHex(newIdx + 1)}. Now bubble it left into sorted position.`
    });

    let i = newIdx;

    while (i > 0 && working[i - 1] > working[i]) {
        steps.push({
            data: [...working],
            highlights: { [i]: 'state-comparing', [i - 1]: 'state-comparing' },
            msg: `Compare ${working[i - 1]} (${toHex(i)}) > ${working[i]} (${toHex(i + 1)}) → swap.`
        });

        [working[i - 1], working[i]] = [working[i], working[i - 1]];

        steps.push({
            data: [...working],
            highlights: { [i]: 'state-swap', [i - 1]: 'state-swap' },
            msg: `Swapped. ${value} is now at address ${toHex(i)}.`
        });

        i--;
    }

    steps.push({
        data: [...working],
        highlights: { [i]: 'state-inserted' },
        msg: `${value} settled at address ${toHex(i + 1)}. Done.`
    });

    return steps;
}

function buildDeleteSteps(arr, value) {
    const steps = [];
    const working = [...arr];

    let foundIndex = -1;

    // Linear search
    for (let i = 0; i < working.length; i++) {
        steps.push({
            data: [...working],
            highlights: { [i]: 'state-comparing' },
            msg: `Checking address ${toHex(i + 1)} for ${value}.`
        });

        if (working[i] === value) {
            foundIndex = i;
            steps.push({
                data: [...working],
                highlights: { [i]: 'state-found' },
                msg: `Found ${value} at address ${toHex(i + 1)}.`
            });
            break;
        }
    }

    if (foundIndex === -1) {
        steps.push({
            data: [...working],
            highlights: {},
            msg: `${value} not found. No deletion performed.`
        });
        return steps;
    }

    // Shift left
    for (let i = foundIndex; i < working.length - 1; i++) {
        steps.push({
            data: [...working],
            highlights: { [i]: 'state-comparing', [i + 1]: 'state-comparing' },
            msg: `Move ${working[i + 1]} from ${toHex(i + 2)} → ${toHex(i + 1)}.`
        });

        working[i] = working[i + 1];

        steps.push({
            data: [...working],
            highlights: { [i]: 'state-swap' },
            msg: `Copied into position ${toHex(i + 1)}.`
        });
    }

    // Remove last element
    const lastIdx = working.length - 1;
    steps.push({
        data: [...working],
        highlights: { [lastIdx]: 'state-deleted' },
        msg: `Clearing last duplicate at ${toHex(lastIdx + 1)}.`
    });

    working.pop();

    steps.push({
        data: [...working],
        highlights: {},
        msg: `Deletion complete.`
    });

    return steps;
}

// Called by script.js refreshOperationHandlers() when switching to array mode.
function setupArrayHandlers() {
    window.currentInsertHandlerForStructure = (val) => {
        if (arrayData.length >= GRID_SIZE) {
            setStepMsg(`Grid is full (max ${GRID_SIZE} values).`);
            return;
        }
        const steps = buildInsertSteps(arrayData, val);
        executeSteps(steps);
    };

    window.currentDeleteHandlerForStructure = (val) => {
        const steps = buildDeleteSteps(arrayData, val);
        executeSteps(steps);
    };

    window.currentSearchHandlerForStructure = (val) => {
        const steps = buildBinarySearchSteps(arrayData, val);
        executeSteps(steps);
    };
}

// Set array as the default active handler (page loads in array mode)
setupArrayHandlers();

function buildBinarySearchSteps(arr, value) {
    const steps = [];
    let left = 0;
    let right = arr.length - 1;

    while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        
        // Highlight the range and the midpoint
        steps.push({
            data: [...arr],
            highlights: { [mid]: 'state-comparing', [left]: 'state-swap', [right]: 'state-swap' },
            msg: `Binary Search: Checking midpoint at index ${mid} (${toHex(mid + 1)}).`
        });

        if (arr[mid] === value) {
            steps.push({
                data: [...arr],
                highlights: { [mid]: 'state-found' },
                msg: `Found ${value} at address ${toHex(mid + 1)}!`
            });
            return steps;
        }

        if (arr[mid] < value) {
            steps.push({
                data: [...arr],
                highlights: { [mid]: 'state-comparing' },
                msg: `${arr[mid]} < ${value}. Searching the right half.`
            });
            left = mid + 1;
        } else {
            steps.push({
                data: [...arr],
                highlights: { [mid]: 'state-comparing' },
                msg: `${arr[mid]} > ${value}. Searching the left half.`
            });
            right = mid - 1;
        }
    }

    steps.push({
        data: [...arr],
        highlights: {},
        msg: `${value} not found in the array.`
    });
    return steps;
}

function executeSteps(steps) {
    if (!visualiseCheck.checked) {
        autoPlaySteps(steps);
    } else {
        cancelAutoPlay();
        allSteps = steps;
        currentStep = 0;
        applyStep(0);
        updateStepButtons();
    }
}