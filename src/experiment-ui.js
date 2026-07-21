// Experiment UI — tabs, mode panels, metrics, W-strip hyperspace view
import { CollisionType } from './collision-rules.js';
import { RANK_LABELS, rankHistogram, countOverlaps } from './entity-logic.js';
import {
  EXPERIMENTS,
  HYPER_DISPLAY_MODES,
  SURGERY_ECOLOGIES,
  CASCADE_RECIPES,
  buildDensityWorld,
  buildHyperBakeScenario,
} from './experiments.js';
import {
  RESEARCH_VIZ_MODES,
  buildResearchVizScenario,
  drawResearchViz,
} from './hyperspace-viz.js';

const RULE_OPTS = Object.values(CollisionType);
const RULE_SHORT = {
  PASS_THROUGH: 'Pass',
  ANNIHILATE: 'Annihilate',
  BOUNCE: 'Bounce',
  ABSORB: 'Absorb',
  REDIRECT: 'Redirect',
  MERGE: 'Merge',
};

export class ExperimentUI {
  constructor(app) {
    this.app = app;
    this.mode = 'playground';
    this.metrics = {
      meetingsLast: 0,
      meetingsTotal: 0,
      meetingsWindow: [],
      eventsByRule: {},
      cascadeEvents: 0,
    };

    // Density dials
    this.density = { size: 8, pointCount: 12, includePlane: true, includeVolume: false };

    // Hyper
    this.hyperModeId = 'tesseract';

    // Surgery
    this.surgeryEcoId = 'predator';
    this.surgeryFocusRule = CollisionType.ABSORB;

    // Cascades
    this.cascadeId = 'broom';
    this.weaveKnotted = false;

    // Research viz
    this.researchVizId = 'pca';

    this._buildTabs();
    this._buildPanels();
    this.setMode('playground', { silent: true });
  }

  _buildTabs() {
    const nav = document.getElementById('experiment-tabs');
    nav.innerHTML = '';
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', 'Experiment modes');

    EXPERIMENTS.forEach((exp, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'exp-tab';
      btn.setAttribute('role', 'tab');
      btn.id = `exp-tab-${exp.id}`;
      btn.dataset.mode = exp.id;
      btn.setAttribute('aria-selected', exp.id === 'playground' ? 'true' : 'false');
      btn.innerHTML = `<span class="exp-tab-label">${exp.label}</span><span class="exp-tab-short">${exp.short}</span>`;
      btn.title = exp.description;
      btn.addEventListener('click', () => this.setMode(exp.id));
      if (i === 0) btn.classList.add('is-active');
      nav.appendChild(btn);
    });
  }

  _buildPanels() {
    this.leftEl = document.getElementById('experiment-left');
    this.rightEl = document.getElementById('experiment-right');
    this.bannerEl = document.getElementById('experiment-banner');
    this.metricsEl = document.getElementById('metrics-bar');
    this.wStrip = document.getElementById('w-strip');
    this.wStripCtx = this.wStrip?.getContext('2d');
    this.researchCanvas = document.getElementById('research-viz');
  }

