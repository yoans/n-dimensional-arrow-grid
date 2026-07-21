// Hyperspace research visualizations — conventional high-D / latent-space techniques
// PCA · neighbor embedding (UMAP/t-SNE-like) · parallel coordinates · SPLOM · affinity heatmap

import { RANK_LABELS } from './entity-logic.js';

export const RESEARCH_VIZ_MODES = [
  {
    id: 'pca',
    label: 'PCA scatter',
    family: 'Dimensionality reduction',
    blurb: 'Linear projection onto axes of maximum variance — the workhorse of LLM latent-space plots.',
    cite: 'PCA · common in transformer embedding / residual-stream viz',
  },
  {
    id: 'neighbors',
    label: 'Neighbor embed',
    family: 'Dimensionality reduction',
    blurb: 'Preserves local neighborhoods in 2D (UMAP / t-SNE spirit). Clusters = entities close in full N-D.',
    cite: 'UMAP / t-SNE style · nonlinear manifold projection',
  },
  {
    id: 'parallel',
    label: 'Parallel coords',
    family: 'Multi-axis',
    blurb: 'One vertical axis per dimension; each entity is a polyline. Classic for spotting correlated dims and outliers.',
    cite: 'Parallel coordinates · Inselberg',
  },
  {
    id: 'splom',
    label: 'Scatter matrix',
    family: 'Multi-axis',
    blurb: 'All pairwise dim×dim scatters (SPLOM). Read which planes carry structure.',
    cite: 'Scatterplot matrix · Tukey',
  },
  {
    id: 'affinity',
    label: 'Affinity heatmap',
    family: 'Relational',
    blurb: 'Pairwise closeness in N-D (attention-matrix energy). Bright = nearby in hyperspace.',
    cite: 'Similarity / attention-style matrices · LLM interpretability',
  },
  {
    id: 'radar',
    label: 'Radar glyphs',
    family: 'Glyphs',
    blurb: 'Each entity as a star polygon — one spoke per dim. Good for comparing a few bodies at once.',
    cite: 'Radar / star plots · glyph encoding',
  },
];

/** Scenario tuned so research views have enough N-D structure to read. */
export function buildResearchVizScenario() {
  const N = 5;
  const size = 8;
  const entities = [];
  // Cluster A — low in dims 3,4
  for (let i = 0; i < 6; i++) {
    entities.push({
      rank: 0,
      spanDims: [],
      pos: [1 + (i % 3), 1 + Math.floor(i / 3), 2, 1 + (i % 2), 1],
      moveDim: i % 3,
      moveDir: i % 2 ? 1 : -1,
      color: [0.3, 0.7, 1.0],
    });
  }
  // Cluster B — high in dims 3,4
  for (let i = 0; i < 6; i++) {
    entities.push({
      rank: 0,
      spanDims: [],
      pos: [4 + (i % 3), 4 + Math.floor(i / 3), 5, 5 + (i % 2), 6],
      moveDim: (i + 1) % 3,
      moveDir: i % 2 ? -1 : 1,
      color: [1.0, 0.45, 0.35],
    });
  }
  // Bridging points moving in hyper dims
  entities.push(
    { rank: 0, spanDims: [], pos: [3, 3, 3, 0, 3], moveDim: 3, moveDir: 1, color: [0.95, 0.9, 0.3] },
    { rank: 0, spanDims: [], pos: [3, 3, 4, 7, 4], moveDim: 3, moveDir: -1, color: [0.95, 0.9, 0.3] },
    { rank: 1, spanDims: [0], pos: [0, 2, 3, 3, 2], moveDim: 4, moveDir: 1, color: [0.5, 1.0, 0.5] },
    { rank: 1, spanDims: [1], pos: [5, 0, 2, 4, 5], moveDim: 3, moveDir: -1, color: [0.7, 0.5, 1.0] },
  );
  return {
    N,
    size,
    speed: 1.0,
    dimMapping: ['X', 'Y', 'Z', 'HUE', 'SIZE'],
    entities,
  };
}

