// Three.js Renderer — 3D scene with per-rank geometry and slice filtering
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DimMapper } from './dim-mapper.js';

export class Renderer {
  constructor(container) {
    this.container = container;

    // Three.js basics
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

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(10, 15, 10);
    this.scene.add(dir);

    // Grid helper + boundary box
    this.gridHelper = null;
    this.boundaryBox = null;

    // Object pool: entity id → THREE.Object3D
    this.pool = new Map();

    // Raycasting
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.gridPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Start render loop (controls + render only)
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

  /**
   * Rebuild the grid helper when world size changes.
   */
  updateGrid(size) {
    const max = size - 1;
    const center = max / 2;

    // Floor grid
    if (this.gridHelper) this.scene.remove(this.gridHelper);
    this.gridHelper = new THREE.GridHelper(max, size - 1, 0x2a3070, 0x1a2050);
    this.gridHelper.position.set(center, 0, center);
    this.scene.add(this.gridHelper);

    // 3D boundary wireframe box from (0,0,0) to (max,max,max)
    if (this.boundaryBox) this.scene.remove(this.boundaryBox);
    const boxGeo = new THREE.BoxGeometry(max, max, max);
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x4c6ef5, transparent: true, opacity: 0.3 });
    this.boundaryBox = new THREE.LineSegments(edgesGeo, edgesMat);
    this.boundaryBox.position.set(center, center, center);
    this.scene.add(this.boundaryBox);
    boxGeo.dispose();

    this._worldSize = size;

