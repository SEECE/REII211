/* A figure, as LaTeX. Plain script, one global `Latex`, extended by js/io/latex-plane.js.

   A `.reii` carries a PROBLEM between the pages of this site (structure/FORMATS.md). This
   carries a PICTURE out of it — the plane or the tree exactly as it stands, as a TikZ document
   a student pastes into a practical or a report. It is deliberately one-way: nothing here is
   ever read back, so it is not a `kind`, it does not go through the envelope, and it is not
   validated on the way in because there is no way in.

   Nothing here touches the DOM, the player or the palette. A caller hands over a view, the role
   map it wants painted (or none, for the plain problem) and the resolved colours, and gets a
   string back. That is what lets js/tests/latex.js check the figure without a canvas.

   Colours are still roles: the preamble writes one `\definecolor` per role the figure actually
   uses, taken from the same `Palette.all()` the canvas is drawn with, so re-skinning the site
   in css/tokens.css re-skins what students hand in. */
(function () {
  'use strict';

  var HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
  var ROLES = ['idle', 'scan', 'focus', 'move', 'done', 'reject', 'path', 'frontier', 'wall'];

  /* `\definecolor{…}{HTML}` wants RRGGBB and nothing else. Every value in css/tokens.css is a
     hex literal, so anything else is a token that has gone missing — grey says so quietly
     rather than emitting a file that will not compile. */
  function hex(value) {
    var m = HEX.exec(String(value == null ? '' : value).trim());
    if (!m) return '808080';
    var h = m[1];
    return (h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h).toUpperCase();
  }

  /* Labels come off a student's own graph and land in a TeX document. Braces and backslashes
     are dropped rather than escaped — a node called `\bf` is nobody's real label and escaping
     it properly needs a lexer — and the rest are the characters that would otherwise be
     commands. js/io/reii.js already holds labels to plain words; this is the same guard for
     the values typed on the page. */
  function esc(text) {
    return String(text == null ? '' : text).replace(/[\\{}]/g, '').replace(/([#$%&_^~])/g, '\\$1');
  }

  function num(v) { return String(Math.round(v * 100) / 100); }

  /* Which roles the figure actually paints, in palette order — so the preamble cannot define a
     colour nothing uses and the legend cannot caption one the picture never shows. */
  function rolesUsed(map) {
    var seen = {};
    for (var k in map) seen[map[k]] = true;
    return ROLES.filter(function (r) { return seen[r]; });
  }

  function roleOf(map, key) { return 'role' + ((map && map[key]) || 'idle'); }

  /* The legend, as rows under the figure. The captions are read out of js/core/legend.js — the
     same table the on-screen legend is written from, so a printed figure cannot caption a
     colour differently from the page it came off. */
  function legend(used, x, y) {
    // a key whose only entry is "untouched" says nothing — that is the problem, not an answer
    if (!used.length || (used.length === 1 && used[0] === 'idle')) return [];
    var caps = (window.Legend && window.Legend.captions) || {};
    var out = ['  % legend — captions from js/core/legend.js, so print and screen agree'];
    used.forEach(function (role, i) {
      var row = y + i * 5.4, cap = caps[role] || [role, ''];
      out.push('  \\filldraw[draw=' + 'role' + role + ', fill=role' + role +
        '!25, line width=0.5pt] (' + num(x) + ',' + num(row) + ') rectangle ++(3.4,3.4);');
      out.push('  \\node[right, font=\\tiny, text=reiiink] at (' + num(x + 4.4) + ',' +
        num(row + 1.7) + ') {\\textbf{' + esc(cap[0]) + '}' +
        (cap[1] ? ' --- ' + esc(cap[1]) : '') + '};');
    });
    return out;
  }

  /* The whole document. `standalone` crops the page to the picture, which is what makes the
     PDF droppable into a report at any size; the tikzpicture inside it is plain TikZ and can
     be pasted into an article class without changing a character. */
  function document_(o) {
    var defs = ['\\definecolor{reiiink}{HTML}{' + hex(o.colours.ink) + '}',
      '\\definecolor{reiipaper}{HTML}{' + hex(o.colours.paper) + '}',
      '\\definecolor{reiigrid}{HTML}{' + hex(o.colours.grid) + '}'];
    (o.used || []).forEach(function (r) {
      defs.push('\\definecolor{role' + r + '}{HTML}{' + hex(o.colours[r]) + '}');
    });
    return ['% ' + esc(o.title),
      '%',
      '% Exported from the REII 211 visualiser. Compile with pdflatex: the document is',
      '% standalone, so the page crops to the figure itself. To put the figure into a report,',
      '% copy the \\definecolor lines into your preamble and the tikzpicture into the text.',
      '',
      '\\documentclass[tikz,border=6pt]{standalone}',
      '\\usetikzlibrary{arrows.meta}',
      ''].concat(defs, ['', '\\begin{document}'], o.body, ['\\end{document}', '']).join('\n');
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
    esc: esc, hex: hex, num: num, rolesUsed: rolesUsed, roleOf: roleOf,
    legend: legend, document: document_,

    /* The displayed tree, and only that: one frame, the shape on screen, coloured as it is on
       screen. There is no solution to fold in — a BST page's answer IS its shape. */
    tree: function (o) {
      var root = o.root;
      if (!root) return null;
      var L = layout(root), dx = 14, dy = 16, r = 4.7, mine = {};
      var at = {}, body = [];
      each(root, function (n) {
        var p = L.pos[n.id];
        at[n.id] = { x: (p.col + 0.5) * dx, y: (p.depth + 0.9) * dy };
        mine[n.id] = (o.roles && o.roles[n.id]) || 'idle';
      });
      var W = L.columns * dx, H = (L.depth + 1.6) * dy;
      /* A thirty-one node tree is 434 mm across, which is no use on a page. The picture is
         scaled to the width of a text block rather than squeezed — every circle, every line and
         every digit in the same proportion — so a wide tree reads as a wide tree that has been
         made smaller. Width is the only cap needed: a BST is never deeper than it is wide. */
      var scale = Math.min(1, 170 / (W + 8));

      body.push('  % edges first, then the discs over them — a disc covers the line it ends on');
      each(root, function (n) {
        [n.left, n.right].forEach(function (kid) {
          if (!kid) return;
          body.push('  \\draw[reiiink!35, line width=0.5pt] (' + num(at[n.id].x) + ',' +
            num(at[n.id].y) + ') -- (' + num(at[kid.id].x) + ',' + num(at[kid.id].y) + ');');
        });
      });
      each(root, function (n) {
        var c = 'role' + mine[n.id];
        body.push('  \\filldraw[draw=' + c + ', fill=' + c + '!20, line width=0.7pt] (' +
          num(at[n.id].x) + ',' + num(at[n.id].y) + ') circle (' + num(r) + ');');
        body.push('  \\node[font=\\small\\bfseries, text=reiiink] at (' + num(at[n.id].x) +
          ',' + num(at[n.id].y) + ') {' + esc(n.value) + '};');
      });

      var used = rolesUsed(mine);
      return document_({
        title: o.title || 'Binary search tree', colours: o.colours, used: used,
        body: ['\\begin{tikzpicture}[x=1mm, y=-1mm, scale=' + num(scale) + ', transform shape]']
          .concat(['  \\node[font=\\bfseries\\small, text=reiiink] at (' + num(W / 2) +
            ',-4) {' + esc(o.title || 'Binary search tree') + '};'], body,
            legend(used, 0, H), ['\\end{tikzpicture}']),
      });
    },
  };
})();
