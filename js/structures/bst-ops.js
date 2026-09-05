/* The three BST operations, narrated. Plain script, one global `BSTOps`.

   All three start the same way — walk down comparing, going left when the target is smaller —
   which is the property the whole structure exists for: one comparison eliminates an entire
   subtree. Insert stops at a null child, search stops at a match, and delete stops at a match
   and then has three cases to deal with.

   The delete cases are the reason this file exists rather than being three lines: a leaf just
   goes, a node with one child is replaced by that child, and a node with TWO children cannot
   be removed at all — its value is overwritten with its in-order successor, and the successor
   (which by construction has no left child) is deleted instead. */
(function () {
  'use strict';
  var R = window.Roles;

  function v(x) { return '<span class="val">' + x + '</span>'; }
  function pathOf(list) { return R.of({ scan: list }); }

  /* Walk from the root towards `value`, narrating each comparison.
     Returns { node, parent, side, path } — node is null if the value is not there. */
  function* descend(tree, value, verb) {
    var node = tree.root(), parent = null, side = null, path = [];
    while (node) {
      path.push(node.id);
      yield {
        tag: verb,
        note: 'At ' + v(node.value) + '. Compare the target ' + v(value) + ' against it.',
        roles: R.of({ scan: path.slice(0, -1), focus: [node.id] }),
      };
      if (tree.equalVal(node.value, value)) return { node: node, parent: parent, side: side, path: path };
      var goLeft = tree.lessVal(value, node.value);
      yield {
        tag: verb,
        note: v(value) + ' is ' + (goLeft ? 'smaller' : 'bigger') + ', so it can only be in the <b>' +
          (goLeft ? 'left' : 'right') + '</b> subtree. Everything on the other side is ' +
          'eliminated by that one comparison.',
        roles: R.of({ reject: [], scan: path, focus: [node.id] }),
      };
      parent = node;
      side = goLeft ? 'left' : 'right';
      node = goLeft ? node.left : node.right;
    }
    return { node: null, parent: parent, side: side, path: path };
  }

  window.BSTOps = {
    insert: function* (tree, value) {
      var spot = yield* descend(tree, value, 'insert');
      if (spot.node) {
        yield { tag: 'duplicate', note: v(value) + ' is already in the tree. A search tree ' +
          'holds each value once.', roles: R.of({ focus: [spot.node.id] }) };
        return;
      }
      var node = tree.make(value);
      if (!spot.parent) tree.setRoot(node); else tree.attach(spot.parent, spot.side, node);
      yield {
        tag: 'done',
        note: 'The walk ran off the bottom of the tree, so this is where ' + v(value) +
          ' belongs. Hang it there as a leaf — <b>nothing else moved</b>.' +
          (tree.height() > tree.stats().Ideal
            ? ' Note the height against the ideal: the tree is leaning.'
            : ''),
        roles: R.of({ scan: spot.path, move: [node.id] }),
      };
    },

    search: function* (tree, value) {
      if (!tree.root()) { yield { note: 'The tree is empty.', roles: {} }; return; }
      var spot = yield* descend(tree, value, 'search');
      yield {
        tag: spot.node ? 'found' : 'not found',
        note: spot.node
          ? 'Found ' + v(value) + ' after <b>' + spot.path.length + '</b> node' +
            (spot.path.length === 1 ? '' : 's') + '. Each level costs the same fixed handful of ' +
            'comparisons — so what the search costs is the <b>height</b> of the tree, not the ' +
            'number of nodes in it. Check the counter against the depth you just walked.'
          : v(value) + ' is not in the tree — the walk reached a missing child, and there is ' +
            'nowhere else it could have been.',
        roles: spot.node ? R.of({ scan: spot.path.slice(0, -1), done: [spot.node.id] })
          : R.of({ reject: spot.path }),
      };
    },

    remove: function* (tree, value) {
      if (!tree.root()) { yield { note: 'The tree is empty.', roles: {} }; return; }
      var spot = yield* descend(tree, value, 'delete');
      if (!spot.node) {
        yield { tag: 'not found', note: v(value) + ' is not in the tree.', roles: R.of({ reject: spot.path }) };
        return;
      }
      var node = spot.node, parent = spot.parent, side = spot.side;

      if (node.left && node.right) {
        yield {
          tag: 'two children',
          note: 'This node has <b>both</b> children, so it cannot simply be unhooked — the two ' +
            'subtrees would have nowhere to go. Instead find its <b>in-order successor</b>: the ' +
            'smallest value in the right subtree, which is the next value up from this one.',
          roles: R.of({ focus: [node.id], scan: spot.path }),
        };
        var sParent = node, s = node.right;
        while (s.left) {
          yield {
            tag: 'successor',
            note: 'Go as far left as possible from the right child — left is always smaller.',
            roles: R.of({ focus: [s.id], scan: spot.path }),
          };
          sParent = s;
          s = s.left;
        }
        yield {
          tag: 'successor',
          note: 'The successor is ' + v(s.value) + '. By construction it has <b>no left child</b>, ' +
            'so it is one of the easy cases — copy its value up and delete it instead.',
          roles: R.of({ move: [node.id], focus: [s.id] }),
        };
        tree.overwrite(node, s.value);
        tree.attach(sParent, sParent === node ? 'right' : 'left', s.right);
        tree.drop();
        yield {
          tag: 'done',
          note: 'Value copied and the successor unlinked. The search-tree order still holds: ' +
            'everything left of ' + v(s.value) + ' is still smaller, everything right still bigger.',
          roles: R.of({ done: [node.id] }),
        };
        return;
      }

      var child = node.left || node.right;
      if (!parent) tree.setRoot(child); else tree.attach(parent, side, child);
      tree.drop();
      yield {
        tag: 'done',
        note: child
          ? 'One child only, so the child takes its parent\'s place — the whole subtree moves ' +
            'up a level and every value in it is still on the correct side of its ancestors.'
          : 'A leaf, so it simply goes.',
        roles: R.of({ scan: spot.path.slice(0, -1), done: child ? [child.id] : [] }),
      };
    },
  };
})();
