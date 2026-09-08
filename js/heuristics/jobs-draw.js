/* The offers, drawn as a timeline. Plain script, one global `JobsDraw`.

   One row per studio, one bar per offer, coloured by role. Laid out as a Gantt chart rather
   than a list because the thing you have to see is OVERLAP — two bars in the same column of
   the chart are two films you cannot both shoot, and no list makes that obvious. */
(function () {
  'use strict';
  var R = window.Roles;

  /* Spreadsheet-style column labels: 0 -> A, 25 -> Z, 26 -> AA, 51 -> AZ, 52 -> BA... */
  function label(n) {
    var s = '';
    n = n + 1;
    while (n > 0) {
      var r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  window.JobsDraw = {
    draw: function (s, frame, colours) {
      if (!s || !frame || !frame.state) return;
      var view = frame.state, ctx = s.ctx;
      var rows = view.jobs.reduce(function (m, j) { return Math.max(m, j.row + 1); }, 1);
      var left = 74, top = 20, bottom = 18;
      var W = Math.max(1, s.w - left - 10);
      var rowH = Math.max(14, Math.min(38, (s.h - top - bottom) / rows));
      var barH = rowH * 0.62;
      var unit = W / Math.max(1, view.span);

      // month ruler
      ctx.strokeStyle = colours.grid;
      ctx.lineWidth = 1;
      ctx.fillStyle = colours['ink-faint'];
      ctx.font = '500 9.5px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      var stride = Math.ceil(view.span / Math.max(4, Math.floor(W / 34)));
      for (var m = 0; m <= view.span; m += stride) {
        var x = left + m * unit;
        ctx.beginPath();
        ctx.moveTo(x, top - 4);
        ctx.lineTo(x, top + rows * rowH);
        ctx.stroke();
        ctx.fillText(String(m), x, s.h - 5);
      }

      var seen = {};
      ctx.textBaseline = 'middle';
      view.jobs.forEach(function (job) {
        var y = top + job.row * rowH + (rowH - barH) / 2;
        var x = left + job.start * unit;
        var w = Math.max(3, (job.end - job.start) * unit - 2);
        var role = R.at(frame.roles, job.id, 'idle');
        ctx.fillStyle = window.Palette.mix(colours[role], role === 'idle' ? 16 : 46, colours.paper);
        ctx.strokeStyle = colours[role];
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, barH, 4); else ctx.rect(x, y, w, barH);
        ctx.fill();
        ctx.stroke();
        if (w > 26 && barH > 12) {
          ctx.fillStyle = colours.ink;
          ctx.font = '600 9.5px ui-sans-serif, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(label(job.id), x + w / 2, y + barH / 2);
        }

        if (seen[job.row]) return;
        seen[job.row] = true;
        ctx.fillStyle = colours['ink-soft'];
        ctx.font = '600 10.5px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(job.studio, left - 8, top + job.row * rowH + rowH / 2);
      });
    },
  };
})();
