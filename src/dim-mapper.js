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
   * Get the 3D spatial position for an entity based on channel mapping.
   * Returns [x, y, z] in world coordinates.
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

  /**
   * Get hue channel value normalized to 0…1 (position / (size-1)).
   * Returns null if no dim is mapped to HUE.
   */
  hueValue(pos, size) {
    const d = this.dimFor(Channel.HUE);
    if (d < 0) return null;
    return (pos[d] || 0) / Math.max(size - 1, 1);
  }

  /**
   * Get size channel value normalized to 0.3…1.5.
   * Returns null if no dim is mapped to SIZE.
   */
  sizeValue(pos, size) {
    const d = this.dimFor(Channel.SIZE);
    if (d < 0) return null;
    const t = (pos[d] || 0) / Math.max(size - 1, 1);
    return 0.3 + t * 1.2;
  }

  /**
   * Get opacity channel value normalized to 0.15…1.0.
   * Returns null if no dim is mapped to OPACITY.
   */
  opacityValue(pos, size) {
    const d = this.dimFor(Channel.OPACITY);
    if (d < 0) return null;
    const t = (pos[d] || 0) / Math.max(size - 1, 1);
    return 0.15 + t * 0.85;
  }

  /**
   * Tesseract: returns normalized 0…1 value for dim mapped to TESSERACT.
   * Used to interpolate between inner (0) and outer (1) cube positions.
   */
  tesseractValue(pos, size) {
    const d = this.dimFor(Channel.TESSERACT);
    if (d < 0) return null;
    return (pos[d] || 0) / Math.max(size - 1, 1);
  }

  /**
   * Check if entity is visible given current slice positions.
   * Only dims mapped to SLICE are checked.
   */
  isVisible(pos, slicePos) {
    for (let d = 0; d < this.mapping.length; d++) {
      if (this.mapping[d] === Channel.SLICE) {
        const sv = slicePos[d];
        if (sv !== undefined && Math.round(pos[d] || 0) !== sv) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * List of available channel options.
   */
  static channelOptions() {
    return Object.values(Channel);
  }
}