  setMode(mode, { silent = false } = {}) {
    const prev = this.mode;
    this.mode = mode;
    document.body.dataset.expMode = mode;

    document.querySelectorAll('.exp-tab').forEach(btn => {
      const on = btn.dataset.mode === mode;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    const playground = mode === 'playground';
    document.getElementById('playground-left').hidden = !playground;
    document.getElementById('playground-right').hidden = !playground;
    this.leftEl.hidden = playground;
    this.rightEl.hidden = playground;

    // Preset select mainly for playground
    const presetSel = document.getElementById('preset-select');
    if (presetSel) presetSel.hidden = !playground;

    this.resetMetrics();
    this._renderModeChrome();

    // Aux canvases toggle layout — force WebGL viewport to reflow
    requestAnimationFrame(() => {
      this.app.renderer?.resize?.();
      if (this.mode === 'research') this.drawResearch();
      if (this.mode === 'hyper') this.drawWStrip();
    });

    if (!silent && prev !== mode) {
      this._enterMode(mode);
    } else if (silent && mode !== 'playground') {
      this._enterMode(mode);
    }
  }

  _enterMode(mode) {
    this.app.pause();
    if (mode === 'density') this.runDensity();
    else if (mode === 'hyper') this.runHyper();
    else if (mode === 'surgery') this.runSurgery();
    else if (mode === 'cascades') this.runCascade();
    else if (mode === 'research') this.runResearch();
    else if (mode === 'playground') {
      this.app.reset();
      this.app.toast('Playground — full sandbox');
    }
  }

  resetMetrics() {
    this.metrics = {
      meetingsLast: 0,
      meetingsTotal: 0,
      meetingsWindow: [],
      eventsByRule: {},
      cascadeEvents: 0,
    };
  }

  onStepStats(stats) {
    if (!stats || this.mode === 'playground') {
      this._updateMetricsBar();
      return;
    }
    this.metrics.meetingsLast = stats.meetings || 0;
    this.metrics.meetingsTotal += stats.meetings || 0;
    this.metrics.meetingsWindow.push(stats.meetings || 0);
    if (this.metrics.meetingsWindow.length > 40) this.metrics.meetingsWindow.shift();

    for (const ev of stats.events || []) {
      this.metrics.eventsByRule[ev.rule] = (this.metrics.eventsByRule[ev.rule] || 0) + 1;
      if (ev.rule === 'MERGE' || ev.rule === 'ABSORB' || ev.rule === 'ANNIHILATE') {
        this.metrics.cascadeEvents++;
      }
    }
    this._updateMetricsBar();
    this._updateLiveReadout(stats);
    if (this._surgeryTally) this._surgeryTally();
    if (this.mode === 'hyper') this.drawWStrip();
    if (this.mode === 'research') this.drawResearch();
  }

  onRender() {
    if (this.mode === 'hyper') this.drawWStrip();
    if (this.mode === 'research') this.drawResearch();
    if (this.mode !== 'playground') this._updateMetricsBar();
  }

  _avgMeetings() {
    const w = this.metrics.meetingsWindow;
    if (!w.length) return 0;
    return w.reduce((a, b) => a + b, 0) / w.length;
  }

  _updateMetricsBar() {
    if (!this.metricsEl) return;
    if (this.mode === 'playground') {
      this.metricsEl.hidden = true;
      return;
    }
    this.metricsEl.hidden = false;
    const hist = rankHistogram(this.app.entities);
    const overlaps = countOverlaps(this.app.entities, this.app.worldConfig.N);
    const avg = this._avgMeetings();
    const band = this._densityBand(avg, overlaps);

    this.metricsEl.innerHTML = `
      <div class="metric"><span class="metric-label">Meetings/step</span><span class="metric-value">${this.metrics.meetingsLast}</span></div>
      <div class="metric"><span class="metric-label">Avg (40)</span><span class="metric-value">${avg.toFixed(2)}</span></div>
      <div class="metric"><span class="metric-label">Now overlapping</span><span class="metric-value">${overlaps}</span></div>
      <div class="metric"><span class="metric-label">Cascades</span><span class="metric-value">${this.metrics.cascadeEvents}</span></div>
      <div class="metric metric-wide"><span class="metric-label">Ranks</span>
        <span class="rank-pills">${hist.map((n, i) => n ? `<span class="rank-pill" title="${RANK_LABELS[i]}">${RANK_LABELS[i][0]}${n}</span>` : '').join('')}</span>
      </div>
      <div class="metric metric-band"><span class="density-band density-band--${band.id}">${band.label}</span></div>
    `;
  }

  _densityBand(avgMeetings, overlaps) {
    if (avgMeetings < 0.05 && overlaps === 0) return { id: 'empty', label: 'Too sparse — rules barely fire' };
    if (avgMeetings < 0.4) return { id: 'low', label: 'Sparse — rare meetings' };
    if (avgMeetings < 1.5) return { id: 'sweet', label: 'Sweet band — interactions readable' };
    if (avgMeetings < 4) return { id: 'busy', label: 'Busy — drama may blur' };
    return { id: 'sludge', label: 'Sludge — too many collisions' };
  }

  _updateLiveReadout(stats) {
    const el = document.getElementById('exp-live-readout');
    if (!el) return;
    const parts = [];
    if (stats.meetings) parts.push(`${stats.meetings} meeting${stats.meetings === 1 ? '' : 's'} this step`);
    const rules = {};
    for (const ev of stats.events || []) rules[ev.rule] = (rules[ev.rule] || 0) + 1;
    for (const [r, n] of Object.entries(rules)) parts.push(`${RULE_SHORT[r] || r}×${n}`);
    el.textContent = parts.length ? parts.join(' · ') : 'No meetings this step';
  }

  _renderModeChrome() {
    const exp = EXPERIMENTS.find(e => e.id === this.mode);
    if (this.bannerEl) {
      if (this.mode === 'playground') {
        this.bannerEl.hidden = true;
      } else {
        this.bannerEl.hidden = false;
        this.bannerEl.innerHTML = `
          <div class="exp-banner-text">
            <strong>${exp.label}</strong>
            <span>${exp.description}</span>
          </div>
          <div id="exp-live-readout" class="exp-live-readout">—</div>
        `;
      }
    }

    if (this.wStrip) {
      this.wStrip.hidden = this.mode !== 'hyper';
    }
    if (this.researchCanvas) {
      this.researchCanvas.hidden = this.mode !== 'research';
    }

    if (this.mode === 'playground') {
      this.leftEl.innerHTML = '';
      this.rightEl.innerHTML = '';
      return;
    }

    if (this.mode === 'density') this._renderDensityPanels();
    else if (this.mode === 'hyper') this._renderHyperPanels();
    else if (this.mode === 'surgery') this._renderSurgeryPanels();
    else if (this.mode === 'cascades') this._renderCascadePanels();
    else if (this.mode === 'research') this._renderResearchPanels();
  }

  // ─── Density ───────────────────────────────────────────────
  _renderDensityPanels() {
    const d = this.density;
    this.leftEl.innerHTML = `
      <h2>Density dials</h2>
      <p class="panel-hint">Turn one dial at a time. Look for the sweet band in the metrics bar — where absorb/merge are readable, not empty or sludge.</p>
      <div class="control-group">
        <label>Points: <span id="den-points-val">${d.pointCount}</span></label>
        <input type="range" id="den-points" min="2" max="40" value="${d.pointCount}">
      </div>
      <div class="control-group">
        <label>Grid size: <span id="den-size-val">${d.size}</span></label>
        <input type="range" id="den-size" min="4" max="16" value="${d.size}">
      </div>
      <label class="dim-checkbox"><input type="checkbox" id="den-plane" ${d.includePlane ? 'checked' : ''}> Include broom plane</label>
      <label class="dim-checkbox"><input type="checkbox" id="den-volume" ${d.includeVolume ? 'checked' : ''}> Include 4D volume (weather)</label>
      <div class="exp-actions">
        <button type="button" id="den-reroll" class="btn-primary">Reseed & Play</button>
      </div>
      <hr class="panel-divider">
      <h2>What to notice</h2>
      <ul class="exp-notes">
        <li>More points raise meetings; larger grid dilutes them.</li>
        <li>A plane is a density amplifier — it sweeps many fixed-dim agreements.</li>
        <li>A volume in 4D meets almost anyone sharing its W.</li>
      </ul>
    `;
    this.rightEl.innerHTML = `
      <h2>Guide</h2>
      <p class="panel-hint">Relative density is agreement on shared fixed dims — not “entities on screen.”</p>
      <div class="guide-card">
        <strong>Readable</strong>
        <p>You can predict a hit a few steps ahead, or narrate a cascade after it happens.</p>
      </div>
      <div class="guide-card">
        <strong>Too sparse</strong>
        <p>Rules never fire. Raise points or add a plane.</p>
      </div>
      <div class="guide-card">
        <strong>Sludge</strong>
        <p>Everything collides every step. Shrink count or grow the grid.</p>
      </div>
    `;

    const bind = () => {
      document.getElementById('den-points').oninput = (e) => {
        d.pointCount = +e.target.value;
        document.getElementById('den-points-val').textContent = d.pointCount;
      };
      document.getElementById('den-size').oninput = (e) => {
        d.size = +e.target.value;
        document.getElementById('den-size-val').textContent = d.size;
      };
      document.getElementById('den-plane').onchange = (e) => { d.includePlane = e.target.checked; };
      document.getElementById('den-volume').onchange = (e) => { d.includeVolume = e.target.checked; };
      document.getElementById('den-reroll').onclick = () => this.runDensity(true);
    };
    bind();
  }

  runDensity(play = true) {
    this.resetMetrics();
    const world = buildDensityWorld(this.density);
    this.app.loadScenario(world, { toast: `Density: ${this.density.pointCount} points · size ${this.density.size}` });
    if (play) this.app.play();
  }

  // ─── Hyper display ─────────────────────────────────────────
  _renderHyperPanels() {
    const modes = HYPER_DISPLAY_MODES.map(m => `
      <button type="button" class="display-mode-btn ${m.id === this.hyperModeId ? 'is-active' : ''}" data-hyper="${m.id}">
        <strong>${m.label}</strong>
        <span>${m.teaches}</span>
      </button>
    `).join('');

    const cur = HYPER_DISPLAY_MODES.find(m => m.id === this.hyperModeId);
    this.leftEl.innerHTML = `
      <h2>Display bake-off</h2>
      <p class="panel-hint">Identical 4D trajectories. Only the encoding of W changes. The strip below the view is pure W — hyperspace as a place.</p>
      <div class="display-mode-list">${modes}</div>
      <div class="guide-card" id="hyper-blurb">
        <strong>${cur.label}</strong> — teaches <em>${cur.teaches}</em>
        <p>${cur.blurb}</p>
      </div>
      <div class="exp-actions">
        <button type="button" id="hyper-replay" class="btn-primary">Replay scene</button>
      </div>
    `;
    this.rightEl.innerHTML = `
      <h2>Rubric</h2>
      <ul class="exp-notes">
        <li><strong>Position in W</strong> — can you tell who is “deep”?</li>
        <li><strong>Motion through W</strong> — can you feel travel, not just state?</li>
        <li><strong>Occupation of W</strong> — does a volume spanning XYZ but free on W read as weather?</li>
      </ul>
      <hr class="panel-divider">
      <h2>W-strip</h2>
      <p class="panel-hint">Each row is an entity. Dot = position on dim 3 (W). Volume is a thick bar — it occupies one W cell but fills XYZ.</p>
    `;

    this.leftEl.querySelectorAll('.display-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.hyperModeId = btn.dataset.hyper;
        this._applyHyperMode();
        this._renderModeChrome();
      });
    });
    document.getElementById('hyper-replay').onclick = () => this.runHyper();
  }

  runHyper() {
    this.resetMetrics();
    const scene = buildHyperBakeScenario();
    const mode = HYPER_DISPLAY_MODES.find(m => m.id === this.hyperModeId);
    scene.dimMapping = [...mode.dimMapping];
    if (mode.id === 'slice') scene.slicePos = [,,, Math.floor(scene.size / 2)];
    this.app.loadScenario(scene, { toast: `Hyper display: ${mode.label}` });
    // Ensure slice pos for slice mode
    if (mode.id === 'slice') {
      this.app.worldConfig.slicePos[3] = Math.floor(scene.size / 2);
    }
    this.app.play();
    this.drawWStrip();
  }

  _applyHyperMode() {
    const mode = HYPER_DISPLAY_MODES.find(m => m.id === this.hyperModeId);
    const mapper = this.app.dimMapper;
    for (let d = 0; d < mode.dimMapping.length; d++) {
      mapper.set(d, mode.dimMapping[d]);
    }
    if (mode.id === 'slice') {
      this.app.worldConfig.slicePos[3] = this.app.worldConfig.slicePos[3] ?? Math.floor(this.app.worldConfig.size / 2);
    }
    this.app.renderer.clearPool();
    this.app.renderScene();
    this.app.ui?.rebuildDimMapping?.();
    this.app.ui?.setupSliceSliders?.();
    this.app.toast(`Encoding: ${mode.label} — ${mode.teaches}`);
    this.drawWStrip();
  }

  drawWStrip() {
    const canvas = this.wStrip;
    const ctx = this.wStripCtx;
    if (!canvas || !ctx || this.mode !== 'hyper' || canvas.hidden) return;

    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 400;
    const h = 88;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = '100%';
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const size = this.app.worldConfig.size;
    const entities = this.app.entities;
    const pad = 28;
    const trackW = w - pad - 12;
    const rowH = Math.min(14, (h - 20) / Math.max(entities.length, 1));

    ctx.fillStyle = 'rgba(8, 10, 24, 0.95)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#6e7699';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('W →', pad, 12);
    ctx.fillText('0', pad, h - 4);
    ctx.fillText(String(size - 1), w - 18, h - 4);

    // grid ticks
    ctx.strokeStyle = 'rgba(76, 110, 245, 0.15)';
    for (let i = 0; i < size; i++) {
      const x = pad + (i / Math.max(size - 1, 1)) * trackW;
      ctx.beginPath();
      ctx.moveTo(x, 16);
      ctx.lineTo(x, h - 10);
      ctx.stroke();
    }

    entities.forEach((ent, i) => {
      const y = 18 + i * rowH + rowH / 2;
      const wv = ent.pos[3] ?? 0;
      const prev = (ent.prevPos && ent.prevPos[3] != null) ? ent.prevPos[3] : wv;
      // use current (post-step) — strip updates each render with interp would need t; use pos
      const x = pad + (wv / Math.max(size - 1, 1)) * trackW;
      const x0 = pad + (prev / Math.max(size - 1, 1)) * trackW;

      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(pad + trackW, y);
      ctx.stroke();

      const c = ent.color;
      const col = `rgb(${Math.round(c[0]*255)},${Math.round(c[1]*255)},${Math.round(c[2]*255)})`;

      if (ent.rank >= 3) {
        // volume: thick mark at W
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x - 5, y - rowH * 0.4, 10, rowH * 0.8);
        ctx.globalAlpha = 1;
      } else if (ent.rank === 1 && ent.spanDims.includes(3)) {
        // line spanning W: full track
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pad, y);
        ctx.lineTo(pad + trackW, y);
        ctx.stroke();
      } else {
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x, y, ent.rank === 0 ? 3.5 : 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // ─── Surgery ───────────────────────────────────────────────
  _renderSurgeryPanels() {
    const eco = SURGERY_ECOLOGIES.find(e => e.id === this.surgeryEcoId);
    const [ra, rb] = eco.focusPair;
    const ecoOpts = SURGERY_ECOLOGIES.map(e =>
      `<option value="${e.id}" ${e.id === this.surgeryEcoId ? 'selected' : ''}>${e.name}</option>`
    ).join('');
    const ruleOpts = RULE_OPTS.map(r =>
      `<option value="${r}" ${r === this.surgeryFocusRule ? 'selected' : ''}>${RULE_SHORT[r]}</option>`
    ).join('');

    this.leftEl.innerHTML = `
      <h2>Interaction surgery</h2>
      <p class="panel-hint">Density stays fixed. Only one rule pair changes. Watch which single cell flips the story.</p>
      <div class="control-group">
        <label>Ecology</label>
        <select id="surg-eco">${ecoOpts}</select>
      </div>
      <div class="guide-card">
        <strong>Hypothesis</strong>
        <p>${eco.hypothesis}</p>
      </div>
      <div class="control-group">
        <label>Focus pair: ${RANK_LABELS[ra]} ↔ ${RANK_LABELS[rb]}</label>
        <select id="surg-rule">${ruleOpts}</select>
      </div>
      <div class="exp-actions">
        <button type="button" id="surg-apply" class="btn-primary">Apply rule & Replay</button>
      </div>
      <hr class="panel-divider">
      <h2>Event tally</h2>
      <div id="surg-tally" class="exp-tally">Play to collect events.</div>
    `;
    this.rightEl.innerHTML = `
      <h2>Story flips</h2>
      <ul class="exp-notes">
        <li><strong>Stable loop</strong> — population oscillates</li>
        <li><strong>Extinction</strong> — board empties</li>
        <li><strong>Monopoly</strong> — one high rank remains</li>
        <li><strong>Escalation</strong> — ranks climb via merge</li>
      </ul>
      <p class="panel-hint">Change the focus rule, replay, and name the outcome. High-leverage pairs usually involve a mid/high rank broom or same-rank annihilation.</p>
    `;

    document.getElementById('surg-eco').onchange = (e) => {
      this.surgeryEcoId = e.target.value;
      const eco2 = SURGERY_ECOLOGIES.find(x => x.id === this.surgeryEcoId);
      const scene = eco2.build();
      this.surgeryFocusRule = scene.rules[eco2.focusPair[0]][eco2.focusPair[1]];
      this._renderModeChrome();
      this.runSurgery();
    };
    document.getElementById('surg-rule').onchange = (e) => {
      this.surgeryFocusRule = e.target.value;
    };
    document.getElementById('surg-apply').onclick = () => this.runSurgery();
  }

  runSurgery() {
    this.resetMetrics();
    const eco = SURGERY_ECOLOGIES.find(e => e.id === this.surgeryEcoId);
    const scene = eco.build();
    const [ra, rb] = eco.focusPair;
    scene.rules[ra][rb] = this.surgeryFocusRule;
    scene.rules[rb][ra] = this.surgeryFocusRule;
    this.app.loadScenario(scene, {
      toast: `${eco.name}: ${RANK_LABELS[ra]}↔${RANK_LABELS[rb]} = ${RULE_SHORT[this.surgeryFocusRule]}`,
    });
    this.app.play();

    // live tally updater via interval-ish — refresh on metrics
    const tally = document.getElementById('surg-tally');
    if (tally) {
      const obs = () => {
        const entries = Object.entries(this.metrics.eventsByRule);
        tally.innerHTML = entries.length
          ? entries.map(([r, n]) => `<div><strong>${RULE_SHORT[r] || r}</strong> ${n}</div>`).join('')
          : 'Play to collect events.';
      };
      this._surgeryTally = obs;
    }
  }

  // ─── Cascades ──────────────────────────────────────────────
  _renderCascadePanels() {
    const cards = CASCADE_RECIPES.map(r => `
      <button type="button" class="cascade-card ${r.id === this.cascadeId ? 'is-active' : ''}" data-cascade="${r.id}">
        <strong>${r.name}</strong>
        <span class="cascade-claim">${r.claim}</span>
        <span class="cascade-topo">${r.topology}</span>
      </button>
    `).join('');

    const recipe = CASCADE_RECIPES.find(r => r.id === this.cascadeId);
    this.leftEl.innerHTML = `
      <h2>Cascade lab</h2>
      <p class="panel-hint">Each recipe is a claim. Hit Play and check whether the success criterion holds.</p>
      <div class="cascade-list">${cards}</div>
      ${recipe.id === 'weave-knot' ? `
        <label class="dim-checkbox" style="margin-top:10px">
          <input type="checkbox" id="weave-knot-toggle" ${this.weaveKnotted ? 'checked' : ''}>
          Knot mode (line↔line → merge)
        </label>
      ` : ''}
      <div class="exp-actions">
        <button type="button" id="cascade-run" class="btn-primary">Run claim</button>
      </div>
    `;
    this.rightEl.innerHTML = `
      <h2>${recipe.name}</h2>
      <div class="guide-card">
        <strong>Claim</strong>
        <p>${recipe.claim}</p>
      </div>
      <div class="guide-card">
        <strong>Hypothesis</strong>
        <p>${recipe.hypothesis}</p>
      </div>
      <div class="guide-card guide-card--success">
        <strong>Success looks like</strong>
        <p>${recipe.success}</p>
      </div>
      <p class="panel-hint">Topology: ${recipe.topology}</p>
    `;

    this.leftEl.querySelectorAll('.cascade-card').forEach(btn => {
      btn.addEventListener('click', () => {
        this.cascadeId = btn.dataset.cascade;
        this._renderModeChrome();
        this.runCascade();
      });
    });
    const knot = document.getElementById('weave-knot-toggle');
    if (knot) {
      knot.onchange = (e) => {
        this.weaveKnotted = e.target.checked;
        this.runCascade();
      };
    }
    document.getElementById('cascade-run').onclick = () => this.runCascade();
  }

  runCascade() {
    this.resetMetrics();
    const recipe = CASCADE_RECIPES.find(r => r.id === this.cascadeId);
    const scene = recipe.id === 'weave-knot'
      ? recipe.build(this.weaveKnotted)
      : recipe.build();
    this.app.loadScenario(scene, { toast: `Cascade: ${recipe.name}` });
    this.app.ui?.showPresetBlurb?.({ name: recipe.name, description: recipe.hypothesis });
    this.app.play();
  }

  // ─── Research viz (conventional high-D / LLM-style) ────────
  _renderResearchPanels() {
    const modes = RESEARCH_VIZ_MODES.map(m => `
      <button type="button" class="display-mode-btn ${m.id === this.researchVizId ? 'is-active' : ''}" data-rviz="${m.id}">
        <strong>${m.label}</strong>
        <span>${m.family}</span>
      </button>
    `).join('');
    const cur = RESEARCH_VIZ_MODES.find(m => m.id === this.researchVizId);

    this.leftEl.innerHTML = `
      <h2>Research visualizations</h2>
      <p class="panel-hint">Techniques used in high-D data viz and LLM latent-space work. The 3D view still runs; the panel below is the projection lab.</p>
      <div class="display-mode-list">${modes}</div>
      <div class="guide-card">
        <strong>${cur.label}</strong>
        <p>${cur.blurb}</p>
        <p class="panel-hint" style="margin:8px 0 0">${cur.cite}</p>
      </div>
      <div class="exp-actions">
        <button type="button" id="rviz-replay" class="btn-primary">Reseed clusters & Play</button>
      </div>
    `;
    this.rightEl.innerHTML = `
      <h2>How to read</h2>
      <ul class="exp-notes">
        <li><strong>PCA</strong> — global variance axes; clusters separate if dims differ in spread.</li>
        <li><strong>Neighbor embed</strong> — local N-D neighbors stay close in 2D (UMAP/t-SNE spirit).</li>
        <li><strong>Parallel coords</strong> — follow a colored line across dims; crossing bundles = structure.</li>
        <li><strong>SPLOM</strong> — which dim pairs show the two color clusters?</li>
        <li><strong>Affinity</strong> — bright cells = close in full hyperspace (attention-matrix energy).</li>
        <li><strong>Radar</strong> — glyph per entity; compare spoke shapes across ranks.</li>
      </ul>
      <hr class="panel-divider">
      <div class="guide-card">
        <strong>Scene</strong>
        <p>Two clusters in 5D (blue vs coral) plus bridges moving on hyper dims — built so DR methods have something to reveal.</p>
      </div>
    `;

    this.leftEl.querySelectorAll('.display-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.researchVizId = btn.dataset.rviz;
        this._renderModeChrome();
        this.drawResearch();
        const m = RESEARCH_VIZ_MODES.find(x => x.id === this.researchVizId);
        this.app.toast(`Research viz: ${m.label}`);
      });
    });
    document.getElementById('rviz-replay').onclick = () => this.runResearch();
  }

  runResearch() {
    this.resetMetrics();
    const scene = buildResearchVizScenario();
    this.app.loadScenario(scene, { toast: 'Research viz — 5D clustered cloud' });
    this.app.play();
    this.drawResearch();
  }

  drawResearch() {
    if (this.mode !== 'research' || !this.researchCanvas) return;
    drawResearchViz(this.researchCanvas, {
      mode: this.researchVizId,
      entities: this.app.entities,
      N: this.app.worldConfig.N,
      size: this.app.worldConfig.size,
      t: this.app._t ?? 1,
    });
  }
}
