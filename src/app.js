// App — orchestrator: world state, step loop, click-to-place, experiments
import { createEntity, stepEntities, resetIdCounter } from './entity-logic.js';
import { CollisionRules, applyCollision, createDefaultTable } from './collision-rules.js';
import { Renderer } from './renderer.js';
import { UIControls } from './ui-controls.js';
import { DimMapper } from './dim-mapper.js';
import { ExperimentUI } from './experiment-ui.js';
import { materializeEntities } from './experiments.js';

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
    this._stepStats = {};

    const viewportEl = document.getElementById('viewport');
    this.renderer = new Renderer(viewportEl);
    this.renderer.updateGrid(this.worldConfig.size);

    this.ui = new UIControls(this);
    this.experiments = new ExperimentUI(this);

    this._seedDefaults();
    this.renderScene();

    viewportEl.addEventListener('click', (e) => this._onViewportClick(e));
    viewportEl.addEventListener('pointerdown', () => this._hideViewportHint(), { once: false });
    viewportEl.addEventListener('wheel', () => this._hideViewportHint(), { passive: true, once: true });
    window.addEventListener('resize', () => {
      this.experiments?.drawWStrip?.();
      this.experiments?.drawResearch?.();
    });

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

  _doStep() {
    this._stepStats = {};
    this.entities = stepEntities(
      this.entities,
      this.worldConfig,
      this.collisionRules,
      applyCollision,
      this._stepStats,
    );
    this.stepCount++;
    this.experiments?.onStepStats(this._stepStats);
  }

  step() {
    this._doStep();
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
        this._doStep();
      }
      this.renderer.updateScene(this.entities, this.worldConfig, this._t, this.dimMapper);
      this.ui.updateStats(this.stepCount, this.entities.length);
      this.experiments?.onRender();
      requestAnimationFrame(() => this._animationFrame());
    } else {
      this._t = Math.min(this._t, 1);
      const ease = this._t < 0.5
        ? 2 * this._t * this._t
        : 1 - Math.pow(-2 * this._t + 2, 2) / 2;
      this.renderer.updateScene(this.entities, this.worldConfig, ease, this.dimMapper);
      this.ui.updateStats(this.stepCount, this.entities.length);
      this.experiments?.onRender();

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
    const mode = this.experiments?.mode || 'playground';
    if (mode !== 'playground') {
      // Re-enter current experiment scenario
      this.experiments._enterMode(mode);
      return;
    }
    this.pause();
    resetIdCounter();
    this.entities = [];
    this.stepCount = 0;
    this.collisionRules.table = createDefaultTable();
    this.worldConfig.N = 3;
    this.worldConfig.size = 8;
    this.worldConfig.slicePos = [];
    this.dimMapper.rebuild(3);
    this.renderer.clearPool();
    this._seedDefaults();
    this.renderer.updateGrid(this.worldConfig.size);
    this.renderScene();
    this.ui.syncFromApp();
    this.ui.rebuildCollisionTable();
    this.toast('Reset to starter shapes');
  }

  clearEntities() {
    this.pause();
    resetIdCounter();
    this.entities = [];
    this.stepCount = 0;
    this.renderer.clearPool();
    this.renderScene();
    this.experiments?.resetMetrics();
    this.experiments?.onRender();
    this.toast('Cleared — click the grid to place shapes');
  }

  setGridSize(size) {
    if (this.experiments?.mode && this.experiments.mode !== 'playground') return;
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
    if (this.experiments?.mode && this.experiments.mode !== 'playground') return;
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

  /**
   * Load a scenario descriptor (from experiments or presets).
   */
  loadScenario(scene, { toast: toastMsg } = {}) {
    this.pause();
    resetIdCounter();

    this.worldConfig.N = scene.N;
    this.worldConfig.size = scene.size;
    this.worldConfig.slicePos = scene.slicePos ? [...scene.slicePos] : [];
    this.speed = scene.speed ?? this.speed;
    this.stepCount = 0;
    this._t = 1;

    this.collisionRules.table = createDefaultTable();
    if (scene.rules) {
      const n = scene.rules.length;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          this.collisionRules.setRule(i, j, scene.rules[i][j]);
        }
      }
    }

    this.dimMapper.rebuild(scene.N);
    if (scene.dimMapping) {
      for (let d = 0; d < scene.dimMapping.length; d++) {
        this.dimMapper.set(d, scene.dimMapping[d]);
      }
    }

    this.entities = materializeEntities(scene);
    this.renderer.clearPool();
    this.renderer.updateGrid(scene.size);
    this.renderScene();

    if (this.ui) {
      this.ui.syncFromApp();
      this.ui.rebuildCollisionTable();
    }
    if (toastMsg) this.toast(toastMsg);
  }

  loadPreset(preset) {
    this.loadScenario(preset);
    if (this.ui) this.ui.syncFromApp();
  }

  renderScene() {
    this.renderer.updateScene(this.entities, this.worldConfig, this._t, this.dimMapper);
    this.ui.updateStats(this.stepCount, this.entities.length);
    this.experiments?.onRender();
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
      case '1':
      case '2':
      case '3':
      case '4':
      case '5': {
        const modes = ['playground', 'density', 'hyper', 'surgery', 'cascades', 'research'];
        const idx = parseInt(e.key, 10) - 1;
        if (modes[idx]) this.experiments.setMode(modes[idx]);
        break;
      }
    }
  }

  _onViewportClick(e) {
    this._hideViewportHint();
    // Placement only in playground (experiments are authored scenarios)
    if (this.experiments?.mode && this.experiments.mode !== 'playground') {
      this.toast('Switch to Playground to paint entities');
      return;
    }

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
