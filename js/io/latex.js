/* A figure, as LaTeX. Plain script, one global `Latex`, extended by js/io/latex-plane.js and
   js/io/latex-jobs.js.

   A `.reii` carries a PROBLEM between the pages of this site (structure/FORMATS.md). This
   carries a PICTURE out of one — the plane, the tree or the timeline exactly as it stands, as a
   TikZ figure a student pastes into a practical or a report. It is deliberately one-way:
   nothing here is ever read back, so it is not a `kind`, it does not go through the envelope,
   and it is not validated on the way in because there is no way in.

   **The figure is monochrome, and that is the point.** The site's role palette says what each
   element is DOING at one moment of a run; a figure in a report is not a moment of a run, it is
   an answer, and it is going to be printed, photocopied and marked in pen. So there are no
   colours here at all: what an answer IS shows as WEIGHT — a heavy line is the path, the tour,
   the tree or the offer that was taken — which survives a black-and-white printer and needs no
   key to read. Three `\tikzset` styles at the top of every picture are the whole vocabulary,
   which is also what makes the figure tunable: retune the drawing by editing three lines
   instead of forty.

   Nothing here touches the DOM or the player. A caller hands over a view and, optionally, the
   set of keys the run chose, and gets a string back — which is what lets js/tests/latex.js
   check the figure without a canvas. */
(function () {
  'use strict';

  /* Labels come off a student's own graph and land in a TeX document. Braces and backslashes
     are dropped rather than escaped — a node called `\bf` is nobody's real label and escaping
     it properly needs a lexer — and the rest are the characters that would otherwise be
     commands. js/io/reii.js already holds labels to plain words; this is the same guard for
     the values typed on the page. */
  function esc(text) {
    return String(text == null ? '' : text).replace(/[\\{}]/g, '').replace(/([#$%&_^~])/g, '\\$1');
  }

  function num(v) { return String(Math.round(v * 100) / 100); }

  /* The four styles every figure is drawn with. `ruling` is the sheet, `link` is a line between
     two things, `lead` is that same line when the run chose it, `disc` is a thing. They are
     declared at the top of the picture rather than repeated on each path so that a student can
     make every line on the figure thicker by editing one of them. */
  var STYLE = [
    '    ruling/.style={black!20, line width=0.3pt},',
    '    link/.style={black!45, line width=0.4pt},',
    '    lead/.style={black, line width=1.1pt},',
    '    disc/.style={draw=black, fill=white, line width=0.7pt}]',
  ];

  /* y is NEGATIVE on purpose: the subjects here measure y down the screen, and flipping it
     would make every exported figure a mirror image of the page it came off. */
  function open() { return ['\\begin{tikzpicture}[x=1mm, y=-1mm,'].concat(STYLE); }

  /* The answer, as a set of keys. `path` is this site's own name for "on the path, the tour or
     the tree that was picked" (css/tokens.css, js/core/legend.js), so a figure never has to
     know which algorithm produced it: whatever the run ended with in `path` is what is drawn
     heavy, whether that is a route, a spanning tree, a closed tour or a booked month. */
  function chosen(roles) {
    var out = {}, any = false;
    for (var k in roles) if (roles[k] === 'path') { out[k] = true; any = true; }
    return any ? out : null;
  }

  /* The whole document — the same shape the EERI 124 visualiser exports, because a student
     taking both courses should be pasting the same kind of block into the same report.

     `article` and not `standalone`: standalone is not in every TeX install and article is. The
     picture is fenced by two comment lines and wrapped in a `figure` inside
     `\resizebox{1\textwidth}{!}{…}` — one number to tune, and it resizes the whole figure
     without touching a coordinate. */
  function document_(o) {
    return ['% ' + esc(o.title),
      '%',
      '% Exported from the REII 211 visualiser. Compiles with pdflatex as it stands.',
      '% Everything between the two fences below drops straight into a document you already',
      '% have open — it needs \\usepackage{tikz} and \\usepackage{graphicx} in that preamble.',
      '% To tune the figure, change the 1 in \\resizebox{1\\textwidth}: it is the only number',
      '% here that is about the page rather than about the picture. To tune the DRAWING, edit',
      '% the four styles at the top of the picture — every line on it comes from one of them.',
      '',
      '\\documentclass{article}',
      '\\usepackage{tikz}',
      '\\usepackage{graphicx}',
      '\\usetikzlibrary{arrows.meta}',
      '\\pagestyle{empty}',
      '',
      '\\begin{document}',
      '',
      '% ---- the figure: everything between these two lines drops into your own document ----',
      '\\begin{figure}[!ht]',
      '\\centering',
      '\\resizebox{1\\textwidth}{!}{%',
    ].concat(o.body, [
      '}%',
      '\\end{figure}',
      '% ---- end of the figure ----',
      '',
      '\\end{document}',
      '',
    ]).join('\n');
  }

  /* The tree as it stands: in-order position sets the column, depth sets the row. That is the
     layout js/structures/bst-draw.js uses, and using it again here is the point — the figure a
     student exports is the drawing they were looking at, not a second idea of it. */
  function layout(root) {
    var pos = {}, column = 0, depth = 0;
    (function walk(n, d) {
      if (!n) return;
      walk(n.left, d + 1);
      pos[n.id] = { col: column++, depth: d };
      if (d > depth) depth = d;
      walk(n.right, d + 1);
    })(root, 0);
    return { pos: pos, columns: Math.max(1, column), depth: depth };
  }

  function each(node, fn) {
    if (!node) return;
    fn(node);
    each(node.left, fn);
    each(node.right, fn);
  }

  window.Latex = {
    esc: esc, num: num, chosen: chosen, open: open, document: document_,

    /* The displayed tree, and only that: one frame, the shape on screen. There is no answer to
       fold in and nothing to ask, because a BST page's answer IS its shape. */
    tree: function (o) {
      var root = o.root;
      if (!root) return null;
      /* Spacing is deliberately tight. The figure is resized to the text width whole, so a
         picture that is naturally 200 mm across arrives with its digits at half the size they
         were drawn at — the way to keep a tree readable on a page is to draw it compact, not
         to draw it big and shrink it. At 11 mm a column there is still 2.6 mm of clear paper
         between two discs, which is what the links need to read as links. */
      var L = layout(root), dx = 11, dy = 13, r = 4.2;
      var at = {}, body = [], title = o.title || 'Binary search tree';
      each(root, function (n) {
        var p = L.pos[n.id];
        at[n.id] = { x: (p.col + 0.5) * dx, y: (p.depth + 0.9) * dy };
      });

      body.push('  % links first, then the discs over them — a disc covers the line it ends on');
      each(root, function (n) {
        [n.left, n.right].forEach(function (kid) {
          if (!kid) return;
          body.push('  \\draw[link] (' + num(at[n.id].x) + ',' + num(at[n.id].y) + ') -- (' +
            num(at[kid.id].x) + ',' + num(at[kid.id].y) + ');');
        });
      });
      each(root, function (n) {
        body.push('  \\filldraw[disc] (' + num(at[n.id].x) + ',' + num(at[n.id].y) +
          ') circle (' + num(r) + ');');
        body.push('  \\node[font=\\small\\bfseries] at (' + num(at[n.id].x) + ',' +
          num(at[n.id].y) + ') {' + esc(n.value) + '};');
      });

      return document_({
        title: title,
        body: open().concat(['  \\node[font=\\bfseries\\small] at (' + num(L.columns * dx / 2) +
          ',-4) {' + esc(title) + '};'], body, ['\\end{tikzpicture}']),
      });
    },
  };
})();
