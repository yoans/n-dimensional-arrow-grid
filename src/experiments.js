// Experiment definitions — scenarios, claims, and display bake-off configs
import { CollisionType as CT } from './collision-rules.js';
import { createEntity } from './entity-logic.js';

function fillRules(same = CT.BOUNCE, cross = CT.PASS_THROUGH) {
  const n = 5;
  const table = [];
  for (let i = 0; i < n; i++) {
    table[i] = [];
    for (let j = 0; j < n; j++) {
      table[i][j] = i === j ? same : cross;
    }
  }
  return table;
}

function setPair(table, a, b, rule) {
  table[a][b] = rule;
  table[b][a] = rule;
}

/** Shared 4D trajectory used for hyper-display bake-off. */
export function buildHyperBakeScenario() {
  const rules = fillRules(CT.BOUNCE, CT.PASS_THROUGH);
  return {
    N: 4,
    size: 8,
    speed: 1.2,
    rules,
    dimMapping: ['X', 'Y', 'Z', 'TESSERACT'],
    entities: [
      { rank: 0, spanDims: [], pos: [1, 2, 3, 0], moveDim: 3, moveDir: 1, color: [1.0, 0.4, 0.5] },
      { rank: 0, spanDims: [], pos: [6, 5, 4, 7], moveDim: 3, moveDir: -1, color: [0.4, 0.7, 1.0] },
      { rank: 0, spanDims: [], pos: [3, 3, 1, 2], moveDim: 0, moveDir: 1, color: [0.9, 0.9, 0.3] },
      { rank: 0, spanDims: [], pos: [2, 6, 6, 5], moveDim: 1, moveDir: -1, color: [0.3, 1.0, 0.6] },
      { rank: 1, spanDims: [0], pos: [0, 4, 2, 1], moveDim: 3, moveDir: 1, color: [0.8, 0.5, 1.0] },
      { rank: 3, spanDims: [0, 1, 2], pos: [0, 0, 0, 3], moveDim: 3, moveDir: -1, color: [0.25, 0.45, 0.9] },
    ],
  };
}

export const HYPER_DISPLAY_MODES = [
  {
    id: 'tesseract',
    label: 'Tesseract',
    blurb: 'W pulls bodies toward/away from the cube center. Best for sensing motion through W.',
    teaches: 'motion through W',
    dimMapping: ['X', 'Y', 'Z', 'TESSERACT'],
  },
  {
    id: 'hue',
    label: 'Hue',
    blurb: 'W becomes color. Easy to read position; weaker sense of “traveling.”',
    teaches: 'position in W',
    dimMapping: ['X', 'Y', 'Z', 'HUE'],
  },
  {
    id: 'opacity',
    label: 'Opacity',
    blurb: 'W becomes ghostliness. Quiet but honest — deep layers fade.',
    teaches: 'position in W',
    dimMapping: ['X', 'Y', 'Z', 'OPACITY'],
  },
  {
    id: 'slice',
    label: 'Slice',
    blurb: 'Only the current W cut is visible. Truest, but you must scrub to explore.',
    teaches: 'occupation of W',
    dimMapping: ['X', 'Y', 'Z', 'SLICE'],
  },
  {
    id: 'size',
    label: 'Size',
    blurb: 'W scales the body. Volumes dominate; points read as pulse.',
    teaches: 'motion through W',
    dimMapping: ['X', 'Y', 'Z', 'SIZE'],
  },
];

/**
 * Build a density-calibration world from dials.
 */
export function buildDensityWorld({ size = 8, pointCount = 12, includePlane = true, includeVolume = false }) {
  const N = includeVolume ? 4 : 3;
  const rules = fillRules(CT.BOUNCE, CT.PASS_THROUGH);
  setPair(rules, 0, 2, CT.ABSORB);
  setPair(rules, 0, 3, CT.ABSORB);
  setPair(rules, 1, 2, CT.ABSORB);

  const entities = [];
  const colors = [
    [0.3, 1.0, 0.4], [1.0, 0.4, 0.3], [0.3, 0.6, 1.0],
    [1.0, 0.85, 0.2], [0.8, 0.3, 1.0], [0.2, 0.9, 0.9],
  ];

  for (let i = 0; i < pointCount; i++) {
    const pos = new Array(N).fill(0).map((_, d) => Math.floor(Math.random() * size));
    const moveDim = i % N;
    entities.push({
      rank: 0,
      spanDims: [],
      pos,
      moveDim,
      moveDir: i % 2 === 0 ? 1 : -1,
      color: colors[i % colors.length],
    });
  }

  if (includePlane) {
    entities.push({
      rank: 2,
      spanDims: [0, 2],
      pos: new Array(N).fill(0),
      moveDim: 1,
      moveDir: 1,
      color: [0.9, 0.2, 0.25],
    });
  }

  if (includeVolume) {
    entities.push({
      rank: 3,
      spanDims: [0, 1, 2],
      pos: [0, 0, 0, Math.floor(size / 2)],
      moveDim: 3,
      moveDir: 1,
      color: [0.2, 0.4, 0.95],
    });
  }

  const dimMapping = includeVolume
    ? ['X', 'Y', 'Z', 'TESSERACT']
    : ['X', 'Y', 'Z'];

  return {
    N,
    size,
    speed: 1.5,
    rules,
    dimMapping,
    entities,
  };
}

