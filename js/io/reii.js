/* The site's own file — a `.reii`, which is JSON inside. Plain script, one global `ReiiFile`.

   Every page here has a different idea of what its "input" is: an array of numbers, a block of
   addressed memory, a tree, a graph, a maze, a scatter of points, a pile of offers. Writing a
   separate little format for each of those is how you end up with seven half-formats and a
   student who cannot tell which of their downloads opens where. So there is ONE envelope:

       { format, version, kind, name, saved, data }

   `kind` names the subject and `data` is exactly that subject's `view()` — the same snapshot
   the renderer already draws (structure/RUNTIME.md). Export is therefore free: a page saves the
   view it was going to draw anyway, and cannot save a shape the site does not understand.

   This file parses and VALIDATES; it builds nothing. A page opens a file and hands `data` to
   its own subject's `load()`. Everything read here came off a student's disk and may have been
   edited by hand or written by something else, so each kind is checked field by field before a
   page ever sees it — an unchecked coordinate is a blank canvas, and an unchecked label is
   markup going into narration. */
(function () {
  'use strict';

  var EXT = '.reii';
  var FORMAT = 'reii-subject';
  var VERSION = 1;

  function bad(msg) { throw new Error(msg); }
  function num(v, lo, hi) { return typeof v === 'number' && isFinite(v) && v >= lo && v <= hi; }
  function int(v, lo, hi) { return num(v, lo, hi) && Math.floor(v) === v; }
  function bool(v) { return v === true || v === false; }
  /* A name that is safe to draw AND safe to narrate: the notes go into innerHTML, so a label
     carrying a tag would be markup by the time a student saw it. */
  function words(v, max) { return typeof v === 'string' && /^[\w .'&-]+$/.test(v) && v.length <= max; }
  function list(v, max, what) {
    if (!Array.isArray(v)) bad('that file has no ' + what);
    if (v.length > max) bad('that file has ' + v.length + ' ' + what + ' — ' + max + ' is the most this site opens');
    return v;
  }
  function each(v, max, what, fn) { list(v, max, what).forEach(function (x, i) { if (!fn(x, i)) bad('one of the ' + what + ' in that file is malformed'); }); }

  /* One entry per subject. `label` is used in the message a page shows when a file arrives on
     the wrong page, so it reads as a sentence: "that is a maze — this page opens an array." */
  var KINDS = {
    array: {
      label: 'an array', accept: 'the numbers of an array, in starting order',
      check: function (d) {
        if (!Array.isArray(d) || !d.length) bad('that file holds an empty array');
        each(d, 500, 'entries', function (v) { return num(v, -1e9, 1e9); });
      },
    },

    memory: {
      label: 'a block of memory', accept: 'an array or linked list, slot for slot',
      check: function (d) {
        if (!d || typeof d !== 'object') bad('that file holds no memory block');
        var n = list(d.cells, 512, 'slots').length;
        if (!n) bad('that memory block has no slots');
        each(d.cells, 512, 'slots', function (c) {
          return c === null || (c && num(c.value, -1e9, 1e9) &&
            (c.next === null || int(c.next, 0, n - 1)) &&
            (c.prev === null || c.prev === undefined || int(c.prev, 0, n - 1)));
        });
        if (!(d.head === null || d.head === undefined || (int(d.head, 0, n - 1) && d.cells[d.head])))
          bad('that memory block points its head at an empty slot');
      },
    },

    bst: {
      label: 'a binary search tree', accept: 'a tree, node for node',
      check: function (d) {
        if (!d || typeof d !== 'object') bad('that file holds no tree');
        var count = 0;
        (function walk(n, depth) {
          if (n === null || n === undefined) return;
          if (typeof n !== 'object' || !num(n.value, -1e9, 1e9)) bad('a node in that tree has no value');
          if (++count > 1023) bad('that tree has more than 1023 nodes');
          if (depth > 64) bad('that tree is deeper than this page can draw');
          walk(n.left, depth + 1);
          walk(n.right, depth + 1);
        })(d.root, 1);
      },
    },

    graph: {
      label: 'a graph', accept: 'nodes and weighted edges on the unit square',
      check: function (d) {
        if (!d || typeof d !== 'object') bad('that file holds no graph');
        var ids = {};
        each(d.nodes, 64, 'nodes', function (n) {
          if (!n || !int(n.id, 0, 1e6) || ids[n.id]) return false;
          ids[n.id] = true;
          return words(n.label, 3) && num(n.x, 0, 1) && num(n.y, 0, 1);
        });
        if (!d.nodes.length) bad('that graph has no nodes');
        each(d.edges, 2048, 'edges', function (e) {
          return e && ids[e.a] && ids[e.b] && e.a !== e.b && num(e.w, 0, 999);
        });
      },
    },

    maze: {
      label: 'a maze', accept: 'a grid of cells and the walls between them',
      check: function (d) {
        if (!d || typeof d !== 'object') bad('that file holds no maze');
        if (!int(d.cols, 2, 200) || !int(d.rows, 2, 200)) bad('that maze is not a sensible size');
        if (!Array.isArray(d.cells) || d.cells.length !== d.cols * d.rows)
          bad('that maze says it is ' + d.cols + '×' + d.rows + ' but carries ' +
            (Array.isArray(d.cells) ? d.cells.length : 'no') + ' cells');
        each(d.cells, 40000, 'cells', function (c) {
          return c && bool(c.n) && bool(c.e) && bool(c.s) && bool(c.w);
        });
      },
    },

    points: {
      label: 'a set of points', accept: 'points on the unit square',
      check: function (d) {
        if (!d || typeof d !== 'object') bad('that file holds no points');
        each(d.points, 200, 'points', function (p) { return p && num(p.x, 0, 1) && num(p.y, 0, 1); });
      },
    },

    jobs: {
      label: 'a set of offers', accept: 'jobs as half-open intervals on a timeline',
      check: function (d) {
        if (!d || typeof d !== 'object') bad('that file holds no offers');
        if (!int(d.span, 1, 600)) bad('that file has no sensible timeline length');
        each(d.jobs, 200, 'offers', function (j) {
          return j && words(j.studio, 16) && int(j.row, 0, 63) &&
            int(j.start, 0, d.span) && int(j.end, 0, d.span) && j.end > j.start;
        });
      },
    },
  };

  function clean(name) {
    var s = String(name == null ? '' : name).replace(/[^\w .-]+/g, '').trim().slice(0, 40);
    return s || 'untitled';
  }

  function write(kind, data, name) {
    if (!KINDS[kind]) bad('there is nothing here that saves a “' + kind + '”');
    KINDS[kind].check(data);            // never write a file this site cannot open again
    return JSON.stringify({
      format: FORMAT, version: VERSION, kind: kind, name: clean(name),
      saved: new Date().toISOString().slice(0, 10), data: data,
    }, null, 2);
  }

  /* `accept` is the page's allow-list of kinds. It is what stops a maze opening on a sorting
     page as an unreadable heap rather than as a plain sentence saying it is a maze. */
  function read(source, accept) {
    var file;
    if (typeof source !== 'string' || source.length > 4e6) bad('that file is too big to be one of ours');
    try { file = JSON.parse(source); } catch (e) { bad('that is not a ' + EXT + ' file — it is not even JSON'); }
    if (!file || typeof file !== 'object' || Array.isArray(file)) bad('that is not a ' + EXT + ' file');
    if (file.format !== FORMAT) bad('unknown file format “' + clean(file.format) + '”');
    if (!int(file.version, 1, VERSION)) bad('that file was saved by a newer version of this site');
    var kind = KINDS[file.kind];
    if (!kind) bad('this site has nothing that opens a “' + clean(file.kind) + '”');
    if (accept && accept.indexOf(file.kind) < 0) {
      bad('that is ' + kind.label + ' — this page opens ' +
        accept.map(function (k) { return KINDS[k].label; }).join(' or '));
    }
    kind.check(file.data);
    return { kind: file.kind, name: clean(file.name), data: file.data };
  }

  window.ReiiFile = { EXT: EXT, FORMAT: FORMAT, VERSION: VERSION, kinds: KINDS, write: write, read: read, clean: clean };
})();
