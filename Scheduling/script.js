// Canvas setup
const canvas = document.getElementById('plane');
const ctx = canvas.getContext('2d');

// UI Elements
const numStudiosInput = document.getElementById('numStudios');
const timeSpanInput = document.getElementById('timeSpan');
const generateBtn = document.getElementById('generateBtn');
const earliestStartBtn = document.getElementById('earliestStartBtn');
const shortestJobBtn = document.getElementById('shortestJobBtn');
const earliestFinishBtn = document.getElementById('earliestFinishBtn');
const visualiseCheck = document.getElementById('visualiseCheck');
const stepControls = document.getElementById('stepControls');
const stepBackBtn = document.getElementById('stepBackBtn');
const stepForwardBtn = document.getElementById('stepForwardBtn');
const resetBtn = document.getElementById('resetBtn');
const clearBtn = document.getElementById('clearBtn');
const distanceLabel = document.getElementById('distanceLabel');
const coordDisplay = document.getElementById('coordDisplay');

// State
let jobs = [];
let selectedJobs = [];
let currentAlgorithm = null;
let visualizationSteps = [];
let currentStep = 0;
let isStepMode = false;

// Job structure: { id, start, end, duration }

// Canvas drawing constants
const PADDING = 50;
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;
const DRAW_WIDTH = CANVAS_WIDTH - 2 * PADDING;
const DRAW_HEIGHT = CANVAS_HEIGHT - 2 * PADDING;

// Initialize
function init() {
    setupEventListeners();
    drawEmptyCanvas();
}

// Event Listeners
function setupEventListeners() {
    generateBtn.addEventListener('click', generateJobs);
    earliestStartBtn.addEventListener('click', () => runAlgorithm('earliestStart'));
    shortestJobBtn.addEventListener('click', () => runAlgorithm('shortestJob'));
    earliestFinishBtn.addEventListener('click', () => runAlgorithm('earliestFinish'));
    visualiseCheck.addEventListener('change', toggleStepMode);
    stepBackBtn.addEventListener('click', stepBack);
    stepForwardBtn.addEventListener('click', stepForward);
    resetBtn.addEventListener('click', resetSelection);
    clearBtn.addEventListener('click', clearAll);
}

// Toggle step-by-step mode
function toggleStepMode() {
    isStepMode = visualiseCheck.checked;
    stepControls.style.display = isStepMode ? 'flex' : 'none';
    
    if (!isStepMode) {
        // If turning off step mode, show final result
        if (visualizationSteps.length > 0) {
            currentStep = visualizationSteps.length - 1;
            drawVisualizationStep();
        }
    }
}

// Generate random jobs across studios (non-overlapping within each studio)
function generateJobs() {
    const numStudios = parseInt(numStudiosInput.value);
    const timeSpan = parseInt(timeSpanInput.value);
    
    jobs = [];
    let jobId = 1;
    
    // For each studio, generate a random number of non-overlapping jobs
    for (let studio = 0; studio < numStudios; studio++) {
        // Random number of jobs per studio (between 1 and 8)
        const numJobsInStudio = Math.floor(Math.random() * 8) + 1;
        
        // Generate random jobs for this studio
        const studioJobs = [];
        for (let i = 0; i < numJobsInStudio; i++) {
            let attempts = 0;
            let validJob = null;
            
            // Try to place a job that doesn't overlap with existing jobs in this studio
            while (attempts < 50 && !validJob) {
                // Use decimal values for more randomness
                const start = Math.random() * (timeSpan - 1);
                // Shorter durations - between 0.5 and timeSpan/5
                const maxDuration = Math.max(0.5, Math.min(timeSpan - start, timeSpan / 5));
                const duration = Math.random() * (maxDuration - 0.5) + 0.5;
                const end = start + duration;
                
                // Check if this job has at least 0.5 month gap with any existing job in this studio
                const hasGap = studioJobs.every(existingJob => 
                    (start >= existingJob.end + 0.5 || end <= existingJob.start - 0.5)
                );
                
                if (hasGap) {
                    validJob = {
                        id: jobId++,
                        start: start,
                        end: end,
                        duration: duration,
                        studio: studio
                    };
                }
                attempts++;
            }
            
            if (validJob) {
                studioJobs.push(validJob);
            }
        }
        
        // Add this studio's jobs to the main jobs array
        jobs.push(...studioJobs);
    }
    
    // Sort by studio first, then by start time within each studio
    jobs.sort((a, b) => {
        if (a.studio !== b.studio) return a.studio - b.studio;
        return a.start - b.start;
    });
    
    selectedJobs = [];
    visualizationSteps = [];
    currentStep = 0;
    currentAlgorithm = null;
    
    // Remove selected class from buttons
    document.querySelectorAll('.algo-btn').forEach(btn => btn.classList.remove('selected'));
    
    updateDisplay();
    drawJobs();
}

