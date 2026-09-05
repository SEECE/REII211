/* The stage as a viewport. Plain script, one global `CityControls`.

   One pointer, two meanings, decided at the moment it goes down: on a pin it drags that pin,
   anywhere else it pans the map. Scrolling zooms about the cursor.

   Nothing here is a CLICK. Click-to-move was fine when the whole map was sixty-four crossings
   and every one of them was a finger wide; on thirteen thousand real ones it is not, because
   the crossing nearest a click is frequently not the one under the cursor, and being told the
   pin went somewhere else is worse than having to aim. A drag says which pin is moving and
   where it is going for as long as it is happening, and the drop snaps to the crossing under
   the pin's point.

   Dropping a pin is a new errand, so it re-runs — unlike the node plane, where an edit is
   announced and waits, because here there is only one thing a drop can mean. Panning and
   zooming are not errands and only repaint: the trace is about the streets, and which of them
   you happen to be looking at is not one of the streets.

       CityControls({ page, cam, city(), pins(), drop(pin, id) }) → { held() }

   `held` is the pin in flight, which the renderer draws under the cursor. It lives here because
   this is the only file that knows a drag is happening. */
(function () {
  'use strict';

  window.CityControls = function (o) {
    var page = o.page;
    if (!page.surface) return { held: function () { return null; } };
    var canvas = page.surface.canvas, held = null, pan = null;

    canvas.style.touchAction = 'none';        // or a touch drag scrolls the page instead

    function stage(e) {
      var box = canvas.getBoundingClientRect();
      return { x: e.clientX - box.left, y: e.clientY - box.top };
    }
    function onPin(at) {
      return window.CityDraw.grab(page.surface, o.city().view(), o.cam, at.x, at.y, o.pins());
    }

    canvas.addEventListener('pointerdown', function (e) {
      var at = stage(e), pin = onPin(at);
      canvas.setPointerCapture(e.pointerId);
      if (pin) held = { pin: pin, x: at.x, y: at.y }; else pan = at;
      canvas.style.cursor = 'grabbing';
      if (pin) page.repaint();
    });

    canvas.addEventListener('pointermove', function (e) {
      var at = stage(e);
      if (held) {
        held.x = at.x;
        held.y = at.y;
        page.repaint();
      } else if (pan) {
        o.cam.pan(at.x - pan.x, at.y - pan.y, page.surface, o.city().view());
        pan = at;
        page.repaint();
      } else {
        canvas.style.cursor = onPin(at) ? 'grab' : 'default';
      }
    });

    canvas.addEventListener('pointerup', function () {
      canvas.style.cursor = 'default';
      pan = null;
      if (!held) return;
      var flying = held;
      held = null;
      /* Where the pin's point ended up, as a place on the MAP — then the nearest crossing to
         it. Turning the cursor back into map coordinates rather than searching in stage ones is
         what makes this work identically at every zoom. */
      var at = window.CityDraw.where(page.surface, o.city().view(), o.cam, flying.x, flying.y);
      var landed = window.CitySource.nearest(o.city(), at.x, at.y);
      var was = o.pins()[flying.pin === 'From' ? 'from' : 'to'];
      // dropped on the crossing it started from: nothing to re-run, just put it back down
      if (landed == null || landed === was) { page.repaint(); return; }
      o.drop(flying.pin, landed);
    });

    canvas.addEventListener('pointercancel', function () {
      held = null;
      pan = null;
      canvas.style.cursor = 'default';
      page.repaint();
    });

    /* Zoom about the cursor, so whatever was under it stays under it. `deltaY` is reported in
       wildly different units by browser and by device, so only its SIGN is trusted. */
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var at = stage(e);
      o.cam.zoom(e.deltaY < 0 ? 1.18 : 1 / 1.18, at.x, at.y, page.surface, o.city().view());
      page.repaint();
    }, { passive: false });

    return { held: function () { return held; } };
  };
})();
