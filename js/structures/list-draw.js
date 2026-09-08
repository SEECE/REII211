/* The memory grid, drawn. Plain script, one global `MemoryDraw`.

   Both structures share this: a block of addressed slots, values in the occupied ones, and —
   for a linked list — an arrow drawn along every stored pointer. Seeing the array's cells sit
   next to each other while the list's arrows criss-cross the block is the point of the page,
   so they must be the same picture with only the arrows added. */
(function () {
  'use strict';
  var R = window.Roles;
  var COLS = 12;

  function hex(i) { return '0x' + (i + 1).toString(16).toUpperCase().padStart(2, '0'); }

  function geometry(s, count) {
    var rows = Math.ceil(count / COLS);
    var gap = 5;
    var cw = (s.w - gap * (COLS - 1)) / COLS;
    var ch = Math.min((s.h - gap * (rows - 1) - 26) / rows, cw * 0.9);
    return { rows: rows, gap: gap, cw: cw, ch: ch, top: 22 };
  }

  function cellBox(g, i) {
    return {
      x: (i % COLS) * (g.cw + g.gap),
      y: g.top + Math.floor(i / COLS) * (g.ch + g.gap),
      w: g.cw, h: g.ch,
    };
  }

  function arrow(ctx, from, to, colour, opts) {
    opts = opts || {};
    var a = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
    var b = { x: to.x + to.w / 2, y: to.y + to.h / 2 };
    var lift = Math.min(40, Math.abs(b.x - a.x) * 0.35 + 14) + (opts.liftBoost || 0);
    ctx.save();
    ctx.strokeStyle = colour;
    ctx.lineWidth = opts.dashed ? 1.2 : 1.6;
    if (opts.dashed) ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.bezierCurveTo(a.x, a.y - lift, b.x, b.y - lift, b.x, b.y);
    ctx.stroke();
    ctx.restore();
    // head, at the arrival end
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - 4, b.y - 8);
    ctx.lineTo(b.x + 4, b.y - 8);
    ctx.closePath();
    ctx.fill();
  }

  window.MemoryDraw = {
    draw: function (s, frame, colours) {
      if (!s || !frame || !frame.state) return;
      var cells = frame.state.cells, ctx = s.ctx;
      var g = geometry(s, cells.length);
      var boxes = cells.map(function (_, i) { return cellBox(g, i); });

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      cells.forEach(function (cell, i) {
        var box = boxes[i];
        var role = R.at(frame.roles, i, cell ? 'done' : null);
        var occupied = !!cell;
        ctx.fillStyle = occupied ? window.Palette.mix(colours[role], 16, colours.paper) : colours.paper;
        ctx.strokeStyle = occupied ? colours[role] : colours.grid;
        ctx.lineWidth = occupied ? 1.5 : 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(box.x, box.y, box.w, box.h, 4);
        else ctx.rect(box.x, box.y, box.w, box.h);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = colours['ink-faint'];
        ctx.font = '500 8px ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(hex(i), box.x + 3, box.y + 7);

        if (occupied) {
          ctx.fillStyle = colours.ink;
          ctx.font = '700 ' + Math.min(13, box.h * 0.4) + 'px ui-sans-serif, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(String(cell.value), box.x + box.w / 2, box.y + box.h * 0.62);
        }
      });

      // the pointers — nothing to draw for an array, which is exactly the comparison
      cells.forEach(function (cell, i) {
        if (!cell || cell.next == null || !cells[cell.next]) return;
        arrow(ctx, boxes[i], boxes[cell.next], colours[R.at(frame.roles, i, 'done')]);
      });

      // a doubly linked list's back pointers — dashed and arced a little higher than the
      // forward ones, so both directions stay legible on the same pair of cells
      cells.forEach(function (cell, i) {
        if (!cell || cell.prev == null || !cells[cell.prev]) return;
        arrow(ctx, boxes[i], boxes[cell.prev], colours['ink-faint'], { dashed: true, liftBoost: 10 });
      });

      var head = frame.state.head, tail = frame.state.tail;
      ctx.fillStyle = colours.focus;
      ctx.font = '700 10px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      if (head != null && cells[head]) {
        ctx.fillText('head ▾', boxes[head].x + boxes[head].w / 2, g.top - 10);
      }
      if (tail != null && cells[tail] && tail !== head) {
        ctx.fillText('tail ▾', boxes[tail].x + boxes[tail].w / 2, g.top - 10);
      }
    },
  };
})();