function rgb(c) {
  return `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
}

function entityPoints(entities, N, size) {
  const max = Math.max(size - 1, 1);
  return entities.map(e => {
    const v = new Array(N);
    for (let d = 0; d < N; d++) {
      // Span dims: place at mid so they don't dominate DR as corner spikes
      v[d] = e.spanDims.includes(d) ? 0.5 : (e.pos[d] ?? 0) / max;
    }
    return { ent: e, v };
  });
}

/** Power-iteration PCA → 2D coords in [0,1]² roughly centered. */
export function projectPCA(points) {
  const n = points.length;
  const D = points[0]?.v.length || 0;
  if (n < 2 || D < 1) return points.map(() => ({ x: 0.5, y: 0.5 }));

  const mean = new Array(D).fill(0);
  for (const p of points) for (let d = 0; d < D; d++) mean[d] += p.v[d];
  for (let d = 0; d < D; d++) mean[d] /= n;

  const centered = points.map(p => p.v.map((x, d) => x - mean[d]));

  function topEigen(exclude = null) {
    let v = new Array(D).fill(0).map((_, i) => (i === 0 ? 1 : 0.01 * (i + 1)));
    if (exclude) {
      // orthogonalize init
      let dot = 0;
      for (let d = 0; d < D; d++) dot += v[d] * exclude[d];
      for (let d = 0; d < D; d++) v[d] -= dot * exclude[d];
    }
    for (let iter = 0; iter < 40; iter++) {
      const w = new Array(D).fill(0);
      for (const row of centered) {
        let proj = 0;
        for (let d = 0; d < D; d++) proj += row[d] * v[d];
        for (let d = 0; d < D; d++) w[d] += proj * row[d];
      }
      if (exclude) {
        let dot = 0;
        for (let d = 0; d < D; d++) dot += w[d] * exclude[d];
        for (let d = 0; d < D; d++) w[d] -= dot * exclude[d];
      }
      let norm = Math.hypot(...w) || 1;
      v = w.map(x => x / norm);
    }
    return v;
  }

  const e1 = topEigen();
  const e2 = D > 1 ? topEigen(e1) : new Array(D).fill(0);

  const coords = centered.map(row => {
    let x = 0, y = 0;
    for (let d = 0; d < D; d++) {
      x += row[d] * e1[d];
      y += row[d] * e2[d];
    }
    return { x, y };
  });

  return normalizeCoords(coords);
}

function normalizeCoords(coords) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const c of coords) {
    minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x);
    minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y);
  }
  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;
  return coords.map(c => ({
    x: 0.08 + 0.84 * ((c.x - minX) / dx),
    y: 0.08 + 0.84 * ((c.y - minY) / dy),
  }));
}

/**
 * Lightweight neighbor-preserving 2D layout (UMAP/t-SNE spirit):
 * kNN in N-D + spring layout toward neighbor distances.
 */
export function projectNeighbors(points, { k = 5, steps = 80 } = {}) {
  const n = points.length;
  if (n < 2) return points.map(() => ({ x: 0.5, y: 0.5 }));

  const dist = (a, b) => {
    let s = 0;
    for (let d = 0; d < a.length; d++) {
      const t = a[d] - b[d];
      s += t * t;
    }
    return Math.sqrt(s);
  };

  const knn = [];
  for (let i = 0; i < n; i++) {
    const ds = [];
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      ds.push({ j, d: dist(points[i].v, points[j].v) });
    }
    ds.sort((a, b) => a.d - b.d);
    knn[i] = ds.slice(0, Math.min(k, n - 1));
  }

  // init from PCA for stability
  let pos = projectPCA(points).map(c => ({ x: c.x, y: c.y }));

  for (let step = 0; step < steps; step++) {
    const lr = 0.08 * (1 - step / steps);
    const next = pos.map(p => ({ x: p.x, y: p.y }));
    for (let i = 0; i < n; i++) {
      for (const { j, d: target } of knn[i]) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const cur = Math.hypot(dx, dy) || 1e-6;
        // map N-D distance (~0..√N) into plot units (~0..1)
        const ideal = 0.05 + target * 0.35;
        const force = (cur - ideal) / cur;
        next[i].x += lr * force * dx * 0.5;
        next[i].y += lr * force * dy * 0.5;
        next[j].x -= lr * force * dx * 0.5;
        next[j].y -= lr * force * dy * 0.5;
      }
    }
    // weak repulsion
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const cur = Math.hypot(dx, dy) || 1e-6;
        if (cur < 0.06) {
          const push = (0.06 - cur) / cur * 0.02;
          next[i].x -= push * dx;
          next[i].y -= push * dy;
          next[j].x += push * dx;
          next[j].y += push * dy;
        }
      }
    }
    pos = next;
  }
  return normalizeCoords(pos);
}

function pairwiseAffinity(points) {
  const n = points.length;
  const M = Array.from({ length: n }, () => new Array(n).fill(0));
  let maxD = 1e-6;
  const D = [];
  for (let i = 0; i < n; i++) {
    D[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) { D[i][j] = 0; continue; }
      let s = 0;
      for (let d = 0; d < points[i].v.length; d++) {
        const t = points[i].v[d] - points[j].v[d];
        s += t * t;
      }
      D[i][j] = Math.sqrt(s);
      maxD = Math.max(maxD, D[i][j]);
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      M[i][j] = i === j ? 1 : Math.exp(-((D[i][j] / maxD) ** 2) * 4);
    }
  }
  return M;
}

/**
 * Draw the selected research visualization into a canvas.
 */
export function drawResearchViz(canvas, { mode, entities, N, size, t = 1 }) {
  if (!canvas || canvas.hidden) return;
  const parent = canvas.parentElement;
  const cssW = parent?.clientWidth || 640;
  const cssH = Math.min(280, Math.max(180, Math.floor(window.innerHeight * 0.28)));
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  canvas.style.width = '100%';
  canvas.style.height = `${cssH}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const w = cssW;
  const h = cssH;
  ctx.fillStyle = '#080a18';
  ctx.fillRect(0, 0, w, h);

  const pts = entityPoints(entities, N, size);
  if (!pts.length) {
    ctx.fillStyle = '#6e7699';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('No entities to project', 16, 28);
    return;
  }

  // Interpolate positions slightly for smoother strip (use pos; prevPos blend)
  const interpPts = pts.map(({ ent, v }) => {
    const prev = ent.prevPos || ent.pos;
    const iv = v.slice();
    for (let d = 0; d < N; d++) {
      if (ent.spanDims.includes(d)) continue;
      const a = (prev[d] ?? 0) / Math.max(size - 1, 1);
      const b = (ent.pos[d] ?? 0) / Math.max(size - 1, 1);
      iv[d] = a + (b - a) * Math.min(1, Math.max(0, t));
    }
    return { ent, v: iv };
  });

  switch (mode) {
    case 'pca':
      drawScatter(ctx, w, h, interpPts, projectPCA(interpPts), 'PCA · variance axes');
      break;
    case 'neighbors':
      drawScatter(ctx, w, h, interpPts, projectNeighbors(interpPts), 'Neighbor embed · local structure');
      break;
    case 'parallel':
      drawParallel(ctx, w, h, interpPts, N);
      break;
    case 'splom':
      drawSplom(ctx, w, h, interpPts, N);
      break;
    case 'affinity':
      drawAffinity(ctx, w, h, interpPts);
      break;
    case 'radar':
      drawRadar(ctx, w, h, interpPts, N);
      break;
    default:
      drawScatter(ctx, w, h, interpPts, projectPCA(interpPts), 'PCA');
  }
}