    // Reposition camera to see the whole grid
    const d = size * 1.2;
    this.camera.position.set(d, d * 0.8, d);
    this.controls.target.set(center, center, center);
    this.controls.update();
  }

  /**
   * Full scene update — diffs entity list, lerps ALL dimensions based on t (0→1).
   * Spatial XYZ, hue, size, opacity, and tesseract all animate from prevPos→pos.
   */
  updateScene(entities, worldConfig, t = 1, dimMapper = null) {
    const size = worldConfig.size;
    const N = worldConfig.N;
    const slicePos = worldConfig.slicePos || [];
    const currentIds = new Set();
    const ease = t; // already eased by caller when needed

    // Reused scratch to avoid per-frame Color allocations
    if (!this._tmpColor) this._tmpColor = new THREE.Color();

    for (const ent of entities) {
      currentIds.add(ent.id);

      // Interpolate the full N-D state so non-XYZ channels animate smoothly
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
        obj = this._createMesh(ent, size);
        this.pool.set(ent.id, obj);
        this.scene.add(obj);
      }

      // Spatial position from interpolated coords
      let lx, ly, lz;
      if (dimMapper) {
        const p = dimMapper.spatial3D(interpPos);
        lx = p[0]; ly = p[1]; lz = p[2];
      } else {
        lx = interpPos[0] || 0;
        ly = interpPos[1] || 0;
        lz = interpPos[2] || 0;
      }

      // Tesseract: smoothly pull toward/away from grid center
      if (dimMapper) {
        const tv = dimMapper.tesseractValue(interpPos, size);
        if (tv !== null) {
          const center = (size - 1) / 2;
          const scale = 0.4 + tv * 0.6;
          obj.position.set(
            center + (lx - center) * scale,
            center + (ly - center) * scale,
            center + (lz - center) * scale,
          );
        } else {
          obj.position.set(lx, ly, lz);
        }
      } else {
        obj.position.set(lx, ly, lz);
      }

      obj.visible = sliceAlpha > 0.001;

      // --- Visual channels (all driven by interpPos) ---
      const color = this._tmpColor;
      if (dimMapper) {
        const hv = dimMapper.hueValue(interpPos, size);
        if (hv !== null) {
          color.setHSL(hv, 0.8, 0.55);
        } else {
          color.setRGB(ent.color[0], ent.color[1], ent.color[2]);
        }
      } else {
        color.setRGB(ent.color[0], ent.color[1], ent.color[2]);
      }

      let scaleVal = 1;
      if (dimMapper) {
        const sv = dimMapper.sizeValue(interpPos, size);
        if (sv !== null) scaleVal = sv;
      }
      obj.scale.set(scaleVal, scaleVal, scaleVal);

      // Opacity = channel opacity × soft slice fade
      let channelOpacity = null;
      if (dimMapper) {
        channelOpacity = dimMapper.opacityValue(interpPos, size);
      }
      if (channelOpacity !== null || sliceAlpha < 1) {
        const base = channelOpacity !== null ? channelOpacity : (obj.userData.defaultOpacity ?? 1);
        this._setMaterialOpacity(obj, base * sliceAlpha);
      } else {
        this._setMaterialOpacity(obj, null);
      }

      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.color.copy(color));
        } else {
          obj.material.color.copy(color);
        }
      }
      if (obj.children) {
        obj.traverse(child => {
          if (child.material && child.material.color) {
            child.material.color.copy(color);
          }
        });
      }
    }

    // Mark removed objects for fade-out
    for (const [id, obj] of this.pool) {
      if (!currentIds.has(id)) {
        if (obj.userData.removing) {
          // Already fading — advance based on time
          const elapsed = (performance.now() - obj.userData.removeStart) / 300; // 300ms fade
          const s = Math.max(0, 1 - elapsed);
          obj.scale.set(s, s, s);
          if (s <= 0) {
            this.scene.remove(obj);
            this._disposeObj(obj);
            this.pool.delete(id);
          }
        } else {
          // Start fade-out
          obj.userData.removing = true;
          obj.userData.removeStart = performance.now();
        }
      }
    }
  }

  _createMesh(entity, size) {
    const color = new THREE.Color(entity.color[0], entity.color[1], entity.color[2]);
    const stampDefault = (mat, opacity) => {
      mat.userData = mat.userData || {};
      mat.userData.defaultOpacity = opacity;
    };

    switch (entity.rank) {
      case 0: { // Point — sphere
        const geo = new THREE.SphereGeometry(0.15, 16, 16);
        const mat = new THREE.MeshPhongMaterial({ color });
        stampDefault(mat, 1);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData.defaultOpacity = 1;
        return mesh;
      }
      case 1: { // Line — spans full grid (0 to size-1) along span axis
        const dim = entity.spanDims[0];
        const max = size - 1;
        // Endpoints in local space (offset from entity position)
        const s = [0, 0, 0];
        const e = [0, 0, 0];
        if (dim < 3) {
          s[dim] = -entity.pos[dim];
          e[dim] = max - entity.pos[dim];
        }
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(s[0], s[1], s[2]),
          new THREE.Vector3(e[0], e[1], e[2]),
        ]);
        const mat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
        stampDefault(mat, 1);
        const line = new THREE.Line(geo, mat);
        line.userData.defaultOpacity = 1;
        return line;
      }
      case 2: { // Plane — semi-transparent, spans 0→size-1 in both span dims
        const max = size - 1;
        const geo = new THREE.PlaneGeometry(max, max);
        const mat = new THREE.MeshPhongMaterial({
          color,
          transparent: true,
          opacity: 0.25,
          side: THREE.DoubleSide,
        });
        stampDefault(mat, 0.25);
        const mesh = new THREE.Mesh(geo, mat);
        const spans = entity.spanDims;
        const mid = max / 2;
        // Use a group so updateScene positions the group, child mesh has local offset
        const group = new THREE.Group();
        if (spans.includes(0) && spans.includes(2)) {
          mesh.rotation.x = -Math.PI / 2;
          mesh.position.set(mid - entity.pos[0], 0, mid - (entity.pos[2] || 0));
        } else if (spans.includes(1) && spans.includes(2)) {
          mesh.rotation.y = Math.PI / 2;
          mesh.position.set(0, mid - entity.pos[1], mid - (entity.pos[2] || 0));
        } else if (spans.includes(0) && spans.includes(1)) {
          mesh.position.set(mid - entity.pos[0], mid - entity.pos[1], 0);
        }
        group.add(mesh);
        // Expose material for color updates
        group.material = mat;
        group.userData.defaultOpacity = 0.25;
        return group;
      }
      case 3: { // Volume — wireframe + translucent fill spanning full grid
        const max = size - 1;
        const mid = max / 2;
        const geo = new THREE.BoxGeometry(max, max, max);
        const mat = new THREE.MeshPhongMaterial({
          color,
          transparent: true,
          opacity: 0.08,
          side: THREE.DoubleSide,
        });
        stampDefault(mat, 0.08);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(mid - entity.pos[0], mid - entity.pos[1], mid - (entity.pos[2] || 0));

        const wireGeo = new THREE.EdgesGeometry(geo);
        const wireMat = new THREE.LineBasicMaterial({ color });
        stampDefault(wireMat, 1);
        const wire = new THREE.LineSegments(wireGeo, wireMat);
        mesh.add(wire);

        // Wrap in group so updateScene positions the group
        const group = new THREE.Group();
        group.add(mesh);
        group.material = mat;
        group.userData.defaultOpacity = 0.08;
        return group;
      }
      default: {
        const geo = new THREE.SphereGeometry(0.15, 16, 16);
        const mat = new THREE.MeshPhongMaterial({ color });
        stampDefault(mat, 1);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData.defaultOpacity = 1;
        return mesh;
      }
    }
  }

  /**
   * Raycast from screen coords to grid plane, return snapped grid position.
   */
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

  /**
   * Clear all pooled objects.
   */
  clearPool() {
    for (const [id, obj] of this.pool) {
      this.scene.remove(obj);
      this._disposeObj(obj);
    }
    this.pool.clear();
  }

  /**
   * Dispose geometry and materials for an object and its children.
   */
  _disposeObj(obj) {
    obj.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
  }

  /**
   * Set opacity on an object's material(s). Pass null to reset to default.
   */
  _setMaterialOpacity(obj, opacity) {
    const apply = (mat, defaultOpacity) => {
      if (!mat) return;
      if (opacity !== null) {
        mat.transparent = true;
        mat.opacity = opacity;
      } else {
        // Restore default (stored or 1.0)
        mat.opacity = mat.userData?.defaultOpacity ?? defaultOpacity ?? 1.0;
        mat.transparent = mat.opacity < 1;
      }
    };

    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => apply(m, 1.0));
      } else {
        apply(obj.material, 1.0);
      }
    }
    // Handle groups (plane/volume)
    if (obj.children) {
      obj.traverse(child => {
        if (child.material) apply(child.material, child.material.userData?.defaultOpacity);
      });
    }
  }
}
