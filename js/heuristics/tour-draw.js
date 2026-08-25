/* Points and the lines between them, drawn. Plain script, one global `PointDraw`.

   Shared by the tour and the closest pair: both are a scatter of numbered points with some
   subset of the segments between them drawn in. A segment comes from a ROLE key of the form
   `e<a>-<b>`, so the algorithm decides what is drawn and this file only decides how — same
   contract as the graph renderer, without needing a graph. */
(function () {
  'use strict';
  var R = window.Roles;

  function frame(s) {
    var pad = 26;
    return { pad: pad, W: Math.max(1, s.w - pad * 2), H: Math.max(1, s.h - pad * 2) };
  }

  window.PointDraw = {
    draw: function (s, f, colours) {
      if (!s || !f || !f.state) return;
      var pts = f.state.points, ctx = s.ctx, box = frame(s);
      var r = Math.max(9, Math.min(16, 220 / Math.max(6, pts.length)));
      var at = {};
      pts.forEach(function (p) { at[p.id] = { x: box.pad + p.x * box.W, y: box.pad + p.y * box.H }; });

      // faint plane, so an empty stage still reads as somewhere you can click
      ctx.strokeStyle = colours.grid;
      ctx.lineWidth = 1;
      for (var g = 1; g < 6; g++) {
        ctx.beginPath();
        ctx.moveTo(box.pad, box.pad + box.H * g / 6); ctx.lineTo(box.pad + box.W, box.pad + box.H * g / 6);
        ctx.moveTo(box.pad + box.W * g / 6, box.pad); ctx.lineTo(box.pad + box.W * g / 6, box.pad + box.H);
        ctx.stroke();
      }

      Object.keys(f.roles).forEach(function (k) {
        if (k.charAt(0) !== 'e') return;
        var ends = k.slice(1).split('-').map(Number);
        var a = at[ends[0]], b = at[ends[1]];
        if (!a || !b) return;
        ctx.strokeStyle = colours[f.roles[k]];
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });

      // a pair marked `done`/`scan` with no segment between them still deserves a line
      ['done', 'scan'].forEach(function (role) {
        var members = pts.filter(function (p) { return f.roles[p.id] === role; });
        if (members.length !== 2) return;
        ctx.strokeStyle = colours[role];
        ctx.lineWidth = role === 'done' ? 3 : 1.6;
        ctx.setLineDash(role === 'scan' ? [4, 3] : []);
        ctx.beginPath();
        ctx.moveTo(at[members[0].id].x, at[members[0].id].y);
        ctx.lineTo(at[members[1].id].x, at[members[1].id].y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 ' + Math.round(r * 0.8) + 'px ui-sans-serif, system-ui, sans-serif';
      pts.forEach(function (p) {
        var role = R.at(f.roles, p.id, 'idle');
        var c = colours[role];
        ctx.fillStyle = window.Palette.mix(c, 20, colours.paper);
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(at[p.id].x, at[p.id].y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = colours.ink;
        ctx.fillText(String(p.id + 1), at[p.id].x, at[p.id].y + 0.5);
      });
    },

    hit: function (s, view, px, py) {
      var box = frame(s);
      var r = Math.max(9, Math.min(16, 220 / Math.max(6, view.points.length))) + 4;
      for (var i = view.points.length - 1; i >= 0; i--) {
        var p = view.points[i];
        if (Math.hypot(box.pad + p.x * box.W - px, box.pad + p.y * box.H - py) <= r) return p.id;
      }
      return null;
    },
    place: function (s, px, py) {
      var box = frame(s);
      return { x: Math.min(1, Math.max(0, (px - box.pad) / box.W)),
        y: Math.min(1, Math.max(0, (py - box.pad) / box.H)) };
    },
  };
})();
