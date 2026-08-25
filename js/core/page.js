/* The page orchestrator — one global `Playground`. This is the file a visualiser page calls,
   and the reason a page script is now about forty lines instead of five hundred.

   It owns the wiring and nothing else: rail → build a run → trace it → hand it to the player →
   the player moves the workbench and the surface. A page supplies the three things that are
   actually about ITS algorithm:

       fields   what the rail asks for            (js/core/rail.js)
       build    turn those answers into a run     → { subject, gen, title }
       render   draw one frame                    (surface, frame, colours)

   Everything else — sizing the canvas, counting comparisons, pausing a timer, disabling Prev
   at frame zero, keeping the legend honest — belongs to the runtime and happens for free.

       Playground({ fields, legend, build, render, file })

   Returns the live parts so an interactive page (the node plane, the point plane) can drive
   the model from its own pointer handlers and call `rebuild()` when the input really changed. */
(function () {
  'use strict';

  window.Playground = function (o) {
    var railEl = document.querySelector('.rail-fields') || document.querySelector('.rail');
    var canvas = document.getElementById('canvas');
    var legendEl = document.getElementById('step-legend');
    var colours = window.Palette.all();
    var current = null;              // the frame on screen, so a resize can repaint it

    var player = window.Player({
      onFrame: function (i, f) { current = f; bench.onFrame(i, f); paint(); },
      onState: function () { bench.onState(); },
    });
    var bench = window.Workbench(player, { title: o.title || '' });

    var surface = canvas ? window.Surface(canvas, function (s) {
      if (current) o.render(s, current, colours);
    }) : null;

    function paint() {
      if (surface) surface.draw();
      else if (o.render) o.render(null, current, colours);
    }

    var rail = window.Rail(railEl, o.fields || [], function (id, value) {
      // a field handler that returns false has dealt with the change itself
      if (o.onField && o.onField(id, value, api) === false) return;
      api.rebuild();
    });

    if (legendEl && o.legend) window.Legend(legendEl, o.legend, o.legendNotes);

    var api = {
      rail: rail,
      player: player,
      surface: surface,
      colours: colours,
      /* Rebuild the run from the rail's current answers and load the new trace. Everything
         that changes the PROBLEM goes through here; nothing else needs to touch the player. */
      rebuild: function () {
        var run = o.build(rail, api);
        if (!run) return api;
        if (run.title) bench.setTitle(run.title);
        player.load(window.Trace.build(run.gen, run.subject, run.opts));
        return api;
      },
      /* Repaint without rebuilding — for a page whose stage is editable between runs. */
      repaint: paint,
      frame: function () { return current; },
    };

    /* Open or Save, if the page declared what it saves. The rebuild after an open belongs
       here rather than in eight page scripts — every open is a new problem by definition. */
    if (o.file) {
      window.Files(railEl, Object.assign({}, o.file, {
        open: function (data, name) { o.file.open(data, name, api); api.rebuild(); },
      }));
    }

    api.rebuild();
    return api;
  };
})();
