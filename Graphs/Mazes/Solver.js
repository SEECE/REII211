/**
 * Solver.js – Shared base class for maze solving algorithms
 */

(function () {

    const CELL = {
        WALL: 0,
        PATH: 1,
        START: 2,
        END: 3,
        VISITED: 4,
        SOLUTION: 5,
    };

    class MazeSolver {
        constructor(gridIn, numRows, numCols, stepMode) {
            this.grid = this.cloneGrid(gridIn);
            this.numRows = numRows;
            this.numCols = numCols;
            this.stepMode = stepMode;
            this.steps = [];

            this.findStartAndGoal();
        }

        cloneGrid(g) {
            return g.map(row => row.slice());
        }

        findStartAndGoal() {
            this.startR = -1;
            this.startC = -1;
            this.goalR = -1;
            this.goalC = -1;

            for (let r = 0; r < this.numRows; r++) {
                for (let c = 0; c < this.numCols; c++) {
                    if (this.grid[r][c] === CELL.START) {
                        this.startR = r;
                        this.startC = c;
                    }
                    if (this.grid[r][c] === CELL.END) {
                        this.goalR = r;
                        this.goalC = c;
                    }
                }
            }
        }

        hasValidStartAndGoal() {
            return this.startR !== -1 && this.goalR !== -1;
        }

        getPassableNeighbours(r, c, includeVisited = false) {
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            const result = [];

            for (const [dr, dc] of dirs) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < this.numRows && nc >= 0 && nc < this.numCols) {
                    const cell = this.grid[nr][nc];
                    if (cell !== CELL.WALL) {
                        if (includeVisited || cell !== CELL.VISITED) {
                            result.push([nr, nc]);
                        }
                    }
                }
            }
            return result;
        }

        /**
         * Walk from a cell to the next junction/dead-end/goal
         * Returns the endpoint and the path taken (all cells in the corridor)
         */
        walkToJunction(startR, startC, fromR, fromC) {
            let currentR = startR;
            let currentC = startC;
            let prevR = fromR;
            let prevC = fromC;
            
            const path = [[currentR, currentC]]; // Track all cells in this corridor

            while (true) {
                // Check if we reached the goal
                if (currentR === this.goalR && currentC === this.goalC) {
                    return { r: currentR, c: currentC, isGoal: true, path: path };
                }

                // Get unvisited neighbours (excluding where we came from)
                const neighbours = this.getPassableNeighbours(currentR, currentC, false)
                    .filter(([nr, nc]) => !(nr === prevR && nc === prevC));

                // If we have 0 neighbours → dead end
                // If we have 2+ neighbours → junction
                // If we have 1 neighbour → continue straight
                if (neighbours.length !== 1) {
                    return { r: currentR, c: currentC, isGoal: false, path: path };
                }

                // Continue straight
                const next = neighbours[0];
                path.push([next[0], next[1]]);
                prevR = currentR;
                prevC = currentC;
                currentR = next[0];
                currentC = next[1];
            }
        }

        /**
         * Mark an entire corridor as visited in ONE step
         */
        markCorridorVisited(path) {
            // Mark all cells in the path as visited
            for (const [r, c] of path) {
                if (this.grid[r][c] !== CELL.START && this.grid[r][c] !== CELL.END) {
                    this.grid[r][c] = CELL.VISITED;
                }
            }
            // Record a SINGLE snapshot for the entire corridor
            this.recordSnapshot();
        }

        /**
         * Find full path between two points for solution drawing
         */
        findFullPath(startR, startC, endR, endC) {
            const queue = [[startR, startC]];
            const parent = new Map();
            parent.set(`${startR},${startC}`, null);
            const visitedSet = new Set();
            visitedSet.add(`${startR},${startC}`);

            while (queue.length > 0) {
                const [r, c] = queue.shift();

                if (r === endR && c === endC) {
                    const path = [];
                    let cur = `${r},${c}`;
                    while (cur) {
                        const [pr, pc] = cur.split(',').map(Number);
                        path.unshift([pr, pc]);
                        const p = parent.get(cur);
                        cur = p ? `${p[0]},${p[1]}` : null;
                    }
                    return path;
                }

                const neighbours = this.getPassableNeighbours(r, c, true);
                for (const [nr, nc] of neighbours) {
                    const key = `${nr},${nc}`;
                    if (visitedSet.has(key)) continue;
                    if (this.grid[nr][nc] !== CELL.VISITED &&
                        this.grid[nr][nc] !== CELL.START &&
                        this.grid[nr][nc] !== CELL.END) continue;
                    visitedSet.add(key);
                    parent.set(key, [r, c]);
                    queue.push([nr, nc]);
                }
            }
            return [];
        }

        recordSnapshot() {
            if (this.stepMode) {
                this.steps.push(this.cloneGrid(this.grid));
            }
        }

        /**
         * Reconstruct solution path - each corridor fills in ONE step
         */
        reconstructPath(parentMap) {
            // Collect junction waypoints
            const waypoints = [];
            let key = `${this.goalR},${this.goalC}`;
            while (key) {
                const [wr, wc] = key.split(',').map(Number);
                waypoints.unshift([wr, wc]);
                const p = parentMap.get(key);
                key = p ? `${p[0]},${p[1]}` : null;
            }

            // Fill paths between waypoints - each full path is ONE step
            for (let i = 0; i < waypoints.length - 1; i++) {
                const [fromR, fromC] = waypoints[i];
                const [toR, toC] = waypoints[i + 1];
                const fullPath = this.findFullPath(fromR, fromC, toR, toC);

                // Mark all solution cells in this corridor at once
                for (const [r, c] of fullPath) {
                    if (this.grid[r][c] !== CELL.START && this.grid[r][c] !== CELL.END) {
                        this.grid[r][c] = CELL.SOLUTION;
                    }
                }
                // Single snapshot for the entire solution corridor
                this.recordSnapshot();
            }

            this.grid[this.startR][this.startC] = CELL.START;
            this.grid[this.goalR][this.goalC] = CELL.END;
            this.recordSnapshot();
        }

        getResult() {
            return {
                steps: this.steps,
                finalGrid: this.cloneGrid(this.grid)
            };
        }
    }

    window.MazeSolver = MazeSolver;
    window.CELL = CELL;

})();