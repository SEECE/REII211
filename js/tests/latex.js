/* Self-checks for the LaTeX export (js/io/latex.js, js/io/latex-plane.js).

   Nothing here compiles TeX — a browser cannot — so the claims checked are the ones a student
   would otherwise only find out about after a failed submission: the document is closed, every
   colour it paints with is defined, a coordinate printed beside a node is the coordinate the
   node is DRAWN at, and a label that came off a student's own graph cannot become a command. */
(function () {
  'use strict';

  function plane(chosen, extra) {
    return window.Latex.plane(Object.assign({
      nodes: [{ id: 0, label: 'A', x: 0.14, y: 0.9 }, { id: 1, label: 'B', x: 0.62, y: 0.24 }],
      edges: [{ a: 0, b: 1, w: 7, key: 'e0-1' }],
      chosen: chosen || null, weighted: true, title: 'Graph',
    }, extra || {}));
  }

  function count(text, needle) { return text.split(needle).length - 1; }

  window.Check.suite('latex — the figure a student hands in', function () {
    var C = window.Check;

    var bare = plane(null);
    /* `article` and not `standalone` — standalone is not in every TeX install. */
    C.ok(bare.indexOf('\\documentclass{article}') >= 0, 'a class every TeX install has');
    ['tikz', 'graphicx'].forEach(function (pkg) {
      C.ok(bare.indexOf('\\usepackage{' + pkg + '}') >= 0, 'it asks for ' + pkg);
    });
    C.equal(count(bare, '\\begin{tikzpicture}'), count(bare, '\\end{tikzpicture}'),
      'every picture it opens it closes');
    C.equal(count(bare, '\\begin{tikzpicture}'), 1, 'one picture, not one per node');

    /* The block between the fences is what gets pasted into a report, so it has to be whole on
       its own: its own colours, its own figure, and a resizebox that is the one number to tune. */
    var fence = bare.split('% ---- ');
    C.equal(fence.length, 3, 'the figure is fenced by exactly two comment lines');
    var lifted = fence[1];
    C.ok(lifted.indexOf('link/.style') >= 0, 'the pasted block declares its own styles');
    C.ok(lifted.indexOf('\\resizebox{1\\textwidth}{!}{%') >= 0, 'and one width to tune');
    C.equal(count(lifted, '\\begin{figure}'), count(lifted, '\\end{figure}'),
      'and closes the figure it opens');
    C.ok(lifted.indexOf('\\begin{tikzpicture}') >= 0 && lifted.indexOf('\\end{tikzpicture}') >= 0,
      'and holds the whole picture');
    C.ok(bare.indexOf('link/.style') > bare.indexOf('\\begin{document}'),
      'nothing the block needs is stranded in the preamble');

    /* The claim the whole plane export rests on: the pair printed beside a node is where the
       node actually sits. 0.9 down the unit square is 90 — measured DOWNWARD, as on screen. */
    C.ok(bare.indexOf('$(14,\\,90)$') >= 0, 'a node carries its own coordinates');
    C.ok(bare.indexOf('(14,90) circle') >= 0, 'and is drawn at exactly those coordinates');
    C.ok(bare.indexOf('$(62,\\,24)$') >= 0, 'the second node too');

    /* Monochrome, on purpose: a figure is printed, photocopied and marked in pen, so what an
       answer IS shows as WEIGHT. No colour anywhere, and no key to have to read. */
    C.equal(count(bare, '\\definecolor'), 0, 'the figure defines no colours at all');
    C.ok(bare.indexOf('Untouched') < 0 && bare.indexOf('Settled') < 0, 'and carries no key');
    C.ok(bare.indexOf('\\draw[link]') >= 0, 'an edge nobody chose is a plain link');
    C.ok(bare.indexOf('\\draw[lead]') < 0, 'and the bare problem has nothing heavy on it');

    var solved = plane({ 'e0-1': true });
    C.ok(solved.indexOf('\\draw[lead]') >= 0, 'a chosen edge is drawn heavy');
    C.ok(solved.indexOf('heavy lines are the answer') >= 0, 'and the caption says so');
    C.ok(bare.indexOf('heavy lines are the answer') < 0, 'only when there is one');

    /* `path` is the site's own name for the answer, so a figure never has to know which
       algorithm drew it. Anything else in a role map is a moment of the run, not the answer. */
    C.equal(window.Latex.chosen({ 0: 'done', 'e0-1': 'path', 'e0-2': 'reject' }), { 'e0-1': true },
      'the answer is exactly what the run left in `path`');
    C.equal(window.Latex.chosen({ 0: 'scan' }), null, 'a run that chose nothing chooses nothing');

    C.ok(solved.indexOf('{7}') >= 0, 'a weighted edge is labelled with its weight');
    C.ok(plane(null, { weighted: false }).indexOf('{7}') < 0, 'an unweighted one is not');

    /* A label is a student's own text on its way into a TeX document. */
    var risky = window.Latex.plane({
      nodes: [{ id: 0, label: 'A_1 & B', x: 0.5, y: 0.5 }], edges: [], title: '100% #done',
    });
    C.ok(risky.indexOf('A\\_1 \\& B') >= 0, 'a label that would be a command is escaped');
    C.ok(risky.indexOf('100\\% \\#done') >= 0, 'so is the title');
    C.ok(risky.indexOf('\\bfseries] at (50,50) {A') >= 0, 'and it is still drawn');

    /* A coordinate label must not be left sitting on top of another node — that is the one
       thing the placement pass exists to stop, so it is checked rather than eyeballed. */
    var crowd = [], i;
    for (i = 0; i < 12; i++) crowd.push({ id: i, label: 'N' + i, x: 0.1 + (i % 4) * 0.26, y: 0.1 + Math.floor(i / 4) * 0.3 });
    var dense = window.Latex.plane({ nodes: crowd, edges: [], title: 'Dense' });
    var spots = dense.match(/text=black!80\] at \(([-\d.]+),([-\d.]+)\)/g) || [];
    C.equal(spots.length, crowd.length, 'every node in a crowd still gets its coordinates');
    var clash = spots.filter(function (s) {
      var m = /\(([-\d.]+),([-\d.]+)\)/.exec(s), lx = +m[1], ly = +m[2];
      return crowd.some(function (n) { return Math.hypot(n.x * 100 - lx, n.y * 100 - ly) < 3.5; });
    });
    C.equal(clash.length, 0, 'and none of them lands on a node');

    /* The tree is the one frame on screen and nothing else — no solution to fold in. */
    var tree = window.BST();
    [50, 30, 70, 20, 40].forEach(function (v) { window.Trace.run(window.BSTOps.insert(tree, v)); });
    var fig = window.Latex.tree({ root: tree.view().root, title: 'Tree' });
    C.equal(count(fig, 'circle ('), 5, 'one disc per node in the tree');
    [50, 30, 70, 20, 40].forEach(function (v) {
      C.ok(fig.indexOf('{' + v + '}') >= 0, 'the value ' + v + ' is on the figure');
    });
    C.equal(count(fig, '\\draw[link]'), 4, 'and one line per parent-child link');
    C.equal(window.Latex.tree({ root: null }), null, 'an empty tree exports nothing');

    /* The timeline. Two claims: every offer is on it, and only the taken ones are heavy. */
    var set = window.JobSet([
      { id: 0, studio: 'Aurora', row: 0, start: 0, end: 4 },
      { id: 1, studio: 'Aurora', row: 0, start: 5, end: 9 },
      { id: 2, studio: 'Bellweather', row: 1, start: 2, end: 7 },
    ], 12);
    var frames = window.Trace.build(window.Scheduling.run(set, 'finish'), set);
    var took = window.Latex.chosen(frames[frames.length - 1].roles);
    var chart = window.Latex.jobs({ view: set.view(), chosen: took, title: 'Offers' });
    C.equal(count(chart, 'rectangle ('), 3, 'one bar per offer');
    C.equal(count(chart, '\\filldraw[lead'), Object.keys(took).length,
      'and a heavy bar for exactly the offers the rule took');
    C.ok(chart.indexOf('{Aurora}') >= 0 && chart.indexOf('{Bellweather}') >= 0,
      'each studio is named once beside its row');
    C.ok(chart.indexOf('{A}') >= 0 && chart.indexOf('{C}') >= 0,
      'and the offers carry the names the page gives them');
    C.equal(count(window.Latex.jobs({ view: set.view(), title: 'Offers' }), '\\filldraw[lead'), 0,
      'the bare set of offers has nothing heavy on it');
    C.equal(window.Latex.jobs({ view: { span: 12, jobs: [] } }), null, 'no offers, no figure');
  });
})();
