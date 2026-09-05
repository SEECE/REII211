# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## What this is

Static, dependency-free educational site: interactive visualisations for **REII 211 —
Introduction to Algorithms** (North-West University). No build step, no package manager, no
framework, **no ES modules** (it must open over `file://`). Open `index.html` in a browser, or
serve the root with `python3 -m http.server`. `test.html` runs every self-check.

## The one idea

> **An algorithm here is a generator that walks a subject and yields a narrated beat. It touches
> no DOM, owns no timer, counts nothing by hand and knows nothing about colour.**

Animating it, stepping it, drawing it, counting it and disabling the buttons are the runtime's
job and happen for free. There is exactly one implementation of each algorithm and playing it is
walking it faster. Read [structure/RUNTIME.md](structure/RUNTIME.md) before writing one.

## Architecture

- **Home** ([index.html](index.html)) and **About** ([about.html](about.html)) are `body.doc`
  pages. Home's card sections are generated from [js/ui/sitemap.js](js/ui/sitemap.js) — the same
  map the ribbon nav reads, so a page cannot be in one and missing from the other.
- **Visualisers** ([topics/](topics/)) — one folder per page, each a `body.app` shell of ribbon
  + three regions: **rail** (the input), **stage** (the drawing), **workbench** (the run —
  narration, counts, legend, transport). Sixteen of them: six bar-graph sorts, two recursion
  trees, arrays/linked-lists and BSTs, the node plane and maze search, the point plane and job
  scheduling, and two comparison pages that run six sorts side by side — as bar graphs, and as
  a block of hues where the sorted answer is the rainbow. See
  [structure/PAGES.md](structure/PAGES.md).
- **Runtime** ([js/core/](js/core/)) — `trace.js` (drain a generator into frames), `player.js`
  (the only clock on the site), `workbench.js`, `surface.js` (canvas sized to its track at
  device resolution), `rail.js` (controls from a declarative field list), `legend.js`,
  `roles.js`, `palette.js` (resolves the `--role-*` tokens for the canvas), `page.js` (the
  `Playground` orchestrator every page calls).
- **Algorithms** — `js/sorting/` (six sorts over `Tape`, an array that counts its own
  comparisons and swaps), `js/recursion/` (the same two sorts as call trees), `js/structures/`
  (one addressed memory grid shared by arrays and lists, plus the BST), `js/graph/` (one model,
  BFS/DFS/Dijkstra/Prim/Kruskal, an editor and an adjacency-matrix view), `js/maze/`,
  `js/heuristics/` (tour, closest pair, interval scheduling), `js/compare/` (the race: several
  of the sorts over one array, all charged the same budget — drawn as bar graphs or as a block
  of colour).
- **Files** ([js/io/reii.js](js/io/reii.js)) — the `.reii` file. One envelope for all seven
  subjects, where the payload is exactly the subject's `view()`; the control that writes and
  reads it is `js/core/files.js`, appended to the rail by `Playground`. See
  [structure/FORMATS.md](structure/FORMATS.md).
- **UI** ([js/ui/](js/ui/)) — `sitemap.js` (the only place a page is named), `nav.js`,
  `cards.js`, `shell.js` (panel state, and nothing else).
- **CSS** ([css/](css/)) — split by scope, ≤200 lines each. **`tokens.css` is the only file to
  edit to reskin the site**, including the canvas pages. See
  [structure/FRONTEND.md](structure/FRONTEND.md).

## Structure docs — read before writing code

[structure/](structure/) holds the binding decisions. They are not background reading: if a task
touches the area a doc covers, **read that doc first and follow it**, and update it in the same
change if the decision itself moves.

- [structure/RUNTIME.md](structure/RUNTIME.md) — **required** before writing or changing an
  algorithm. The subject contract (`view()` / `stats()`), the frame shape, why counting lives in
  the subject and never in the algorithm, and the definition of done. Never write an algorithm
  twice for two modes — that was the bug.
- [structure/FRONTEND.md](structure/FRONTEND.md) — **required** before touching `css/`,
  `js/ui/`, or a page's markup. The two shells, the three regions and who owns overflow, panel
  state, the three palettes, why roles are a contract, and the ids the scripts bind to. Never
  give a region a magic-number height.
- [structure/PAGES.md](structure/PAGES.md) — **required** before adding a page or changing a
  page script. The `Playground` call, the two kinds of page (fresh each run against a standing
  subject), and the six steps to add a visualiser.
- [structure/FORMATS.md](structure/FORMATS.md) — **required** before changing what a page saves
  or adding a file kind. Why the payload is the subject's `view()` and not a second description
  of it, and why everything read off a disk is validated field by field.

## Conventions

- **Keep every file under 200 lines.** When one grows past it, split by JOB and add the pieces to
  the bundle map in [js/deps.js](js/deps.js) (or, for CSS, to the `@import` index). A page never
  lists scripts by hand, which is what makes splitting cheap.
- Plain scripts, one global per subsystem (`Trace`, `Player`, `Tape`, `Graph`, `Sorts`…).
- Colours come from roles, never from literals. Blend with `Palette.mix()`, never CSS
  `color-mix()` — an unparseable canvas `fillStyle` is silently ignored.
- Adding a visualiser = one sitemap entry + one topic folder + one bundle + one page script +
  the algorithm + its self-checks + a `file` block so the page can be saved and reopened. That
  is the definition of done.
- Narration should teach, not label. Say *why* the step happened and what it cost — and if a
  step claims something is provable, there must be a check in `js/tests/` that makes the claim
  trustworthy.

## Repo notes

- `graphify-out/` and `visualizations/` are gitignored (graphify knowledge-graph output).
