# Pages — how a visualiser is put together

**Read this before adding a page or changing a page script.** The layout is
[FRONTEND.md](FRONTEND.md); the algorithm side is [RUNTIME.md](RUNTIME.md).

Every visualiser is the same three files' worth of work:

```
topics/<slug>/index.html   ~95 lines of shell, identical everywhere but the title and one call
js/pages/<name>.js         the wiring: what the rail asks, how to build a run, how to draw it
js/<area>/*.js             the algorithm(s), which know nothing about any of this
```

## The page script

`js/core/page.js` owns the wiring and nothing else: rail → build a run → trace it → hand it to
the player → the player moves the workbench and the surface. A page supplies only what is
actually about its own subject.

```js
Playground({
  title:       'Bubble sort',                      // workbench heading
  fields:      [ … ],                              // the rail, declared — see js/core/rail.js
  legend:      ['idle', 'scan', 'move', 'done'],   // role names, captions from js/core/legend.js
  legendNotes: { scan: { desc: 'The pair being compared' } },

  build:  function (rail) { return { subject, gen, title }; },
  render: function (surface, frame, colours) { … },
  onField: function (id, value, api) { … },        // optional

  file: {                                          // optional — Open or Save, in the rail
    kind:   'graph',                               // what this page saves (js/io/reii.js)
    accept: ['graph'],                             // what it will open; defaults to [kind]
    name:   function () { return 'graph-9'; },     // the filename, slugified for you
    get:    function () { return graph.view(); },  // or null when there is nothing to save
    open:   function (data, name, api) { … },      // may throw; the message is for a student
  },

  latex: {                                         // optional — Copy LaTeX figure, same menu
    name: function () { return 'graph-9'; },       // names it in the sentence it reports with
    ask:  'the sentence under the checkbox',       // omit and it copies with no dialog at all
    get:  function (opts) { return tex; },         // opts.solution; null when there is nothing
  },
});
```

`latex` is the one-way export — a figure for a report, not a subject this site reads back, and
it goes on the CLIPBOARD rather than into a file. It is a separate block because it is a
separate question: `file.get` hands over the subject, `latex.get` hands over a PICTURE of it,
and only the page knows whether the answer belongs in the picture. Declaring `ask` is what puts
the options dialog in front of it. `Playground` forwards the block to the file control by name —
leaving it behind is how the action silently never appears. See [FORMATS.md](FORMATS.md).

`file.open` applies the file and nothing else — `Playground` rebuilds afterwards, because every
open is a new problem by definition. Throwing out of it is how a page refuses a file it cannot
draw (an array of 90 on a page whose tree tops out at 28); the message goes straight to the
student, so it should read like a sentence. See [FORMATS.md](FORMATS.md).

`build` is called on every rebuild and must return a **fresh generator**. `render` draws one
frame and is also called on resize, so it must be pure with respect to the frame it is given —
never mutate `frame.roles`; overlay onto a copy (see `js/pages/node-plane.js`).

`api.frames()` hands back the whole trace by reference, for a view that draws the RUN rather
than a moment in it — the marking table on the sorting pages rebuilds when that stops being the
same array and not before. `render` is still the only thing that draws.

**Copy a frame with `Object.assign`, never `Object.create`.** `roles` is an accessor, because a
beat may state only what changed and the map is folded on demand ([RUNTIME.md](RUNTIME.md)).
Inheriting from a frame and assigning over its roles throws in strict mode, and the map the
getter hands back at a keyframe is that keyframe's own — so copy the map too before writing
into it.

A page whose run is too long to drain up front returns `{ live: function () { return { subject,
gen }; } }` instead of `{ subject, gen }` — a way to START the run rather than one already
walked. `Playground` hands that to `Trace.live` and everything downstream is unchanged. Only the
colour block needs it, and [RUNTIME.md](RUNTIME.md) says what it costs.

A page whose subject is bigger than its stage owns a **camera**, and it is a rendering concern
only — the subject is whole and every part of it exists at every zoom. The street map keeps one
in `js/city/camera.js`: a point in SUBJECT coordinates that sits at the middle of the stage, and
a zoom over whatever scale fits the whole thing. Keeping it in subject units rather than pixels
is what makes it survive a resize, and `render` culling to `cam.bounds()` is what makes a
zoomed-in view cost what a zoomed-in view should cost. The camera must survive `rebuild()` —
that runs on every interaction, and being thrown back to the whole subject each time is
unusable — so it is reset only when the subject itself is replaced.

