/**
 * DFS.js – Depth-First Search maze solver
 * Junction-to-Junction DFS with proper corridor walking
 */

(function() {

    function solveDFS(gridIn, numRows, numCols, stepMode) {
        const solver = new window.MazeSolver(gridIn, numRows, numCols, stepMode);
        
        if (!solver.hasValidStartAndGoal()) {
            return solver.getResult();
        }

        const parent = new Map();
        const visited = new Set();
        const stack = [];

        const startKey = `${solver.startR},${solver.startC}`;
        visited.add(startKey);
        parent.set(startKey, null);
        stack.push([solver.startR, solver.startC]);

        let found = false;

        while (stack.length > 0 && !found) {
            const [r, c] = stack.pop();

            // Get unvisited neighbours
            const neighbours = solver.getPassableNeighbours(r, c, false)
                .filter(([nr, nc]) => !visited.has(`${nr},${nc}`));

            for (const [nr, nc] of neighbours) {
                if (visited.has(`${nr},${nc}`)) continue;

                const corridor = solver.walkToJunction(nr, nc, r, c);
                
                // Mark the entire corridor as visited in ONE step
                solver.markCorridorVisited(corridor.path);
                
                const epKey = `${corridor.r},${corridor.c}`;

                if (!visited.has(epKey)) {
                    visited.add(epKey);
                    parent.set(epKey, [r, c]);
                    stack.push([corridor.r, corridor.c]);

                    if (corridor.isGoal) {
                        found = true;
                        break;
                    }
                }
            }
        }

        if (found) {
            solver.reconstructPath(parent);
        }

        return solver.getResult();
    }

    window.solveDFS = solveDFS;

})();