// App — orchestrator: world state, step loop, click-to-place
import { createEntity, stepEntities, resetIdCounter } from './entity-logic.js';
import { CollisionRules, applyCollision } from './collision-rules.js';
import { Renderer } from './renderer.js';
import { UIControls } from './ui-controls.js';
import { DimMapper } from './dim-mapper.js';

class App {
  constructor() {
    this.worldConfig = {
      N: 3,
      size: 8,
      slicePos: [],
    };

    this.entities = [];
    this.collisionRules = new CollisionRules();
    this.dimMapper = new DimMapper();
    this.dimMapper.rebuild(this.worldConfig.N);
    this.stepCount = 0;
    this.speed = 1.0;
    this.isPlaying = false;

    this._t = 1;
    this._lastFrameTime = 0;
    this._animating = false;
    this._toastTimer = null;
    this._hintHidden = false;

    const viewportEl = document.getElementById('viewport');
    this.renderer = new Renderer(viewportEl);
    this.renderer.updateGrid(this.worldConfig.size);

    this.ui = new UIControls(this);

    this._seedDefaults();
    this.renderScene();

    viewportEl.addEventListener('click', (e) => this._onViewportClick(e));
    viewportEl.addEventListener('pointerdown', () => this._hideViewportHint(), { once: false });
    viewportEl.addEventListener('wheel', () => this._hideViewportHint(), { passive: true, once: true });

    document.addEventListener('keydown', (e) => this._onKeyDown(e));
  }

  _hideViewportHint() {
    if (this._hintHidden) return;
    this._hintHidden = true;
    const hint = document.getElementById('viewport-hint');
    if (!hint) return;
    hint.classList.add('fade-out');
    setTimeout(() => { hint.hidden = true; }, 400);
  }

