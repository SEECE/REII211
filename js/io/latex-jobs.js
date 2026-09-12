/* The timeline, as LaTeX — `Latex.jobs`, added onto the global js/io/latex.js defines.

   One row per studio, one bar per offer, a month ruler underneath: the same Gantt chart
   js/heuristics/jobs-draw.js paints, for the same reason it is a chart and not a list. The
   thing a student has to see is OVERLAP — two bars in the same column are two films that
   cannot both be shot — and no list makes that obvious.

   An offer the run took is drawn heavy and tinted; every other offer is a thin outline. That is
   the whole answer on this page, and it survives a photocopier, which a colour would not. */
(function () {
  'use strict';

  var LEFT = 24, WIDE = 130, ROW = 9, BAR = 5.6, TOP = 4;

  /* spec: { view, chosen, title } — `view` exactly as JobSet.view() states it, `chosen` the set
     of job ids the rule accepted (Latex.chosen) or null for the bare set of offers. */
  window.Latex.jobs = function (o) {
    var L = window.Latex, view = o.view || {}, jobs = view.jobs || [], won = o.chosen || null;
    if (!jobs.length) return null;
    var span = Math.max(1, view.span || 1);
    var rows = jobs.reduce(function (m, j) { return Math.max(m, j.row + 1); }, 1);
    var unit = WIDE / span, foot = TOP + rows * ROW, body = [];
    /* the same rule the canvas uses: as many month marks as fit without the numbers touching */
    var stride = Math.ceil(span / Math.max(4, Math.floor(WIDE / 13)));

    body.push('  % the month ruler, and a rule down the chart at every mark');
    for (var m = 0; m <= span; m += stride) {
      var x = L.num(LEFT + m * unit);
      body.push('  \\draw[ruling] (' + x + ',' + L.num(TOP - 2) + ') -- (' + x + ',' + L.num(foot) + ');');
      body.push('  \\node[below, font=\\tiny, text=black!70] at (' + x + ',' + L.num(foot + 1) +
        ') {' + m + '};');
    }

    body.push('  % one row per studio, one bar per offer — a taken offer is the heavy one');
    var seen = {};
    jobs.forEach(function (job) {
      var y = TOP + job.row * ROW + (ROW - BAR) / 2;
      var x = LEFT + job.start * unit, w = Math.max(0.8, (job.end - job.start) * unit);
      var lead = !!(won && won[job.id]);
      body.push('  \\filldraw[' + (lead ? 'lead, fill=black!12' : 'disc') +
        ', rounded corners=0.8pt] (' + L.num(x) + ',' + L.num(y) + ') rectangle (' +
        L.num(x + w) + ',' + L.num(y + BAR) + ');');
      // the offer's own name, inside the bar when it fits and not at all when it does not:
      // a letter spilling past a one-month offer reads as a label on its neighbour
      if (w > 5) {
        body.push('  \\node[font=\\tiny\\bfseries] at (' + L.num(x + w / 2) + ',' +
          L.num(y + BAR / 2) + ') {' + L.esc(window.JobsDraw.label(job.id)) + '};');
      }
      if (seen[job.row]) return;
      seen[job.row] = true;
      body.push('  \\node[left, font=\\scriptsize] at (' + L.num(LEFT - 3) + ',' +
        L.num(TOP + job.row * ROW + ROW / 2) + ') {' + L.esc(job.studio) + '};');
    });

    var title = o.title || 'Job scheduling';
    var note = 'Each offer runs from its start month to its end month; overlapping bars are ' +
      'films that cannot both be shot.' + (won ? ' The heavy bars are the ones the rule took.' : '');
    return L.document({
      title: title,
      body: L.open().concat(
        ['  \\node[font=\\bfseries\\small] at (' + L.num(LEFT + WIDE / 2) + ',-4) {' +
          L.esc(title) + '};'],
        body,
        /* `text width`, for the same reason js/io/latex-plane.js gives: a one-line caption
           wider than the chart stretches the bounding box, and \resizebox then shrinks the
           chart to fit the sentence. */
        ['  \\node[right, text width=' + L.num(LEFT + WIDE) + 'mm, align=left, font=\\tiny, ' +
          'text=black!70] at (0,' + L.num(foot + 8) + ') {' + note + '};'],
        ['\\end{tikzpicture}']),
    });
  };
})();
