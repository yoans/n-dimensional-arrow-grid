# Plan: N-Dimensional Arrow Grid Overhaul

## TL;DR

Rebuild this repo with AG16-style simulation bones, a ranked entity model (point / line / plane / volume), Three.js 3D rendering, and a configurable collision rule table. Introduce Vite for ES module structure.

---

## Key Design Decisions

| Decision | Choice |
|---|---|
| 3D rendering | Three.js (WebGL, OrbitControls) via npm + Vite |
| Line / plane / volume extent | Full grid extent — they span the entire grid in their span dimensions |
| Build system | Vite (ESM), mirroring AG16 |
| Data primitive | **Entity** replaces "arrow" |

---

## Entity Data Model

```js
{
  id: string,
  rank: 0 | 1 | 2 | 3,   // 0 = point, 1 = line, 2 = plane, 3 = volume
  spanDims: int[],         // which dims define its body; length === rank
  pos: float[],            // coordinate in ALL N dims
  moveDim: int,            // which dim it travels in; MUST NOT be in spanDims
  moveDir: 1 | -1,
  color: [r, g, b],
}
```

**Overlap rule**: two entities overlap when every dimension in `(non-spanDims of A) ∩ (non-spanDims of B)` agrees in position.

> Example: a point at `[2, 3, 4]` meets a line that spans dim-1 positioned at `pos = [2, *, 4]` because both share fixed dim-0=2 and dim-2=4.

**Movement**: each step, `pos[moveDim] += moveDir`. `moveDim` must be orthogonal to `spanDims` — a line spanning X can only travel in Y or Z.

**Boundary**: when `pos[moveDim]` reaches 0 or `size−1`, the default handler bounces (flips `moveDir`).

---

## Phases

### Phase 1 — Foundation: `src/entity-logic.js`

Replaces `grid.js`. Pure functions, no mutation of inputs.

- `createEntity(rank, spanDims, pos, moveDim, moveDir, color)` — factory + validation
- `checkOverlap(entityA, entityB, N)` — shared-fixed-dim comparison returning `bool`
- `entityFingerprint(entity)` — numeric hash of non-span dim positions (AG16 hashing pattern, no string keys, no GC pressure)
- `stepEntities(entities, worldConfig, collisionRules)` — hot path:
  1. Group by fingerprint pair → find all overlapping entity groups
  2. Apply collision rule per pair → produce surviving entities
  3. Move each survivor: `pos[moveDim] += moveDir`
  4. Bounce at boundary: flip `moveDir` at `0` and `size−1`
  - Pre-allocated entity buffer (AG16 pattern — reused across frames)
  - Returns a new array, never mutates input

### Phase 2 — Collision Rules: `src/collision-rules.js`

- Interaction types:

| Type | Behavior |
|---|---|
| `PASS_THROUGH` | Both survive, no effect |
| `ANNIHILATE` | Both destroyed |
| `BOUNCE` | Both reverse `moveDir` |
| `ABSORB` | Higher rank survives, lower is destroyed |
| `REDIRECT` | Both get a random moveDim orthogonal to their spanDims |
| `MERGE` | Produce one entity with combined spanDims (if rank allows) |

- `DEFAULT_COLLISION_TABLE[4][4]` — symmetric matrix:
  - Same rank meets same rank → `BOUNCE`
  - All other pairings → `PASS_THROUGH`
- `setCollisionRule(rankA, rankB, type)` — mutates the active table
- `applyCollision(entityA, entityB, type)` → `[...surviving entities]`

### Phase 3 — Vite Project Structure

Parallel with phases 1 and 2.

- Add `package.json` and `vite.config.js` (mirror AG16)
- Create `src/` folder: `entity-logic.js`, `collision-rules.js`, `renderer.js`, `ui-controls.js`, `app.js`
- `index.html` at root (Vite entry)
- Delete: `grid.js`, `renderer.js`, `app.js` (replaced by `src/` equivalents)
- Keep: `style.css` (updated in Phase 5)

### Phase 4 — Three.js Renderer: `src/renderer.js`

Depends on Phases 1 and 3.