export const SURGERY_ECOLOGIES = [
  {
    id: 'predator',
    name: 'Predator Chain',
    hypothesis: 'Absorb on cross-rank should clear points, then lines, leaving the plane.',
    focusPair: [0, 2], // point vs plane
    build() {
      const rules = fillRules(CT.BOUNCE, CT.PASS_THROUGH);
      setPair(rules, 0, 1, CT.ABSORB);
      setPair(rules, 0, 2, CT.ABSORB);
      setPair(rules, 1, 2, CT.ABSORB);
      return {
        N: 3,
        size: 8,
        speed: 1.5,
        rules,
        entities: [
          { rank: 0, spanDims: [], pos: [1, 1, 1], moveDim: 0, moveDir: 1, color: [0.3, 1.0, 0.3] },
          { rank: 0, spanDims: [], pos: [6, 2, 3], moveDim: 2, moveDir: -1, color: [0.4, 0.9, 0.2] },
          { rank: 0, spanDims: [], pos: [3, 5, 6], moveDim: 1, moveDir: -1, color: [0.2, 0.8, 0.5] },
          { rank: 0, spanDims: [], pos: [5, 1, 5], moveDim: 0, moveDir: -1, color: [0.5, 1.0, 0.4] },
          { rank: 0, spanDims: [], pos: [2, 6, 2], moveDim: 2, moveDir: 1, color: [0.6, 0.95, 0.3] },
          { rank: 0, spanDims: [], pos: [7, 4, 1], moveDim: 1, moveDir: -1, color: [0.35, 0.85, 0.45] },
          { rank: 1, spanDims: [0], pos: [0, 3, 1], moveDim: 1, moveDir: 1, color: [1.0, 0.6, 0.1] },
          { rank: 1, spanDims: [2], pos: [4, 4, 0], moveDim: 1, moveDir: -1, color: [0.9, 0.5, 0.0] },
          { rank: 2, spanDims: [0, 2], pos: [0, 0, 0], moveDim: 1, moveDir: 1, color: [0.9, 0.15, 0.15] },
        ],
      };
    },
  },
  {
    id: 'merge-lab',
    name: 'Merge Lab',
    hypothesis: 'All-merge should climb the rank ladder until free dims run out.',
    focusPair: [0, 0],
    build() {
      const rules = fillRules(CT.MERGE, CT.MERGE);
      return {
        N: 3,
        size: 8,
        speed: 1.4,
        rules,
        entities: Array.from({ length: 14 }, (_, i) => ({
          rank: 0,
          spanDims: [],
          pos: [i % 8, Math.floor(i / 3) % 8, (i * 2) % 8],
          moveDim: i % 3,
          moveDir: i % 2 === 0 ? 1 : -1,
          color: [0.2 + (i % 5) * 0.15, 0.5, 1.0 - (i % 4) * 0.15],
        })),
      };
    },
  },
  {
    id: 'billiard',
    name: 'Billiard Physics',
    hypothesis: 'Same-rank bounce should persist; flipping to annihilate should empty the board.',
    focusPair: [0, 0],
    build() {
      const rules = fillRules(CT.BOUNCE, CT.PASS_THROUGH);
      return {
        N: 3,
        size: 8,
        speed: 2.0,
        rules,
        entities: [
          { rank: 0, spanDims: [], pos: [0, 0, 0], moveDim: 0, moveDir: 1, color: [1.0, 0.3, 0.3] },
          { rank: 0, spanDims: [], pos: [7, 0, 0], moveDim: 0, moveDir: -1, color: [0.3, 0.5, 1.0] },
          { rank: 0, spanDims: [], pos: [0, 7, 0], moveDim: 1, moveDir: -1, color: [0.3, 1.0, 0.4] },
          { rank: 0, spanDims: [], pos: [3, 3, 7], moveDim: 2, moveDir: -1, color: [1.0, 0.8, 0.2] },
          { rank: 0, spanDims: [], pos: [7, 7, 7], moveDim: 0, moveDir: -1, color: [0.8, 0.3, 1.0] },
          { rank: 0, spanDims: [], pos: [4, 0, 4], moveDim: 1, moveDir: 1, color: [0.2, 0.9, 0.9] },
          { rank: 0, spanDims: [], pos: [1, 4, 2], moveDim: 2, moveDir: 1, color: [1.0, 0.5, 0.2] },
          { rank: 0, spanDims: [], pos: [5, 5, 1], moveDim: 0, moveDir: -1, color: [0.5, 1.0, 0.5] },
        ],
      };
    },
  },
];

