/* Quick sort, drawn as its call tree. Plain script, one global `QuickTree`.

   This is the page that makes the case for pivot choice, and it needs the tree to make it. On
   the bar graph a bad pivot just looks slow; here it is visible as SHAPE — a balanced pivot
   gives a bushy tree ~log n deep, and a pivot that is always the smallest or largest element
   gives a ladder n deep with one element peeled off per level. That ladder is the Θ(n²).

   Run it on an already-sorted array with the last-element pivot, look at the shape, then
   switch to median-of-three on the same array.

   The partition itself is NOT written here: it is the generator js/sorting/quick.js registers,
   run on the same tape and re-labelled onto the node it belongs to. So the scan is watched a
   comparison at a time on this page too, and the two pages cannot disagree about what quick
   sort does to an array — which they did, because this file used to split a slice into two
   fresh arrays in one beat. */
(function () {
  'use strict';
  var R = window.Roles;

  /* Play a partition (or a pivot choice) inside `node`: one tree beat per beat it yields, with
     the node's own values refreshed off the tape first so the box shows the swap that just
     happened. The prose is the bar page's — it names real positions in the real array, which
     is what a slice of the tree is. */
  function* inside(gen, tree, tape, node) {
    var step = gen.next();
    while (!step.done) {
      tree.touch(node, tape.slice(node.lo, node.hi));
      yield {
        tag: 'depth ' + node.depth,
        note: step.value.note,
        roles: R.of({ focus: [node.id] }),
      };
      step = gen.next();
    }
    tree.touch(node, tape.slice(node.lo, node.hi));
    return step.value;
  }

  function* sort(tree, tape, parent, lo, hi, strategy) {
    var node = tree.open(parent, lo, hi + 1, tape.slice(lo, hi + 1));

    if (lo >= hi) {
      tree.close(node, tape.slice(lo, hi + 1));
      yield {
        tag: 'depth ' + node.depth,
        note: 'One element — nothing to partition. Base case.',
        roles: R.of({ done: [node.id] }),
      };
      return;
    }

    var Q = window.Sorts.get('quick');
    yield* inside(Q.choosePivot(tape, lo, hi, strategy), tree, tape, node);
    var p = yield* inside(Q.partition(tape, lo, hi, node.depth), tree, tape, node);

    var left = p - lo, right = hi - p;
    yield {
      tag: 'depth ' + node.depth,
      note: 'The scan is done: <b>' + left + '</b> elements ended up left of the pivot and <b>' +
        right + '</b> right of it, and the pivot itself is finished. Those two sides are the ' +
        'two calls below.' +
        (Math.min(left, right) === 0
          ? ' <b>One side is empty</b> — this level removed a single element and handed the ' +
            'rest straight down. Do that every level and the tree is n deep.'
          : ' A split near the middle is what buys the log n depth.'),
      roles: R.of({ focus: [node.id] }),
    };

    /* An empty side is not a call: recursing on it drew a blank box on the tree and took a
       leaf column with it, which is what crowded every other node off the stage. */
    if (left) yield* sort(tree, tape, node, lo, p - 1, strategy);
    if (right) yield* sort(tree, tape, node, p + 1, hi, strategy);

    tree.close(node, tape.slice(lo, hi + 1));
    yield {
      tag: 'depth ' + node.depth,
      note: 'Both sides came back sorted. There is no merge step: the pivot was already in its ' +
        'final place, so the two sorted sides simply sit either side of it.',
      roles: R.of({ done: [node.id].concat(node.kids.map(function (k) { return k.id; })) }),
    };
  }

  window.QuickTree = {
    label: 'Quick sort — the call tree',
    roles: ['idle', 'focus', 'done'],
    notes: {
      idle: { label: 'Waiting', desc: 'Entered, not yet returned' },
      focus: { label: 'Partitioning', desc: 'Being scanned and split around its pivot' },
      done: { label: 'Sorted', desc: 'This call has returned a sorted slice' },
    },
    run: function* (tree, tape, values, strategy) {
      yield* sort(tree, tape, null, 0, tape.size - 1, strategy);
      /* The fewest levels a quick sort tree over n elements can have. A call of size k splits
         into two of size a and b with a + b = k - 1 — the pivot itself is not handed down — so
         the best case is ⌈log₂(n+1)⌉, NOT ⌈log₂ n⌉. Getting that wrong made the page claim a
         perfect tree was deeper than the one median-of-three had just built in front of you. */
      var ideal = Math.max(1, Math.ceil(Math.log2(tape.size + 1)));
      yield {
        tag: 'done',
        note: 'Sorted, in <b>' + (tree.depth() + 1) + '</b> levels. A perfectly balanced tree ' +
          'over ' + tape.size + ' elements would be <b>' + ideal + '</b>. The gap ' +
          'between those two numbers is what the pivot choice cost you.',
        roles: R.of({ done: tree.nodes().map(function (n) { return n.id; }) }),
      };
    },
  };
})();
