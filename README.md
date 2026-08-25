# REII 211 Visualisation Playground

Interactive algorithm visualisations for REII 211 at the North-West University. The written
course material lives in the GitBook and gets read top to bottom; this is the other half — a set
of small browser tools that get poked at.

Hosted at <https://seece.github.io/REII211/>.

## Running it locally

Everything runs client side. There is no build step, no package manager and no server-side code,
and no ES modules either, so opening `index.html` straight off the filesystem works:

```bash
git clone … && open index.html
```

Or serve it, if you prefer:

```bash
python3 -m http.server 8000
```

`test.html` runs every self-check in the browser.

## How a page works

All fourteen pages are laid out the same way, and it is worth knowing which third does what:

- **the rail**, on the left — the **input**. How much data, in what order, which algorithm.
- **the stage**, in the middle — the state of that problem right now.
- **the workbench**, on the right — the **run**. Play walks the whole thing, Prev and Next move
  one step, the legend decodes the colours and the counts at the bottom are what the algorithm
  has spent so far.

Either side panel folds away with the two buttons at the right of the ribbon.

## Saving and opening

At the foot of every rail is **Open or Save**. Saving writes a `.reii` file — the problem the
page is set up on, not the run: the array, the graph you drew, the maze, the offers. Opening one
puts it back.

A file says which kind of subject it holds, so it opens on every page that can use it and is
turned away with a plain sentence on the ones that cannot. An array saved from bubble sort opens
on the other five sorts and on both recursion trees, which is the only honest way to compare two
algorithms: the same input, twice. The format is one envelope for all seven subjects —
[structure/FORMATS.md](structure/FORMATS.md).

## What is in it

| Section | Pages |
|---|---|
| Sorting | selection, insertion, bubble, exchange, merge, quick — on one bar graph |
| Recursion trees | merge and quick again, drawn as the call tree |
| Data structures | arrays and linked lists in one memory grid; binary search trees |
| Graphs | node plane (BFS · DFS · Dijkstra · Prim · Kruskal, editable); maze search |
| Heuristics | nearest-neighbour tour and closest pair; greedy job scheduling |

## Layout

```
index.html          home — the card sections are generated from the sitemap
about.html          what this is, and what it is not
test.html           the self-checks
css/                split by scope, ≤200 lines each; tokens.css reskins everything
js/core/            the runtime: trace, player, workbench, surface, rail, legend, palette
js/io/              the .reii file — one envelope, one validator per subject
js/ui/              sitemap (the only place a page is named), nav, cards, panel state
js/sorting/ …       the algorithms, one area per folder
js/pages/           one small script per page kind
js/tests/           the self-checks, run by test.html
topics/<slug>/      one folder per visualiser
structure/          the architecture decisions — read these before changing anything
```

## Adding a visualisation

One entry in `js/ui/sitemap.js`, a `topics/<slug>/index.html` copied from the nearest existing
page, a bundle in `js/deps.js`, a page script, the algorithm, and its self-checks.
[structure/PAGES.md](structure/PAGES.md) has the detail.

## Notes

These build intuition; they do not prove anything. Small inputs show more than large ones, and
changing a single parameter at a time is the fastest way to see what an algorithm is actually
doing — run the same sort on a shuffled array and then on a reversed one and watch the counts
move.
