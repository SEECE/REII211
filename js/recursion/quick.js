/* Quick sort, drawn as its call tree. Plain script, one global `QuickTree`.

   This is the page that makes the case for pivot choice, and it needs the tree to make it. On
   the bar graph a bad pivot just looks slow; here it is visible as SHAPE — a balanced pivot
   gives a bushy tree ~log n deep, and a pivot that is always the smallest or largest element
   gives a ladder n deep with one element peeled off per level. That ladder is the Θ(n²).

   Run it on an already-sorted array with the last-element pivot, look at the shape, then
   switch to median-of-three on the same array. */
(function () {
  'use strict';
  var R = window.Roles;

  /* Order the three INDICES by the values they point at, which leaves the median in `mid`.
     These are the same three comparisons js/sorting/quick.js pays on the bar graph, made
     through the same tape — so the two pages report the same cost for the same pivot choice.
     Sorting a trio on the side and charging a guessed number for it is how the two drift. */
  function pick(values, strategy, tape) {
    if (strategy !== 'median' || values.length < 3) return values.length - 1;
    var lo = 0, mid = values.length >> 1, hi = values.length - 1, s;
    if (tape.lessVal(values[mid], values[lo])) { s = lo; lo = mid; mid = s; }
    if (tape.lessVal(values[hi], values[lo])) { s = lo; lo = hi; hi = s; }
    if (tape.lessVal(values[hi], values[mid])) { s = mid; mid = hi; hi = s; }
    return mid;
  }

  function* sort(tree, tape, parent, lo, values, strategy) {
    var node = tree.open(parent, lo, lo + values.length, values);

    if (values.length < 2) {
      tree.close(node, values);
      yield {
        tag: 'depth ' + node.depth,
        note: 'One element — nothing to partition. Base case.',
        roles: R.of({ done: [node.id] }),
      };
      return values;
    }

    var p = pick(values, strategy, tape);
    var pivot = values[p];
    var left = [], right = [];
    values.forEach(function (v, i) {
      if (i === p) return;
      if (tape.lessVal(v, pivot)) left.push(v); else right.push(v);
    });
    tree.touch(node, left.concat([pivot], right));

    yield {
      tag: 'depth ' + node.depth,
      note: 'Pivot <b>' + pivot + '</b>. Everything smaller goes left (<b>' + left.length +
        '</b>), everything else goes right (<b>' + right.length + '</b>).' +
        (Math.min(left.length, right.length) === 0
          ? ' <b>One side is empty</b> — this level removed a single element and handed the ' +
            'rest straight down. Do that every level and the tree is n deep.'
          : ' A split near the middle is what buys the log n depth.'),
      roles: R.of({ focus: [node.id] }),
    };

    /* An empty side is not a call: recursing on it drew a blank box on the tree and took a
       leaf column with it, which is what crowded every other node off the stage. The lean it
       causes is already the point of the partition beat above. */
    var sortedLeft = left.length ? yield* sort(tree, tape, node, lo, left, strategy) : left;
    var sortedRight = right.length
      ? yield* sort(tree, tape, node, lo + left.length + 1, right, strategy) : right;

    var out = sortedLeft.concat([pivot], sortedRight);
    out.forEach(function (v, k) { tape.set(lo + k, v); });
    tree.close(node, out);
    yield {
      tag: 'depth ' + node.depth,
      note: 'Both sides came back sorted. There is no merge step: the pivot was already in its ' +
        'final place, so the two sorted sides simply sit either side of it.',
      roles: R.of({ done: [node.id].concat(node.kids.map(function (k) { return k.id; })) }),
    };
    return out;
  }

  window.QuickTree = {
    label: 'Quick sort — the call tree',
    roles: ['idle', 'focus', 'done'],
    notes: {
      idle: { label: 'Waiting', desc: 'Entered, not yet returned' },
      focus: { label: 'Partitioning', desc: 'Being split around its pivot' },
      done: { label: 'Sorted', desc: 'This call has returned a sorted slice' },
    },
    run: function* (tree, tape, values, strategy) {
      yield* sort(tree, tape, null, 0, values, strategy);
      /* The fewest levels a quick sort tree over n elements can have. A call of size k splits
         into two of size a and b with a + b = k - 1 — the pivot itself is not handed down — so
         the best case is ⌈log₂(n+1)⌉, NOT ⌈log₂ n⌉. Getting that wrong made the page claim a
         perfect tree was deeper than the one median-of-three had just built in front of you. */
      var ideal = Math.max(1, Math.ceil(Math.log2(values.length + 1)));
      yield {
        tag: 'done',
        note: 'Sorted, in <b>' + (tree.depth() + 1) + '</b> levels. A perfectly balanced tree ' +
          'over ' + values.length + ' elements would be <b>' + ideal + '</b>. The gap ' +
          'between those two numbers is what the pivot choice cost you.',
        roles: R.of({ done: tree.nodes().map(function (n) { return n.id; }) }),
      };
    },
  };
})();