function drawFrame(ctx, w, h, title) {
  ctx.strokeStyle = 'rgba(76, 110, 245, 0.25)';
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  ctx.fillStyle = '#8b9bff';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText(title, 12, 16);
}

function drawScatter(ctx, w, h, pts, coords, title) {
  drawFrame(ctx, w, h, title);
  const pad = 28;
  const bw = w - pad * 2;
  const bh = h - pad - 16;

  ctx.strokeStyle = 'rgba(76, 110, 245, 0.12)';
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, pad + bh);
  ctx.lineTo(pad + bw, pad + bh);
  ctx.stroke();

  pts.forEach((p, i) => {
    const c = coords[i];
    const x = pad + c.x * bw;
    const y = pad + (1 - c.y) * bh;
    ctx.fillStyle = rgb(p.ent.color);
    ctx.beginPath();
    const r = p.ent.rank === 0 ? 4.5 : 3 + p.ent.rank;
    if (p.ent.rank >= 2) {
      ctx.globalAlpha = 0.75;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    } else {
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  ctx.fillStyle = '#5a6280';
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillText('PC1 →', pad + bw - 36, pad + bh + 12);
  ctx.save();
  ctx.translate(10, pad + bh / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('PC2', 0, 0);
  ctx.restore();
}

function drawParallel(ctx, w, h, pts, N) {
  drawFrame(ctx, w, h, 'Parallel coordinates');
  const padX = 36;
  const padY = 28;
  const usableW = w - padX * 2;
  const top = padY + 8;
  const bot = h - 22;

  ctx.font = '10px system-ui, sans-serif';
  for (let d = 0; d < N; d++) {
    const x = padX + (N === 1 ? usableW / 2 : (d / (N - 1)) * usableW);
    ctx.strokeStyle = 'rgba(76, 110, 245, 0.35)';
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bot);
    ctx.stroke();
    ctx.fillStyle = '#8b9bff';
    ctx.fillText(`d${d}`, x - 6, bot + 14);
  }

  for (const p of pts) {
    ctx.strokeStyle = rgb(p.ent.color);
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = p.ent.rank === 0 ? 1.5 : 2;
    ctx.beginPath();
    for (let d = 0; d < N; d++) {
      const x = padX + (N === 1 ? usableW / 2 : (d / (N - 1)) * usableW);
      const y = bot - p.v[d] * (bot - top);
      if (d === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawSplom(ctx, w, h, pts, N) {
  const dims = Math.min(N, 5);
  drawFrame(ctx, w, h, `Scatterplot matrix (${dims}×${dims})`);
  const pad = 24;
  const cell = Math.min((w - pad * 2) / dims, (h - pad * 2 - 8) / dims);
  const ox = (w - cell * dims) / 2;
  const oy = pad + 4;

  for (let i = 0; i < dims; i++) {
    for (let j = 0; j < dims; j++) {
      const x0 = ox + j * cell;
      const y0 = oy + i * cell;
      ctx.strokeStyle = 'rgba(76, 110, 245, 0.2)';
      ctx.strokeRect(x0, y0, cell, cell);
      if (i === j) {
        ctx.fillStyle = 'rgba(76, 110, 245, 0.06)';
        ctx.fillRect(x0, y0, cell, cell);
        ctx.fillStyle = '#6c7aff';
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillText(`d${i}`, x0 + cell / 2 - 6, y0 + cell / 2 + 3);
        continue;
      }
      const m = 3;
      for (const p of pts) {
        const px = x0 + m + p.v[j] * (cell - m * 2);
        const py = y0 + cell - m - p.v[i] * (cell - m * 2);
        ctx.fillStyle = rgb(p.ent.color);
        ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
      }
    }
  }
}

function drawAffinity(ctx, w, h, pts) {
  drawFrame(ctx, w, h, 'Affinity heatmap · pairwise N-D closeness');
  const M = pairwiseAffinity(pts);
  const n = pts.length;
  const pad = 36;
  const side = Math.min(w, h) - pad * 1.2;
  const ox = (w - side) / 2;
  const oy = 22;
  const cell = side / n;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const a = M[i][j];
      // attention-ish: dark → bright cyan/magenta
      const r = Math.round(20 + a * 180);
      const g = Math.round(30 + a * 120);
      const b = Math.round(60 + a * 195);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(ox + j * cell, oy + i * cell, cell + 0.5, cell + 0.5);
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.strokeRect(ox, oy, side, side);

  ctx.fillStyle = '#6e7699';
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillText('entities →', ox, oy + side + 12);
  ctx.save();
  ctx.translate(ox - 8, oy + side / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('entities', 0, 0);
  ctx.restore();
}

function drawRadar(ctx, w, h, pts, N) {
  drawFrame(ctx, w, h, 'Radar glyphs · one star per entity');
  const cols = Math.ceil(Math.sqrt(pts.length));
  const rows = Math.ceil(pts.length / cols);
  const gw = w / cols;
  const gh = (h - 20) / rows;

  pts.forEach((p, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = col * gw + gw / 2;
    const cy = 20 + row * gh + gh / 2;
    const R = Math.min(gw, gh) * 0.32;

    ctx.strokeStyle = 'rgba(76, 110, 245, 0.2)';
    for (let ring = 1; ring <= 2; ring++) {
      ctx.beginPath();
      for (let d = 0; d < N; d++) {
        const ang = -Math.PI / 2 + (d / N) * Math.PI * 2;
        const rr = (R * ring) / 2;
        const x = cx + Math.cos(ang) * rr;
        const y = cy + Math.sin(ang) * rr;
        if (d === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.beginPath();
    for (let d = 0; d < N; d++) {
      const ang = -Math.PI / 2 + (d / N) * Math.PI * 2;
      const rr = 4 + p.v[d] * (R - 4);
      const x = cx + Math.cos(ang) * rr;
      const y = cy + Math.sin(ang) * rr;
      if (d === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = rgb(p.ent.color);
    ctx.fillStyle = rgb(p.ent.color);
    ctx.globalAlpha = 0.25;
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#6e7699';
    ctx.font = '9px system-ui, sans-serif';
    ctx.fillText(RANK_LABELS[p.ent.rank]?.[0] || '?', cx - 3, cy + R + 10);
  });
}
