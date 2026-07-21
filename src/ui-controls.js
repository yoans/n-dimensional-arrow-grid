// UI Controls — wiring for entity palette, collision rule table, and simulation controls
import { CollisionType } from './collision-rules.js';
import { Channel, DimMapper } from './dim-mapper.js';
import { PRESETS } from './presets.js';

const RANK_LABELS = ['Point', 'Line', 'Plane', 'Volume'];
const RANK_HINTS = [
  'A single cell — no span dims needed',
  'Needs 1 span dim (the axis it stretches along)',
  'Needs 2 span dims (the plane it covers)',
  'Needs 3 span dims (the box it fills)',
];
const COLLISION_TYPES = Object.values(CollisionType);
const COLLISION_LABELS = {
  PASS_THROUGH: 'Pass through',
  ANNIHILATE: 'Annihilate',
  BOUNCE: 'Bounce',
  ABSORB: 'Absorb',
  REDIRECT: 'Redirect',
  MERGE: 'Merge',
};
const CHANNEL_HINTS = {
  X: 'Horizontal position',
  Y: 'Vertical position',
  Z: 'Depth position',
  HUE: 'Encode as color hue',
  SIZE: 'Encode as scale',
  OPACITY: 'Encode as transparency',
  TESSERACT: '4D cube projection',
  SLICE: 'Filter with a slider',
};

export class UIControls {
  constructor(app) {
    this.app = app;
    this.paintRank = 0;
    this.paintSpanDims = [];
    this.paintMoveDim = 1;
    this.paintMoveDir = 1;
    this.paintColor = [0.3, 0.8, 0.3];
    this._blurbTimer = null;

    this.setupEntityPalette();
    this.setupDimMapping();
    this.setupCollisionTable();
    this.setupSimControls();
    this.setupPresets();
    this.setupSliceSliders();
    this.setupWelcome();
    this.updatePlayButton();
  }

  // --- Welcome / help ---
  setupWelcome() {
    const overlay = document.getElementById('welcome');
    const helpBtn = document.getElementById('help-btn');
    const dismiss = document.getElementById('welcome-dismiss');
    const demo = document.getElementById('welcome-demo');

    const show = () => {
      overlay.hidden = false;
      dismiss?.focus();
    };
    const hide = () => {
      overlay.hidden = true;
      try { localStorage.setItem('ndgrid-welcomed', '1'); } catch (_) { /* ignore */ }
    };

    helpBtn?.addEventListener('click', show);
    dismiss?.addEventListener('click', hide);
    demo?.addEventListener('click', () => {
      hide();
      this.app.loadPreset(PRESETS[0]);
      this.showPresetBlurb(PRESETS[0]);
      this.app.play();
      this.app.toast('Playing Billiard Points — drag to look around');
    });

    // Show on first visit
    let seen = false;
    try { seen = localStorage.getItem('ndgrid-welcomed') === '1'; } catch (_) { /* ignore */ }
    if (!seen) show();
    else overlay.hidden = true;
  }

  showPresetBlurb(preset) {
    const el = document.getElementById('preset-blurb');
    if (!el || !preset) return;
    el.innerHTML = `<strong>${preset.name}</strong>${preset.description}`;
    el.hidden = false;
    clearTimeout(this._blurbTimer);
    this._blurbTimer = setTimeout(() => { el.hidden = true; }, 8000);
  }

  updatePlayButton() {
    const btn = document.getElementById('play-btn');
    if (!btn) return;
    const playing = this.app.isPlaying;
    btn.classList.toggle('is-playing', playing);
    btn.innerHTML = playing
      ? 'Pause <span class="key-hint">Space</span>'
      : 'Play <span class="key-hint">Space</span>';
    btn.setAttribute('aria-label', playing ? 'Pause playback' : 'Start continuous playback');
    btn.title = playing ? 'Pause (Space)' : 'Play (Space)';
  }