- Init `THREE.Scene`, `PerspectiveCamera`, `WebGLRenderer`, `OrbitControls`
- `WorldConfig`: `{ size, N, slicePos[] }`
- Per-rank geometry:

| Rank | Geometry | Appearance |
|---|---|---|
| 0 — point | `SphereGeometry(0.15)` | Solid, placed at `(pos[0], pos[1], pos[2])` |
| 1 — line | `LineSegments` 0→size along span axis | Solid, positioned at entity's fixed coords |
| 2 — plane | `PlaneGeometry(size, size)` | Semi-transparent, alpha ~0.3, rotated to span dims |
| 3 — volume | `BoxGeometry(size, size, size)` | Wireframe + translucent fill, alpha ~0.1 |

- Color from `entity.color` → `THREE.Color`
- **Slice filter** (N > 3): hide entities where `pos[d] !== slicePos[d]` for all `d ≥ 3`
- **Object pool**: reuse Three.js mesh objects by entity `id`; only recreate geometry when `rank` or `spanDims` changes
- `updateScene(entities, worldConfig)` — diffs previous/current entity list; adds, removes, or repositions objects

### Phase 5 — UI: `src/ui-controls.js` + `index.html` + `style.css`

Depends on Phase 4.

**Left panel — Entity Palette**
- Rank selector (Point / Line / Plane / Volume)
- SpanDims multi-checkbox (dynamic, based on current N)
- MoveDim dropdown (only dims NOT in spanDims)
- MoveDir toggle (+/−)
- Color picker
- Paint mode: click in 3D viewport → raycast → place entity at snapped grid position

**Right panel — Collision Rule Table**
- 4×4 grid (Point / Line / Plane / Volume vs same)
- Each cell is a `<select>` with all interaction type options
- Updates `collisionRules` config live — takes effect on next step

**Bottom bar — Simulation Controls**
- Step, Play/Pause, Reset, Speed slider
- Grid Size slider, Dimensions slider (2–8)
- Slice sliders for dims ≥ 3 (appear/disappear dynamically as N changes)
- Step count + entity count stats

### Phase 6 — App Orchestration: `src/app.js`

Depends on all prior phases.

- Holds world state: `entities[]`, `worldConfig`, `collisionRules`
- `step()` → `stepEntities(entities, worldConfig, collisionRules)` → `renderer.updateScene()`
- RAF-based animation loop with configurable speed
- Click-to-place: Three.js raycasting → snap to grid cell → `createEntity(...)` → push to entities

---

## File Map

| File | Action |
|---|---|
| `grid.js` | Delete — logic moves to `src/entity-logic.js` |
| `renderer.js` | Delete — replaced by `src/renderer.js` |
| `app.js` | Delete — replaced by `src/app.js` |
| `index.html` | Rewrite for new UI layout |
| `style.css` | Update for three-panel layout |
| `src/entity-logic.js` | New — simulation core |
| `src/collision-rules.js` | New — rule table |
| `src/renderer.js` | New — Three.js scene |
| `src/ui-controls.js` | New — panel wiring |
| `src/app.js` | New — orchestrator |
| `package.json` | New — Vite + Three.js deps |
| `vite.config.js` | New — mirror AG16 |

**Reference (read-only)**
- `AG16/src/arrow-grid/arrows-logic-optimized.js` — buffer/hashing pattern for hot-path step loop
- `AG16/vite.config.js` — Vite config to copy

---

## Verification Checklist

- [ ] `npm run dev` serves without errors
- [ ] Default scene shows one point, one line, one plane in 3D with working OrbitControls
- [ ] Stepping moves entities; overlapping point + line triggers the configured collision rule
- [ ] Setting N=4 shows a slice slider; entities not at that slice are hidden
- [ ] Changing a collision table cell takes effect on the very next step
- [ ] Grid size and dimension changes rebuild the world without crash

---

## Scope Boundaries

**In scope**
- Entity model (point / line / plane / volume)
- Step logic with pre-allocated buffers
- Three.js 3D renderer with orbit + slice filtering
- Configurable collision rule table
- Paint-mode entity placement UI

**Out of scope**
- Sound / MIDI (AG16 feature, not applicable here)
- Symmetry tools
- Save / load presets
- AG16 channel system — `color` serves as the differentiator here
