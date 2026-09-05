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
| `graph` | `Graph` — nodes and weighted edges | node plane, Manhattan |
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

## What this deliberately is not

There is no export to anything else, because there is nothing else to export *to*: an array and
a maze are not artefacts another tool consumes. A `.reii` is for carrying a problem between the
pages of this site and between a student and a marker, and that is all it has to do.
