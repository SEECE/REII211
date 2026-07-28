/**
 * BFS.js – Breadth-First Search maze solver
 * Junction-to-Junction BFS with proper corridor walking
 */

(function () {

    function solveBFS(gridIn, numRows, numCols, stepMode) {
        const solver = new window.MazeSolver(gridIn, numRows, numCols, stepMode);

        if (!solver.hasValidStartAndGoal()) {
            return solver.getResult();
        }

        const parent = new Map();
        const visited = new Set();
        const queue = [];

        const startKey = `${solver.startR},${solver.startC}`;
        visited.add(startKey);
        parent.set(startKey, null);
        queue.push([solver.startR, solver.startC]);

        let found = false;

        while (queue.length > 0 && !found) {
            const [r, c] = queue.shift();

            // Get all passable neighbours to explore
            const neighbours = solver.getPassableNeighbours(r, c, false);

            for (const [nr, nc] of neighbours) {
                const neighbourKey = `${nr},${nc}`;
                if (visited.has(neighbourKey)) continue;

                // Walk from this neighbour to the next junction
                const corridor = solver.walkToJunction(nr, nc, r, c);
                
                // Mark the entire corridor as visited in ONE step
                solver.markCorridorVisited(corridor.path);
                
                const epKey = `${corridor.r},${corridor.c}`;

                if (!visited.has(epKey)) {
                    visited.add(epKey);
                    parent.set(epKey, [r, c]);
                    queue.push([corridor.r, corridor.c]);

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

    window.solveBFS = solveBFS;

})();