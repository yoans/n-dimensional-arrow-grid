// Dimension-to-display-channel mapping
// Channels: X, Y, Z (spatial), HUE, SIZE, OPACITY, TESSERACT, SLICE

export const Channel = {
  X: 'X',
  Y: 'Y',
  Z: 'Z',
  HUE: 'HUE',
  SIZE: 'SIZE',
  OPACITY: 'OPACITY',
  TESSERACT: 'TESSERACT',
  SLICE: 'SLICE',
};

// Ordered list of channels for auto-assignment
const AUTO_ORDER = [
  Channel.X, Channel.Y, Channel.Z,
  Channel.HUE, Channel.SIZE, Channel.OPACITY,
  Channel.TESSERACT,
  // beyond 7 dims → SLICE
];

export class DimMapper {
  constructor() {
    // dim index → Channel
    this.mapping = [];
  }

  /**
   * Rebuild mapping for N dimensions.
   * Auto-assigns: 0→X, 1→Y, 2→Z, 3→HUE, 4→SIZE, 5→OPACITY, 6→TESSERACT, 7+→SLICE
   */
  rebuild(N) {
    this.mapping = [];
    for (let d = 0; d < N; d++) {
      this.mapping[d] = d < AUTO_ORDER.length ? AUTO_ORDER[d] : Channel.SLICE;
    }
  }

  set(dim, channel) {
    this.mapping[dim] = channel;
  }

  get(dim) {
    return this.mapping[dim] || Channel.SLICE;
  }

  /**
   * Return the dim index assigned to a given channel, or -1.
   */
  dimFor(channel) {
    return this.mapping.indexOf(channel);
  }

  /**
   * Linearly interpolate an N-dimensional position (fractional coords allowed).
   */
  static lerpPos(prev, cur, t) {
    const n = Math.max(prev?.length || 0, cur?.length || 0);
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      const a = prev?.[i] || 0;
      const b = cur?.[i] || 0;
      out[i] = a + (b - a) * t;
    }
    return out;
  }

  /**
   * Get the 3D spatial position for an entity based on channel mapping.
   * Returns [x, y, z] in world coordinates (may be fractional during animation).
   */
  spatial3D(pos) {
    const xd = this.dimFor(Channel.X);
    const yd = this.dimFor(Channel.Y);
    const zd = this.dimFor(Channel.Z);
    return [
      xd >= 0 ? (pos[xd] || 0) : 0,
      yd >= 0 ? (pos[yd] || 0) : 0,
      zd >= 0 ? (pos[zd] || 0) : 0,
    ];
  }

  /** Normalize a dim coordinate to 0…1 given grid size. */
  _norm(pos, dim, size) {
    return (pos[dim] || 0) / Math.max(size - 1, 1);
  }

  /**
   * Get hue channel value normalized to 0…1 (position / (size-1)).
   * Returns null if no dim is mapped to HUE.
   */
  hueValue(pos, size) {
    const d = this.dimFor(Channel.HUE);
    if (d < 0) return null;
    return this._norm(pos, d, size);
  }

  /**
   * Get size channel value normalized to 0.3…1.5.
   * Returns null if no dim is mapped to SIZE.
   */
  sizeValue(pos, size) {
    const d = this.dimFor(Channel.SIZE);
    if (d < 0) return null;
    return 0.3 + this._norm(pos, d, size) * 1.2;
  }

  /**
   * Get opacity channel value normalized to 0.15…1.0.
   * Returns null if no dim is mapped to OPACITY.
   */
  opacityValue(pos, size) {
    const d = this.dimFor(Channel.OPACITY);
    if (d < 0) return null;
    return 0.15 + this._norm(pos, d, size) * 0.85;
  }

  /**
   * Tesseract: returns normalized 0…1 value for dim mapped to TESSERACT.
   * Used to interpolate between inner (0) and outer (1) cube positions.
   */
  tesseractValue(pos, size) {
    const d = this.dimFor(Channel.TESSERACT);
    if (d < 0) return null;
    return this._norm(pos, d, size);
  }

  /**
   * Soft slice visibility 0…1. Fully visible within 0.5 cells of the slice
   * plane; fades out by 1.0 cell away. Supports fractional (lerped) positions.
   */
  sliceFactor(pos, slicePos) {
    let factor = 1;
    for (let d = 0; d < this.mapping.length; d++) {
      if (this.mapping[d] !== Channel.SLICE) continue;
      const sv = slicePos[d];
      if (sv === undefined) continue;
      const dist = Math.abs((pos[d] || 0) - sv);
      if (dist > 0.5) {
        factor *= Math.max(0, 1 - (dist - 0.5) * 2);
      }
    }
    return factor;
  }

  /**
   * Check if entity is visible given current slice positions.
   * Only dims mapped to SLICE are checked.
   */
  isVisible(pos, slicePos) {
    return this.sliceFactor(pos, slicePos) > 0.001;
  }

  /**
   * List of available channel options.
   */
  static channelOptions() {
    return Object.values(Channel);
  }
}
