/* The arrays-and-linked-lists page. Plain script, one global `ListsPage`.

   Unlike the sorting pages, the STORE survives between runs: you build a structure up over
   several operations and each one is traced against what is already there. So `build` does not
   make a new subject — it runs whatever operation the rail last asked for against the standing
   store, and only Clear or a change of structure starts over. */
(function () {
  'use strict';

  var SLOTS = 72;

  window.ListsPage = function () {
    var store, kind, pending;

    function ops() { return kind === 'array' ? window.ArrayOps : window.ListOps; }
    function doubly() { return kind === 'doubly'; }

    function* intro(message) {
      yield {
        note: message || 'Pick a value and an operation. The structure is kept <b>sorted</b>, ' +
          'so the same values in the same order end up in very different places in memory ' +
          'depending on which structure is holding them.',
        roles: {},
      };
    }

    function reset(message) {
      store = window.Store(SLOTS);
      pending = function () { return intro(message); };
    }

    function value(rail) {
      var v = rail.get('value');
      return Number.isFinite(v) ? v : Math.floor(Math.random() * 99) + 1;
    }

    /* Which structure a saved block IS, read off the block itself: only the list operations
       ever set a head, and only a doubly linked one ever writes a back pointer. Getting this
       wrong would run array operations over a list, so it is derived rather than remembered. */
    function detect(saved) {
      if (saved.head == null) return 'array';
      return saved.cells.some(function (c) { return c && c.prev != null; }) ? 'doubly' : 'singly';
    }

    reset();

    return window.Playground({
      title: 'Memory',
      legend: ['idle', 'scan', 'focus', 'move', 'path', 'done', 'reject'],
      legendNotes: {
        idle: { label: 'Free', desc: 'An unused slot of memory' },
        scan: { label: 'Walked', desc: 'Slots visited getting here' },
        focus: { label: 'Here', desc: 'The slot being looked at right now' },
        move: { label: 'Written', desc: 'Just written or allocated' },
        path: { label: 'The list', desc: 'The chain as it stands, head to tail' },
        done: { label: 'In use', desc: 'Holding a value' },
        reject: { label: 'Eliminated', desc: 'Ruled out without being read' },
      },

      fields: [
        { id: 'kind', kind: 'choice', label: 'Structure', value: 'array', options: [
          { value: 'array', label: 'Array' },
          { value: 'singly', label: 'Singly linked list' },
          { value: 'doubly', label: 'Doubly linked list' },
        ] },
        { id: 'value', kind: 'number', label: 'Value', min: 1, max: 999, value: 42 },
        { id: 'insert', kind: 'button', label: 'Insert', variant: 'primary' },
        { id: 'search', kind: 'button', label: 'Search' },
        { id: 'remove', kind: 'button', label: 'Delete' },
        { id: 'clear', kind: 'button', label: 'Clear', variant: 'ghost' },
        { id: 'autoplay', kind: 'check', label: 'Play automatically', value: true },
        { id: 'hint', kind: 'note', spacer: true, label:
          'Insert the same handful of values into an array and then into a list, and compare ' +
          'the Hops and Writes counters.' },
      ],

      file: {
        kind: 'memory',
        name: function () { return 'memory-' + kind; },
        get: function () { return store.used() ? store.view() : null; },
        open: function (data, name, api) {
          api.rail.set('kind', detect(data));      // switching structure clears the block…
          store = window.Store.load(data);         // …and this is the block that replaces it
          pending = function () {
            return intro('Opened <b>' + name + '</b> — the same values in the same slots they ' +
              'were saved in. Insert one more and watch where it has to go.');
          };
        },
      },

      onField: function (id, v, api) {
        var rail = api.rail;
        if (id === 'autoplay') return false;                  // just a preference, nothing to run
        if (id === 'kind') { kind = v; reset('Switched to the ' + v + ' structure — the block starts empty.'); return; }
        if (id === 'clear') { reset('Cleared.'); return; }
        if (id === 'value') return false;                    // typing a number runs nothing
        var target = value(rail);
        var op = ops()[id === 'remove' ? 'remove' : id];
        if (!op) return false;
        pending = function () { return op(store, target, doubly()); };
        if (rail.get('autoplay')) { api.rebuild(); api.player.play(); return false; }
      },

      build: function (rail) {
        kind = kind || rail.get('kind');
        return { subject: store, gen: pending(), title: 'Memory · ' + kind };
      },

      render: function (surface, frame, colours) { window.MemoryDraw.draw(surface, frame, colours); },
    });
  };
})();