// Draw empty canvas with axes
function drawEmptyCanvas() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw axes
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    
    // X-axis (time)
    ctx.beginPath();
    ctx.moveTo(PADDING, CANVAS_HEIGHT - PADDING);
    ctx.lineTo(CANVAS_WIDTH - PADDING, CANVAS_HEIGHT - PADDING);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(PADDING, PADDING);
    ctx.lineTo(PADDING, CANVAS_HEIGHT - PADDING);
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#666';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Time (months)', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10);
    
    ctx.save();
    ctx.translate(15, CANVAS_HEIGHT / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Film Jobs', 0, 0);
    ctx.restore();
}

// Draw all jobs
function drawJobs() {
    if (jobs.length === 0) {
        drawEmptyCanvas();
        return;
    }
    
    drawEmptyCanvas();
    
    const timeSpan = parseInt(timeSpanInput.value);
    const barHeight = 20;
    const spacing = 5;
    
    // Get the maximum studio number to determine total height needed
    const maxStudio = Math.max(...jobs.map(j => j.studio));
    const numStudios = maxStudio + 1;
    const totalBarsHeight = numStudios * (barHeight + spacing);
    const startY = (CANVAS_HEIGHT - totalBarsHeight) / 2;
    
    // Draw studio labels
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    for (let i = 0; i < numStudios; i++) {
        const y = startY + i * (barHeight + spacing) + barHeight / 2;
        ctx.fillText(`${i + 1}`, PADDING - 10, y + 4);
    }
    
    jobs.forEach(job => {
        const y = startY + job.studio * (barHeight + spacing);
        drawJob(job, y, barHeight, timeSpan, 'gray');
    });
    
    // Draw time labels
    ctx.fillStyle = '#666';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    const numLabels = Math.min(timeSpan, 12);
    for (let i = 0; i <= numLabels; i++) {
        const month = Math.floor((i / numLabels) * timeSpan);
        const x = PADDING + (month / timeSpan) * DRAW_WIDTH;
        ctx.fillText(month, x, CANVAS_HEIGHT - PADDING + 20);
    }
}

// Draw a single job bar
function drawJob(job, y, height, timeSpan, color) {
    const x = PADDING + (job.start / timeSpan) * DRAW_WIDTH;
    const width = ((job.end - job.start) / timeSpan) * DRAW_WIDTH;
    
    // Draw bar
    ctx.fillStyle = color === 'gray' ? '#9ca3af' : 
                     color === 'green' ? '#10b981' : 
                     color === 'red' ? '#ef4444' : color;
    ctx.fillRect(x, y, width, height);
    
    // Draw border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    
    // Draw job number only (no "Job" text)
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(job.id, x + width / 2, y + height / 2);
}