  // --- Left panel: Entity Palette ---
  setupEntityPalette() {
    const panel = document.getElementById('entity-palette');

    const rankGroup = document.createElement('div');
    rankGroup.className = 'control-group';
    rankGroup.innerHTML = `<label>Shape</label><span class="control-hint" id="rank-hint">${RANK_HINTS[0]}</span>`;
    const rankSelect = document.createElement('select');
    rankSelect.id = 'rank-select';
    rankSelect.setAttribute('aria-label', 'Entity shape / rank');
    RANK_LABELS.forEach((label, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = label;
      rankSelect.appendChild(opt);
    });
    rankSelect.addEventListener('change', () => {
      this.paintRank = parseInt(rankSelect.value, 10);
      document.getElementById('rank-hint').textContent = RANK_HINTS[this.paintRank];
      this._autoPickSpanDims();
      this.rebuildSpanDimCheckboxes();
    });
    rankGroup.appendChild(rankSelect);
    panel.appendChild(rankGroup);

    const spanGroup = document.createElement('div');
    spanGroup.className = 'control-group';
    spanGroup.innerHTML = `<label>Span dims</label><span class="control-hint">Axes the shape extends along</span>`;
    this.spanDimContainer = document.createElement('div');
    this.spanDimContainer.id = 'span-dims';
    this.spanDimContainer.className = 'checkbox-group';
    spanGroup.appendChild(this.spanDimContainer);
    panel.appendChild(spanGroup);

    const moveGroup = document.createElement('div');
    moveGroup.className = 'control-group';
    moveGroup.innerHTML = `<label>Move along</label><span class="control-hint">Must be outside the span</span>`;
    this.moveDimSelect = document.createElement('select');
    this.moveDimSelect.id = 'move-dim';
    this.moveDimSelect.setAttribute('aria-label', 'Movement dimension');
    this.moveDimSelect.addEventListener('change', () => {
      this.paintMoveDim = parseInt(this.moveDimSelect.value, 10);
    });
    moveGroup.appendChild(this.moveDimSelect);
    panel.appendChild(moveGroup);

    this._autoPickSpanDims();
    this.rebuildSpanDimCheckboxes();

    const dirGroup = document.createElement('div');
    dirGroup.className = 'control-group';
    dirGroup.innerHTML = `<label>Direction</label>`;
    const dirBtn = document.createElement('button');
    dirBtn.type = 'button';
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

  /** Pick the first `rank` dims as span so placement always works. */
  _autoPickSpanDims() {
    const N = this.app.worldConfig.N;
    this.paintSpanDims = [];
    for (let d = 0; d < N && this.paintSpanDims.length < this.paintRank; d++) {
      this.paintSpanDims.push(d);
    }
  }

  rebuildSpanDimCheckboxes() {
    const N = this.app.worldConfig.N;
    this.spanDimContainer.innerHTML = '';
    this._spanCheckboxes = [];

    // Keep auto-picked dims that still fit; refill if empty for this rank
    this.paintSpanDims = this.paintSpanDims.filter(d => d < N).slice(0, this.paintRank);
    if (this.paintSpanDims.length < this.paintRank) {
      this._autoPickSpanDims();
    }

    for (let d = 0; d < N; d++) {
      const label = document.createElement('label');
      label.className = 'dim-checkbox';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = d;
      cb.checked = this.paintSpanDims.includes(d);
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

  _enforceSpanLimit() {
    const maxSpan = this.paintRank;
    const atLimit = this.paintSpanDims.length >= maxSpan;
    for (const cb of this._spanCheckboxes) {
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
    const prev = this.paintMoveDim;
    this.moveDimSelect.innerHTML = '';
    const available = [];
    for (let d = 0; d < N; d++) {
      if (!this.paintSpanDims.includes(d)) {
        available.push(d);
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = `Dim ${d}`;
        this.moveDimSelect.appendChild(opt);
      }
    }
    if (available.includes(prev)) {
      this.moveDimSelect.value = String(prev);
      this.paintMoveDim = prev;
    } else if (available.length) {
      this.moveDimSelect.value = String(available[0]);
      this.paintMoveDim = available[0];
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
        opt.title = CHANNEL_HINTS[ch] || '';
        sel.appendChild(opt);
      });
      sel.value = mapper.get(d);
      sel.title = CHANNEL_HINTS[sel.value] || '';
      const dim = d;
      sel.addEventListener('change', () => {
        mapper.set(dim, sel.value);
        sel.title = CHANNEL_HINTS[sel.value] || '';
        this.app.renderer.clearPool();
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
        const sel = document.createElement('select');
        sel.className = 'rule-select';
        const editable = j >= i;
        sel.disabled = !editable;
        sel.setAttribute(
          'aria-label',
          editable
            ? `${RANK_LABELS[i]} vs ${RANK_LABELS[j]} collision rule`
            : `${RANK_LABELS[i]} vs ${RANK_LABELS[j]} (mirrors ${RANK_LABELS[j]} vs ${RANK_LABELS[i]})`,
        );
        COLLISION_TYPES.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t;
          opt.textContent = COLLISION_LABELS[t] || t.replace(/_/g, ' ');
          sel.appendChild(opt);
        });
        sel.value = this.app.collisionRules.getRule(i, j);
        sel.dataset.rule = `${i}-${j}`;
        if (editable) {
          const ri = i, rj = j;
          sel.addEventListener('change', () => {
            this.app.collisionRules.setRule(ri, rj, sel.value);
            const mirror = document.querySelector(`[data-rule="${rj}-${ri}"]`);
            if (mirror) mirror.value = sel.value;
          });
        }
        td.appendChild(sel);
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
    document.getElementById('play-btn').addEventListener('click', () => {
      this.app.isPlaying ? this.app.pause() : this.app.play();
    });
    document.getElementById('reset-btn').addEventListener('click', () => this.app.reset());
    document.getElementById('clear-btn')?.addEventListener('click', () => this.app.clearEntities());

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
      const val = parseInt(sizeSlider.value, 10);
      this.app.setGridSize(val);
      sizeVal.textContent = val;
      sizeSlider.setAttribute('aria-valuenow', val);
    });

    const dimSlider = document.getElementById('dim-slider');
    const dimVal = document.getElementById('dim-value');
    dimSlider.addEventListener('input', () => {
      const val = parseInt(dimSlider.value, 10);
      this.app.setDimensions(val);
      dimVal.textContent = val;
      dimSlider.setAttribute('aria-valuenow', val);
      this.rebuildSpanDimCheckboxes();
      this.rebuildDimMapping();
      this.setupSliceSliders();
    });
  }

  setupSliceSliders() {
    const container = document.getElementById('slice-sliders');
    container.innerHTML = '';
    const N = this.app.worldConfig.N;
    const size = this.app.worldConfig.size;
    const mapper = this.app.dimMapper;

    const sliceDims = [];
    for (let d = 0; d < N; d++) {
      if (mapper.get(d) === Channel.SLICE) sliceDims.push(d);
    }

    for (const d of sliceDims) {
      const group = document.createElement('div');
      group.className = 'control-group';
      const valSpan = document.createElement('span');
      valSpan.textContent = String(this.app.worldConfig.slicePos[d] ?? 0);
      group.innerHTML = `<label>Slice Dim ${d}: </label>`;
      group.querySelector('label').appendChild(valSpan);
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = 0;
      slider.max = size - 1;
      slider.value = this.app.worldConfig.slicePos[d] ?? 0;
      const dim = d;
      slider.addEventListener('input', () => {
        const v = parseInt(slider.value, 10);
        this.app.worldConfig.slicePos[dim] = v;
        valSpan.textContent = v;
        this.app.renderScene();
      });
      group.appendChild(slider);
      container.appendChild(group);
      if (this.app.worldConfig.slicePos[d] === undefined) {
        this.app.worldConfig.slicePos[d] = 0;
      }
    }
  }

  updateStats(stepCount, entityCount) {
    document.getElementById('step-count').textContent = stepCount;
    document.getElementById('entity-count').textContent = entityCount;
  }

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
      const idx = parseInt(sel.value, 10);
      if (!isNaN(idx) && PRESETS[idx]) {
        const preset = PRESETS[idx];
        this.app.loadPreset(preset);
        this.showPresetBlurb(preset);
        this.app.toast(`Loaded “${preset.name}” — hit Play`);
        sel.value = '';
      }
    });
  }

  syncFromApp() {
    const speedSlider = document.getElementById('speed-slider');
    const speedVal = document.getElementById('speed-value');
    if (speedSlider) {
      speedSlider.value = this.app.speed;
      speedVal.textContent = this.app.speed.toFixed(1);
    }

    const sizeSlider = document.getElementById('size-slider');
    const sizeVal = document.getElementById('size-value');
    if (sizeSlider) {
      sizeSlider.value = this.app.worldConfig.size;
      sizeVal.textContent = this.app.worldConfig.size;
    }

    const dimSlider = document.getElementById('dim-slider');
    const dimVal = document.getElementById('dim-value');
    if (dimSlider) {
      dimSlider.value = this.app.worldConfig.N;
      dimVal.textContent = this.app.worldConfig.N;
    }

    this.rebuildSpanDimCheckboxes();
    this.rebuildDimMapping();
    this.setupSliceSliders();
    this.rebuildCollisionTable();
    this.updatePlayButton();
  }

  rebuildCollisionTable() {
    const selects = document.querySelectorAll('[data-rule]');
    selects.forEach(sel => {
      const [i, j] = sel.dataset.rule.split('-').map(Number);
      sel.value = this.app.collisionRules.getRule(i, j);
    });
  }
}
