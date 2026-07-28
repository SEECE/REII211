/**
 * UIControls.js - Handles all UI control panel generation and interactions
 */

const UIControls = (function () {
    let numRows = 51;
    let numCols = 51;

    function generateControlsHTML() {
        return `
            <div class="controls">
                <div class="control-group">
                    <h3>Maze</h3>
                    <div class="dim-row">
                        <label>Rows:</label>
                        <input type="number" id="gridRows" value="${numRows}" min="5" max="201" step="2">
                    </div>
                    <div class="dim-row">
                        <label>Cols:</label>
                        <input type="number" id="gridCols" value="${numCols}" min="5" max="401" step="2">
                    </div>
                    <button id="generateBtn">Generate Maze</button>
                    <button id="clearBtn" style="background:#6366f1; margin-top:4px;">Clear Grid</button>
                    <button id="resetSolutionBtn" style="background:#f97316; margin-top:4px;">⟳ Reset Solution</button>
                </div>

                <div class="control-group">
                    <h3>Search Algorithm</h3>
                    <div class="radio-group">
                        <label class="radio-option selected" id="label-dfs">
                            <input type="radio" name="algorithm" value="dfs" checked>
                            <div class="radio-label">
                                <strong>Depth-First Search</strong>
                                <span>Explores deep before backtracking</span>
                            </div>
                        </label>
                        <label class="radio-option" id="label-bfs">
                            <input type="radio" name="algorithm" value="bfs">
                            <div class="radio-label">
                                <strong>Breadth-First Search</strong>
                                <span>Guarantees shortest path</span>
                            </div>
                        </label>
                    </div>
                    <button id="solveBtn" style="background:#3b82f6; margin-top: 12px;">Solve Maze</button>
                </div>

                <div class="control-group">
                    <h3>Visualisation</h3>
                    <label style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                        <input type="checkbox" id="visualiseCheck">
                        Step-by-step mode (manual)
                    </label>
                    
                    <div class="control-group" id="speedControl" style="margin-top: 8px;">
                        <label>Animation Speed: <span class="range-val" id="val-speed">55x</span></label>
                        <input type="range" id="slider-speed" min="0" max="100" value="50" />
                        <small style="display:block; margin-top:4px; color:#666;">Slower ← → Faster</small>
                    </div>
                    
                    <div id="stepControls">
                        <button id="stepBackBtn">← Back</button>
                        <button id="stepForwardBtn">Forward →</button>
                    </div>
                    <div id="stepPill">Step 0 / 0</div>
                </div>
            </div>
        `;
    }

    function generateLegendHTML() {
        return `
            <div class="legend">
                <div class="legend-item"><div class="legend-dot" style="background:#1f2937;"></div>Wall</div>
                <div class="legend-item"><div class="legend-dot" style="background:#ffffff; border:1px solid #d1d5db;"></div>Path</div>
                <div class="legend-item"><div class="legend-dot" style="background:#22c55e;"></div>Start</div>
                <div class="legend-item"><div class="legend-dot" style="background:#ef4444;"></div>End</div>
                <div class="legend-item"><div class="legend-dot" style="background:#93c5fd;"></div>Visited</div>
                <div class="legend-item"><div class="legend-dot" style="background:#f59e0b;"></div>Solution</div>
            </div>
        `;
    }

    function initControls() {
        const controlsPanel = document.getElementById('controls-panel');
        const legendPanel = document.getElementById('legend');

        if (controlsPanel) {
            controlsPanel.innerHTML = generateControlsHTML();
        }
        if (legendPanel) {
            legendPanel.innerHTML = generateLegendHTML();
        }

        return {
            getNumRows: () => parseInt(document.getElementById("gridRows")?.value || numRows, 10),
            getNumCols: () => parseInt(document.getElementById("gridCols")?.value || numCols, 10),
            getAlgorithm: () => document.querySelector("input[name='algorithm']:checked")?.value,
            getSpeedDelay: () => {
                const slider = document.getElementById("slider-speed");
                const speedVal = document.getElementById("val-speed");
                const speed = parseInt(slider?.value || 50, 10);

                // Map 0-100 slider to 10-100 speed multiplier
                const multiplier = 10 + (speed * 0.9);

                // Calculate delay: higher multiplier = lower delay
                // Assuming 5000ms is the 'slowest' base unit, 
                // 10x speed = 500ms delay, 100x speed = 50ms delay.
                const delay = Math.round(500 / multiplier);

                if (speedVal) {
                    speedVal.textContent = `${multiplier.toFixed(0)}x`;
                }

                return delay;
            },
            isStepMode: () => document.getElementById("visualiseCheck")?.checked || false,
            updateStepUI: (currentStep, totalSteps) => {
                const pill = document.getElementById("stepPill");
                const backBtn = document.getElementById("stepBackBtn");
                const fwdBtn = document.getElementById("stepForwardBtn");

                if (!pill) return;

                if (totalSteps === 0) {
                    pill.style.display = "none";
                    if (backBtn) backBtn.disabled = true;
                    if (fwdBtn) fwdBtn.disabled = true;
                } else {
                    pill.style.display = "block";
                    pill.textContent = `Step ${currentStep} / ${totalSteps}`;
                    if (backBtn) backBtn.disabled = currentStep <= 0;
                    if (fwdBtn) fwdBtn.disabled = currentStep >= totalSteps;
                }
            }
        };
    }

    return {
        generateControlsHTML,
        generateLegendHTML,
        initControls
    };
})();