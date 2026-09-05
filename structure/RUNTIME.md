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

### `roles`, or `delta`

A beat may state the whole picture or only what CHANGED since the last one:

```js
yield { roles: Roles.of({ done: everythingSoFar, focus: [here] }) };   // the whole picture
yield { delta: Roles.of({ done: [wasFocused],    focus: [here] }) };   // only what moved
```

In a `delta`, the role **`idle` erases** — which is what `Roles.at` already returns for a key
nobody mentioned, so there is no new vocabulary. The trace keeps the delta as it was handed
over and folds it into a full map only when a frame is actually DRAWN, keyframing so the fold
is bounded however long the run is. A renderer reads `frame.roles` and cannot tell which kind
of beat made it.

**Use `delta` whenever a role set is CUMULATIVE.** A set restated every beat is O(n) memory and
O(n) time per frame, so a run over n elements costs O(n²) of both — which is invisible at sixty
nodes and fatal at thirteen thousand. Measured on the whole of Manhattan, 3,000 frames of
Dijkstra carried 4.6 million role entries and the full run would have carried about 345
million; the same run as deltas carries a handful of keys per frame and builds in 2.6 seconds.

The two forms **mix**, and the graph searches mix them: a beat that states the whole picture is
a keyframe and the accumulation restarts from it, so the summing-up beats at the start and end
of a run are written exactly as they always were and only the hot loop is a delta.

The delta worth being careful about is the one that is **not append-only**. Dijkstra's
shortest-path tree SHRINKS — an edge leaves it the moment a better parent is found — and that
edge has to be put back to `idle` by hand. `js/tests/frames.js` is what makes that trustworthy:
it asserts the highlighted edges are a forest on every frame, and a stale edge is a second way
into one node.

Not every algorithm can use it. Prim's narration shows every edge crossing out of the tree,
which is a genuinely different set at every step — it has nothing to state a delta *about*, and
so it is the one algorithm here that cannot walk the whole island.

### Trace and Player

`Trace.build(gen, subject)` drains the generator into frames, recording `view()` and `stats()`
at every beat. `Trace.run(gen)` drains it for the RESULT only, keeping no frames — that is what
the self-checks use, and what a page uses for setup work it does not want narrated (filling a
BST, carving a maze before searching it).

The trace is capped at `Trace.MAX` frames, or `opts.max`. A badly chosen input can produce
millions of beats, and a tab that dies is worse than a walk that stops early and says so —
which the last frame does. `opts.why` replaces the reason it gives: "run it again on a smaller
input" is the right answer for a sort and no answer at all for an algorithm that is quadratic
in something the student cannot see.

`Trace.live(start, opts)` (in `js/core/trace-live.js`) is the same list **discovered as it is
walked**, and exists for the one page where building it up front is not merely slow but
impossible: a 128 × 128 colour block
sorted one operation at a time is tens of millions of beats, each recording a 16,384-long
snapshot. `start()` returns a *fresh* `{ subject, gen }` and may be called again, because a
generator cannot be rewound — so going back past the kept window replays the run, bounded by
`opts.rewind` so that one Prev press can never freeze the tab. `total` is `null` until the run
ends, and `oldest` is the earliest frame still reachable. **Use `build` unless you have measured
that you cannot**; a live trace trades a known length and free rewind for a run that has neither.

`Player` is the only clock on the site. It walks a frame list, and `step()` pauses first so a
Next press never fights a running animation. It reads frames through **`.at(k)`** and asks
"did `at(i + 1)` give me anything" rather than "is `i` the last index" — the second question has
no answer while a trace is still growing, and a plain Array already has `.at()`.

**The speed slider is a rate, not a delay.** Mapping it onto a shrinking `setTimeout` looked
right and was a lie at the top: a browser clamps a nested timer to about 4 ms, so every setting
above roughly 70 asked for the same speed. Past the floor the player advances several frames per
paint instead (`player.stride()`), which the workbench prints beside the slider. Nothing leaves
the trace — Prev and Next still move exactly one frame.

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

A tick may charge MORE than one unit (`opts.per`). That costs granularity and nothing else —
every lane is still billed the identical amount at every frame — but it is a last resort, not a
way to make a run fit. **Making a long run fit is `Trace.live`'s job, not the algorithm's**: the
colour block runs at one operation a step at every size, because a step you cannot see is not a
step you can learn anything from.

## Adding an algorithm

1. Write `js/<area>/<name>.js` as a generator over an existing subject. If it needs a new kind
   of subject, that is a new file with `view()` and `stats()` — and put the counting in it.
   State cumulative role sets as `delta`, not by restating them.
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
- No cumulative role set restated on every beat. That is a `delta`, and the difference is
  whether the page survives its subject getting big.