// Run selected algorithm
function runAlgorithm(algorithm) {
    if (jobs.length === 0) {
        generateJobs();
    }
    
    currentAlgorithm = algorithm;
    
    // Update button states
    document.querySelectorAll('.algo-btn').forEach(btn => btn.classList.remove('selected'));
    if (algorithm === 'earliestStart') earliestStartBtn.classList.add('selected');
    if (algorithm === 'shortestJob') shortestJobBtn.classList.add('selected');
    if (algorithm === 'earliestFinish') earliestFinishBtn.classList.add('selected');
    
    // Run the algorithm
    if (algorithm === 'earliestStart') {
        runEarliestStart();
    } else if (algorithm === 'shortestJob') {
        runShortestJob();
    } else if (algorithm === 'earliestFinish') {
        runEarliestFinish();
    }
    
    if (isStepMode) {
        currentStep = 0;
        drawVisualizationStep();
    } else {
        currentStep = visualizationSteps.length - 1;
        drawVisualizationStep();
    }
}

// Algorithm: Earliest Start Time First
function runEarliestStart() {
    visualizationSteps = [];
    selectedJobs = [];
    
    const sortedJobs = [...jobs].sort((a, b) => a.start - b.start);
    let lastEnd = -1;
    
    visualizationSteps.push({ selected: [], considering: null, rejected: [] });
    
    sortedJobs.forEach(job => {
        if (job.start >= lastEnd) {
            selectedJobs.push(job);
            lastEnd = job.end;
            visualizationSteps.push({ 
                selected: [...selectedJobs], 
                considering: job, 
                rejected: sortedJobs.filter(j => !selectedJobs.includes(j) && sortedJobs.indexOf(j) <= sortedJobs.indexOf(job))
            });
        } else {
            visualizationSteps.push({ 
                selected: [...selectedJobs], 
                considering: job, 
                rejected: sortedJobs.filter(j => !selectedJobs.includes(j) && sortedJobs.indexOf(j) <= sortedJobs.indexOf(job))
            });
        }
    });
    
    updateDisplay();
}

// Algorithm: Shortest Job First
function runShortestJob() {
    visualizationSteps = [];
    selectedJobs = [];
    
    // Sort by duration ascending - shortest first
    let remaining = [...jobs].sort((a, b) => a.duration - b.duration);
    const rejected = [];
    
    visualizationSteps.push({ selected: [], considering: null, rejected: [] });
    
    while (remaining.length > 0) {
        // Pick the shortest job from what's left
        const job = remaining[0];
        
        // Accept it
        selectedJobs.push(job);
        
        // Remove it from remaining
        remaining.shift();
        
        // Remove all jobs that intersect with the accepted job
        const newRemaining = [];
        remaining.forEach(j => {
            if (j.start < job.end && j.end > job.start) {
                // Intersects - remove it
                rejected.push(j);
                visualizationSteps.push({
                    selected: [...selectedJobs],
                    considering: j,
                    rejected: [...rejected]
                });
            } else {
                newRemaining.push(j);
            }
        });
        remaining = newRemaining;
        
        // Record step after accepting the job
        visualizationSteps.push({
            selected: [...selectedJobs],
            considering: job,
            rejected: [...rejected]
        });
    }
    
    updateDisplay();
}

// Algorithm: Earliest Finish Time First (Optimal)
function runEarliestFinish() {
    visualizationSteps = [];
    selectedJobs = [];
    
    const sortedJobs = [...jobs].sort((a, b) => a.end - b.end);
    let lastEnd = -1;
    
    visualizationSteps.push({ selected: [], considering: null, rejected: [] });
    
    sortedJobs.forEach(job => {
        if (job.start >= lastEnd) {
            selectedJobs.push(job);
            lastEnd = job.end;
            visualizationSteps.push({ 
                selected: [...selectedJobs], 
                considering: job, 
                rejected: sortedJobs.filter(j => !selectedJobs.includes(j) && sortedJobs.indexOf(j) <= sortedJobs.indexOf(job))
            });
        } else {
            visualizationSteps.push({ 
                selected: [...selectedJobs], 
                considering: job, 
                rejected: sortedJobs.filter(j => !selectedJobs.includes(j) && sortedJobs.indexOf(j) <= sortedJobs.indexOf(job))
            });
        }
    });
    
    updateDisplay();
}

