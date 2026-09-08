/* The Dijkstra marking table, drawn. Plain script; extends the `GraphMarks` global with
   `view()`. The model it renders is js/graph/marks.js — read that first.

   The table is WRITTEN as the run walks, not shown finished beside it. Columns to the right of
   the one you are on do not exist yet, and the column you are on is half-written: at the settle
   beat it is the distances copied forward with the settled cell boxed, and at the relax beat
   the improvements land in it. That is the difference between a table you can learn the
   algorithm from and a picture of the answer — and it is why stepping back un-writes, because
   a column the run has not reached is not an answer yet.

   Nothing here decides anything. Every number comes from `GraphMarks.tabulate`, which reads it
   off the frames; every chip in the queue comes from `GraphMarks.queue`, which lists what a
   column already says. */
(function () {
  'use strict';

  /* A table is DOM, and a graph the plane can hold is not bounded — the editor will let you
     click a hundred nodes onto it. n nodes settle into n columns, so the table is n² cells.
     ponytail: a flat node budget; nothing on this page is meant to be marked by hand at that
     size anyway. */
  var NODES = 40;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function fmt(d) { return d === Infinity || d == null ? '–' : String(d); }

  window.GraphMarks.view = function (api) {
    var root = document.getElementById('marks');
    if (!root) return null;

    var model = null, source = null, table = null, queue = null;
    var cells = [];                  // cells[column] = [th, td per node], for revealing a column
    var shown = -1, ink = '';        // the column on screen, and what was last written into it

    function note(text) {
      root.innerHTML = '';
      root.appendChild(el('p', 'mark-note', text));
    }

    function build() {
      var frames = api.frames();
      if (frames === source) return;
      source = frames;
      table = queue = null;
      cells = [];
      shown = -1;
      ink = '';
      model = window.GraphMarks.tabulate(frames);

      if (!model) {
        /* The rail has ONE marking button and the algorithm decides what the marking is, so
           this note has to say which algorithms have one — the page cannot say it in the
           button's label any more. BFS never reaches here: it is drawn, not tabled. */
        note('There is no run to write out yet — put some nodes on the plane. Dijkstra is ' +
          'marked as a table, one column per node coming out of the priority queue; every ' +
          'other algorithm here is marked as a drawing and does not reach this box.');
        return;
      }
      if (model.nodes.length > NODES) {
        note('This graph has ' + model.nodes.length + ' nodes, so the table would be ' +
          model.nodes.length + ' columns wide. Generate a smaller one to write it out.');
        return;
      }

      root.innerHTML = '';
      table = el('table', 'mark-table mark-table--wide');
      var head = el('tr');
      head.appendChild(el('th', 'mark-step', 'Settled →'));
      model.cols.forEach(function (col, c) {
        var th = el('th', null, col.settled == null ? '–' : label(col.settled));
        th.title = c ? 'the column written when ' + label(col.settled) + ' came out of the queue'
          : 'before anything has been settled';
        head.appendChild(th);
        cells[c] = [th];
      });
      table.appendChild(el('thead')).appendChild(head);

      var body = el('tbody');
      model.nodes.forEach(function (n) {
        var tr = el('tr');
        tr.appendChild(el('th', 'mark-step', n.label));
        model.cols.forEach(function (col, c) {
          var td = el('td', klass(col, n.id, true), fmt(col.dist[n.id]));
          tr.appendChild(td);
          cells[c].push(td);
        });
        body.appendChild(tr);
      });
      table.appendChild(body);
      root.appendChild(table);

      root.appendChild(el('p', 'mark-note', 'One column per node coming out of the queue. ' +
        'A boxed cell is a distance that has just been settled — it is final and will not move ' +
        'again. A bold cell is a route that got shorter this step.'));

      queue = el('div', 'mark-queue');
      root.appendChild(queue);
    }

    function label(id) {
      for (var i = 0; i < model.nodes.length; i++) if (model.nodes[i].id === id) return model.nodes[i].label;
      return String(id);
    }

    function klass(col, id, written) {
      return (col.settled === id ? 'mark-final ' : '') +
        (written && col.hit[id] ? 'mark-hit' : '') || null;
    }

    /* Reveal up to column k and no further. A column the run has not reached is not an answer
       yet, and leaving it on screen hands the student the rest of the table. */
    function reveal(k) {
      if (shown === k) return;
      for (var c = 0; c < cells.length; c++) {
        var hide = c > k;
        for (var j = 0; j < cells[c].length; j++) cells[c][j].hidden = hide;
      }
      shown = k;
    }

    /* The column being written. Before its relax beat it shows the distances copied forward —
       which for an improved cell is what the column BEFORE it says — and after it, the
       improvements. Every other column is final and was filled once, at build. */
    function writeColumn(k, written) {
      var col = model.cols[k], before = k ? model.cols[k - 1] : col;
      model.nodes.forEach(function (n, row) {
        var td = cells[k][row + 1];
        var d = !written && col.hit[n.id] ? before.dist[n.id] : col.dist[n.id];
        td.textContent = fmt(d);
        td.className = klass(col, n.id, written) || '';
      });
    }

    function writeQueue(k, written) {
      var col = model.cols[k], before = k ? model.cols[k - 1] : col;
      var dist = {};
      model.nodes.forEach(function (n) {
        dist[n.id] = !written && col.hit[n.id] ? before.dist[n.id] : col.dist[n.id];
      });
      var waiting = window.GraphMarks.queue(model, k, dist);

      queue.innerHTML = '';
      queue.appendChild(el('p', 'eyebrow eyebrow--muted', 'Priority queue'));
      var strip = el('div', 'queue-strip');
      if (col.settled != null) {
        strip.appendChild(el('span', 'q-chip q-out',
          label(col.settled) + ' ' + fmt(col.dist[col.settled])));
        strip.appendChild(el('span', 'q-arrow', 'came out →'));
      }
      if (!waiting.length) strip.appendChild(el('span', 'q-empty', 'empty'));
      waiting.forEach(function (e, i) {
        var chip = el('span', 'q-chip' + (i ? '' : ' q-next') + (written && col.hit[e.id] ? ' q-new' : ''),
          e.label + ' ' + e.d);
        chip.title = i ? '' : 'nearest — this is the one that comes out next';
        strip.appendChild(chip);
      });
      queue.appendChild(strip);
      /* An empty queue at a settle beat is not the end of the run — the node that just came
         out has not had its edges looked at yet, and everything it discovers pushes in on the
         next beat. Saying "the run is over" there would be wrong on the very first step. */
      queue.appendChild(el('p', 'mark-note', waiting.length
        ? 'Nearest first. A node pushes in the moment a shorter route to it is found, so ' +
          waiting[0].label + ' at ' + waiting[0].d + ' comes out next however late it arrived.'
        : written
          ? 'Every node the source can reach has been settled, so the run is over.'
          : 'Nothing is waiting at this instant — ' + label(col.settled) + ' has only just come ' +
            'out, and whatever its edges reach pushes in on the next step.'));
    }

    return {
      paint: function (i) {
        build();
        if (!table) return;
        i = Math.max(0, Math.min(model.at.length - 1, i));
        var k = model.at[i], written = i >= model.cols[k].relaxAt;
        /* Play arrives here sixty times a second and the column it is on has usually neither
           moved nor changed what it says. */
        var stamp = k + (written ? ':w' : ':o');
        if (stamp === ink) return;
        ink = stamp;
        reveal(k);
        writeColumn(k, written);
        writeQueue(k, written);
      },
    };
  };
})();
