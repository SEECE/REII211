# Files — the `.reii` format

**Read this before changing what a page saves, or adding a kind.** The runtime side is
[RUNTIME.md](RUNTIME.md); wiring a page is [PAGES.md](PAGES.md).

Every page here has a different idea of what its *input* is: an array of numbers, a block of
addressed memory, a tree, a graph, a maze, a scatter of points, a pile of offers. Seven pages,
seven shapes. The obvious thing to do is write a little format for each — and the result is
seven half-formats and a student who cannot tell which of their downloads opens where.

So there is **one envelope**, and the only thing that varies is what is inside it.

```json
{
  "format": "reii-subject",
  "version": 1,
  "kind": "graph",
  "name": "graph-9",
  "saved": "2026-08-25",
  "data": { "nodes": [ … ], "edges": [ … ] }
}
```

## `data` is the subject's `view()`

Not a new representation of the subject — **the same snapshot the renderer already draws**
(see [RUNTIME.md](RUNTIME.md#subject)). That single decision is what keeps this small:

- **Saving is free.** A page saves the view it was going to draw anyway. There is no second
  description of a graph to keep in step with the first.
- **A page cannot save a shape the site does not understand**, because the shape is the one the
  site is built on.
- **Opening is one method per subject** — `Graph.load`, `MazeGrid.load`, `Store.load`,
  `BST.load`, `PointSet.load`, `JobSet.load` — each rebuilding itself from its own view, through
  its own public API, so nothing bypasses the model. An array needs no loader: it *is* the view.

`load()` is not part of the trace contract. The runtime never calls it; only a page opening a
file does.

## The kinds

| `kind` | Subject | Opens on |
|---|---|---|
| `array` | a plain array of numbers (up to 16,384 — a 128 × 128 colour block) | the six sorting pages, both recursion trees, both comparison pages |
| `memory` | `Store` — slots, values and pointers | arrays & linked lists |
| `bst` | `BST` — the tree's shape | binary search trees |
| `graph` | `Graph` — nodes and weighted edges | node plane, Manhattan (its idealised grid) |
| `maze` | `MazeGrid` — cells and the walls between them | maze search |
| `points` | `PointSet` — points on the unit square | closed route finding |
| `jobs` | `JobSet` — half-open intervals on a timeline | job scheduling |

An `array` opening on eight different pages is the point: save a shuffle from bubble sort, open
it on merge sort, and the comparison counts are finally about the algorithms.

A `graph` opening on two is the same point made the other way. A street map *is* a graph, so
Manhattan saves one and the node plane will draw it — but the reverse is not free, because
Manhattan draws blocks between four corners and a node plane has none. The kind cannot express
that, so the page checks the SHAPE and refuses in a sentence (`CityGrid.isCity`). A kind says
what a file is; only the page knows what it can draw.

Manhattan's *real* map is the other end of the same argument. It is a `Graph` like any other,
but a window on it is hundreds of crossings called things like `Broadway × W 42nd St`, and this
format holds 64 nodes with three-letter labels. So the page declines to save one and says why,
rather than writing a file it could never open again. Nothing is bent to fit: a `.reii` carries
a problem a student set up between the pages that can draw it, and a city read off a map is
neither.

## Everything read off a disk is checked

`js/io/reii.js` parses and validates; it builds nothing. A file may have been hand-edited,
truncated, or written by something that guessed, so every kind checks its own fields before a
page sees them — indices in range, coordinates on the plane, a cell count that matches the grid
it claims, intervals that end after they start, and labels that are plain words rather than
markup on its way into narration through `innerHTML`.

Two rules that are easy to lose:

1. **Nothing is written before the round trip is proved.** `Files` writes, reads its own output
   back, and only then downloads. A file this site cannot open again is worse than no file.
2. **A page declares what it will open.** The allow-list is what turns "a maze drawn as an
   unreadable heap on the sorting page" into the sentence *that is a maze — this page opens an
   array*.

## Adding a kind

1. **An entry in `KINDS`** in [../js/io/reii.js](../js/io/reii.js) — a `label`, a one-line
   `accept` describing what is inside, and a `check` that validates every field.
2. **A `load()` on the subject**, next to the model it rebuilds, using that model's public API.
3. **The `file` block on the page's `Playground`** — see [PAGES.md](PAGES.md).
4. **Round-trip checks** in [../js/tests/io.js](../js/tests/io.js): write it, read it, load it,
   and compare the subject's own `view()` — "it opened" is not the same claim as "it opened as
   the same thing" — plus the refusals that matter for the new shape.

## Out: a figure, as LaTeX

A `.reii` carries a **problem** between the pages of this site. It is not, and should not
become, a way of getting a *picture* out of one — a student writing up a practical needs a
figure in their report, and a `.reii` is no use to them at all.

So there is a second, **one-way** export: [../js/io/latex.js](../js/io/latex.js) and
[../js/io/latex-plane.js](../js/io/latex-plane.js) turn what is on the stage into a standalone
TikZ document. It is not a `kind`, it does not go through the envelope, and nothing here ever
reads one back — which is precisely why it is allowed to be a different shape. The control is
[../js/core/files-latex.js](../js/core/files-latex.js), appended next to Open and Save when a
page declares a `latex` block ([PAGES.md](PAGES.md)).

Three pages declare one, and there are two figures between them:

| Page | Figure |
|---|---|
| node plane, point plane | the plane, on a ticked 0–100 grid, every node carrying its own `(x, y)` |
| binary search trees | the tree on screen, at the step you paused on |

**The plane prints its coordinates, and that is the whole job.** A figure handed in has to be
readable off the paper, so the unit square is written out as a ruled 0–100 grid with both axes
ticked and each node labelled with its own pair. The disc is drawn at the **rounded** coordinate,
so the pair printed beside it cannot disagree with where it sits. Where that pair *goes* is the
readability of the figure: eight compass points per node, scored against the other nodes, every
edge sampled along its length, the labels already placed and the edge of the plot — greedily, in
a fixed order, so the same plane always exports the same picture. `y` is measured **downward**,
as it is on screen; flipping it would make every exported figure a mirror image of the page it
came off, and the caption says so in as many words.

**The plane asks; the tree does not.** A plane has a run behind it, so the dialog offers the
answer — the roles of the LAST frame of the trace, which is the route, the tree or the tour the
run walked to — or the bare problem to work through by hand. The marking views are never
exported: they are a second drawing of the same trace, and what a practical asks for is the
plane. A BST has no such choice, because the answer on that page *is* the shape.

**Colours are still roles.** The preamble writes one `\definecolor` per role the figure actually
paints, read from the same `Palette.all()` the canvas is drawn with, and the legend captions come
out of [../js/core/legend.js](../js/core/legend.js) — so re-skinning the site in `tokens.css`
re-skins what students hand in, and a printed key cannot caption a colour differently from the
page it came off.

## What this deliberately is not

There is no third format. An array and a maze are not artefacts another tool consumes, and a
`.reii` is for carrying a problem between the pages of this site and between a student and a
marker. The LaTeX export exists because a *figure* is a real artefact with a real consumer; the
test for a fourth is the same one — name the thing that reads it.
