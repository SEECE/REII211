# REII 211 Visualisation Playground

This repository holds the interactive algorithm visualisations for REII 211 at the North-West University. It used to live inside the course GitBook, but the two have very different jobs, the GitBook is written material that gets read top to bottom while this is a set of small browser tools that get poked at, so they have been split apart and this repository now only serves the visualisations.

The playground is hosted at https://seece.github.io/REII211/ and covers sorting, data structures, graphs, scheduling and heuristics.

## Running it locally

Everything runs client side, there is no build step, no package manager and no server side code, so the only thing needed is a browser. Cloning the repository and opening `index.html` directly is enough for almost everything. A few pages load their scripts as modules, and browsers refuse to do that over `file://`, so if a page comes up blank serve the folder over HTTP instead:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` and pick a visualisation from the index.

## Layout

The index page is the entry point and links to every visualisation with relative paths, which is what keeps the whole thing portable, the same files work from a local folder, a local server or GitHub Pages without any configuration. Each visualisation lives in its own directory with its markup, script and styling kept together:

```
index.html              Entry point, links to everything below
style.css               Shared styling for the index
Sorting/                Bar graph sorts, one directory per algorithm
ComplexSorting/         Merge and quick sort with the recursion made visible
DataStructures/         Linked lists and binary search trees
Graphs/                 Traversals, spanning trees and shortest paths
Scheduling/             Job selection and interval scheduling
Heuristics/             Nearest neighbour and closest pair on a tour
```

## Adding a visualisation

Make a directory for it, keep the markup, script and any styling inside that directory, then add a card to `index.html` pointing at the new page. There is no registry to update and nothing to rebuild, the index is the only file that knows about the rest.

## Notes

These tools are meant for building intuition and not for proving anything. Small inputs show more than large ones, and changing a single parameter at a time is usually the fastest way to see what an algorithm is actually doing. The written course material lives in the GitBook and this repository is only the interactive companion to it.
