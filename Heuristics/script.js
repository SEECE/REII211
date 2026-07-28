const canvas = document.getElementById("plane");
const ctx = canvas.getContext("2d");

const SIZE = 100;          
const DISPLAY_SIZE = 105;  
const SCALE = 580 / (2 * DISPLAY_SIZE);  

let points = [];
let lines = [];  
let allSteps = [];  
let currentStep = 0;  


function toCanvas(x, y) {
    return {
        x: canvas.width / 2 + x * SCALE,
        y: canvas.height / 2 - y * SCALE
    };
}

function toWorld(cx, cy) {
    return {
        x: Math.round((cx - canvas.width / 2) / SCALE),
        y: Math.round((canvas.height / 2 - cy) / SCALE)
    };
}


function drawAxes() {
    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
}

function drawPoints() {
    ctx.fillStyle = "black";

    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const c = toCanvas(p.x, p.y);
        
        
        ctx.beginPath();
        ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        
        ctx.font = "10px Arial";
        ctx.fillStyle = "#666";
        const label = `(${i + 1})`;
        const metrics = ctx.measureText(label);
        ctx.fillText(label, c.x - metrics.width / 2, c.y + 14);
        ctx.fillStyle = "black";
    }
}

function drawLines() {
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    ctx.fillStyle = "red";
    ctx.font = "12px Arial";

    for (const line of lines) {
        const from = toCanvas(line.from.x, line.from.y);
        const to = toCanvas(line.to.x, line.to.y);

        
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();

        
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        ctx.fillText(line.order.toString(), midX + 5, midY - 5);
    }
}

function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAxes();
    drawLines();
    drawPoints();
    updateDistanceLabel();
    updateStepButtons();
}

function updateDistanceLabel() {
    const label = document.getElementById("distanceLabel");
    if (lines.length === 0) {
        label.textContent = "";
        return;
    }

    let totalDist = 0;
    for (const line of lines) {
        totalDist += distance(line.from, line.to);
    }

    label.textContent = `Total Distance: ${totalDist.toFixed(2)}`;
}

function updateStepButtons() {
    const backBtn = document.getElementById("stepBackBtn");
    const forwardBtn = document.getElementById("stepForwardBtn");
    
    
    backBtn.disabled = allSteps.length === 0 || currentStep === 0;
    forwardBtn.disabled = allSteps.length === 0 || currentStep >= allSteps.length;
}


let mouseDownTime = 0;
let mouseDownPos = null;
const HOLD_DURATION = 500; 

canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    
    mouseDownTime = Date.now();
    mouseDownPos = {cx, cy};
});

canvas.addEventListener("mouseup", (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    
    const holdTime = Date.now() - mouseDownTime;
    
    
    const moved = mouseDownPos && 
                  (Math.abs(cx - mouseDownPos.cx) > 5 || 
                   Math.abs(cy - mouseDownPos.cy) > 5);
    
    if (holdTime >= HOLD_DURATION && !moved) {
        
        const p = toWorld(cx, cy);
        
        for (let i = 0; i < points.length; i++) {
            const canvasPoint = toCanvas(points[i].x, points[i].y);
            const dist = Math.sqrt(
                Math.pow(canvasPoint.x - cx, 2) + 
                Math.pow(canvasPoint.y - cy, 2)
            );
            
            if (dist <= 8) { 
                points.splice(i, 1);
                lines = [];
                allSteps = [];
                currentStep = 0;
                redraw();
                return;
            }
        }
    } else if (holdTime < HOLD_DURATION && !moved) {
        
        const p = toWorld(cx, cy);
        if (Math.abs(p.x) <= SIZE && Math.abs(p.y) <= SIZE) {
            points.push(p);
            redraw();
        }
    }
    
    mouseDownTime = 0;
    mouseDownPos = null;
});

