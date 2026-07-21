# Experiment Design: Density, Display & Interaction in N-D

A working note for designing experiments that help us *see* and *feel* when this system is doing something meaningful — and when it is just sparse noise or opaque hyper-geometry.

This is not an implementation plan. It is a discussion frame: questions, premises to pressure-test, and candidate experiment shapes.

---

## Why this experiment

The simulator already has the bones:

- Ranks fill their **span dims** completely and translate only along **free dims**
- Collisions are a configurable matrix over rank pairs
- Extra dimensions are mapped to channels (hue, size, opacity, tesseract, slice)

What we do **not** yet understand systematically:

1. When do objects meet often enough that interaction rules matter?
2. When does a hyper-dimension *read* as motion/structure vs. random flicker?
3. Which rank mixtures produce cascades worth watching — and which collapse into mush or emptiness?

The experiment is about **relative density**, **display encoding**, and **interaction design** as coupled variables — not about shipping one more preset.

---

## Core premises to explore

### P1 — Hyper-dimensions need their own visual language

Today’s toolkit (hue / size / opacity / tesseract / slice) is a start. Premises to test:

- **Channel encodings** treat a free dim as a continuous attribute of a 3D body. Good for “this point is deep in W.” Weak for “this volume is sweeping through W.”
- **Tesseract projection** makes W feel spatial (inner/outer cube). Strong for points and thin objects; ambiguous for solids that already fill XYZ.
- **Slicing** is honest but lossy: you only see the cut. Density on the slice can look high while the full N-D world is empty (or the reverse).
- **Hyperspace visualizations** (new direction): instead of encoding W onto an existing body, invent a *scene grammar* for higher dims — e.g. linked dual views, shadow-bodies, trail-ribbons through W, or a “control room” of orthogonal projections. Question: can hyperspace become a first-class *place* in the UI, not just a slider on a 3D toy?

**Discussion prompts**

- What should “moving in W” *look like* for a full-grid volume vs. a point?
- When is projection better than encoding? When is a second viewport better than either?
- Are there hyper-dim displays that only make sense for rank ≥ 2 (solids as portals/fields)?

### P2 — Relative density governs whether interactions are meaningful

Overlap only happens when fixed (non-span) coordinates agree. So density is not “entities per cell” in 3D — it is **agreement rate on the shared fixed subspace**.

Rough intuition (to formalize later):

| Rank mix | Fixed dims (high) | Meeting chance | Feel |
|----------|-------------------|----------------|------|
| Many points | All N | Low unless crowded | Billiards / gas |
| Lines vs lines (parallel span) | N−1 | Medium | Weave / miss |
| Lines vs lines (orthogonal span) | often fewer shared fixed | Higher crossings | Cosmic weave |
| Plane vs points | N−2 fixed on plane | Plane “sweeps” many points | Predator / broom |
| Volume (spans 3) in 4D+ | few fixed | Volume is a near-omnipresent field along free dims | Weather system |
| Hyper (spans 4) in 5D+ | even fewer fixed | Interactions become almost inevitable on the free axis | Cascade fuel |

Premises to test:

- There is a **sweet band** of density where rules are legible: not empty, not instant sludge.
- Rank ascent (point → line → plane → volume) is also a **density amplifier**: higher ranks occupy more of the overlap algebra.
- Grid size and N pull in opposite directions: larger grids dilute meetings; more dims can dilute *or* concentrate depending on what is spanned vs free.
- “Meaningful interaction” might mean: a viewer can predict *who will hit whom* a few steps out — or be surprised by a cascade they can still narrate.

**Discussion prompts**

- Should density be a first-class metric in the UI (predicted meeting rate, mean free path along free dims)?
- Do we want *controlled* density (spawn rules, quotas per rank) or *emergent* density (merge/absorb as ecology)?
- Is the interesting regime sparse points + rare high-rank “events,” or dense mid-ranks?

### P3 — Inter-object-type interaction is the drama engine

The collision table is the script. Premises:

- **Symmetric same-rank rules** (bounce / annihilate) read as physics.
- **Asymmetric cross-rank rules** (absorb / merge / redirect) read as ecology or alchemy.
- Cascades need **fuel + converter + sink**:
  - Fuel: many low-rank entities
  - Converter: merge / redirect that changes rank or trajectory
  - Sink: absorb / annihilate that removes mass — or a boundary that recycles motion
- Without a sink, merge evolution tends toward a few high-rank blobs; without fuel, predator chains starve; without converters, billiards never escalate.

**Discussion prompts**

- Which rank-pair cells are doing the real work in our favorite presets — and which are dead weight?
- Should some experiments *lock* most of the table and only vary one relationship (e.g. only plane↔point)?
- Is “pass through” a visual problem (missed drama) or a density tool (lets layers coexist)?

### P4 — Cool designs are hypotheses about cascades

Presets should not only “look neat.” They should isolate a claim:

| Claim | Design sketch | Success looks like |
|-------|---------------|--------------------|
| Higher rank is a broom | One plane, many points, absorb | Clearing wave with residue |
| Merge is evolution | Only merge, only points | Rank ladder you can narrate |
| Hyper-dim is weather | Volumes free on W, points free on XYZ | Climate of meetings in W |
| Orthogonal weave | Lines on alternating spans, pass-through | Persistent fabric, rare knots |
| Fragile complexity | Redirect + annihilate | Bursts then sudden quiet |
| Dual-scale story | Hyper solid on dim 4 + lines on free dim | Big body pulses while small agents streak |

**Discussion prompts**

- Can we classify designs by *cascade topology* (linear food chain, branching merge tree, cyclic redirect chaos)?
- What is the minimum entity count for each claim to read in under 30 seconds?
- Which claims need a better hyper-dim display to even be fair tests?

---

## Experiment axes (independent variables)

Treat these as dials we can turn one or two at a time:

1. **N** — number of dimensions  
2. **Grid size** — extent per dim  
3. **Rank histogram** — counts (and allowed spans) per rank  
4. **Span policy** — which dims higher ranks are allowed to fill (spatial vs hyper)  
5. **Free-dim policy** — what free dims map to (spatial slide vs channel vs hyperspace view)  
6. **Collision script** — full table vs single-cell surgical variants  
7. **Display mode** — channel set, tesseract on/off, slice, or experimental hyperspace view  
8. **Seed structure** — random gas vs choreographed initial positions  

Dependent measures (even if informal at first):

- Meetings per step / per entity  
- Time-to-first-cascade / cascade length  
- Rank entropy over time  
- Viewer comprehension (can they explain what happened?)  
- Aesthetic hold (do they keep watching?)

---

## Candidate experiment tracks

### Track A — Density calibration

**Goal:** Find regimes where cross-rank rules become legible.

- Fix display (simple XYZ + one free-dim encoding).  
- Sweep point count × grid size × presence of one plane or volume.  
- Log or eyeball meeting rate; mark the band where absorb/merge is “readable.”

**Output:** A density guide (“for size 8 / 3D, ~N points + 1 plane”) baked into future presets.

### Track B — Hyper-dimension display bake-off

**Goal:** Same underlying 4D/5D trajectory; different visualizations.

Compare side-by-side (or sequential) for one Solid Drift–like scenario:

- Tesseract only  
- Hue only  
- Opacity only  
- Slice scrubbing  
- Dual view: 3D body + 1D “W timeline” strips per entity  
- Speculative hyperspace: e.g. entities cast “shadows” into a second canvas that is pure free-dim space  

**Output:** A short rubric — which encodings teach *position in W*, which teach *motion through W*, which teach *occupation of W* (span vs free).

### Track C — Interaction surgery

**Goal:** Isolate type↔type drama.

- Start from one ecology (e.g. Predator Chain).  
- Change only one table cell at a time; keep density fixed.  
- Record which single change flips the story (stable loop → extinction → monopoly blob).

**Output:** A map of high-leverage rule pairs.

### Track D — Cascade showcase lab

**Goal:** Deliberately design for cascading results.

Promising recipes to prototype:

1. **Merge avalanche** — dense points, all-merge, small grid; watch rank climb.  
2. **Broom and sparks** — plane absorb + point bounce among themselves.  
3. **Redirect storm** — mid density, redirect on cross-rank, annihilate on same-rank.  
4. **Hyper monsoon** — volume/hyper free on W; points free on XYZ; meetings gated by W alignment.  
5. **Weave then knot** — pass-through lines until a rule flip introduces merge at crossings.

**Output:** A curated set of “claim presets” with one-sentence hypotheses in the blurb.

---

## Open design tensions

- **Honesty vs spectacle** — tesseract and hue are beautiful; slices are truer. How much illusion is acceptable if it teaches the free-dim idea?
- **Full-span solids vs readable agents** — a XYZ-filling volume is correct but can visually dominate. Is the volume a character or a climate?
- **Emergence vs authorship** — random gas discovers behaviors; authored seeds demonstrate them. Experiments need both, labeled as such.
- **Metric culture** — without even light instrumentation, we will argue from vibes. What is the smallest useful overlay (meeting flashes, rank histogram sparkline)?

---

## Suggested discussion agenda

1. Agree on what “meaningful interaction” means for this project (legibility? surprise? longevity? pedagogy?).  
2. Pick one track (A–D) for a first pass; write success criteria in one paragraph.  
3. Decide whether hyperspace visualization is a research branch (new views) or a polish branch (better channels).  
4. List 3 cascade claims worth proving with presets.  
5. Note any engine gaps the experiments will expose (e.g. metrics API, dual viewport, spawn budgets).

---

## Scratch space

_Use this section in review meetings — capture reactions, rejected ideas, and links to prototypes._

-  
-  
-  
