// UI Controls — wiring for entity palette, collision rule table, and simulation controls
import { CollisionType } from './collision-rules.js';
import { Channel, DimMapper } from './dim-mapper.js';
import { PRESETS } from './presets.js';

const RANK_LABELS = ['Point', 'Line', 'Plane', 'Volume'];
const COLLISION_TYPES = Object.values(CollisionType);

export class UIControls {
  constructor(app) {
    this.app = app;
    this.paintRank = 0;
    this.paintSpanDims = [];
    this.paintMoveDim = 1;
    this.paintMoveDir = 1;
    this.paintColor = [0.3, 0.8, 0.3];

    this.setupEntityPalette();
    this.setupDimMapping();
    this.setupCollisionTable();
    this.setupSimControls();
    this.setupPresets();
    this.setupSliceSliders();
  }

  // --- Left panel: Entity Palette ---
  setupEntityPalette() {
    const panel = document.getElementById('entity-palette');

    // Rank selector
    const rankGroup = document.createElement('div');
    rankGroup.className = 'control-group';
    rankGroup.innerHTML = `<label>Rank</label>`;
    const rankSelect = document.createElement('select');
    rankSelect.id = 'rank-select';
    rankSelect.setAttribute('aria-label', 'Entity rank');
    RANK_LABELS.forEach((label, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = label;
      rankSelect.appendChild(opt);
    });
    rankSelect.addEventListener('change', () => {
      this.paintRank = parseInt(rankSelect.value);
      // Clear span dims that exceed the new rank limit
      while (this.paintSpanDims.length > this.paintRank) {
        this.paintSpanDims.pop();
      }
      this.rebuildSpanDimCheckboxes();
    });
    rankGroup.appendChild(rankSelect);
    panel.appendChild(rankGroup);

    // SpanDims checkboxes
    const spanGroup = document.createElement('div');
    spanGroup.className = 'control-group';
    spanGroup.innerHTML = `<label>Span Dims</label>`;
    this.spanDimContainer = document.createElement('div');
    this.spanDimContainer.id = 'span-dims';
    this.spanDimContainer.className = 'checkbox-group';
    spanGroup.appendChild(this.spanDimContainer);
    panel.appendChild(spanGroup);

    // MoveDim dropdown (must exist before rebuildSpanDimCheckboxes calls rebuildMoveDimOptions)
    const moveGroup = document.createElement('div');
    moveGroup.className = 'control-group';
    moveGroup.innerHTML = `<label>Move Dim</label>`;
    this.moveDimSelect = document.createElement('select');
    this.moveDimSelect.id = 'move-dim';
    this.moveDimSelect.setAttribute('aria-label', 'Movement dimension');
    this.moveDimSelect.addEventListener('change', () => {
      this.paintMoveDim = parseInt(this.moveDimSelect.value);
    });
    moveGroup.appendChild(this.moveDimSelect);
    panel.appendChild(moveGroup);

    // Now safe to build span checkboxes (which triggers rebuildMoveDimOptions)
    this.rebuildSpanDimCheckboxes();

    // MoveDir toggle
    const dirGroup = document.createElement('div');
    dirGroup.className = 'control-group';
    dirGroup.innerHTML = `<label>Move Direction</label>`;
    const dirBtn = document.createElement('button');
    dirBtn.id = 'dir-toggle';
    dirBtn.textContent = '+1';
    dirBtn.setAttribute('aria-label', 'Move direction: positive');
    dirBtn.addEventListener('click', () => {
      this.paintMoveDir *= -1;
      dirBtn.textContent = this.paintMoveDir === 1 ? '+1' : '−1';
      dirBtn.setAttribute('aria-label', `Move direction: ${this.paintMoveDir === 1 ? 'positive' : 'negative'}`);
    });
    dirGroup.appendChild(dirBtn);
    panel.appendChild(dirGroup);

    // Color picker
    const colorGroup = document.createElement('div');
    colorGroup.className = 'control-group';
    colorGroup.innerHTML = `<label>Color</label>`;
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = '#4dcc4d';
    colorInput.setAttribute('aria-label', 'Entity color');
    colorInput.addEventListener('input', () => {
      const hex = colorInput.value;
      this.paintColor = [
        parseInt(hex.substr(1, 2), 16) / 255,
        parseInt(hex.substr(3, 2), 16) / 255,
        parseInt(hex.substr(5, 2), 16) / 255,
      ];
    });
    colorGroup.appendChild(colorInput);
    panel.appendChild(colorGroup);
  }