canvas.addEventListener("click", (e) => {
    
    e.preventDefault();
});

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const p = toWorld(cx, cy);

    const coordDisplay = document.getElementById("coordDisplay");
    if (Math.abs(p.x) <= SIZE && Math.abs(p.y) <= SIZE) {
        coordDisplay.textContent = `Coordinates: (${p.x}, ${p.y})`;
    } else {
        coordDisplay.textContent = "";
    }
});

canvas.addEventListener("mouseleave", () => {
    document.getElementById("coordDisplay").textContent = "";
});


function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

document.getElementById("generateBtn").addEventListener("click", () => {
    const n = parseInt(document.getElementById("numPoints").value, 10);
    points = [];
    lines = [];
    allSteps = [];
    currentStep = 0;
    selectedAlgorithm = null;
    document.getElementById("nnBtn").classList.remove("selected");
    document.getElementById("cpBtn").classList.remove("selected");
    document.getElementById("nnOptions").style.display = "none";

    for (let i = 0; i < n; i++) {
        points.push({
            x: randomInt(-SIZE, SIZE),
            y: randomInt(-SIZE, SIZE)
        });
    }

    redraw();
});

document.getElementById("resetBtn").addEventListener("click", () => {
    lines = [];
    allSteps = [];
    currentStep = 0;
    selectedAlgorithm = null;
    document.getElementById("nnBtn").classList.remove("selected");
    document.getElementById("cpBtn").classList.remove("selected");
    document.getElementById("nnOptions").style.display = "none";
    redraw();
});

document.getElementById("clearBtn").addEventListener("click", () => {
    points = [];
    lines = [];
    allSteps = [];
    currentStep = 0;
    selectedAlgorithm = null;
    document.getElementById("nnBtn").classList.remove("selected");
    document.getElementById("cpBtn").classList.remove("selected");
    document.getElementById("nnOptions").style.display = "none";
    redraw();
});


document.getElementById("visualiseCheck").addEventListener("change", (e) => {
    const stepControls = document.getElementById("stepControls");
    stepControls.style.display = e.target.checked ? "block" : "none";
});


function distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function nearestNeighbor(startNodeIndex = 0) {
    if (points.length < 2) {
        alert("Need at least 2 points");
        return;
    }

    const steps = [];
    const visited = new Set();
    const start = points[startNodeIndex];
    let current = start;
    visited.add(startNodeIndex);
    let order = 1;

    while (visited.size < points.length) {
        let nearestIdx = -1;
        let minDist = Infinity;

        for (let i = 0; i < points.length; i++) {
            if (!visited.has(i)) {
                const dist = distance(current, points[i]);
                if (dist < minDist) {
                    minDist = dist;
                    nearestIdx = i;
                }
            }
        }

        if (nearestIdx !== -1) {
            steps.push({
                from: current,
                to: points[nearestIdx],
                order: order++
            });
            visited.add(nearestIdx);
            current = points[nearestIdx];
        }
    }

    
    steps.push({
        from: current,
        to: start,
        order: order
    });

    return steps;
}

function closestPair() {
    if (points.length < 2) {
        alert("Need at least 2 points");
        return;
    }

    const steps = [];
    const degree = new Array(points.length).fill(0);
    const connections = Array.from({length: points.length}, () => []);
    let order = 1;

    for (let iter = 0; iter < points.length - 1; iter++) {
        let minDist = Infinity;
        let bestI = -1, bestJ = -1;

        for (let i = 0; i < points.length; i++) {
            if (degree[i] >= 2) continue;
            
            for (let j = i + 1; j < points.length; j++) {
                if (degree[j] >= 2) continue;
                if (connections[i].includes(j)) continue;
                if (wouldCreateCycle(i, j, connections)) continue;
                
                const dist = distance(points[i], points[j]);
                if (dist < minDist) {
                    minDist = dist;
                    bestI = i;
                    bestJ = j;
                }
            }
        }

        if (bestI === -1) break;

        steps.push({
            from: points[bestI],
            to: points[bestJ],
            order: order++
        });

        degree[bestI]++;
        degree[bestJ]++;
        connections[bestI].push(bestJ);
        connections[bestJ].push(bestI);
    }

    const endpoints = [];
    for (let i = 0; i < points.length; i++) {
        if (degree[i] === 1) endpoints.push(i);
    }

    if (endpoints.length === 2) {
        steps.push({
            from: points[endpoints[0]],
            to: points[endpoints[1]],
            order: order
        });
    }

    return steps;
}

