/* The legend — what each colour on the stage means. Plain script, one global `Legend`.

   The captions live HERE, next to the role names in css/tokens.css, and a page names only the
   roles it actually uses:

       Legend(el, ['idle', 'scan', 'move', 'done'], { scan: 'The pair being compared' });

   The old site hand-wrote a legend block in every page's HTML — five nested divs per entry,
   duplicated across eight sorting pages — and several were stale: the bubble-sort page still
   labelled a colour "Minimum" from the selection-sort page it was copied from. A legend built
   from the same role names the renderer paints with cannot say the wrong thing. */
(function () {
  'use strict';

  var CAPTIONS = {
    idle: ['Untouched', 'Not looked at yet'],
    scan: ['Reading', 'Being compared or read right now'],
    focus: ['Cursor', 'The pivot, the key, or the node under the head'],
    move: ['Writing', 'Being swapped, written or relinked'],
    done: ['Settled', 'In its final place — it will not move again'],
    reject: ['Discarded', 'Considered and passed over'],
    path: ['Chosen', 'On the path, the tour or the tree that was picked'],
    frontier: ['Queued', 'Discovered, waiting its turn'],
    wall: ['Blocked', 'A wall, or a slot that cannot be used'],
  };

  window.Legend = function (root, roles, overrides) {
    root.innerHTML = '';
    (roles || []).forEach(function (role) {
      var caption = CAPTIONS[role] || [role, ''];
      var over = (overrides && overrides[role]) || null;
      var label = over ? (over.label || caption[0]) : caption[0];
      var desc = over ? (typeof over === 'string' ? over : over.desc || caption[1]) : caption[1];

      var item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML =
        '<span class="legend-swatch" style="--swatch: var(--role-' + role + ')" aria-hidden="true"></span>' +
        '<span class="legend-text"><b class="legend-label">' + label + '</b>' +
        (desc ? '<span class="legend-desc">' + desc + '</span>' : '') + '</span>';
      root.appendChild(item);
    });
    return root;
  };
  window.Legend.captions = CAPTIONS;
})();