// Draw visualization step
function drawVisualizationStep() {
    if (visualizationSteps.length === 0 || currentStep < 0) return;
    
    const step = visualizationSteps[currentStep];
    drawEmptyCanvas();
    
    const timeSpan = parseInt(timeSpanInput.value);
    const barHeight = 20;
    const spacing = 5;
    
    // Get the maximum studio number to determine total height needed
    const maxStudio = Math.max(...jobs.map(j => j.studio));
    const numStudios = maxStudio + 1;
    const totalBarsHeight = numStudios * (barHeight + spacing);
    const startY = (CANVAS_HEIGHT - totalBarsHeight) / 2;
    
    // Draw studio labels
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    for (let i = 0; i < numStudios; i++) {
        const y = startY + i * (barHeight + spacing) + barHeight / 2;
        ctx.fillText(`${i + 1}`, PADDING - 10, y + 4);
    }
    
    jobs.forEach(job => {
        const y = startY + job.studio * (barHeight + spacing);
        let color = 'gray';
        
        if (step.selected.includes(job)) {
            color = 'green';
        } else if (step.rejected.includes(job)) {
            color = 'red';
        } else if (step.considering === job) {
            color = '#fbbf24'; // Yellow for considering
        }
        
        drawJob(job, y, barHeight, timeSpan, color);
    });
    
    // Draw time labels
    ctx.fillStyle = '#666';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    const numLabels = Math.min(timeSpan, 12);
    for (let i = 0; i <= numLabels; i++) {
        const month = Math.floor((i / numLabels) * timeSpan);
        const x = PADDING + (month / timeSpan) * DRAW_WIDTH;
        ctx.fillText(month, x, CANVAS_HEIGHT - PADDING + 20);
    }
    
    updateDisplay();
}

// Step forward
function stepForward() {
    if (currentStep < visualizationSteps.length - 1) {
        currentStep++;
        drawVisualizationStep();
    }
}

// Step back
function stepBack() {
    if (currentStep > 0) {
        currentStep--;
        drawVisualizationStep();
    }
}

// Reset selection
function resetSelection() {
    selectedJobs = [];
    visualizationSteps = [];
    currentStep = 0;
    currentAlgorithm = null;
    
    document.querySelectorAll('.algo-btn').forEach(btn => btn.classList.remove('selected'));
    
    updateDisplay();
    drawJobs();
}

// Clear all
function clearAll() {
    jobs = [];
    selectedJobs = [];
    visualizationSteps = [];
    currentStep = 0;
    currentAlgorithm = null;
    
    document.querySelectorAll('.algo-btn').forEach(btn => btn.classList.remove('selected'));
    
    updateDisplay();
    drawEmptyCanvas();
}

// Update display
function updateDisplay() {
    const totalJobsSelected = selectedJobs.length;
    distanceLabel.textContent = `Jobs Selected: ${totalJobsSelected}`;
    
    if (jobs.length === 0) {
        coordDisplay.textContent = 'Click "Generate Jobs" to start';
    } else if (currentAlgorithm === null) {
        coordDisplay.textContent = `${jobs.length} jobs generated. Select a heuristic to solve.`;
    } else {
        const algoName = currentAlgorithm === 'earliestStart' ? 'Earliest Start' :
                        currentAlgorithm === 'shortestJob' ? 'Shortest Job' :
                        'Earliest Finish';
        
        // Calculate total time covered by selected jobs
        const timeSpan = parseInt(timeSpanInput.value);
        const totalTimeCovered = selectedJobs.reduce((sum, job) => sum + job.duration, 0);
        const percentageCovered = ((totalTimeCovered / timeSpan) * 100).toFixed(1);
        
        coordDisplay.textContent = `Algorithm: ${algoName}\nStep ${currentStep + 1}/${visualizationSteps.length}\nTime Coverage: ${percentageCovered}%`;
    }
}

// Start the application
init();