export const CASCADE_RECIPES = [
  {
    id: 'merge-avalanche',
    name: 'Merge Avalanche',
    claim: 'Merge is evolution',
    hypothesis: 'Dense points + all-merge → narratable rank ladder within ~30s.',
    success: 'You can say “points became lines became a plane.”',
    topology: 'branching merge tree',
    build() {
      const rules = fillRules(CT.MERGE, CT.MERGE);
      return {
        N: 3,
        size: 6,
        speed: 2.0,
        rules,
        entities: Array.from({ length: 16 }, (_, i) => ({
          rank: 0,
          spanDims: [],
          pos: [i % 6, (i * 2) % 6, (i * 3) % 6],
          moveDim: i % 3,
          moveDir: i % 2 ? 1 : -1,
          color: [0.15 + (i % 6) * 0.12, 0.45 + (i % 3) * 0.1, 0.95],
        })),
      };
    },
  },
  {
    id: 'broom',
    name: 'Broom & Sparks',
    claim: 'Higher rank is a broom',
    hypothesis: 'One absorbing plane clears points; point↔point bounce leaves residue sparks.',
    success: 'A clearing wave with leftover bouncing dots.',
    topology: 'linear food chain',
    build() {
      const rules = fillRules(CT.BOUNCE, CT.PASS_THROUGH);
      setPair(rules, 0, 2, CT.ABSORB);
      return {
        N: 3,
        size: 10,
        speed: 1.4,
        rules,
        entities: [
          { rank: 2, spanDims: [0, 2], pos: [0, 0, 0], moveDim: 1, moveDir: 1, color: [0.15, 0.2, 0.7] },
          ...Array.from({ length: 18 }, (_, i) => ({
            rank: 0,
            spanDims: [],
            pos: [1 + (i % 8), 2 + (i % 7), 1 + ((i * 3) % 8)],
            moveDim: i % 3,
            moveDir: i % 2 ? 1 : -1,
            color: [1.0, 0.85 - (i % 5) * 0.1, 0.25],
          })),
        ],
      };
    },
  },
  {
    id: 'redirect-storm',
    name: 'Redirect Storm',
    claim: 'Fragile complexity',
    hypothesis: 'Cross-rank redirect + same-rank annihilate → bursts then quiet.',
    success: 'Chaotic mid-game, then sudden calm / emptiness.',
    topology: 'cyclic redirect chaos',
    build() {
      const rules = fillRules(CT.ANNIHILATE, CT.REDIRECT);
      return {
        N: 3,
        size: 8,
        speed: 1.8,
        rules,
        entities: [
          ...Array.from({ length: 8 }, (_, i) => ({
            rank: 0,
            spanDims: [],
            pos: [i % 8, (i * 2) % 8, (i * 3) % 8],
            moveDim: i % 3,
            moveDir: 1,
            color: [1.0, 0.3 + i * 0.05, 0.3],
          })),
          ...Array.from({ length: 4 }, (_, i) => ({
            rank: 1,
            spanDims: [i % 3],
            pos: [0, 0, 0].map((v, d) => (d === i % 3 ? 0 : 2 + i * 2)),
            moveDim: (i + 1) % 3,
            moveDir: -1,
            color: [0.3, 0.8, 1.0],
          })),
        ],
      };
    },
  },
  {
    id: 'hyper-monsoon',
    name: 'Hyper Monsoon',
    claim: 'Hyper-dim is weather',
    hypothesis: 'Volumes free on W gate meetings with XYZ points — climate, not collisions.',
    success: 'Meetings cluster when W aligns; quiet when volumes are “elsewhere.”',
    topology: 'dual-scale weather',
    build() {
      const rules = fillRules(CT.BOUNCE, CT.PASS_THROUGH);
      setPair(rules, 0, 3, CT.ABSORB);
      setPair(rules, 0, 0, CT.BOUNCE);
      return {
        N: 4,
        size: 8,
        speed: 1.2,
        dimMapping: ['X', 'Y', 'Z', 'TESSERACT'],
        rules,
        entities: [
          { rank: 3, spanDims: [0, 1, 2], pos: [0, 0, 0, 0], moveDim: 3, moveDir: 1, color: [0.3, 0.5, 1.0] },
          { rank: 3, spanDims: [0, 1, 2], pos: [0, 0, 0, 7], moveDim: 3, moveDir: -1, color: [1.0, 0.35, 0.4] },
          ...Array.from({ length: 10 }, (_, i) => ({
            rank: 0,
            spanDims: [],
            pos: [1 + i % 6, 1 + (i * 2) % 6, 1 + (i * 3) % 6, 2 + (i % 5)],
            moveDim: i % 3,
            moveDir: i % 2 ? 1 : -1,
            color: [0.9, 0.85, 0.3],
          })),
        ],
      };
    },
  },
  {
    id: 'weave-knot',
    name: 'Weave then Knot',
    claim: 'Orthogonal weave',
    hypothesis: 'Pass-through lines form fabric; flip crossings to merge and knots appear.',
    success: 'Persistent weave, then sudden thicker strands after the rule flip.',
    topology: 'fabric → knot',
    startPassThrough: true,
    build(mergeCrossings = false) {
      const rules = fillRules(CT.BOUNCE, mergeCrossings ? CT.MERGE : CT.PASS_THROUGH);
      setPair(rules, 1, 1, mergeCrossings ? CT.MERGE : CT.PASS_THROUGH);
      return {
        N: 3,
        size: 10,
        speed: 1.5,
        rules,
        entities: [
          { rank: 1, spanDims: [0], pos: [0, 0, 2], moveDim: 1, moveDir: 1, color: [1.0, 0.3, 0.4] },
          { rank: 1, spanDims: [0], pos: [0, 9, 5], moveDim: 1, moveDir: -1, color: [1.0, 0.5, 0.2] },
          { rank: 1, spanDims: [0], pos: [0, 4, 8], moveDim: 1, moveDir: 1, color: [0.9, 0.2, 0.6] },
          { rank: 1, spanDims: [1], pos: [2, 0, 3], moveDim: 0, moveDir: 1, color: [0.2, 0.5, 1.0] },
          { rank: 1, spanDims: [1], pos: [7, 0, 6], moveDim: 0, moveDir: -1, color: [0.3, 0.7, 0.9] },
          { rank: 1, spanDims: [1], pos: [5, 0, 1], moveDim: 0, moveDir: 1, color: [0.1, 0.4, 0.8] },
          { rank: 1, spanDims: [2], pos: [3, 5, 0], moveDim: 0, moveDir: -1, color: [0.3, 1.0, 0.4] },
          { rank: 1, spanDims: [2], pos: [8, 2, 0], moveDim: 1, moveDir: 1, color: [0.5, 0.9, 0.2] },
        ],
      };
    },
  },
];

