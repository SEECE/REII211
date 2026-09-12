/* "Export to LaTeX…" — the third action under the rail's file button. Plain script, one global
   `FilesLatex`, appended by js/core/files.js when the page declares a `latex` block.

       latex: {
         name: function () { return 'graph-9'; },     // the filename, slugified for you
         ask:  'the sentence under the checkbox',     // optional — omit and it exports at once
         get:  function (opts) { return tex; },       // opts.solution; null if nothing to draw
       }

   The options are a real `<dialog>` and not another inline disclosure. The rail is a scroll
   container, so the Open-or-Save menu had to expand in place (css/controls-file.css) — but a
   dialog is in the browser's top layer, above every overflow on the page, and brings the modal
   backdrop, Escape, the focus trap and `method="dialog"` returning which button was pressed
   with it. That is four behaviours nobody has to write, and the reason this is not a div. */
(function () {
  'use strict';

  window.FilesLatex = function (o) {
    var node = window.Files.node, spec = o.latex;
    var action = node('button', 'file-action',
      'Export to LaTeX…<small>.tex — a TikZ figure for a report' +
      (spec.ask ? ', with or without the answer' : '') + '</small>');
    action.type = 'button';
    o.list.appendChild(action);

    var dialog = null, box = null;

    /* Built once, on first use: a page that never exports never puts one in the document. */
    function make() {
      dialog = node('dialog', 'file-dialog');
      dialog.innerHTML =
        '<form method="dialog">' +
        '<h2>Export to LaTeX</h2>' +
        '<label class="file-opt"><input type="checkbox" checked>' +
        '<span>Include the solution<small>' + spec.ask + '</small></span></label>' +
        '<menu><button value="cancel" class="btn btn--soft">Cancel</button>' +
        '<button value="go" class="btn btn--primary">Export</button></menu>' +
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
      var base = window.Files.slug(spec.name ? spec.name() : 'figure');
      window.Files.download(text, base + '.tex', 'application/x-tex');
      o.say('exported ' + base + '.tex — compile it with pdflatex');
      o.show(false);
    }

    action.addEventListener('click', function () {
      if (!spec.ask) return write(false);
      if (!dialog) make();
      dialog.returnValue = '';
      dialog.showModal();
    });
  };
})();
