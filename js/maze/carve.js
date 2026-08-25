/* Carving the maze. Plain script, one global `MazeCarve`.

   The carver is a depth-first search that knocks the wall down behind it, which is worth
   watching because it explains the mazes it produces: DFS goes as deep as it can before
   backing up, so a recursive-backtracker maze has long winding corridors and few short
   branches. Prim's carver picks a random wall from everything on the frontier instead, and
   makes the opposite kind of maze — bushy, with many short dead ends.

   Both produce a PERFECT maze: every cell reachable, exactly one route between any two, no
   loops. That is what makes the search afterwards a fair comparison. */
(function () {
  'use strict';
  var R = window.Roles;

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  window.MazeCarve = {
    label: 'Carving the maze',
    roles: ['wall', 'frontier', 'focus', 'done'],
    notes: {
      wall: { label: 'Solid', desc: 'Not carved into yet' },
      frontier: { label: 'On the stack', desc: 'Carved, still has somewhere to go back to' },
      focus: { label: 'Digging', desc: 'The cell the carver is standing in' },
      done: { label: 'Carved', desc: 'Part of the maze' },
    },

    /* backtracker = DFS; prim = random frontier. One walk, one flag, same as the searches. */
    run: function* (grid, style) {
      var carved = {}, stack = [grid.start];
      carved[grid.start] = true;
      yield {
        tag: style === 'prim' ? "Prim's" : 'backtracker',
        note: style === 'prim'
          ? 'Start anywhere and keep a set of every wall touching the carved region. Knock a ' +
            '<b>random</b> one down each step. Choosing at random keeps the region compact, ' +
            'which gives a bushy maze full of short dead ends.'
          : 'A depth-first carve: walk to a random unvisited neighbour, knock the wall down, ' +
            'and only back up when there is nowhere left to go. Going deep before going wide ' +
            'is what gives this maze its long corridors.',
        roles: R.of({ focus: [grid.start] }),
      };

      while (stack.length) {
        var at = style === 'prim'
          ? stack[Math.floor(Math.random() * stack.length)]
          : stack[stack.length - 1];
        var options = shuffle(grid.around(at).filter(function (n) { return !carved[n.to]; }));

        if (!options.length) {
          stack.splice(stack.indexOf(at), 1);
          yield {
            tag: 'backtrack',
            note: 'Every neighbour of this cell is already carved, so there is nothing to do ' +
              'here. Drop it and carry on from somewhere that still has a way out.',
            roles: R.of({ done: Object.keys(carved).map(Number), frontier: stack, focus: [at] }),
          };
          continue;
        }

        var pick = options[0];
        grid.open(at, pick);
        carved[pick.to] = true;
        grid.settle();
        stack.push(pick.to);
        yield {
          tag: 'carve',
          note: 'Knock down the wall to the ' + pick.dir.name.toUpperCase() + ' and step through. ' +
            'The new cell had never been reached before, which is what stops a loop ever forming.',
          roles: R.of({ done: Object.keys(carved).map(Number), frontier: stack, focus: [pick.to] }),
        };
      }

      yield {
        tag: 'done',
        note: 'Every cell is carved and there are no loops — a <b>perfect maze</b>, with exactly ' +
          'one route between any two cells. Now search it.',
        roles: R.of({ done: Object.keys(carved).map(Number) }),
      };
    },
  };
})();