`onField(id, value, api)` runs before the rebuild. Return `false` to suppress it — that is how a
number box can be typed into without re-running anything. A range whose rebuild is expensive
takes `settle: true` instead, and reports when the drag ENDS rather than on every tick of it —
the colour block rebuilds six sorts over up to 484 values and locks the tab up otherwise.

Everything else — sizing the canvas, counting, pausing a timer, disabling Prev at frame zero,
keeping the legend honest — is the runtime's.

## Two kinds of page

**Fresh each run** (the sorts, the recursion trees). `build` makes a new subject every time, so
changing any rail field is a new problem.

**Standing subject** (memory, BST, node plane, the street map, the maze, point plane,
scheduling). The subject lives in the page's closure and *survives* between runs — you build a
structure up over several operations, or you build a graph and then run four different
algorithms on it. `build` runs
whatever the rail last asked for against what is already there; only Clear or a genuine change
of input starts over. This is what makes the comparisons on those pages mean anything: BFS and
Dijkstra on *the same* graph, all three greedy rules on *the same* offers.

An interactive page also drives the subject from its own pointer handlers, then calls
`api.rebuild()`. Hit-testing reads its geometry back from the renderer (`GraphDraw.hit`,
`CityDraw.hit`, `PointDraw.hit`) rather than recomputing it, so what you click is what was drawn
— the old version worked the positions out twice and the two drifted apart on every resize.

## Adding a visualiser

1. **One entry in `js/ui/sitemap.js`.** That is the only place a page is named; the ribbon nav
   and home's cards both render from it.
2. **`topics/<slug>/index.html`** — copy the nearest existing one. Change the `<title>`, the
   `.ribbon-title`, `data-current`, `data-load` and the one init call. Nothing else varies.
   `<slug>` must equal the sitemap id: `SiteMap.href()` builds every link from it.
3. **A bundle in `js/deps.js`** naming the files. **No page lists scripts by hand** — that is
   what keeps the 200-line ceiling cheap to hold, since splitting a file is an edit there and in
   no markup at all.
4. **`js/pages/<name>.js`** with the `Playground` call.
5. **The algorithm** under `js/<area>/`, plus its checks in `js/tests/` — see
   [RUNTIME.md](RUNTIME.md#adding-an-algorithm).
6. **A `file` block**, so the page can save what it is set up on and open it again. If the
   subject is a new shape, that is a kind in `js/io/reii.js` too — [FORMATS.md](FORMATS.md).

## A page that draws real data

One page does: Manhattan reads its streets from an OpenStreetMap extract. Three rules come with
that, and they are why it did not need a new subject, a new kind or a new renderer.

**The data is fetched at build time and committed.** A visualiser must open over `file://` with
no server and no network, so a page that fetched anything would be a page that sometimes draws
nothing. `tools/fetch-osm.sh` writes the asset; the page loads it as a `<script>`, because
`fetch()` and `XMLHttpRequest` are both blocked on `file://` and a script tag is not.

**It becomes a `Graph` and nothing downstream is told.** `js/city/osm-graph.js` hands back the
same subject `js/city/grid.js` invents, so all five algorithms, the renderer, the trace and the
file block are the ones that were already there. If real data needs a change downstream, the
change is usually wrong — the exception was `.wb-readout`, which was capped without an
`overflow` and only overflowed once a counter held two hundred street names.

**A real crop is not a tidy graph.** Cropping a street network leaves islands, so the largest
connected component is what is kept; and the runtime scans nodes linearly and snapshots the
whole subject per frame, so the window tightens around its centre until it is under a node cap.
Both are the page's problem to solve before the runtime ever sees the graph.

## Page markup, in order

```
<header class="ribbon">      brand · title · [data-nav] · the two panel toggles
<div class="workspace">
  <aside class="rail">         with an empty .rail-fields for js/core/rail.js
  <section class="stage">      with <canvas id="canvas">
  <aside class="workbench">    head · narration + #step-legend · #step-readout · transport
  <button class="scrim">
<script src="js/deps.js" data-load="…">
<script>window.addEventListener('load', …)</script>
<script src="js/ui/sitemap.js"></script>
<script src="js/ui/nav.js"></script>
```

The init call goes inside a `load` listener because `deps.js` **appends** the bundle rather than
letting the parser see it — by `load`, every file has run.

`sitemap.js` and `nav.js` stay plain tags at the end of `<body>`: they need nothing from the
bundle, and home and About load them without a bundle at all.
