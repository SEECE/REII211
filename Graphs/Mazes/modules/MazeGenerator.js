/**
 * MazeGenerator.js - Handles maze generation using Prim's algorithm
 */

const MazeGenerator = (function() {
    const CELL = window.CELL || { WALL: 0, PATH: 1, START: 2, END: 3 };
    
    function initGrid(rows, cols) {
        const grid = [];
        for (let r = 0; r < rows; r++) {
            grid.push(new Array(cols).fill(CELL.WALL));
        }
        return grid;
    }
    
    function forceOdd(val, min, max) {
        let v = Math.max(min, Math.min(max, val));
        if (v % 2 === 0) v++;
        return v;
    }
    
    function getAllPassableCells(grid, rows, cols) {
        const passable = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c] === CELL.PATH) {
                    passable.push([r, c]);
                }
            }
        }
        return passable;
    }
    
    function generateMaze(rows, cols) {
        const grid = initGrid(rows, cols);
        const DIRS = [[-2,0], [2,0], [0,-2], [0,2]];
        
        function inBounds(r, c) {
            return r > 0 && r < rows - 1 && c > 0 && c < cols - 1;
        }
        
        const inMaze = new Set();
        const frontier = [];
        const inFrontier = new Set();
        
        function addToFrontier(r, c) {
            for (const [dr, dc] of DIRS) {
                const nr = r + dr, nc = c + dc;
                if (inBounds(nr, nc) && !inMaze.has(`${nr},${nc}`) && !inFrontier.has(`${nr},${nc}`)) {
                    frontier.push([nr, nc]);
                    inFrontier.add(`${nr},${nc}`);
                }
            }
        }
        
        const seedR = 1, seedC = 1;
        grid[seedR][seedC] = CELL.PATH;
        inMaze.add(`${seedR},${seedC}`);
        addToFrontier(seedR, seedC);
        
        while (frontier.length > 0) {
            const idx = Math.floor(Math.random() * frontier.length);
            const [fr, fc] = frontier[idx];
            frontier[idx] = frontier[frontier.length - 1];
            frontier.pop();
            
            const inNeighbours = [];
            for (const [dr, dc] of DIRS) {
                const nr = fr + dr, nc = fc + dc;
                if (inBounds(nr, nc) && inMaze.has(`${nr},${nc}`)) {
                    inNeighbours.push([nr, nc]);
                }
            }
            
            if (inNeighbours.length === 0) continue;
            
            const [nr, nc] = inNeighbours[Math.floor(Math.random() * inNeighbours.length)];
            const wr = (fr + nr) / 2, wc = (fc + nc) / 2;
            grid[wr][wc] = CELL.PATH;
            grid[fr][fc] = CELL.PATH;
            
            inMaze.add(`${fr},${fc}`);
            addToFrontier(fr, fc);
        }
        
        // Set start position (always top-left-ish area)
        grid[1][1] = CELL.START;
        
        // Find random end position (not too close to start)
        const passableCells = getAllPassableCells(grid, rows, cols);
        // Filter out cells too close to start (within 3 cells)
        const farCells = passableCells.filter(([r, c]) => {
            const distance = Math.abs(r - 1) + Math.abs(c - 1);
            return distance > 5; // Ensure end is reasonably far from start
        });
        
        if (farCells.length > 0) {
            const randomIndex = Math.floor(Math.random() * farCells.length);
            const [endR, endC] = farCells[randomIndex];
            grid[endR][endC] = CELL.END;
        } else {
            // Fallback to bottom-right if no far cells found
            grid[rows - 2][cols - 2] = CELL.END;
        }
        
        return grid;
    }
    
    return {
        generateMaze,
        forceOdd,
        initGrid
    };
})();