  rebuildSpanDimCheckboxes() {
    const N = this.app.worldConfig.N;
    this.spanDimContainer.innerHTML = '';
    this.paintSpanDims = [];
    this._spanCheckboxes = [];

    for (let d = 0; d < N; d++) {
      const label = document.createElement('label');
      label.className = 'dim-checkbox';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = d;
      cb.setAttribute('aria-label', `Span dimension ${d}`);
      cb.addEventListener('change', () => {
        if (cb.checked) {
          if (!this.paintSpanDims.includes(d)) this.paintSpanDims.push(d);
        } else {
          this.paintSpanDims = this.paintSpanDims.filter(x => x !== d);
        }
        this._enforceSpanLimit();
        this.rebuildMoveDimOptions();
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(` Dim ${d}`));
      this.spanDimContainer.appendChild(label);
      this._spanCheckboxes.push(cb);
    }
    this._enforceSpanLimit();
    this.rebuildMoveDimOptions();
  }

  /**
   * Disable unchecked span-dim checkboxes when the rank limit is reached.
   * Point=0 spans, Line=1, Plane=2, Volume=3.
   */
  _enforceSpanLimit() {
    const maxSpan = this.paintRank;
    const atLimit = this.paintSpanDims.length >= maxSpan;
    for (const cb of this._spanCheckboxes) {
      const dim = parseInt(cb.value);
      if (cb.checked) {
        cb.disabled = false;
        cb.parentElement.classList.remove('disabled-dim');
      } else {
        cb.disabled = atLimit;
        cb.parentElement.classList.toggle('disabled-dim', atLimit);
      }
    }
  }

  rebuildMoveDimOptions() {
    const N = this.app.worldConfig.N;
    this.moveDimSelect.innerHTML = '';
    for (let d = 0; d < N; d++) {
      if (!this.paintSpanDims.includes(d)) {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = `Dim ${d}`;
        this.moveDimSelect.appendChild(opt);
      }
    }
    if (this.moveDimSelect.value !== undefined) {
      this.paintMoveDim = parseInt(this.moveDimSelect.value);
    }
  }

  // --- Dimension Mapping UI ---
  setupDimMapping() {
    this.dimMappingContainer = document.getElementById('dim-mapping');
    this.rebuildDimMapping();
  }

  rebuildDimMapping() {
    const container = this.dimMappingContainer;
    if (!container) return;
    container.innerHTML = '';
    const mapper = this.app.dimMapper;
    const N = this.app.worldConfig.N;
    const channels = DimMapper.channelOptions();

    for (let d = 0; d < N; d++) {
      const row = document.createElement('div');
      row.className = 'dim-row';
      const label = document.createElement('label');
      label.textContent = `Dim ${d}`;
      row.appendChild(label);

      const sel = document.createElement('select');
      sel.setAttribute('aria-label', `Dimension ${d} channel mapping`);
      channels.forEach(ch => {
        const opt = document.createElement('option');
        opt.value = ch;
        opt.textContent = ch;
        sel.appendChild(opt);
      });
      sel.value = mapper.get(d);
      const dim = d;
      sel.addEventListener('change', () => {
        mapper.set(dim, sel.value);
        this.app.renderer.clearPool(); // rebuild meshes for new mapping
        this.app.renderScene();
        this.rebuildSliceSliders();
      });
      row.appendChild(sel);
      container.appendChild(row);
    }
  }

  rebuildSliceSliders() {
    this.setupSliceSliders();
  }

  // --- Right panel: Collision Rule Table ---
  setupCollisionTable() {
    const panel = document.getElementById('collision-panel');
    const table = document.createElement('table');
    table.className = 'collision-table';
    table.setAttribute('role', 'grid');

    const caption = document.createElement('caption');
    caption.className = 'sr-only';
    caption.textContent = 'Collision rules: choose what happens when entities of different ranks collide';
    table.appendChild(caption);

    // Header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th scope="col"></th>' + RANK_LABELS.map(l => `<th scope="col">${l}</th>`).join('');
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let i = 0; i < 4; i++) {
      const row = document.createElement('tr');
      row.innerHTML = `<th scope="row">${RANK_LABELS[i]}</th>`;
      for (let j = 0; j < 4; j++) {
        const td = document.createElement('td');
        if (j >= i) {
          const sel = document.createElement('select');
          sel.className = 'rule-select';
          sel.setAttribute('aria-label', `${RANK_LABELS[i]} vs ${RANK_LABELS[j]} collision rule`);
          COLLISION_TYPES.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t.replace('_', ' ');
            sel.appendChild(opt);
          });
          sel.value = this.app.collisionRules.getRule(i, j);
          const ri = i, rj = j;
          sel.addEventListener('change', () => {
            this.app.collisionRules.setRule(ri, rj, sel.value);
            // Mirror in symmetric cell
            const mirror = document.querySelector(`[data-rule="${rj}-${ri}"]`);
            if (mirror) mirror.value = sel.value;
          });
          sel.dataset.rule = `${i}-${j}`;
          td.appendChild(sel);
        } else {
          // Symmetric cell — mirror (read-only)
          const sel = document.createElement('select');
          sel.className = 'rule-select';
          sel.disabled = true;
          sel.setAttribute('aria-label', `${RANK_LABELS[i]} vs ${RANK_LABELS[j]} (mirrors ${RANK_LABELS[j]} vs ${RANK_LABELS[i]})`);
          COLLISION_TYPES.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t.replace('_', ' ');
            sel.appendChild(opt);
          });
          sel.value = this.app.collisionRules.getRule(i, j);
          sel.dataset.rule = `${i}-${j}`;
          td.appendChild(sel);
        }
        row.appendChild(td);
      }
      tbody.appendChild(row);
    }
    table.appendChild(tbody);

    panel.appendChild(table);
  }

  // --- Bottom bar: Simulation controls ---
  setupSimControls() {
    document.getElementById('step-btn').addEventListener('click', () => this.app.step());
    document.getElementById('play-btn').addEventListener('click', () => this.app.play());
    document.getElementById('pause-btn').addEventListener('click', () => this.app.pause());
    document.getElementById('reset-btn').addEventListener('click', () => this.app.reset());

    const speedSlider = document.getElementById('speed-slider');
    const speedVal = document.getElementById('speed-value');
    speedSlider.addEventListener('input', () => {
      const val = parseFloat(speedSlider.value);
      this.app.speed = val;
      speedVal.textContent = val.toFixed(1);
      speedSlider.setAttribute('aria-valuenow', val);
    });

    const sizeSlider = document.getElementById('size-slider');
    const sizeVal = document.getElementById('size-value');
    sizeSlider.addEventListener('input', () => {
      const val = parseInt(sizeSlider.value);
      this.app.setGridSize(val);
      sizeVal.textContent = val;
      sizeSlider.setAttribute('aria-valuenow', val);
    });

    const dimSlider = document.getElementById('dim-slider');
    const dimVal = document.getElementById('dim-value');
    dimSlider.addEventListener('input', () => {
      const val = parseInt(dimSlider.value);
      this.app.setDimensions(val);
      dimVal.textContent = val;
      dimSlider.setAttribute('aria-valuenow', val);
      this.rebuildSpanDimCheckboxes();
      this.rebuildDimMapping();
      this.setupSliceSliders();
    });
  }

  // --- Slice sliders for SLICE-mapped dims ---
  setupSliceSliders() {
    const container = document.getElementById('slice-sliders');
    container.innerHTML = '';
    const N = this.app.worldConfig.N;
    const size = this.app.worldConfig.size;
    const mapper = this.app.dimMapper;

    // Collect dims assigned to SLICE channel
    const sliceDims = [];
    for (let d = 0; d < N; d++) {
      if (mapper.get(d) === Channel.SLICE) sliceDims.push(d);
    }

    for (const d of sliceDims) {
      const group = document.createElement('div');
      group.className = 'control-group';
      const valSpan = document.createElement('span');
      valSpan.textContent = '0';
      group.innerHTML = `<label>Slice Dim ${d}: </label>`;
      group.querySelector('label').appendChild(valSpan);
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = 0;
      slider.max = size - 1;
      slider.value = 0;
      const dim = d;
      slider.addEventListener('input', () => {
        const v = parseInt(slider.value);
        this.app.worldConfig.slicePos[dim] = v;
        valSpan.textContent = v;
        this.app.renderScene();
      });
      group.appendChild(slider);
      container.appendChild(group);
      // Initialize slicePos
      if (this.app.worldConfig.slicePos[d] === undefined) {
        this.app.worldConfig.slicePos[d] = 0;
      }
    }
  }

  updateStats(stepCount, entityCount) {
    document.getElementById('step-count').textContent = stepCount;
    document.getElementById('entity-count').textContent = entityCount;
  }

  // --- Presets ---
  setupPresets() {
    const sel = document.getElementById('preset-select');
    PRESETS.forEach((p, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = p.name;
      opt.title = p.description;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => {
      const idx = parseInt(sel.value);
      if (!isNaN(idx) && PRESETS[idx]) {
        this.app.loadPreset(PRESETS[idx]);
        sel.value = ''; // reset to "— Preset —" after loading
      }
    });
  }

  /**
   * Sync all UI controls to match current app state (after preset load, etc.)
   */
  syncFromApp() {
    // Speed
    const speedSlider = document.getElementById('speed-slider');
    const speedVal = document.getElementById('speed-value');
    if (speedSlider) {
      speedSlider.value = this.app.speed;
      speedVal.textContent = this.app.speed.toFixed(1);
    }

    // Size
    const sizeSlider = document.getElementById('size-slider');
    const sizeVal = document.getElementById('size-value');
    if (sizeSlider) {
      sizeSlider.value = this.app.worldConfig.size;
      sizeVal.textContent = this.app.worldConfig.size;
    }

    // Dims
    const dimSlider = document.getElementById('dim-slider');
    const dimVal = document.getElementById('dim-value');
    if (dimSlider) {
      dimSlider.value = this.app.worldConfig.N;
      dimVal.textContent = this.app.worldConfig.N;
    }

    // Rebuild dependent UI
    this.rebuildSpanDimCheckboxes();
    this.rebuildDimMapping();
    this.setupSliceSliders();
    this.rebuildCollisionTable();
  }

  /**
   * Rebuild the collision table to reflect current rules.
   */
  rebuildCollisionTable() {
    const selects = document.querySelectorAll('[data-rule]');
    selects.forEach(sel => {
      const [i, j] = sel.dataset.rule.split('-').map(Number);
      sel.value = this.app.collisionRules.getRule(i, j);
    });
  }
}
