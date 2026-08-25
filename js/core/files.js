/* The Open-or-Save control at the foot of every rail. Plain script, one global `Files`.

   A page does not build this: `Playground` appends it when the page declares a `file` block
   (structure/PAGES.md), so the control sits in the same place, says the same things and is
   styled the same way on all fourteen pages. What varies is only which KIND of subject the
   page saves and which kinds it will open — both read out of js/io/reii.js, so the wording
   here cannot drift from what the format actually accepts.

   The menu expands INLINE rather than popping over the button: the rail is a scroll container
   (structure/FRONTEND.md), so an absolutely-positioned menu would be clipped by it. An inline
   disclosure needs no measuring, survives the narrow-screen drawer, and is a plain
   <button aria-expanded> as far as a screen reader is concerned.

       Files(railEl, { kind, accept, name(), get(), open(data, name) })

   `get()` returns the subject view to save, or null if there is nothing yet. `open()` may
   throw — the message goes straight to the student, so it should read like a sentence. */
(function () {
  'use strict';

  function node(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function slug(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'reii';
  }

  function download(text, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  window.Files = function (root, o) {
    var F = window.ReiiFile;
    var kind = F.kinds[o.kind];
    if (!root || !kind) return null;
    var accept = o.accept || [o.kind];

    var box = node('div', 'field filemenu');
    box.appendChild(node('span', 'field-label', 'File'));
    var btn = node('button', 'btn btn--soft btn--block',
      '<span class="file-caret" aria-hidden="true"></span> Open or Save');
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    box.appendChild(btn);

    var list = node('div', 'file-actions');
    list.hidden = true;
    var opens = accept.map(function (k) { return F.kinds[k].label; }).join(' or ');
    var pick = node('label', 'file-action',
      'Open a file…<small>' + opens + ', saved anywhere on this site</small>');
    var input = node('input', 'sr-only');
    input.type = 'file';
    input.accept = F.EXT + ',.json,application/json';
    pick.appendChild(input);
    var save = node('button', 'file-action',
      'Save ' + kind.label + '<small>' + F.EXT + ' — ' + kind.accept + '</small>');
    save.type = 'button';
    list.appendChild(pick);
    list.appendChild(save);
    box.appendChild(list);

    var note = node('p', 'field-note');
    note.setAttribute('role', 'status');
    box.appendChild(note);
    root.appendChild(box);

    function say(msg, bad) {
      note.textContent = msg || '';                  // never innerHTML: this quotes a filename
      note.classList.toggle('field-note--error', !!bad);
    }
    function show(on) {
      list.hidden = !on;
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    }

    btn.addEventListener('click', function () { show(list.hidden); });
    document.addEventListener('click', function (e) {
      if (!list.hidden && !box.contains(e.target)) show(false);
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !list.hidden) { show(false); btn.focus(); }
    });

    save.addEventListener('click', function () {
      var data = o.get && o.get();
      if (!data) { say(o.empty || 'there is nothing here to save yet', true); return; }
      var base = slug(o.name ? o.name() : o.kind);
      try {
        var text = F.write(o.kind, data, base);
        F.read(text, [o.kind]);        // saving a file this site cannot open again is worse
        download(text, base + F.EXT);  // than not saving it at all
        say('saved ' + base + F.EXT);
        show(false);
      } catch (err) { say(err.message, true); }
    });

    input.addEventListener('change', function () {
      var file = input.files[0];
      input.value = '';                              // so re-picking the same file fires again
      if (!file) return;
      if (file.size > 4e6) { say('that file is far too big to be one of ours', true); return; }
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var got = F.read(reader.result, accept);
          o.open(got.data, got.name);
          say('opened ' + got.name + F.EXT);
          show(false);
        } catch (err) { say(err.message, true); }
      };
      reader.onerror = function () { say('could not read that file', true); };
      reader.readAsText(file);
    });

    return { say: say, close: function () { show(false); } };
  };
})();
