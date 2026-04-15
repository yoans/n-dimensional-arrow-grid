// App — orchestrator: world state, step loop, click-to-place
import { createEntity, stepEntities, resetIdCounter } from './entity-logic.js';
import { CollisionRules, applyCollision } from './collision-rules.js';
import { Renderer } from './renderer.js';
import { UIControls } from './ui-controls.js';
import { DimMapper } from './dim-mapper.js';
import { PRESETS } from './presets.js';

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
    this.speed = 1.0; // steps per second
    this.isPlaying = false;

    // Animation state
    this._t = 1;              // interpolation progress 0→1; starts at 1 (idle)
    this._lastFrameTime = 0;
    this._animating = false;

    // Renderer
    const viewportEl = document.getElementById('viewport');
    this.renderer = new Renderer(viewportEl);
    this.renderer.updateGrid(this.worldConfig.size);

    // UI
    this.ui = new UIControls(this);

    // Seed default entities: one point, one line, one plane
    this._seedDefaults();
    this.renderScene();

    // Click-to-place
    viewportEl.addEventListener('click', (e) => this._onViewportClick(e));

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this._onKeyDown(e));
  }

  _seedDefaults() {
    const s = this.worldConfig.size;
    const mid = Math.floor(s / 2);

    this.entities.push(
      createEntity(0, [], [mid, 0, mid], 1, 1, [0.3, 0.8, 0.4]),         // point
      createEntity(1, [0], [0, mid, mid], 1, 1, [0.2, 0.5, 0.9]),        // line spanning X
      createEntity(2, [0, 2], [0, 0, 0], 1, 1, [0.9, 0.4, 0.3]),        // plane spanning XZ
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

  /**
   * Start the RAF interpolation loop if not already running.
   */
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

    // Advance interpolation progress
    this._t += dt * this.speed;

    if (this.isPlaying) {
      // Continuous play: chain steps seamlessly, carry overflow time
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
      // Linear interpolation for smooth constant-velocity motion
      this.renderer.updateScene(this.entities, this.worldConfig, this._t, this.dimMapper);
      this.ui.updateStats(this.stepCount, this.entities.length);
      requestAnimationFrame(() => this._animationFrame());
    } else {
      // Single step: clamp to 1 and apply easing for nice decel/accel
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
    this._startAnimation();
  }

  pause() {
    this.isPlaying = false;
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

    // Apply world config
    this.worldConfig.N = preset.N;
    this.worldConfig.size = preset.size;
    this.worldConfig.slicePos = [];
    this.speed = preset.speed;
    this.stepCount = 0;
    this._t = 1;

    // Collision rules
    if (preset.rules) {
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          this.collisionRules.setRule(i, j, preset.rules[i][j]);
        }
      }
    }

    // Dim mapping
    this.dimMapper.rebuild(preset.N);
    if (preset.dimMapping) {
      for (let d = 0; d < preset.dimMapping.length; d++) {
        this.dimMapper.set(d, preset.dimMapping[d]);
      }
    }

    // Entities
    this.entities = [];
    this.renderer.clearPool();
    for (const e of preset.entities) {
      const pos = [...e.pos];
      // Pad pos to N dimensions
      while (pos.length < preset.N) pos.push(0);
      this.entities.push(
        createEntity(e.rank, [...e.spanDims], pos, e.moveDim, e.moveDir, [...e.color]),
      );
    }

    this.renderer.updateGrid(preset.size);
    this.renderScene();

    // Notify UI to refresh all controls
    if (this.ui) this.ui.syncFromApp();
  }

  renderScene() {
    this.renderer.updateScene(this.entities, this.worldConfig, this._t, this.dimMapper);
    this.ui.updateStats(this.stepCount, this.entities.length);
  }

  _onKeyDown(e) {
    // Ignore shortcuts when typing in an input/select
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
    }
  }

  _onViewportClick(e) {
    const hit = this.renderer.raycastToGrid(e.clientX, e.clientY, this.worldConfig.size);
    if (!hit) return;

    const N = this.worldConfig.N;
    const pos = new Array(N).fill(0);
    pos[0] = hit.x;
    if (N > 1) pos[1] = hit.y;
    if (N > 2) pos[2] = hit.z;

    // Fill higher-dim positions from current slice
    for (let d = 3; d < N; d++) {
      pos[d] = this.worldConfig.slicePos[d] || 0;
    }

    const rank = this.ui.paintRank;
    const spanDims = this.ui.paintSpanDims.slice(0, rank);
    const moveDim = this.ui.paintMoveDim;
    const moveDir = this.ui.paintMoveDir;
    const color = [...this.ui.paintColor];

    try {
      const ent = createEntity(rank, spanDims, pos, moveDim, moveDir, color);
      this.entities.push(ent);
      this.renderScene();
    } catch (err) {
      console.warn('Could not place entity:', err.message);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
