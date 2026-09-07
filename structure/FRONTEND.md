# Frontend — layout, tokens and the DOM contract

**Read this before touching anything in `css/`, `js/ui/`, or a page's markup.** The algorithm
side is [RUNTIME.md](RUNTIME.md); assembling a page is [PAGES.md](PAGES.md).

The rule everything here enforces: **a visualiser page never scrolls, and no two regions ever
overlap.** The old layout failed both — a control column taller than the viewport pushed the
canvas off the bottom of the screen, and you scrolled the whole site around to see the thing
you came for. That was one cause with many symptoms: regions whose height came from their
content instead of from the layout.

## The two shells

A page picks one on `<body>`:

| Shell | Used by | Behaviour |
|---|---|---|
| `body.app` | every visualiser | `height: 100dvh; overflow: hidden`. Grid rows: ribbon (auto) + `.workspace` (1fr). The page **cannot** scroll — there is nowhere to scroll to. |
| `body.doc` | home, about, the self-checks | An ordinary document. Grows and scrolls. |

Because `body.app` has a definite height, every region below it inherits one, and "this panel
is too tall" resolves to *that panel scrolls* rather than *the page grows*.

## The three regions

`.workspace` is one CSS grid: `rail | stage | workbench`. **The split between the first and the
last is the point of the whole layout:**

- **rail** (left, `css/controls.css`) — the **INPUT**. How much data, in what order, which
  algorithm. Scrolls internally.
- **stage** (centre) — the drawing. Gets the `1fr`: it is the point of the page. Never scrolls;
  `js/core/surface.js` sizes the canvas to the track at device resolution.
- **workbench** (right, `css/workbench.css`) — the **RUN**. Narration, the running counts, the
  legend, and the Play / Prev / Next transport. **Four fixed grid rows**: head, scrolling
  narration + legend, pinned counts, transport. The counts are a row, not a sticky element, so
  they cannot ride over the text.

The old pages put every one of those workbench things — step buttons, stats, status line,
legend — in the same left column as the array size and the shuffle button. Setup and walk are
different jobs and now sit in different places.

Rules for any new region or panel:

1. It is a **grid track or a grid row**, never a floated or sticky card.
2. It carries `min-height: 0` (via `.panel`) so a child's `overflow-y` can engage.
3. Exactly **one** descendant owns the scrolling, and it says so with `.scroller`.
4. **No magic-number heights.** No `height: 600px`, no `calc(100vh - 240px)`. Cap in `vh` if
   something truly needs a ceiling (see `.wb-readout`, `max-height: 26vh`).

## Panel state

Both side panels collapse. State lives in exactly one place — `data-rail` / `data-workbench` on
`.workspace` — and `js/ui/shell.js` is the only thing that writes it. CSS decides what "closed"
means at the current width: above 1080px the track is removed and the stage grows into it;
at or below, both panels become overlay drawers over a full-width stage, with a scrim, `Escape`
to close, and `inert` on a closed drawer so it leaves the tab order.

`shell.js` never measures or positions anything. If you find `getBoundingClientRect` in there,
the layout is wrong, not the script.

## Tokens: three palettes, and roles are a contract

`css/tokens.css` is **the only file to edit to reskin the site**, and it holds three palettes
that are not interchangeable:

1. **chrome** (light) — `--panel`, `--text`, `--line`, `--aqua-*`, `--sky-*`, `--iris-*`.
   Everything the student clicks or reads.
2. **paper** — `--paper`, `--ink`, `--ink-soft`, `--grid`: the sheet a visualisation is drawn on.
3. **roles** — `--role-idle` · `-scan` · `-focus` · `-move` · `-done` · `-reject` · `-path` ·
   `-frontier` · `-wall`.

### Roles

A canvas cannot read a custom property, so the old pages each carried their own hex table —
`const COLOR = { default: '#8b5cf6', … }` repeated in twelve files, none of them agreeing.
`js/core/palette.js` resolves the `--role-*` names once and hands the renderers the values.
**The role names are therefore a contract between `tokens.css`, `palette.js` and every
renderer**; renaming one is a change in all three.

A role is semantic, not decorative: `scan` is "being compared right now" on a sorting page and
"being relaxed right now" on Dijkstra. **A renderer asks for a role, never for a colour, and an
algorithm yields a role, never a colour.** `js/core/legend.js` writes the legend from the same
role names, so a swatch and its caption cannot disagree — several of the old hand-written
legends were stale, and the bubble-sort page still labelled a colour "Minimum" from the
selection-sort page it had been copied from.

**The one exception, and the test for another.** `js/compare/spectrum.js` paints a colour that
is not a role, because on that page the colour IS the value — the same information a bar's
height carries on `js/sorting/bars.js`, not a statement about what the element is doing. That
is the whole test: if reskinning the site would change what the picture MEANS, the colour is
data and belongs in the renderer; if it would only change how the picture looks, it is a role
and belongs in `tokens.css`. Everything that element is *doing* on that page — compared,
written, under the cursor — still comes from the palette, and an algorithm still yields only
roles. A second renderer wanting this exception is almost certainly wrong.

Blend with `Palette.mix()`, not CSS `color-mix()`: a canvas `fillStyle` goes through the CSS
colour parser and a value the browser cannot parse is **silently ignored**, leaving the
previous fill in place. That is a wrong-colour bug that only shows up on older browsers and
nobody ever finds.

Contrast floor: `--text-faint` is 4.7:1 on `--panel`, and every stop of the primary button's
gradient clears 5:1 against white text.

## The DOM contract

Scripts find elements **by id**, anywhere in the document, so markup can be rearranged freely —
but the ids cannot change without changing the script:

