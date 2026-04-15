// Collision Rules — configurable interaction table
import { cloneEntity, createEntity } from './entity-logic.js';

export const CollisionType = {
  PASS_THROUGH: 'PASS_THROUGH',
  ANNIHILATE: 'ANNIHILATE',
  BOUNCE: 'BOUNCE',
  ABSORB: 'ABSORB',
  REDIRECT: 'REDIRECT',
  MERGE: 'MERGE',
};

/**
 * 4×4 symmetric default collision table.
 * Same-rank → BOUNCE, all other → PASS_THROUGH.
 */
export function createDefaultTable() {
  const table = [];
  for (let i = 0; i < 4; i++) {
    table[i] = [];
    for (let j = 0; j < 4; j++) {
      table[i][j] = i === j ? CollisionType.BOUNCE : CollisionType.PASS_THROUGH;
    }
  }
  return table;
}

export class CollisionRules {
  constructor() {
    this.table = createDefaultTable();
  }

  getRule(rankA, rankB) {
    return this.table[rankA][rankB];
  }

  setRule(rankA, rankB, type) {
    this.table[rankA][rankB] = type;
    this.table[rankB][rankA] = type; // symmetric
  }

  getTable() {
    return this.table;
  }
}

/**
 * Apply a collision between two entities, returning surviving entities.
 */
export function applyCollision(a, b, type, N) {
  switch (type) {
    case CollisionType.PASS_THROUGH:
      return [cloneEntity(a), cloneEntity(b)];

    case CollisionType.ANNIHILATE:
      return [];

    case CollisionType.BOUNCE: {
      const ca = cloneEntity(a);
      const cb = cloneEntity(b);
      ca.moveDir *= -1;
      cb.moveDir *= -1;
      return [ca, cb];
    }

    case CollisionType.ABSORB: {
      // Higher rank survives
      if (a.rank > b.rank) return [cloneEntity(a)];
      if (b.rank > a.rank) return [cloneEntity(b)];
      // Equal rank: both survive (fallback)
      return [cloneEntity(a), cloneEntity(b)];
    }

    case CollisionType.REDIRECT: {
      const ra = cloneEntity(a);
      const rb = cloneEntity(b);
      ra.moveDim = pickRandomOrthogonalDim(ra.spanDims, ra.moveDim, N);
      rb.moveDim = pickRandomOrthogonalDim(rb.spanDims, rb.moveDim, N);
      return [ra, rb];
    }

    case CollisionType.MERGE: {
      // Combine spanDims if combined rank ≤ 3
      const combinedSpan = [...new Set([...a.spanDims, ...b.spanDims])];
      if (combinedSpan.length <= 3) {
        const newRank = combinedSpan.length;
        // Find a valid moveDim not in combinedSpan
        let newMoveDim = -1;
        for (let d = 0; d < N; d++) {
          if (!combinedSpan.includes(d)) {
            newMoveDim = d;
            break;
          }
        }
        if (newMoveDim === -1) {
          // No free dim — both survive unchanged
          return [cloneEntity(a), cloneEntity(b)];
        }
        return [createEntity(newRank, combinedSpan, [...a.pos], newMoveDim, a.moveDir, a.color)];
      }
      // Can't merge beyond rank 3
      return [cloneEntity(a), cloneEntity(b)];
    }

    default:
      return [cloneEntity(a), cloneEntity(b)];
  }
}

function pickRandomOrthogonalDim(spanDims, currentMoveDim, N) {
  const candidates = [];
  for (let d = 0; d < N; d++) {
    if (spanDims.indexOf(d) === -1 && d !== currentMoveDim) {
      candidates.push(d);
    }
  }
  if (candidates.length === 0) return currentMoveDim;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
