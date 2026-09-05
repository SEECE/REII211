# The runtime — traces, subjects and the player

**Read this before writing or changing any algorithm.** The frontend it is shown in is
[FRONTEND.md](FRONTEND.md); how a page is assembled is [PAGES.md](PAGES.md).

One idea holds the whole site together:

> **An algorithm is a generator that walks a subject and yields a narrated beat. It touches no
> DOM, owns no timer, counts nothing by hand and knows nothing about colour.**

Everything else — animating it, stepping it, drawing it, counting it, disabling the Prev button
at frame zero — belongs to the runtime and happens for free.

## Why this exists

The old site had twelve independent copies of the same machinery, and each one had drifted:
a `running` boolean, an async generator racing a `setTimeout`, a *separate* `stepHistory`
array built by a *second* implementation of the same algorithm for the manual mode, plus
`setButtons()` called from four places. The two implementations could disagree — and did:
bubble sort reported different comparison counts depending on whether you pressed Solve or
Next.

There is now one implementation per algorithm, and playing it is walking it faster.

## The three parts

### Subject

Whatever the algorithm mutates: an instrumented array, a graph, a tree, a block of memory. It
owes the runtime exactly two methods:

| Method | Returns |
|---|---|
| `view()` | an immutable snapshot the renderer can draw |
| `stats()` | the counters to pin in the workbench, as `{ Label: value }` |

A subject may also carry a `load()` that rebuilds it from a saved `view()`. That is **not**
part of this contract — the runtime never calls it, only a page opening a `.reii` does. See
[FORMATS.md](FORMATS.md).

`view()` should reuse one object until something is written — a run of pure comparisons then
costs no memory at all, which is most of a sort's frames (see `js/sorting/tape.js`).

**The subject is where counting lives.** `Tape.less()` counts a comparison, `Store.hop()`
counts a pointer dereference, `Graph.neighbours()` counts the edges it hands back. An algorithm
that had to remember to increment a counter would eventually forget, and the number on screen
would quietly become a lie.

### Generator

```js
function* bubble(tape) {
  for (…) {
    yield {
      note: 'Comparing 12 and 9',              // HTML, the narration
      tag: 'pass 3',                            // optional badge
      roles: Roles.of({ scan: [j, j + 1] }),    // what each element IS right now
    };
  }
}
```

`roles` maps an element's key to a ROLE name, never to a colour — see
[FRONTEND.md](FRONTEND.md#roles). Nesting is `yield*`, which is how the recursive algorithms
(merge, quick, the tree carvers) narrate their recursion without a manual stack.

### Trace and Player

`Trace.build(gen, subject)` drains the generator into frames, recording `view()` and `stats()`
at every beat. `Trace.run(gen)` drains it for the RESULT only, keeping no frames — that is what
the self-checks use, and what a page uses for setup work it does not want narrated (filling a
BST, carving a maze before searching it).

The trace is capped at `Trace.MAX` frames. A badly chosen input can produce millions of beats,
and a tab that dies is worse than a walk that stops early and says so — which the last frame
does.

`Player` is the only clock on the site. It walks a frame list, and `step()` pauses first so a
Next press never fights a running animation.

## Racing several algorithms

A comparison page (`js/compare/`) has no algorithm of its own. Its subject is a field of LANES,
each holding a plain `Tape` and the real generator from `js/sorting/`, and its generator
advances them — so there is still exactly one implementation of each sort and a lane bills what
the single-sort page bills. The self-checks assert that directly.

**A race advances on cost, never on beats.** One beat per lane per tick sounds obvious and
ranks the narration instead of the algorithms: a sort that explains itself twice per comparison
would lose a race it wins. A tick is one unit of work — one comparison or one write — and each
lane is advanced until its tape has billed past the budget. Every lane is therefore charged the
same amount at every frame, and the only difference on screen is how much sorting that bought.
A lane can overshoot the budget (the beat that takes it over may write a whole merged run) but
must never fall behind it, which is what a check enforces.

## Adding an algorithm

1. Write `js/<area>/<name>.js` as a generator over an existing subject. If it needs a new kind
   of subject, that is a new file with `view()` and `stats()` — and put the counting in it.
2. Add the file to its bundle in [js/deps.js](../js/deps.js). **No page lists scripts by hand.**
3. Add a case to the matching suite in `js/tests/`. Check the CLAIMS the narration makes, not
   just that it runs — if a step says "this is provably optimal", the check is what makes that
   sentence trustworthy. Where possible check against an *independent* reference (Dijkstra
   against a plain implementation, Prim against Kruskal, pruned closest-pair against brute
   force): two different routes to the same answer is a far stronger statement than one route
   matching a number somebody typed in.

That is the definition of done.

## What must not happen in an algorithm file

- No `document`, no canvas, no `getElementById`.
- No `setTimeout` — the player owns time.
- No colour literals; roles only.
- No second implementation for a different mode. If you are writing the algorithm twice, the
  design has gone wrong.
