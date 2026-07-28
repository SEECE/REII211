/**
 * CanvasRenderer.js - Handles all canvas drawing operations
 */

const CanvasRenderer = (function() {
    let canvas, ctx;
    const CELL = window.CELL || { WALL: 0, PATH: 1, START: 2, END: 3, VISITED: 4, SOLUTION: 5 };
    
    const COLOUR = {
        [CELL.WALL]: "#1f2937",
        [CELL.PATH]: "#ffffff",
        [CELL.START]: "#22c55e",
        [CELL.END]: "#ef4444",
        [CELL.VISITED]: "#93c5fd",
        [CELL.SOLUTION]: "#f59e0b",
    };
    
    function init() {
        canvas = document.getElementById("mazeCanvas");
        ctx = canvas.getContext("2d");
    }
    
    function resizeCanvas(numRows, numCols, maxCanvasW, maxCanvasH) {
        const cellW = Math.floor(maxCanvasW / numCols);
        const cellH = Math.floor(maxCanvasH / numRows);
        const cs = Math.max(1, Math.min(cellW, cellH));
        canvas.width = cs * numCols;
        canvas.height = cs * numRows;
        return cs;
    }
    
    function drawGrid(grid, numRows, numCols) {
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const cs = canvas.width / numCols;
        
        for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < numCols; c++) {
                ctx.fillStyle = COLOUR[grid[r][c]] || "#ffffff";
                ctx.fillRect(Math.floor(c * cs), Math.floor(r * cs),
                            Math.ceil(cs), Math.ceil(cs));
            }
        }
        
        // Draw grid lines if cells are large enough
        if (cs >= 8) {
            ctx.strokeStyle = "rgba(0,0,0,0.07)";
            ctx.lineWidth = 0.5;
            for (let r = 0; r <= numRows; r++) {
                ctx.beginPath();
                ctx.moveTo(0, r * cs);
                ctx.lineTo(canvas.width, r * cs);
                ctx.stroke();
            }
            for (let c = 0; c <= numCols; c++) {
                ctx.beginPath();
                ctx.moveTo(c * cs, 0);
                ctx.lineTo(c * cs, canvas.height);
                ctx.stroke();
            }
        }
    }
    
    return {
        init,
        resizeCanvas,
        drawGrid
    };
})();