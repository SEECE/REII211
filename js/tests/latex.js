/* Self-checks for the LaTeX export (js/io/latex.js, js/io/latex-plane.js).

   Nothing here compiles TeX — a browser cannot — so the claims checked are the ones a student
   would otherwise only find out about after a failed submission: the document is closed, every
   colour it paints with is defined, a coordinate printed beside a node is the coordinate the
   node is DRAWN at, and a label that came off a student's own graph cannot become a command. */
(function () {
  'use strict';

  var COLOURS = {
    ink: '#0f2830', paper: '#ffffff', grid: '#dbe7ec', idle: '#94b8c8', scan: '#0ea5e9',
    focus: '#7c3aed', move: '#e11d48', done: '#0d9488', reject: '#cbd5e1', path: '#f59e0b',
    frontier: '#22d3ee', wall: '#0f3a4a',
  };

  function plane(roles, extra) {
    return window.Latex.plane(Object.assign({
      nodes: [{ id: 0, label: 'A', x: 0.14, y: 0.9 }, { id: 1, label: 'B', x: 0.62, y: 0.24 }],
      edges: [{ a: 0, b: 1, w: 7, key: 'e0-1' }],
      roles: roles || null, weighted: true, title: 'Graph', colours: COLOURS,
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
    C.ok(lifted.indexOf('\\definecolor') >= 0, 'the pasted block carries its own colours');
    C.ok(lifted.indexOf('\\resizebox{1\\textwidth}{!}{%') >= 0, 'and one width to tune');
    C.equal(count(lifted, '\\begin{figure}'), count(lifted, '\\end{figure}'),
      'and closes the figure it opens');
    C.ok(lifted.indexOf('\\begin{tikzpicture}') >= 0 && lifted.indexOf('\\end{tikzpicture}') >= 0,
      'and holds the whole picture');
    C.ok(bare.indexOf('\\definecolor', bare.indexOf('\\begin{document}')) >= 0,
      'nothing the block needs is stranded in the preamble');

    /* The claim the whole plane export rests on: the pair printed beside a node is where the
       node actually sits. 0.9 down the unit square is 90 — measured DOWNWARD, as on screen. */
    C.ok(bare.indexOf('$(14,\\,90)$') >= 0, 'a node carries its own coordinates');
    C.ok(bare.indexOf('(14,90) circle') >= 0, 'and is drawn at exactly those coordinates');
    C.ok(bare.indexOf('$(62,\\,24)$') >= 0, 'the second node too');

    /* The problem without its answer: everything idle, so there is one colour and no legend —
       a key captioning colours the picture never paints is worse than no key. */
    C.equal(count(bare, '\\definecolor{role'), 1, 'the bare problem defines one role colour');
    C.ok(bare.indexOf('roleidle') >= 0, 'and it is the untouched one');
    C.ok(bare.indexOf('Untouched') < 0, 'the bare problem carries no legend');

    var solved = plane({ 0: 'done', 1: 'path', 'e0-1': 'path' });
    C.equal(count(solved, '\\definecolor{role'), 2, 'the solution defines only what it paints');
    C.ok(solved.indexOf('\\definecolor{rolepath}{HTML}{F59E0B}') >= 0, 'role colours come from the palette');
    C.ok(solved.indexOf('roleidle') < 0, 'and not one it never uses');
    C.ok(solved.indexOf('Settled') >= 0 && solved.indexOf('Chosen') >= 0,
      'the legend captions are the page\'s own');

    C.ok(solved.indexOf('{7}') >= 0, 'a weighted edge is labelled with its weight');
    C.ok(plane(null, { weighted: false }).indexOf('{7}') < 0, 'an unweighted one is not');

    /* A label is a student's own text on its way into a TeX document. */
    var risky = window.Latex.plane({
      nodes: [{ id: 0, label: 'A_1 & B', x: 0.5, y: 0.5 }], edges: [],
      roles: null, title: '100% #done', colours: COLOURS,
    });
    C.ok(risky.indexOf('A\\_1 \\& B') >= 0, 'a label that would be a command is escaped');
    C.ok(risky.indexOf('100\\% \\#done') >= 0, 'so is the title');
    C.ok(risky.indexOf('\\bfseries, text=reiiink] at (50,50) {A') >= 0, 'and it is still drawn');

    /* A coordinate label must not be left sitting on top of another node — that is the one
       thing the placement pass exists to stop, so it is checked rather than eyeballed. */
    var crowd = [], i;
    for (i = 0; i < 12; i++) crowd.push({ id: i, label: 'N' + i, x: 0.1 + (i % 4) * 0.26, y: 0.1 + Math.floor(i / 4) * 0.3 });
    var dense = window.Latex.plane({ nodes: crowd, edges: [], roles: null, title: 'Dense', colours: COLOURS });
    var spots = dense.match(/text=reiiink!80\] at \(([-\d.]+),([-\d.]+)\)/g) || [];
    C.equal(spots.length, crowd.length, 'every node in a crowd still gets its coordinates');
    var clash = spots.filter(function (s) {
      var m = /\(([-\d.]+),([-\d.]+)\)/.exec(s), lx = +m[1], ly = +m[2];
      return crowd.some(function (n) { return Math.hypot(n.x * 100 - lx, n.y * 100 - ly) < 3.5; });
    });
    C.equal(clash.length, 0, 'and none of them lands on a node');

    /* The tree is the one frame on screen and nothing else — no solution to fold in. */
    var tree = window.BST();
    [50, 30, 70, 20, 40].forEach(function (v) { window.Trace.run(window.BSTOps.insert(tree, v)); });
    var fig = window.Latex.tree({ root: tree.view().root, roles: null, title: 'Tree', colours: COLOURS });
    C.equal(count(fig, 'circle ('), 5, 'one disc per node in the tree');
    [50, 30, 70, 20, 40].forEach(function (v) {
      C.ok(fig.indexOf('{' + v + '}') >= 0, 'the value ' + v + ' is on the figure');
    });
    C.equal(count(fig, '\\draw[reiiline'), 4, 'and one line per parent-child link');
    C.ok(fig.indexOf('\\definecolor{reiiline}{HTML}{94B8C8}') >= 0,
      'a link is drawn in the untouched role, the same as a plain edge on the plane');
    C.ok(plane(null).indexOf('roleidle, line width=0.5pt') >= 0, 'which is that same line');
    C.equal(window.Latex.tree({ root: null, colours: COLOURS }), null, 'an empty tree exports nothing');
  });
})();
