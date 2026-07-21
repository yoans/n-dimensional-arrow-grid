// Three.js Renderer — span dims fill the grid; free dims localize & move
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Channel, DimMapper } from './dim-mapper.js';

/** Thickness on free spatial axes so planes/volumes stay visible as slabs. */
const FREE_THICKNESS = 0.1;

export class Renderer {
  constructor(container) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a18);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.camera.position.set(8, 8, 8);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(10, 15, 10);
    this.scene.add(dir);

    this.gridHelper = null;
    this.boundaryBox = null;
    this.pool = new Map();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.gridPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this._tmpColor = new THREE.Color();
    this._worldSize = 8;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._rafId = 0;
    this._startRenderLoop();
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _startRenderLoop() {
    const tick = () => {
      this._rafId = requestAnimationFrame(tick);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  updateGrid(size) {
    const max = size - 1;
    const center = max / 2;

    if (this.gridHelper) this.scene.remove(this.gridHelper);
    this.gridHelper = new THREE.GridHelper(max, size - 1, 0x2a3070, 0x1a2050);
    this.gridHelper.position.set(center, 0, center);
    this.scene.add(this.gridHelper);

    if (this.boundaryBox) this.scene.remove(this.boundaryBox);
    const boxGeo = new THREE.BoxGeometry(max, max, max);
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x4c6ef5, transparent: true, opacity: 0.3 });
    this.boundaryBox = new THREE.LineSegments(edgesGeo, edgesMat);
    this.boundaryBox.position.set(center, center, center);
    this.scene.add(this.boundaryBox);
    boxGeo.dispose();

    this._worldSize = size;

    const d = size * 1.2;
    this.camera.position.set(d, d * 0.8, d);
    this.controls.target.set(center, center, center);
    this.controls.update();
  }

  /**
   * For each display axis X/Y/Z: span dims → full [0, max]; free dims → point at pos.
   */
  _spatialExtents(ent, pos, size, dimMapper) {
    const max = size - 1;
    const lo = [0, 0, 0];
    const hi = [0, 0, 0];
    const axes = [Channel.X, Channel.Y, Channel.Z];

    for (let a = 0; a < 3; a++) {
      const d = dimMapper ? dimMapper.dimFor(axes[a]) : a;
      if (d < 0) {
        lo[a] = hi[a] = max / 2;
      } else if (ent.spanDims.includes(d)) {
        lo[a] = 0;
        hi[a] = max;
      } else {
        const p = pos[d] ?? 0;
        lo[a] = p;
        hi[a] = p;
      }
    }
    return { lo, hi, max };
  }

  /**
   * Place entity geometry from span/free extents. SIZE channel scales the root;
   * tesseract (when free) pulls the whole body toward/away from grid center.
   */
  _layoutEntity(obj, ent, pos, size, dimMapper, sizeChannel = 1) {
    const { lo, hi, max } = this._spatialExtents(ent, pos, size, dimMapper);
    const cx = (lo[0] + hi[0]) / 2;
    const cy = (lo[1] + hi[1]) / 2;
    const cz = (lo[2] + hi[2]) / 2;

    // Tesseract: only when that dim is free (entity moves through it, not spanning it)
    let px = cx, py = cy, pz = cz;
    const tessDim = dimMapper ? dimMapper.dimFor(Channel.TESSERACT) : -1;
    const tessIsFree = tessDim >= 0 && !ent.spanDims.includes(tessDim);
    if (tessIsFree && dimMapper) {
      const tv = dimMapper.tesseractValue(pos, size);
      if (tv !== null) {
        const center = max / 2;
        const s = 0.4 + tv * 0.6;
        px = center + (cx - center) * s;
        py = center + (cy - center) * s;
        pz = center + (cz - center) * s;
      }
    }

    obj.position.set(px, py, pz);
    // SIZE channel on the root; body mesh carries span extents in local scale
    obj.scale.set(sizeChannel, sizeChannel, sizeChannel);

    const kind = obj.userData.kind;

    if (kind === 'point') {
      // sphere sits at the free-dim coordinate (already in obj.position)
      return;
    }

    if (kind === 'line') {
      const line = obj.userData.body;
      const positions = line.geometry.attributes.position;
      // Endpoints relative to center
      positions.setXYZ(0, lo[0] - cx, lo[1] - cy, lo[2] - cz);
      positions.setXYZ(1, hi[0] - cx, hi[1] - cy, hi[2] - cz);
      positions.needsUpdate = true;
      line.geometry.computeBoundingSphere();

      // If the only span is a non-spatial (e.g. TESSERACT), draw radial inner→outer
      if (tessDim >= 0 && ent.spanDims.includes(tessDim) && ent.spanDims.length === 1) {
        const center = max / 2;
        // Free spatial position is (cx,cy,cz) before tess — use entity's spatial free coords
        const sx = cx === center && cy === center && cz === center ? center + 1 : cx;
        const sy = cy;
        const sz = cz;
        const dx = sx - center, dy = sy - center, dz = sz - center;
        const len = Math.hypot(dx, dy, dz) || 1;
        const ux = dx / len, uy = dy / len, uz = dz / len;
        // Local to obj at grid-center projection of free point
        obj.position.set(sx, sy, sz);
        const inner = 0.4 * len;
        const outer = 1.0 * len;
        // Points relative to (sx,sy,sz): along unit radial from center
        // position on ray at distance r from center: center + r*u
        // relative to sx: (center + r*u) - (center + len*u) = (r - len)*u
        positions.setXYZ(0, (inner - len) * ux, (inner - len) * uy, (inner - len) * uz);
        positions.setXYZ(1, (outer - len) * ux, (outer - len) * uy, (outer - len) * uz);
        positions.needsUpdate = true;
      }
      return;
    }

    // Plane / volume / hyper — unit box scaled to extents
    const body = obj.userData.body;
    let sx = hi[0] - lo[0];
    let sy = hi[1] - lo[1];
    let sz = hi[2] - lo[2];
    // Free axes need a little thickness so slabs remain visible
    if (sx < FREE_THICKNESS) sx = FREE_THICKNESS;
    if (sy < FREE_THICKNESS) sy = FREE_THICKNESS;
    if (sz < FREE_THICKNESS) sz = FREE_THICKNESS;
    body.scale.set(sx, sy, sz);

    // Hyper spanning TESSERACT: show inner ghost cube (fills the 4th dim)
    const ghost = obj.userData.tessGhost;
    if (ghost) {
      const showGhost = tessDim >= 0 && ent.spanDims.includes(tessDim);
      ghost.visible = showGhost;
      if (showGhost) {
        ghost.scale.set(sx * 0.4, sy * 0.4, sz * 0.4);
      }
    }
  }

  updateScene(entities, worldConfig, t = 1, dimMapper = null) {
    const size = worldConfig.size;
    const N = worldConfig.N;
    const slicePos = worldConfig.slicePos || [];
    const currentIds = new Set();
    const ease = t;

    for (const ent of entities) {
      currentIds.add(ent.id);

      const prev = ent.prevPos || ent.pos;
      const interpPos = DimMapper.lerpPos(prev, ent.pos, ease);

      let sliceAlpha = 1;
      if (dimMapper) {
        sliceAlpha = dimMapper.sliceFactor(interpPos, slicePos);
      } else {
        for (let d = 3; d < N; d++) {
          if (slicePos[d] === undefined) continue;
          const dist = Math.abs((interpPos[d] || 0) - slicePos[d]);
          if (dist > 0.5) sliceAlpha *= Math.max(0, 1 - (dist - 0.5) * 2);
        }
      }

      let obj = this.pool.get(ent.id);
      if (!obj) {
        obj = this._createMesh(ent);
        this.pool.set(ent.id, obj);
        this.scene.add(obj);
      }

      let sizeChannel = 1;
      if (dimMapper) {
        const sv = dimMapper.sizeValue(interpPos, size);
        // SIZE only applies when that dim is free (moving through it), not spanned
        const sizeDim = dimMapper.dimFor(Channel.SIZE);
        if (sv !== null && sizeDim >= 0 && !ent.spanDims.includes(sizeDim)) {
          sizeChannel = sv;
        }
      }

      this._layoutEntity(obj, ent, interpPos, size, dimMapper, sizeChannel);
      obj.visible = sliceAlpha > 0.001;

      const color = this._tmpColor;
      if (dimMapper) {
        const hueDim = dimMapper.dimFor(Channel.HUE);
        const hv = dimMapper.hueValue(interpPos, size);
        // Hue animates when free; if spanned, keep entity color (occupies all hues)
        if (hv !== null && hueDim >= 0 && !ent.spanDims.includes(hueDim)) {
          color.setHSL(hv, 0.8, 0.55);
        } else {
          color.setRGB(ent.color[0], ent.color[1], ent.color[2]);
        }
      } else {
        color.setRGB(ent.color[0], ent.color[1], ent.color[2]);
      }

      let channelOpacity = null;
      if (dimMapper) {
        const opDim = dimMapper.dimFor(Channel.OPACITY);
        const ov = dimMapper.opacityValue(interpPos, size);
        if (ov !== null && opDim >= 0 && !ent.spanDims.includes(opDim)) {
          channelOpacity = ov;
        }
      }
      if (channelOpacity !== null || sliceAlpha < 1) {
        const base = channelOpacity !== null ? channelOpacity : (obj.userData.defaultOpacity ?? 1);
        this._setMaterialOpacity(obj, base * sliceAlpha);
      } else {
        this._setMaterialOpacity(obj, null);
      }

      this._setColor(obj, color);
    }

    for (const [id, obj] of this.pool) {
      if (!currentIds.has(id)) {
        if (obj.userData.removing) {
          const elapsed = (performance.now() - obj.userData.removeStart) / 300;
          const s = Math.max(0, 1 - elapsed);
          obj.scale.set(s, s, s);
          if (s <= 0) {
            this.scene.remove(obj);
            this._disposeObj(obj);
            this.pool.delete(id);
          }
        } else {
          obj.userData.removing = true;
          obj.userData.removeStart = performance.now();
        }
      }
    }
  }

  _setColor(obj, color) {
    if (obj.material?.color) obj.material.color.copy(color);
    obj.traverse(child => {
      if (child.material?.color) child.material.color.copy(color);
    });
  }

  _stampDefault(mat, opacity) {
    mat.userData = mat.userData || {};
    mat.userData.defaultOpacity = opacity;
  }

  _createMesh(entity) {
    const color = new THREE.Color(entity.color[0], entity.color[1], entity.color[2]);
    const rank = entity.rank;

    if (rank === 0) {
      const geo = new THREE.SphereGeometry(0.15, 16, 16);
      const mat = new THREE.MeshPhongMaterial({ color });
      this._stampDefault(mat, 1);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.kind = 'point';
      mesh.userData.defaultOpacity = 1;
      mesh.material = mat;
      return mesh;
    }

    if (rank === 1) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.5, 0, 0),
        new THREE.Vector3(0.5, 0, 0),
      ]);
      const mat = new THREE.LineBasicMaterial({ color });
      this._stampDefault(mat, 1);
      const line = new THREE.Line(geo, mat);
      const group = new THREE.Group();
      group.add(line);
      group.userData.kind = 'line';
      group.userData.body = line;
      group.userData.defaultOpacity = 1;
      group.material = mat;
      return group;
    }

    // Plane (2), Volume (3), Hyper (4+) — unit box, scaled each frame to span extents
    const opacity = rank >= 3 ? 0.1 : 0.28;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this._stampDefault(mat, opacity);
    const mesh = new THREE.Mesh(geo, mat);

    const group = new THREE.Group();
    group.add(mesh);
    group.userData.kind = rank >= 3 ? 'volume' : 'plane';
    group.userData.body = mesh;
    group.userData.defaultOpacity = opacity;
    group.material = mat;

    if (rank >= 3) {
      const wireGeo = new THREE.EdgesGeometry(geo);
      const wireMat = new THREE.LineBasicMaterial({ color });
      this._stampDefault(wireMat, 1);
      const wire = new THREE.LineSegments(wireGeo, wireMat);
      mesh.add(wire);
    }

    if (rank >= 4) {
      // Inner ghost for tesseract-span hypersolids
      const ghostGeo = new THREE.BoxGeometry(1, 1, 1);
      const ghostEdges = new THREE.EdgesGeometry(ghostGeo);
      const ghostMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.55,
      });
      this._stampDefault(ghostMat, 0.55);
      const ghost = new THREE.LineSegments(ghostEdges, ghostMat);
      ghost.visible = false;
      group.add(ghost);
      group.userData.tessGhost = ghost;
      ghostGeo.dispose();
    }

    return group;
  }

  raycastToGrid(clientX, clientY, size) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.gridPlane, target);

    if (target) {
      const gx = Math.round(target.x);
      const gy = 0;
      const gz = Math.round(target.z);
      if (gx >= 0 && gx < size && gz >= 0 && gz < size) {
        return { x: gx, y: gy, z: gz };
      }
    }
    return null;
  }

  clearPool() {
    for (const [, obj] of this.pool) {
      this.scene.remove(obj);
      this._disposeObj(obj);
    }
    this.pool.clear();
  }

  _disposeObj(obj) {
    obj.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
  }

  _setMaterialOpacity(obj, opacity) {
    const apply = (mat) => {
      if (!mat) return;
      if (opacity !== null) {
        mat.transparent = true;
        mat.opacity = opacity;
      } else {
        mat.opacity = mat.userData?.defaultOpacity ?? 1.0;
        mat.transparent = mat.opacity < 1;
      }
    };

    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(apply);
      else apply(obj.material);
    }
    if (obj.children) {
      obj.traverse(child => {
        if (child.material) apply(child.material);
      });
    }
  }
}
