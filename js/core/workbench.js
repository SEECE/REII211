/* The workbench panel — the RUN, bound to a Player. Plain script, one global `Workbench`.

   It renders whatever the current frame says (title, narration, counts, progress) and owns the
   transport row. It knows nothing about sorting, graphs or trees: a frame is a frame.

   Elements are found by id, so page markup can be rearranged freely — but the ids are the
   contract (see structure/FRONTEND.md):

       #step-count #step-title #step-body #step-progress #step-readout
       #step-prev #step-play #step-next #step-speed #step-speed-val

   Everything here used to live in the left control panel next to "array size", which is why
   that column did not fit a laptop. Setup on the left, the walk on the right.

   **Nothing is written to the DOM twice.** A frame arrives as often as the player ticks — on
   the colour block that is hundreds a second — and most of what a frame says does not change
   between one and the next: the race yields the same paragraph of narration for thousands of
   frames running, and the counters beside it change one digit. Assigning innerHTML re-parses
   the markup and throws away the layout whether or not anything differs, and #step-title is
   aria-live, so an identical rewrite also re-announces it to a screen reader. So each piece
   remembers what it last showed and a write that would change nothing does not happen. */
(function () {
  'use strict';

  function byId(id) { return document.getElementById(id); }

  window.Workbench = function (player, opts) {
    var el = {
      count: byId('step-count'), title: byId('step-title'), body: byId('step-body'),
      progress: byId('step-progress'), readout: byId('step-readout'),
      prev: byId('step-prev'), play: byId('step-play'), next: byId('step-next'),
      speed: byId('step-speed'), speedVal: byId('step-speed-val'),
    };
    var heading = (opts && opts.title) || 'Walk the algorithm';
    var shown = {};                  // the last thing each piece was given, so it is not re-given
    var cells = {};                  // the .readout-val of each counter, once the grid exists

    /* The counters keep their grid and only the numbers inside it move. Rebuilding the markup
       every frame was the single most expensive thing on this panel, and it changed the same
       three or four digits each time. The grid is rebuilt only when the SET of counters
       changes, which is when a page loads a different kind of run. */
    function stats(map) {
      if (!el.readout) return;
      var keys = map ? Object.keys(map) : [];
      var shape = keys.join('\u0001');
      if (shape !== shown.shape) {
        el.readout.innerHTML = keys.length ? '<div class="readout-grid">' + keys.map(function (key) {
          return '<span class="readout-cell"><span class="readout-key">' + key + '</span>' +
            '<span class="readout-val"></span></span>';
        }).join('') + '</div>' : '';
        var found = el.readout.querySelectorAll('.readout-val');
        cells = {};
        keys.forEach(function (key, n) { cells[key] = found[n]; });
        shown.shape = shape;
        shown.values = {};
      }
      keys.forEach(function (key) {
        var v = map[key];
        var text = typeof v === 'number' ? v.toLocaleString() : String(v);
        if (shown.values[key] === text) return;
        shown.values[key] = text;
        cells[key].textContent = text;
        cells[key].className = 'readout-val' + (typeof v === 'string' ? ' readout-val--soft' : '');
      });
    }

    function set(node, key, value, html) {
      if (!node || shown[key] === value) return;
      shown[key] = value;
      if (html) node.innerHTML = value; else node.textContent = value;
    }

    function frame(i, f) {
      if (!f) return;
      /* `total` is null while a live trace is still being discovered, and "step 41,802 of
         41,802" would be a fraction of a number nobody knows yet. A run that cannot say how
         long it is counts instead, and takes its progress from the frame — the race reports
         how many lanes are home, which is the only honest answer it has. */
      var total = player.total();
      set(el.count, 'count', total == null ? (i + 1).toLocaleString() + ' steps'
        : (i + 1).toLocaleString() + ' / ' + total.toLocaleString());
      set(el.title, 'title',
        (f.tag ? '<span class="step-badge">' + f.tag + '</span>' : '') + heading, true);
      set(el.body, 'note', f.note || '', true);
      if (el.progress) {
        var done = f.progress != null ? f.progress
          : total == null ? 0 : total < 2 ? 1 : i / (total - 1);
        var width = (Math.max(0, Math.min(1, done)) * 100).toFixed(2) + '%';
        if (shown.width !== width) {
          shown.width = width;
          el.progress.firstElementChild.style.width = width;
        }
      }
      stats(f.stats);
    }

    /* Called on every frame as well as on every real state change, so it is guarded the same
       way: four attribute writes a frame is four style invalidations for a button that has
       looked identical for the last ten thousand of them. */
    function state() {
      var i = player.index(), more = player.hasNext(), back = player.hasPrev();
      var alone = !back && !more;                // a one-frame run has nothing to transport
      var now = back + '|' + more + '|' + alone + '|' + player.playing();
      if (now === shown.transport) return;
      shown.transport = now;
      if (el.prev) el.prev.disabled = !back;
      if (el.next) el.next.disabled = !more;
      if (el.play) {
        el.play.disabled = alone;
        el.play.dataset.playing = String(player.playing());
        el.play.lastChild.textContent = player.playing() ? 'Pause' : 'Play';
        el.play.setAttribute('aria-label', player.playing() ? 'Pause the walk' : 'Play the walk');
      }
    }

    if (el.prev) el.prev.addEventListener('click', function () { player.step(-1); });
    if (el.next) el.next.addEventListener('click', function () { player.step(1); });
    if (el.play) el.play.addEventListener('click', function () { player.toggle(); });

    /* Walking the trace by hand is the point of the page, so it is also on the arrow keys —
       a student reading the narration should not have to go back to the mouse between steps.
       Bound on the document because there is nothing sensible to focus first, and skipped
       while a field has focus: Left in a range input is the student moving the slider, and
       Space on a focused button is that button, not this one. */
    document.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(t.tagName))) return;
      if (e.key === 'ArrowLeft') player.step(-1);
      else if (e.key === 'ArrowRight') player.step(1);
      else if (e.key === ' ' || e.key === 'Spacebar') player.toggle();
      else return;
      e.preventDefault();
    });
    /* The speed label says the stride once it is more than one: past the point where the timer
       cannot tick any faster, turning the slider up advances several frames per paint rather
       than painting faster, and a student watching swaps go by needs to know which they are
       looking at. */
    function speed() {
      player.setSpeed(Number(el.speed.value));
      var stride = player.stride();
      if (el.speedVal) {
        el.speedVal.innerHTML = el.speed.value + '×' +
          (stride > 1 ? ' <small>· ' + stride + ' a frame</small>' : '');
      }
    }
    if (el.speed) {
      el.speed.addEventListener('input', speed);
      speed();
    }

    return {
      /* the page's heading for the walk — "Bubble sort", "Dijkstra from A" */
      setTitle: function (t) { heading = t; shown.title = null; },
      onFrame: frame,
      onState: state,
    };
  };
})();
