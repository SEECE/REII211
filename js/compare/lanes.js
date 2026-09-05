/* The lane grid — one bar graph per algorithm, on one canvas. Plain script, one global `Lanes`.

   The bars themselves are not drawn here: each lane is handed to js/sorting/bars.js on a
   translated context, so a lane in the race is drawn by the same code as the whole stage on a
   single-sort page and cannot drift from it. What this file owns is the arrangement — how many
   columns, how big a cell, and the heading that says which algorithm a cell is and what it has
   spent so far.

   The column count is chosen, not configured. A rail with a tick box per algorithm means the
   number of lanes changes on a click, and a hardcoded 3×2 would leave a single ticked
   algorithm as a sixth of the stage. Every split from 1×n to n×1 is scored on how close its
   cell comes to the shape a bar graph wants to be, and the best one wins — which also makes
   the layout react to the stage growing when a panel is collapsed, for free. */
(function () {
  'use strict';

  var WANT = 1.9;              // a bar graph reads best about twice as wide as it is tall
  var FONT = 'ui-sans-serif, system-ui, sans-serif';

  /* the split whose cell is closest to WANT, scored on the log ratio so that twice-too-wide
     and half-too-wide are penalised the same */
  function split(n, w, h) {
    var best = null;
    for (var cols = 1; cols <= n; cols++) {
      var rows = Math.ceil(n / cols);
      var score = Math.abs(Math.log((w / cols) / (h / rows) / WANT));
      if (!best || score < best.score) best = { cols: cols, rows: rows, score: score };
    }
    return best || { cols: 1, rows: 1 };
  }

  function place(lane) {
    return lane.place === 1 ? '1st' : lane.place === 2 ? '2nd' : lane.place === 3 ? '3rd'
      : lane.place + 'th';
  }

  window.Lanes = {
    /* named so the self-checks can assert the arrangement without a canvas */
    split: split,

    draw: function (s, frame, colours) {
      if (!s || !frame || !frame.state) return;
      var lanes = frame.state.lanes || [];
      var ctx = s.ctx;
      ctx.textAlign = 'left';

      if (!lanes.length) {
        ctx.fillStyle = colours['ink-faint'];
        ctx.font = '500 14px ' + FONT;
        ctx.textAlign = 'center';
        ctx.fillText('Tick an algorithm on the left to put it in the race.', s.w / 2, s.h / 2);
        return;
      }

      var grid = split(lanes.length, s.w, s.h);
      var cw = s.w / grid.cols, ch = s.h / grid.rows;
      var head = Math.max(16, Math.min(24, ch * 0.14));
      var size = Math.max(9, Math.min(13, cw / 16));

      lanes.forEach(function (lane, i) {
        var x = (i % grid.cols) * cw, y = Math.floor(i / grid.cols) * ch;
        var pad = 4;
        this.head(ctx, lane, x + pad, y + pad, cw - pad * 2, head, size, colours);

        ctx.save();
        ctx.beginPath();                       // a lane never paints over its neighbour
        ctx.rect(x + pad, y + head + pad, cw - pad * 2, ch - head - pad * 3);
        ctx.clip();
        ctx.translate(x + pad, y + head + pad);
        window.Bars.draw({ ctx: ctx, w: cw - pad * 2, h: ch - head - pad * 3 },
          { state: lane.state, roles: (frame.roles && frame.roles[lane.id]) || {} }, colours);
        ctx.restore();
      }, this);
    },

    /* the heading: which algorithm this is, and what it has spent. A lane that is home says so
       and stops counting — the number under it is the answer the page exists to compare. */
    head: function (ctx, lane, x, y, w, h, size, colours) {
      var done = lane.done;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = done ? colours.done : colours.ink;
      ctx.font = '650 ' + size + 'px ' + FONT;
      ctx.fillText(lane.label, x, y + h / 2, w * 0.62);

      ctx.textAlign = 'right';
      ctx.font = '500 ' + (size - 1) + 'px ' + FONT;
      ctx.fillStyle = done ? colours.done : colours['ink-faint'];
      ctx.fillText((done ? place(lane) + ' · ' : '') + lane.cost.toLocaleString() + ' ops',
        x + w, y + h / 2, w * 0.36);
      ctx.textBaseline = 'alphabetic';

      ctx.strokeStyle = done ? colours.done : colours.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + h - 0.5);
      ctx.lineTo(x + w, y + h - 0.5);
      ctx.stroke();
    },
  };
})();