  toast(message, { error = false } = {}) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('is-error', error);
    el.hidden = false;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.hidden = true; }, 2800);
  }

  _seedDefaults() {
    const s = this.worldConfig.size;
    const mid = Math.floor(s / 2);

    this.entities.push(
      createEntity(0, [], [mid, 0, mid], 1, 1, [0.3, 0.8, 0.4]),
      createEntity(1, [0], [0, mid, mid], 1, 1, [0.2, 0.5, 0.9]),
      createEntity(2, [0, 2], [0, 0, 0], 1, 1, [0.9, 0.4, 0.3]),
    );
  }

  step() {
    this.entities = stepEntities(
      this.entities,
      this.worldConfig,
      this.collisionRules,
      applyCollision,
    );
    this.stepCount++;
    this._t = 0;
    this._startAnimation();
  }

  _startAnimation() {
    if (this._animating) return;
    this._animating = true;
    this._lastFrameTime = performance.now();
    this._animationFrame();
  }

  _animationFrame() {
    const now = performance.now();
    const dt = (now - this._lastFrameTime) / 1000;
    this._lastFrameTime = now;

    this._t += dt * this.speed;

    if (this.isPlaying) {
      while (this._t >= 1) {
        this._t -= 1;
        this.entities = stepEntities(
          this.entities,
          this.worldConfig,
          this.collisionRules,
          applyCollision,
        );
        this.stepCount++;
      }
      this.renderer.updateScene(this.entities, this.worldConfig, this._t, this.dimMapper);
      this.ui.updateStats(this.stepCount, this.entities.length);
      requestAnimationFrame(() => this._animationFrame());
    } else {
      this._t = Math.min(this._t, 1);
      const ease = this._t < 0.5
        ? 2 * this._t * this._t
        : 1 - Math.pow(-2 * this._t + 2, 2) / 2;
      this.renderer.updateScene(this.entities, this.worldConfig, ease, this.dimMapper);
      this.ui.updateStats(this.stepCount, this.entities.length);

      if (this._t < 1) {
        requestAnimationFrame(() => this._animationFrame());
      } else {
        this._animating = false;
      }
    }
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.ui.updatePlayButton();
    this._startAnimation();
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.ui.updatePlayButton();
  }

  reset() {
    this.pause();
    resetIdCounter();
    this.entities = [];
    this.stepCount = 0;
    this.renderer.clearPool();
    this._seedDefaults();
    this.renderer.updateGrid(this.worldConfig.size);
    this.renderScene();
    this.toast('Reset to starter shapes');
  }

  clearEntities() {
    this.pause();
    resetIdCounter();
    this.entities = [];
    this.stepCount = 0;
    this.renderer.clearPool();
    this.renderScene();
    this.toast('Cleared — click the grid to place shapes');
  }

  setGridSize(size) {
    this.worldConfig.size = size;
    this.pause();
    resetIdCounter();
    this.entities = [];
    this.stepCount = 0;
    this.renderer.clearPool();
    this._seedDefaults();
    this.renderer.updateGrid(size);
    this.renderScene();
  }

  setDimensions(N) {
    this.worldConfig.N = N;
    this.worldConfig.slicePos = [];
    this.dimMapper.rebuild(N);
    this.pause();
    resetIdCounter();
    this.entities = [];
    this.stepCount = 0;
    this.renderer.clearPool();
    this._seedDefaults();
    this.renderer.updateGrid(this.worldConfig.size);
    this.renderScene();
  }

  loadPreset(preset) {
    this.pause();
    resetIdCounter();

    this.worldConfig.N = preset.N;
    this.worldConfig.size = preset.size;
    this.worldConfig.slicePos = [];
    this.speed = preset.speed;
    this.stepCount = 0;
    this._t = 1;

    if (preset.rules) {
      const n = preset.rules.length;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          this.collisionRules.setRule(i, j, preset.rules[i][j]);
        }
      }
    }

    this.dimMapper.rebuild(preset.N);
    if (preset.dimMapping) {
      for (let d = 0; d < preset.dimMapping.length; d++) {
        this.dimMapper.set(d, preset.dimMapping[d]);
      }
    }

    this.entities = [];
    this.renderer.clearPool();
    for (const e of preset.entities) {
      const pos = [...e.pos];
      while (pos.length < preset.N) pos.push(0);
      this.entities.push(
        createEntity(e.rank, [...e.spanDims], pos, e.moveDim, e.moveDir, [...e.color]),
      );
    }

    this.renderer.updateGrid(preset.size);
    this.renderScene();

    if (this.ui) this.ui.syncFromApp();
  }

  renderScene() {
    this.renderer.updateScene(this.entities, this.worldConfig, this._t, this.dimMapper);
    this.ui.updateStats(this.stepCount, this.entities.length);
  }

  _onKeyDown(e) {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        this.isPlaying ? this.pause() : this.play();
        break;
      case 's':
      case 'S':
        this.step();
        break;
      case 'r':
      case 'R':
        this.reset();
        break;
      case '?':
      case '/': {
        if (e.key === '/' && !e.shiftKey) break;
        const overlay = document.getElementById('welcome');
        if (overlay) overlay.hidden = !overlay.hidden;
        break;
      }
      case 'Escape': {
        const overlay = document.getElementById('welcome');
        if (overlay && !overlay.hidden) overlay.hidden = true;
        break;
      }
    }
  }

  _onViewportClick(e) {
    this._hideViewportHint();
    const hit = this.renderer.raycastToGrid(e.clientX, e.clientY, this.worldConfig.size);
    if (!hit) return;

    const N = this.worldConfig.N;
    const pos = new Array(N).fill(0);
    pos[0] = hit.x;
    if (N > 1) pos[1] = hit.y;
    if (N > 2) pos[2] = hit.z;

    for (let d = 3; d < N; d++) {
      pos[d] = this.worldConfig.slicePos[d] || 0;
    }

    const rank = this.ui.paintRank;
    const spanDims = this.ui.paintSpanDims.slice(0, rank);
    const moveDim = this.ui.paintMoveDim;
    const moveDir = this.ui.paintMoveDir;
    const color = [...this.ui.paintColor];

    if (spanDims.length !== rank) {
      this.toast(`Pick ${rank} span dim${rank === 1 ? '' : 's'} for a ${['point', 'line', 'plane', 'volume', 'hyper'][rank]}`, { error: true });
      return;
    }
    if (moveDim < 0 || spanDims.includes(moveDim) || Number.isNaN(moveDim)) {
      this.toast('Need a free dim to move along — raise Dims or change span', { error: true });
      return;
    }

    try {
      const ent = createEntity(rank, spanDims, pos, moveDim, moveDir, color);
      this.entities.push(ent);
      this.renderScene();
    } catch (err) {
      this.toast(err.message || 'Could not place entity', { error: true });
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
