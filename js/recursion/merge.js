/* Merge sort, drawn as its call tree. Plain script, one global `MergeTree`.

   What the tree shows that the bar graph cannot: the shape is fixed by n alone — always
   ⌈log₂ n⌉ splits and so ⌈log₂ n⌉ + 1 levels, always in the same places, whatever the values
   are. Every level touches all n
   elements exactly once on the way back up, and n per level times log n levels IS the
   n log n. Read the tree top to bottom and that argument is the picture. */
(function () {
  'use strict';
  var R = window.Roles;

  /* The tape is the real array underneath the tree: merging writes the result straight back
     into positions lo‥hi, which is what a real merge sort does and what makes the write count
     on the workbench the true one. */
  function merge(left, right, tape, lo) {
    var out = [], i = 0, j = 0;
    while (i < left.length && j < right.length) {
      out.push(tape.lessVal(right[j], left[i]) ? right[j++] : left[i++]);
    }
    while (i < left.length) out.push(left[i++]);
    while (j < right.length) out.push(right[j++]);
    out.forEach(function (v, k) { tape.set(lo + k, v); });
    return out;
  }

  function* sort(tree, tape, parent, lo, hi, values) {
    var node = tree.open(parent, lo, hi, values);

    if (values.length < 2) {
      tree.close(node, values);
      yield {
        tag: 'depth ' + node.depth,
        note: 'A slice of ' + (values.length ? 'one' : 'zero') + ' element' +
          (values.length === 1 ? '' : 's') + ' is already sorted. This is the base case — the ' +
          'recursion stops here and starts returning.',
        roles: R.of({ done: [node.id] }),
      };
      return values;
    }

    var mid = values.length >> 1;
    yield {
      tag: 'depth ' + node.depth,
      note: 'Split <b>' + values.length + '</b> elements into <b>' + mid + '</b> and <b>' +
        (values.length - mid) + '</b>. The split point depends only on the LENGTH, never on ' +
        'the values — which is why merge sort has the same shape on every input.',
      roles: R.of({ focus: [node.id] }),
    };

    var left = yield* sort(tree, tape, node, lo, lo + mid, values.slice(0, mid));
    var right = yield* sort(tree, tape, node, lo + mid, hi, values.slice(mid));

    var merged = merge(left, right, tape, lo);
    tree.close(node, merged);
    yield {
      tag: 'depth ' + node.depth,
      note: 'Both children came back sorted, so merging them is one pass over <b>' +
        merged.length + '</b> elements. Every level of this tree merges all n elements exactly ' +
        'once — n per level, log n levels.',
      roles: R.of({ move: [node.id], done: node.kids.map(function (k) { return k.id; }) }),
    };
    return merged;
  }

  window.MergeTree = {
    label: 'Merge sort — the call tree',
    roles: ['idle', 'focus', 'move', 'done'],
    notes: {
      idle: { label: 'Waiting', desc: 'A call that has been entered but has not returned' },
      focus: { label: 'Splitting', desc: 'Being divided into two halves' },
      move: { label: 'Merging', desc: 'Its two children being merged back into it' },
      done: { label: 'Sorted', desc: 'This call has returned a sorted slice' },
    },
    run: function* (tree, tape, values) {
      yield* sort(tree, tape, null, 0, values.length, values);
      yield {
        tag: 'done',
        note: 'Sorted. The tree is <b>' + (tree.depth() + 1) + '</b> levels deep for <b>' +
          values.length + '</b> elements, and it would be that deep for any arrangement of ' +
          'them — merge sort has no bad input.',
        roles: R.of({ done: tree.nodes().map(function (n) { return n.id; }) }),
      };
    },
  };
})();