function wouldCreateCycle(i, j, connections) {
    
    
    const visited = new Set();
    const queue = [i];
    visited.add(i);

    while (queue.length > 0) {
        const current = queue.shift();
        
        for (const neighbor of connections[current]) {
            if (neighbor === j) return true; 
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }

    return false;
}


let selectedAlgorithm = null;

document.getElementById("nnBtn").addEventListener("click", () => {
    
    if (points.length === 0) {
        const n = parseInt(document.getElementById("numPoints").value, 10);
        for (let i = 0; i < n; i++) {
            points.push({
                x: randomInt(-SIZE, SIZE),
                y: randomInt(-SIZE, SIZE)
            });
        }
        redraw();
    }
    
    if (points.length < 2) {
        alert("Need at least 2 points");
        return;
    }
    
    
    const nnOptions = document.getElementById("nnOptions");
    nnOptions.style.display = "block";
    
    const startNodeInput = document.getElementById("nnStartNode");
    startNodeInput.max = points.length;
    
    
    let startNodeValue = parseInt(startNodeInput.value, 10);
    if (startNodeValue > points.length) {
        startNodeValue = 1;
        startNodeInput.value = 1;
    }
    
    const startNode = startNodeValue - 1; 
    
    const visualise = document.getElementById("visualiseCheck").checked;
    const steps = nearestNeighbor(startNode);
    
    if (!steps) return; 
    
    
    selectedAlgorithm = 'nn';
    document.getElementById("nnBtn").classList.add("selected");
    document.getElementById("cpBtn").classList.remove("selected");
    
    if (!visualise) {
        lines = steps;
        redraw();
    } else {
        allSteps = steps;
        currentStep = 0;
        lines = [];
        redraw();
    }
});


document.getElementById("nnStartNode").addEventListener("input", () => {
    if (selectedAlgorithm === 'nn') {
        const startNode = parseInt(document.getElementById("nnStartNode").value, 10) - 1;
        const visualise = document.getElementById("visualiseCheck").checked;
        const steps = nearestNeighbor(startNode);
        
        if (!steps) return;
        
        if (!visualise) {
            
            lines = steps;
            redraw();
        } else {
            
            allSteps = steps;
            currentStep = 0;
            lines = [];
            redraw();
        }
    }
});

document.getElementById("cpBtn").addEventListener("click", () => {
    
    if (points.length === 0) {
        const n = parseInt(document.getElementById("numPoints").value, 10);
        for (let i = 0; i < n; i++) {
            points.push({
                x: randomInt(-SIZE, SIZE),
                y: randomInt(-SIZE, SIZE)
            });
        }
        redraw();
    }
    
    if (points.length < 2) {
        alert("Need at least 2 points");
        return;
    }
    
    
    document.getElementById("nnOptions").style.display = "none";
    
    const visualise = document.getElementById("visualiseCheck").checked;
    const steps = closestPair();
    
    
    selectedAlgorithm = 'cp';
    document.getElementById("cpBtn").classList.add("selected");
    document.getElementById("nnBtn").classList.remove("selected");
    
    if (!visualise) {
        lines = steps;
        redraw();
    } else {
        allSteps = steps;
        currentStep = 0;
        lines = [];
        redraw();
    }
});

document.getElementById("stepBackBtn").addEventListener("click", () => {
    if (currentStep > 0) {
        currentStep--;
        lines = allSteps.slice(0, currentStep);
        redraw();
    }
});

document.getElementById("stepForwardBtn").addEventListener("click", () => {
    if (currentStep < allSteps.length) {
        currentStep++;
        lines = allSteps.slice(0, currentStep);
        redraw();
    }
});


redraw();