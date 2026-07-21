// Entity Logic — pure functions, no mutation of inputs
// Entity ranks: 0=point, 1=line, 2=plane, 3=volume

let _nextId = 1;

/**
 * Factory + validation for entity creation.
 */
export function createEntity(rank, spanDims, pos, moveDim, moveDir, color) {
  if (rank < 0 || rank > 3) throw new Error(`Invalid rank: ${rank}`);
  if (spanDims.length !== rank) throw new Error(`spanDims length ${spanDims.length} !== rank ${rank}`);
  if (spanDims.includes(moveDim)) throw new Error(`moveDim ${moveDim} cannot be in spanDims`);
  if (moveDir !== 1 && moveDir !== -1) throw new Error(`moveDir must be 1 or -1`);

  return {
    id: `e${_nextId++}`,
    rank,
    spanDims: [...spanDims],
    pos: [...pos],
    prevPos: [...pos],
    moveDim,
    moveDir,
    color: [...color],
  };
}

/**
 * Reset ID counter (useful for tests / reset).
 */
export function resetIdCounter() {
  _nextId = 1;
}

/**
 * Check if two entities overlap.
 * Two entities overlap when every dimension that is fixed (non-span) for BOTH
 * entities agrees in position.
 */
export function checkOverlap(a, b, N) {
  for (let d = 0; d < N; d++) {
    const aFixed = a.spanDims.indexOf(d) === -1;
    const bFixed = b.spanDims.indexOf(d) === -1;
    if (aFixed && bFixed) {
      if (Math.round(a.pos[d]) !== Math.round(b.pos[d])) return false;
    }
  }
  return true;
}

/**
 * Numeric fingerprint based on non-span dim positions.
 * Used for fast overlap grouping — entities with different fingerprints
 * cannot overlap with any point-rank entity at the same position.
 */
export function entityFingerprint(entity, N) {
  let hash = 0;
  for (let d = 0; d < N; d++) {
    if (entity.spanDims.indexOf(d) === -1) {
      hash = (hash * 31 + Math.round(entity.pos[d])) | 0;
    }
  }
  return hash;
}

/**
 * Hot-path step function.
 * 1. Find overlapping pairs and apply collision rules
 * 2. Move survivors
 * 3. Bounce at boundaries
 * Returns a new array — never mutates input.
 */
export function stepEntities(entities, worldConfig, collisionRules, applyCollision) {
  const N = worldConfig.N;
  const size = worldConfig.size;

  // Step 1: detect overlapping pairs
  const destroyed = new Set();
  const survivors = [];

  // Brute-force pairwise overlap (fine for moderate entity counts)
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      if (destroyed.has(i) || destroyed.has(j)) continue;
      const a = entities[i];
      const b = entities[j];
      if (checkOverlap(a, b, N)) {
        const ruleType = collisionRules.getRule(a.rank, b.rank);
        const result = applyCollision(a, b, ruleType, N);
        // result is an array of surviving entities from this pair
        // Mark originals as destroyed and push replacements
        destroyed.add(i);
        destroyed.add(j);
        for (const ent of result) {
          survivors.push(ent);
        }
      }
    }
  }

  // Collect non-destroyed originals
  for (let i = 0; i < entities.length; i++) {
    if (!destroyed.has(i)) {
      survivors.push(cloneEntity(entities[i]));
    }
  }

  // Step 2 & 3: snapshot prevPos, then move + bounce
  for (const ent of survivors) {
    ent.prevPos = [...ent.pos];
    const d = ent.moveDim;
    let next = ent.pos[d] + ent.moveDir;
    // Reflect at walls so every step still travels one cell (no dead frame)
    if (next < 0 || next > size - 1) {
      ent.moveDir *= -1;
      next = ent.pos[d] + ent.moveDir;
    }
    // Clamp in case size === 1
    ent.pos[d] = Math.max(0, Math.min(size - 1, next));
  }

  return survivors;
}

/**
 * Clone an entity (shallow copy of arrays).
 */
export function cloneEntity(e) {
  return {
    id: e.id,
    rank: e.rank,
    spanDims: [...e.spanDims],
    pos: [...e.pos],
    prevPos: e.prevPos ? [...e.prevPos] : [...e.pos],
    moveDim: e.moveDim,
    moveDir: e.moveDir,
    color: [...e.color],
  };
}
