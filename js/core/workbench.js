/* The workbench panel — the RUN, bound to a Player. Plain script, one global `Workbench`.

   It renders whatever the current frame says (title, narration, counts, progress) and owns the
   transport row. It knows nothing about sorting, graphs or trees: a frame is a frame.

   Elements are found by id, so page markup can be rearranged freely — but the ids are the
   contract (see structure/FRONTEND.md):

       #step-count #step-title #step-body #step-progress #step-readout
       #step-prev #step-play #step-next #step-speed #step-speed-val

   Everything here used to live in the left control panel next to "array size", which is why
   that column did not fit a laptop. Setup on the left, the walk on the right. */
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

    function stats(map) {
      if (!el.readout) return;
      if (!map) { el.readout.innerHTML = ''; return; }
      var html = '';
      for (var key in map) {
        var v = map[key];
        var soft = typeof v === 'string';
        html += '<span class="readout-cell"><span class="readout-key">' + key + '</span>' +
          '<span class="readout-val' + (soft ? ' readout-val--soft' : '') + '">' +
          (typeof v === 'number' ? v.toLocaleString() : v) + '</span></span>';
      }
      el.readout.innerHTML = '<div class="readout-grid">' + html + '</div>';
    }

    function frame(i, f) {
      if (!f) return;
      var total = player.length();
      if (el.count) el.count.textContent = (i + 1) + ' / ' + total;
      if (el.title) el.title.innerHTML = (f.tag ? '<span class="step-badge">' + f.tag + '</span>' : '') + heading;
      if (el.body) el.body.innerHTML = f.note || '';
      if (el.progress) {
        el.progress.firstElementChild.style.width =
          (total < 2 ? 100 : (i / (total - 1)) * 100) + '%';
      }
      stats(f.stats);
    }

    function state() {
      var i = player.index(), last = player.length() - 1;
      if (el.prev) el.prev.disabled = i <= 0;
      if (el.next) el.next.disabled = i >= last;
      if (el.play) {
        el.play.disabled = last < 1;
        el.play.dataset.playing = String(player.playing());
        el.play.lastChild.textContent = player.playing() ? 'Pause' : 'Play';
        el.play.setAttribute('aria-label', player.playing() ? 'Pause the walk' : 'Play the walk');
      }
    }

    if (el.prev) el.prev.addEventListener('click', function () { player.step(-1); });
    if (el.next) el.next.addEventListener('click', function () { player.step(1); });
    if (el.play) el.play.addEventListener('click', function () { player.toggle(); });
    if (el.speed) {
      el.speed.addEventListener('input', function () {
        player.setSpeed(Number(el.speed.value));
        if (el.speedVal) el.speedVal.textContent = el.speed.value + '×';
      });
      player.setSpeed(Number(el.speed.value));
      if (el.speedVal) el.speedVal.textContent = el.speed.value + '×';
    }

    return {
      /* the page's heading for the walk — "Bubble sort", "Dijkstra from A" */
      setTitle: function (t) { heading = t; },
      onFrame: frame,
      onState: state,
    };
  };
})();