export const EXPERIMENTS = [
  {
    id: 'playground',
    label: 'Playground',
    short: 'Free explore',
    description: 'Full sandbox — paint, remap dims, edit every collision rule, load any preset.',
  },
  {
    id: 'density',
    label: 'Density',
    short: 'Track A',
    description: 'Calibrate how crowded the world must be before interactions become legible. Watch meetings/step and rank mix.',
  },
  {
    id: 'hyper',
    label: 'Hyper Display',
    short: 'Track B',
    description: 'Same 4D motion, different encodings. Compare what teaches position vs motion vs occupation of W.',
  },
  {
    id: 'surgery',
    label: 'Interaction',
    short: 'Track C',
    description: 'Lock an ecology and change one rule pair. See which cell flips the story.',
  },
  {
    id: 'cascades',
    label: 'Cascades',
    short: 'Track D',
    description: 'Claim-driven recipes — merge avalanches, brooms, storms, weather. Each has a hypothesis to verify.',
  },
  {
    id: 'research',
    label: 'Research Viz',
    short: 'High-D',
    description: 'Conventional hyperspace techniques from data viz & LLM latent-space work: PCA, neighbor embeds, parallel coords, SPLOM, affinity, radar.',
  },
];

/** Materialize entity objects from a scenario descriptor. */
export function materializeEntities(desc) {
  return desc.entities.map(e => {
    const pos = [...e.pos];
    while (pos.length < desc.N) pos.push(0);
    return createEntity(e.rank, [...e.spanDims], pos, e.moveDim, e.moveDir, [...e.color]);
  });
}
