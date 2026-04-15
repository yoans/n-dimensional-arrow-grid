// Presets — curated configurations showcasing interesting interactions
import { CollisionType } from './collision-rules.js';

/**
 * Each preset defines:
 *   name        – display label
 *   description – short flavor text
 *   N           – number of dimensions
 *   size        – grid size
 *   speed       – playback speed
 *   rules       – 4×4 collision table (symmetric; only upper-triangle needed)
 *   entities    – array of { rank, spanDims, pos, moveDim, moveDir, color }
 *   dimMapping  – optional array of channel names per dim (auto if omitted)
 */

const CT = CollisionType;

function rule(pp, pl, pP, pv, ll, lP, lv, PP, Pv, vv) {
  // Shorthand: build symmetric 4×4 from 10 upper-triangle values
  // Order: point-point, point-line, point-plane, point-volume,
  //        line-line, line-plane, line-volume,
  //        plane-plane, plane-volume,
  //        volume-volume
  return [
    [pp, pl, pP, pv],
    [pl, ll, lP, lv],
    [pP, lP, PP, Pv],
    [pv, lv, Pv, vv],
  ];
}

export const PRESETS = [

  // ─── 1. Billiard Points ──────────────────────────────────────────
  {
    name: 'Billiard Points',
    description: 'Points bounce off each other like billiard balls. Simple and mesmerizing.',
    N: 3,
    size: 8,
    speed: 2.0,
    rules: rule(
      CT.BOUNCE,       // point-point: bounce
      CT.PASS_THROUGH, CT.PASS_THROUGH, CT.PASS_THROUGH,
      CT.BOUNCE,       // line-line
      CT.PASS_THROUGH, CT.PASS_THROUGH,
      CT.BOUNCE,       // plane-plane
      CT.PASS_THROUGH,
      CT.BOUNCE,       // volume-volume
    ),
    entities: [
      { rank: 0, spanDims: [], pos: [0, 0, 0], moveDim: 0, moveDir: 1, color: [1.0, 0.3, 0.3] },
      { rank: 0, spanDims: [], pos: [7, 0, 0], moveDim: 0, moveDir: -1, color: [0.3, 0.5, 1.0] },
      { rank: 0, spanDims: [], pos: [0, 7, 0], moveDim: 1, moveDir: -1, color: [0.3, 1.0, 0.4] },
      { rank: 0, spanDims: [], pos: [3, 3, 7], moveDim: 2, moveDir: -1, color: [1.0, 0.8, 0.2] },
      { rank: 0, spanDims: [], pos: [7, 7, 7], moveDim: 0, moveDir: -1, color: [0.8, 0.3, 1.0] },
      { rank: 0, spanDims: [], pos: [4, 0, 4], moveDim: 1, moveDir: 1, color: [0.2, 0.9, 0.9] },
    ],
  },

  // ─── 2. Cosmic Weave ──────────────────────────────────────────
  {
    name: 'Cosmic Weave',
    description: 'Lines of different orientations pass through each other, creating a shifting weave.',
    N: 3,
    size: 10,
    speed: 1.5,
    rules: rule(
      CT.BOUNCE,
      CT.PASS_THROUGH, CT.PASS_THROUGH, CT.PASS_THROUGH,
      CT.PASS_THROUGH,  // line-line: pass through
      CT.PASS_THROUGH, CT.PASS_THROUGH,
      CT.BOUNCE,
      CT.PASS_THROUGH,
      CT.BOUNCE,
    ),
    entities: [
      // Horizontal lines sliding vertically
      { rank: 1, spanDims: [0], pos: [0, 0, 2], moveDim: 1, moveDir: 1, color: [1.0, 0.3, 0.4] },
      { rank: 1, spanDims: [0], pos: [0, 9, 5], moveDim: 1, moveDir: -1, color: [1.0, 0.5, 0.2] },
      { rank: 1, spanDims: [0], pos: [0, 4, 8], moveDim: 1, moveDir: 1, color: [0.9, 0.2, 0.6] },
      // Vertical lines sliding horizontally
      { rank: 1, spanDims: [1], pos: [2, 0, 3], moveDim: 0, moveDir: 1, color: [0.2, 0.5, 1.0] },
      { rank: 1, spanDims: [1], pos: [7, 0, 6], moveDim: 0, moveDir: -1, color: [0.3, 0.7, 0.9] },
      { rank: 1, spanDims: [1], pos: [5, 0, 1], moveDim: 0, moveDir: 1, color: [0.1, 0.4, 0.8] },
      // Depth lines sliding sideways
      { rank: 1, spanDims: [2], pos: [3, 5, 0], moveDim: 0, moveDir: -1, color: [0.3, 1.0, 0.4] },
      { rank: 1, spanDims: [2], pos: [8, 2, 0], moveDim: 1, moveDir: 1, color: [0.5, 0.9, 0.2] },
    ],
  },

  // ─── 3. Predator Chain ───────────────────────────────────────
  {
    name: 'Predator Chain',
    description: 'Points are absorbed by lines. Lines are absorbed by planes. A food chain in motion.',
    N: 3,
    size: 8,
    speed: 1.5,
    rules: rule(
      CT.BOUNCE,       // point-point: bounce
      CT.ABSORB,       // point-line: line eats point
      CT.ABSORB,       // point-plane: plane eats point
      CT.ABSORB,       // point-volume: volume eats point
      CT.BOUNCE,       // line-line: bounce
      CT.ABSORB,       // line-plane: plane eats line
      CT.ABSORB,       // line-volume: volume eats line
      CT.BOUNCE,       // plane-plane: bounce
      CT.ABSORB,       // plane-volume: volume eats plane
      CT.BOUNCE,       // volume-volume: bounce
    ),
    entities: [
      // Prey: points
      { rank: 0, spanDims: [], pos: [1, 1, 1], moveDim: 0, moveDir: 1, color: [0.3, 1.0, 0.3] },
      { rank: 0, spanDims: [], pos: [6, 2, 3], moveDim: 2, moveDir: -1, color: [0.4, 0.9, 0.2] },
      { rank: 0, spanDims: [], pos: [3, 5, 6], moveDim: 1, moveDir: -1, color: [0.2, 0.8, 0.5] },
      { rank: 0, spanDims: [], pos: [5, 1, 5], moveDim: 0, moveDir: -1, color: [0.5, 1.0, 0.4] },
      // Hunters: lines
      { rank: 1, spanDims: [0], pos: [0, 3, 1], moveDim: 1, moveDir: 1, color: [1.0, 0.6, 0.1] },
      { rank: 1, spanDims: [2], pos: [4, 4, 0], moveDim: 1, moveDir: -1, color: [0.9, 0.5, 0.0] },
      // Apex: plane
      { rank: 2, spanDims: [0, 2], pos: [0, 0, 0], moveDim: 1, moveDir: 1, color: [0.9, 0.15, 0.15] },
    ],
  },

  // ─── 4. Merge Evolution ──────────────────────────────────────
  {
    name: 'Merge Evolution',
    description: 'Everything merges on contact. Points → lines → planes → volumes. Watch complexity grow.',
    N: 3,
    size: 10,
    speed: 1.2,
    rules: rule(
      CT.MERGE,   // point-point
      CT.MERGE,   // point-line
      CT.MERGE,   // point-plane
      CT.MERGE,   // point-volume
      CT.MERGE,   // line-line
      CT.MERGE,   // line-plane
      CT.MERGE,   // line-volume
      CT.MERGE,   // plane-plane
      CT.MERGE,   // plane-volume
      CT.MERGE,   // volume-volume
    ),
    entities: [
      { rank: 0, spanDims: [], pos: [2, 2, 5], moveDim: 0, moveDir: 1, color: [0.2, 0.6, 1.0] },
      { rank: 0, spanDims: [], pos: [7, 2, 5], moveDim: 0, moveDir: -1, color: [0.3, 0.7, 0.9] },
      { rank: 0, spanDims: [], pos: [4, 5, 2], moveDim: 1, moveDir: -1, color: [0.1, 0.5, 0.8] },
      { rank: 0, spanDims: [], pos: [4, 0, 8], moveDim: 1, moveDir: 1, color: [0.4, 0.8, 1.0] },
      { rank: 0, spanDims: [], pos: [1, 8, 3], moveDim: 2, moveDir: 1, color: [0.0, 0.4, 0.7] },
      { rank: 0, spanDims: [], pos: [8, 8, 7], moveDim: 2, moveDir: -1, color: [0.5, 0.9, 1.0] },
      { rank: 0, spanDims: [], pos: [5, 5, 5], moveDim: 0, moveDir: -1, color: [0.3, 0.6, 0.8] },
      { rank: 0, spanDims: [], pos: [0, 5, 0], moveDim: 2, moveDir: 1, color: [0.2, 0.7, 0.6] },
    ],
  },

  // ─── 5. Annihilation Storm ───────────────────────────────────
  {
    name: 'Annihilation Storm',
    description: 'Same-rank entities annihilate. Different ranks redirect. Chaotic and unpredictable.',
    N: 3,
    size: 8,
    speed: 1.8,
    rules: rule(
      CT.ANNIHILATE,  // point-point: annihilate
      CT.REDIRECT,    // point-line: redirect
      CT.REDIRECT,    // point-plane
      CT.REDIRECT,    // point-volume
      CT.ANNIHILATE,  // line-line
      CT.REDIRECT,    // line-plane
      CT.REDIRECT,    // line-volume
      CT.ANNIHILATE,  // plane-plane
      CT.REDIRECT,    // plane-volume
      CT.ANNIHILATE,  // volume-volume
    ),
    entities: [
      { rank: 0, spanDims: [], pos: [0, 0, 0], moveDim: 0, moveDir: 1, color: [1.0, 0.2, 0.2] },
      { rank: 0, spanDims: [], pos: [7, 0, 0], moveDim: 0, moveDir: -1, color: [0.2, 0.2, 1.0] },
      { rank: 0, spanDims: [], pos: [3, 3, 3], moveDim: 1, moveDir: 1, color: [1.0, 1.0, 0.2] },
      { rank: 1, spanDims: [0], pos: [0, 5, 3], moveDim: 2, moveDir: -1, color: [0.2, 1.0, 0.5] },
      { rank: 1, spanDims: [1], pos: [4, 0, 5], moveDim: 0, moveDir: 1, color: [1.0, 0.5, 0.0] },
      { rank: 1, spanDims: [2], pos: [6, 6, 0], moveDim: 1, moveDir: -1, color: [0.7, 0.2, 1.0] },
      { rank: 0, spanDims: [], pos: [2, 7, 5], moveDim: 2, moveDir: -1, color: [0.0, 0.8, 0.8] },
    ],
  },

  // ─── 6. Hyperspace (5D + hue & size) ─────────────────────────
  {
    name: 'Hyperspace',
    description: '5D world: position encoded as color (hue) and size. See beyond 3D.',
    N: 5,
    size: 6,
    speed: 1.0,
    dimMapping: ['X', 'Y', 'Z', 'HUE', 'SIZE'],
    rules: rule(
      CT.BOUNCE,
      CT.PASS_THROUGH, CT.PASS_THROUGH, CT.PASS_THROUGH,
      CT.BOUNCE,
      CT.PASS_THROUGH, CT.PASS_THROUGH,
      CT.BOUNCE,
      CT.PASS_THROUGH,
      CT.BOUNCE,
    ),
    entities: [
      { rank: 0, spanDims: [], pos: [0, 0, 0, 0, 0], moveDim: 3, moveDir: 1, color: [1.0, 1.0, 1.0] },
      { rank: 0, spanDims: [], pos: [5, 5, 5, 5, 5], moveDim: 4, moveDir: -1, color: [1.0, 1.0, 1.0] },
      { rank: 0, spanDims: [], pos: [3, 3, 0, 2, 3], moveDim: 0, moveDir: 1, color: [1.0, 1.0, 1.0] },
      { rank: 0, spanDims: [], pos: [0, 5, 3, 4, 1], moveDim: 1, moveDir: -1, color: [1.0, 1.0, 1.0] },
      { rank: 0, spanDims: [], pos: [5, 0, 5, 1, 4], moveDim: 2, moveDir: -1, color: [1.0, 1.0, 1.0] },
      { rank: 0, spanDims: [], pos: [2, 2, 2, 3, 2], moveDim: 3, moveDir: -1, color: [1.0, 1.0, 1.0] },
      { rank: 1, spanDims: [0], pos: [0, 3, 3, 0, 5], moveDim: 4, moveDir: -1, color: [1.0, 1.0, 1.0] },
      { rank: 1, spanDims: [2], pos: [4, 1, 0, 5, 0], moveDim: 3, moveDir: 1, color: [1.0, 1.0, 1.0] },
    ],
  },

  // ─── 7. Tesseract Dance ──────────────────────────────────────
  {
    name: 'Tesseract Dance',
    description: '4D with tesseract projection. Points orbit between inner and outer cubes.',
    N: 4,
    size: 6,
    speed: 0.8,
    dimMapping: ['X', 'Y', 'Z', 'TESSERACT'],
    rules: rule(
      CT.BOUNCE,
      CT.REDIRECT, CT.PASS_THROUGH, CT.PASS_THROUGH,
      CT.BOUNCE,
      CT.PASS_THROUGH, CT.PASS_THROUGH,
      CT.BOUNCE,
      CT.PASS_THROUGH,
      CT.BOUNCE,
    ),
    entities: [
      // Points moving in the 4th dimension (tesseract axis)
      { rank: 0, spanDims: [], pos: [1, 1, 1, 0], moveDim: 3, moveDir: 1, color: [1.0, 0.4, 0.7] },
      { rank: 0, spanDims: [], pos: [4, 4, 4, 5], moveDim: 3, moveDir: -1, color: [0.4, 0.7, 1.0] },
      { rank: 0, spanDims: [], pos: [1, 4, 1, 2], moveDim: 3, moveDir: 1, color: [0.7, 1.0, 0.4] },
      { rank: 0, spanDims: [], pos: [4, 1, 4, 3], moveDim: 3, moveDir: -1, color: [1.0, 0.9, 0.2] },
      // Points moving in spatial dims
      { rank: 0, spanDims: [], pos: [0, 2, 3, 0], moveDim: 0, moveDir: 1, color: [0.8, 0.3, 1.0] },
      { rank: 0, spanDims: [], pos: [3, 0, 2, 5], moveDim: 1, moveDir: 1, color: [0.3, 1.0, 0.8] },
      // Line in 4D
      { rank: 1, spanDims: [3], pos: [3, 3, 3, 0], moveDim: 0, moveDir: -1, color: [0.6, 0.6, 0.6] },
    ],
  },

  // ─── 8. Ghostly Layers ───────────────────────────────────────
  {
    name: 'Ghostly Layers',
    description: '4D with opacity channel. Deeper layers fade to ghostly transparency.',
    N: 4,
    size: 8,
    speed: 1.2,
    dimMapping: ['X', 'Y', 'Z', 'OPACITY'],
    rules: rule(
      CT.BOUNCE,
      CT.ABSORB, CT.PASS_THROUGH, CT.PASS_THROUGH,
      CT.PASS_THROUGH,
      CT.PASS_THROUGH, CT.PASS_THROUGH,
      CT.BOUNCE,
      CT.PASS_THROUGH,
      CT.BOUNCE,
    ),
    entities: [
      // Points at different depths (dim 3 = opacity)
      { rank: 0, spanDims: [], pos: [1, 1, 1, 0], moveDim: 0, moveDir: 1, color: [1.0, 0.3, 0.3] },
      { rank: 0, spanDims: [], pos: [6, 6, 6, 7], moveDim: 0, moveDir: -1, color: [0.3, 0.3, 1.0] },
      { rank: 0, spanDims: [], pos: [4, 2, 5, 3], moveDim: 3, moveDir: 1, color: [0.3, 1.0, 0.3] },
      { rank: 0, spanDims: [], pos: [2, 5, 2, 5], moveDim: 3, moveDir: -1, color: [1.0, 1.0, 0.3] },
      // Lines sweeping at different opacities
      { rank: 1, spanDims: [0], pos: [0, 3, 4, 1], moveDim: 1, moveDir: 1, color: [0.8, 0.2, 0.8] },
      { rank: 1, spanDims: [1], pos: [5, 0, 2, 6], moveDim: 0, moveDir: -1, color: [0.2, 0.8, 0.8] },
      // Plane at full opacity
      { rank: 2, spanDims: [0, 2], pos: [0, 0, 0, 0], moveDim: 1, moveDir: 1, color: [0.9, 0.6, 0.1] },
    ],
  },

  // ─── 9. Particle Accelerator ─────────────────────────────────
  {
    name: 'Particle Accelerator',
    description: 'Fast points in a small grid. Merges and redirects create emergent complexity.',
    N: 3,
    size: 6,
    speed: 3.0,
    rules: rule(
      CT.REDIRECT,    // point-point: redirect
      CT.MERGE,       // point-line: merge
      CT.MERGE,       // point-plane: merge
      CT.ABSORB,      // point-volume: absorbed
      CT.REDIRECT,    // line-line: redirect
      CT.MERGE,       // line-plane: merge
      CT.ABSORB,      // line-volume: absorbed
      CT.REDIRECT,    // plane-plane: redirect
      CT.ABSORB,      // plane-volume: absorbed
      CT.BOUNCE,      // volume-volume: bounce
    ),
    entities: [
      { rank: 0, spanDims: [], pos: [0, 0, 0], moveDim: 0, moveDir: 1, color: [0.0, 0.8, 1.0] },
      { rank: 0, spanDims: [], pos: [5, 0, 0], moveDim: 0, moveDir: -1, color: [1.0, 0.0, 0.5] },
      { rank: 0, spanDims: [], pos: [0, 5, 0], moveDim: 1, moveDir: -1, color: [0.5, 1.0, 0.0] },
      { rank: 0, spanDims: [], pos: [0, 0, 5], moveDim: 2, moveDir: -1, color: [1.0, 0.5, 0.0] },
      { rank: 0, spanDims: [], pos: [5, 5, 5], moveDim: 0, moveDir: -1, color: [0.8, 0.0, 1.0] },
      { rank: 0, spanDims: [], pos: [3, 3, 0], moveDim: 2, moveDir: 1, color: [0.0, 1.0, 0.5] },
      { rank: 0, spanDims: [], pos: [2, 0, 3], moveDim: 1, moveDir: 1, color: [1.0, 1.0, 0.0] },
      { rank: 0, spanDims: [], pos: [5, 2, 3], moveDim: 2, moveDir: -1, color: [0.3, 0.3, 1.0] },
    ],
  },

  // ─── 10. The Sweep ───────────────────────────────────────────
  {
    name: 'The Sweep',
    description: 'A rising plane meets falling lines and bouncing points. A choreography of ranks.',
    N: 3,
    size: 12,
    speed: 1.0,
    rules: rule(
      CT.BOUNCE,      // point-point
      CT.REDIRECT,    // point-line: redirect
      CT.BOUNCE,      // point-plane: bounce off plane
      CT.PASS_THROUGH,
      CT.BOUNCE,      // line-line
      CT.BOUNCE,      // line-plane: bounce off plane
      CT.PASS_THROUGH,
      CT.ANNIHILATE,  // plane-plane: annihilate!
      CT.PASS_THROUGH,
      CT.BOUNCE,
    ),
    entities: [
      // The sweeping plane
      { rank: 2, spanDims: [0, 2], pos: [0, 0, 0], moveDim: 1, moveDir: 1, color: [0.15, 0.15, 0.6] },
      // Lines in its path
      { rank: 1, spanDims: [0], pos: [0, 8, 3], moveDim: 1, moveDir: -1, color: [1.0, 0.4, 0.1] },
      { rank: 1, spanDims: [2], pos: [5, 6, 0], moveDim: 1, moveDir: -1, color: [0.1, 1.0, 0.4] },
      { rank: 1, spanDims: [0], pos: [0, 11, 8], moveDim: 1, moveDir: -1, color: [1.0, 0.2, 0.6] },
      // Points scattered about
      { rank: 0, spanDims: [], pos: [3, 4, 3], moveDim: 0, moveDir: 1, color: [1.0, 1.0, 0.3] },
      { rank: 0, spanDims: [], pos: [8, 3, 8], moveDim: 2, moveDir: -1, color: [0.3, 1.0, 1.0] },
      { rank: 0, spanDims: [], pos: [6, 10, 1], moveDim: 1, moveDir: -1, color: [1.0, 0.3, 1.0] },
      { rank: 0, spanDims: [], pos: [1, 7, 10], moveDim: 0, moveDir: 1, color: [0.6, 0.9, 0.2] },
      // Counter-sweeping plane
      { rank: 2, spanDims: [0, 2], pos: [0, 11, 0], moveDim: 1, moveDir: -1, color: [0.6, 0.15, 0.15] },
    ],
  },

];
