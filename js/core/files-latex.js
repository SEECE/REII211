/* "Copy LaTeX figure…" — the third action under the rail's file button. Plain script, one
   global `FilesLatex`, appended by js/core/files.js when the page declares a `latex` block.

       latex: {
         name: function () { return 'graph-9'; },     // names it in the sentence it reports
         ask:  'the sentence under the checkbox',     // optional — omit and it copies at once
         get:  function (opts) { return tex; },       // opts.solution; null if nothing to draw
       }

   It writes no file. The only place a figure ever goes is pasted into a report the student
   already has open, so it goes on the CLIPBOARD — the same thing the EERI 124 visualiser's
   "Copy LaTeX Diagram" does, so the two courses behave alike. A downloaded .tex would be one
   more thing to find in a downloads folder on the way to the same paste.

   The options are a real <dialog> and not another inline disclosure. The rail is a scroll
   container, so the Open-or-Save menu had to expand in place (css/controls-file.css) — but a
   dialog is in the browser's top layer, above every overflow on the page, and brings the modal
   backdrop, Escape, the focus trap and `method="dialog"` returning which button was pressed
   with it. That is four behaviours nobody has to write, and the reason this is not a div. */
(function () {
  'use strict';

  /* The site must work over file://, where the async clipboard is the least reliable thing on
     the page — it needs a secure context and a permission that a local file does not always
     get. The old execCommand path is deprecated and works there, so it is the fallback rather
     than a sentence telling a student their figure is somewhere they cannot reach.
     ponytail: two paths because one of them is not available everywhere the site has to run. */
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(legacy);
    }
    return legacy();

    function legacy() {
      var box = document.createElement('textarea');
      box.value = text;
      box.setAttribute('readonly', '');
      box.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(box);
      box.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(box);
      return ok ? Promise.resolve() : Promise.reject(new Error('no clipboard'));
    }
  }

  window.FilesLatex = function (o) {
    var node = window.Files.node, spec = o.latex;
    var action = node('button', 'file-action',
      'Copy LaTeX figure…<small>a TikZ figure, straight onto the clipboard' +
      (spec.ask ? ' — with or without the answer' : '') + '</small>');
    action.type = 'button';
    o.list.appendChild(action);

    var dialog = null, box = null;

    /* Built once, on first use: a page that never exports never puts one in the document. */
    function make() {
      dialog = node('dialog', 'file-dialog');
      dialog.innerHTML =
        '<form method="dialog">' +
        '<h2>Copy LaTeX figure</h2>' +
        '<label class="file-opt"><input type="checkbox" checked>' +
        '<span>Include the solution<small>' + spec.ask + '</small></span></label>' +
        '<menu><button value="cancel" class="btn btn--soft">Cancel</button>' +
        '<button value="go" class="btn btn--primary">Copy</button></menu>' +
        '</form>';
      box = dialog.querySelector('input');
      dialog.addEventListener('close', function () {
        if (dialog.returnValue === 'go') write(box.checked);
      });
      document.body.appendChild(dialog);
    }

    function write(solution) {
      var text = spec.get({ solution: !!solution });
      if (!text) { o.say(spec.empty || 'there is nothing here to draw yet', true); return; }
      var what = window.Files.slug(spec.name ? spec.name() : 'figure');
      copy(text).then(function () {
        o.say('copied ' + what + ' — paste it in between the two fence comments');
        o.show(false);
      }, function () {
        o.say('this browser would not let the page reach the clipboard', true);
      });
    }

    action.addEventListener('click', function () {
      if (!spec.ask) return write(false);
      if (!dialog) make();
      dialog.returnValue = '';
      dialog.showModal();
    });
  };
})();
