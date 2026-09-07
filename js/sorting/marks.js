/* The marking table — the run written out the way it is marked on paper. Plain script, one
   global `Marks`.

   A bar graph shows you the array. It does not show you the ANSWER a student is asked to
   write in a test, which is one line of the array per change:

       step   [0]  [1]  [2]
        0      3    1    2
        1      1    3    2
        2      1    2    3

   So the stage carries a second view of the same trace, and the workbench swaps between them.
   It is not a second run and not a second implementation: the rows come out of the frames the
   player is already walking, which is the whole point — the table and the bars cannot disagree
   about what the algorithm did.

   **A row is a PASS, not a beat.** The state at the end of every `tag` group — "key 2/3",
   "pass 3", "partition" — which is the granularity the answer is written at: [3,1,2] gives
   three rows and not the five the shifts pass through. That is also why the mid-shift state
   [3,3,2] never appears; it is a smear of a value being copied, not an arrangement of the
   array, and no marker would accept it as a line. A group that ended where the last one did
   adds nothing, so a pass that made no write costs no row — `Tape.view()` hands back the same
   array object until something is written (js/sorting/tape.js), so that test is a reference
   comparison and costs nothing. Cells that moved since the row above are marked.

   The algorithm supplies none of this. `tag` is already how a sort names its own phase for the
   workbench badge, so a table built from it needs no beat to know it is being tabulated.

   Marks(api, onView) → null when the page has no #marks / #step-views, so a page that has not
   been given the markup is simply unaffected. */
(function () {
  'use strict';

  /* A table is DOM, and DOM at this size is not free. n=120 over a long run is more cells
     than a browser will lay out smoothly, and a marking table nobody can read is not worth
     the frames it costs — so the table stops and says where it stopped.
     ponytail: a flat cell budget; virtualise the rows if the big arrays ever matter here. */
  var CELLS = 15000;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* frames → the rows a marker would write, plus which row each frame is standing in. */
  function tabulate(frames) {
    var at = new Int32Array(frames.length);
    var last = frames[0].state, n = last.length;
    var cap = n ? Math.max(2, Math.floor(CELLS / n)) : 2;
    var rows = [{ step: 0, tag: 'start', state: last, hit: null }];
    var cut = false, start = 0, i, k;

    for (i = 0; i < frames.length; i++) {
      // the last frame carrying this tag is where the pass finished, and its state is the line
      if (i + 1 < frames.length && frames[i + 1].tag === frames[i].tag) continue;
      var state = frames[i].state, row = rows.length - 1;
      if (state !== last) {
        if (rows.length >= cap) cut = true;
        else {
          rows.push({ step: i, tag: frames[i].tag, state: state, hit: diff(last, state) });
          row = rows.length - 1;
        }
        last = state;
      }
      for (k = start; k <= i; k++) at[k] = row;
      start = i + 1;
    }
    return { rows: rows, at: at, truncated: cut, n: n };
  }

  function diff(a, b) {
    var out = {};
    for (var i = 0; i < b.length; i++) if (a[i] !== b[i]) out[i] = true;
    return out;
  }

  window.Marks = function (api, onView) {
    var root = document.getElementById('marks');
    var views = document.getElementById('step-views');
    if (!root || !views) return null;

    var stage = root.parentElement;
    var table = null, model = null, source = null, shownRow = -1;

    /* Two buttons in the rail's own vocabulary, so the pressed state is the one css/controls
       already draws. The stage is told which view it is in and hides the other one. */
    var mode = 'bars';
    [['bars', 'Bars'], ['marks', 'Table']].forEach(function (v) {
      var b = el('button', 'btn btn--soft btn--sm', v[1]);
      b.type = 'button';
      b.dataset.view = v[0];
      b.setAttribute('aria-pressed', String(v[0] === mode));
      b.addEventListener('click', function () { api.marks.show(v[0]); });
      views.appendChild(b);
    });

    function build() {
      var frames = api.frames();
      if (frames === source) return;
      source = frames;
      model = tabulate(frames);
      shownRow = -1;
      table = null;
      root.innerHTML = '';
      if (!model.n) return;

      table = el('table', 'mark-table');
      var head = el('tr');
      head.appendChild(el('th', 'mark-step', 'step'));
      head.appendChild(el('th', 'mark-tag', 'after'));
      for (var c = 0; c < model.n; c++) head.appendChild(el('th', null, '[' + c + ']'));
      table.appendChild(el('thead')).appendChild(head);

      var body = el('tbody');
      model.rows.forEach(function (row, k) {
        var tr = el('tr');
        tr.title = 'trace step ' + (row.step + 1);
        tr.appendChild(el('th', 'mark-step', String(k)));
        tr.appendChild(el('td', 'mark-tag', row.tag || '—'));
        for (var j = 0; j < model.n; j++) {
          tr.appendChild(el('td', row.hit && row.hit[j] ? 'mark-hit' : null, String(row.state[j])));
        }
        body.appendChild(tr);
      });
      table.appendChild(body);
      root.appendChild(table);
      if (model.truncated) {
        root.appendChild(el('p', 'mark-note', 'Table stopped at ' + model.rows.length +
          ' rows. Run it again on a smaller array to write the whole thing out.'));
      }
    }

    api.marks = {
      show: function (v) {
        mode = v;
        stage.dataset.view = v;
        Array.prototype.forEach.call(views.children, function (b) {
          b.setAttribute('aria-pressed', String(b.dataset.view === v));
        });
        if (onView) onView(v);
      },
      showing: function () { return mode === 'marks'; },
      /* The table is the whole run; walking it only moves which row is the current one. */
      paint: function (i) {
        build();
        if (!table) return;
        var k = model.at[Math.max(0, Math.min(model.at.length - 1, i))];
        if (k === shownRow) return;
        var body = table.tBodies[0];
        if (body.children[shownRow]) body.children[shownRow].classList.remove('mark-now');
        shownRow = k;
        var tr = body.children[k];
        if (!tr) return;
        tr.classList.add('mark-now');
        tr.scrollIntoView({ block: 'nearest' });
      },
    };
    api.marks.show('bars');
    return api.marks;
  };
  /* the row model, without a DOM — js/tests/sorting.js checks the table against the trace */
  window.Marks.tabulate = tabulate;
})();