| Ids | Read by |
|---|---|
| `[data-nav]` with `data-base` / `data-current` | `js/ui/nav.js` |
| `[data-cards]` | `js/ui/cards.js` (home) |
| `[data-panel="rail\|workbench"]` | `js/ui/shell.js` |
| `.rail-fields` | `js/core/rail.js` — where the declared controls are appended |
| `#canvas` | `js/core/surface.js` |
| `#step-legend` | `js/core/legend.js` |
| `#step-count` `#step-title` `#step-body` `#step-progress` `#step-readout` `#step-prev` `#step-play` `#step-next` `#step-speed` `#step-speed-val` | `js/core/workbench.js` |
| `#marks` (in the stage) and `#step-views` (in the workbench head) | `js/sorting/marks.js` — **optional**: a page without both is simply left with one view |

Class names the scripts emit are equally binding: `.legend-item` `.legend-swatch`
`.legend-label` `.legend-desc` (legend), `.readout-grid` `.readout-cell` `.readout-key`
`.readout-val` (counts), `.step-badge` `.val` (narration), `.field` `.field-label`
`.field-head` `.field-value` `.ctl` `.ctl-range` `.check-row` `.btn` `.btn--*` `.btn-stack`
(rail), `.nav-top` `.nav-group` `.nav-menu` `.nav-item` `.nav-caret` `.nav-long` `.nav-short`
(nav), `.card` `.card-title` `.card-sub` `.card-go` `.section-label` `.section-blurb` (home).

## Two views of one stage

A stage may carry a second view of the SAME run. The sorting pages do: the bar graph, and the
marking table — the run written out one line per pass, which is the answer a student is asked
for in a test and the one thing a bar graph cannot show them. It is not a second run and not a
second implementation; the rows come out of the frames the player is already walking
(`js/sorting/marks.js`), so the table and the bars cannot disagree about what the algorithm did.

**A second view steps with the first.** It is not a summary shown beside the run: the table's
bottom row holds the frame the bars are drawing at this instant, rows the run has not reached
are not on screen, and a line is fixed only on the frame the bars agree with it — which
`js/tests/sorting.js` asserts, because that is the only thing "1:1" can be checked to mean.

Both views live in the stage and exactly one is in the box at a time — `.stage[data-view]`
gives the other `display: none`, not `visibility: hidden`, because a hidden-but-laid-out
sibling takes a grid row and shortens the drawing that IS showing.

The switch belongs to the **workbench** (`#step-views`), not the rail. It changes how you read
the run, not what the problem is — same split as everything else on that side.

## The ribbon nav

**`js/ui/sitemap.js` is the only place a page is named.** Two things render from it: the ribbon
drop-downs on every page (`js/ui/nav.js`) and home's card sections (`js/ui/cards.js`). A
visualiser therefore cannot exist in one and be missing from the other — which is exactly what
the old site got wrong, where `index.html` was the only file that knew any page existed and
nothing linked anywhere once you left it.

Each page carries an empty

```html
<nav class="ribbon-nav" data-nav data-base="../../" data-current="bubble-sort"></nav>
```

and loads `sitemap.js` then `nav.js` at the end of `<body>`.

Three details a hover menu does not work without, all learned the hard way:

1. **`.nav-menu::before` bridges the gap** between the button and the panel. An absolutely
   positioned menu does not extend its parent's box, so without the bridge the pointer leaves
   `.nav-group` on the way down, `mouseleave` fires, and the menu shuts under the cursor. If you
   change the menu's `top` offset, change the bridge with it.
2. **Closing runs on a ~160 ms delay.** A pointer travelling diagonally to the item it is aiming
   at clips the corner of the menu; an instant close pulls it out from under them.
3. **Hover is bound only when the device hovers** (`matchMedia('(hover: hover)')`). On a
   touchscreen a tap fires `mouseenter` *and* `click`, so binding both makes one tap open a menu
   and immediately close it.

`.ribbon-nav` therefore **must not** be a scroll container — an `overflow-x` clips the open
menu — so at narrow widths the group labels shorten (`.nav-long` / `.nav-short`) instead.

## The stylesheets

Split by scope, **≤200 lines each**, loaded in this order. A stylesheet that outgrows the
ceiling becomes an `@import` index carrying **no rules of its own**, because an `@import` can
only precede the importing file's own rules and a part could not otherwise override the index.

| File | Owns | Loaded by |
|---|---|---|
| `tokens.css` | the three palettes, spacing, shape, motion, region widths | every page |
| `base.css` | reset, the two shells, `.panel`, `.scroller`, `.eyebrow`, skip link, footer | every page |
| `ribbon.css` | the top ribbon. `@import` index over `-shell` · `-nav` · `-panels` | every page |
| `workspace.css` | the rail/stage/workbench grid, collapsing, drawers | visualiser pages |
| `controls.css` | `.field` / `.ctl` / `.btn` — the rail's vocabulary | visualiser pages |
| `workbench.css` | the run panel. `@import` index over `-head` · `-readout` · `-transport` | visualiser pages |
| `home.css` | hero, section labels, cards, the About prose | home, about, self-checks |

**A new page wanting its own stylesheet is usually a sign it is not using the shell it was
given** — check that first. New styling goes in the file that owns that scope; if it fits none
of them, add a file rather than growing one past 200 lines.

## Verifying

Layout changes still need real-browser QA — say so when handing the work over. What can be
checked without one: that every bundle in `js/deps.js` resolves to a real file, that every topic
page names a real bundle, loads the right stylesheets and carries every id in the table above,
and that every sitemap entry has a folder and every folder is in the sitemap. That audit is a
few dozen lines of node against the real files — write it fresh rather than trusting a reading
of the markup.
