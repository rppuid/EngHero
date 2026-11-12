// 장면 단위 동작 스프라이트. 인물별 한 장(가로 6장면 × 세로 9줄, 장면 96×96)에서 장면을 꺼내
// 기울이기·눌림·번쩍임·색 덧씌움·테두리를 입혀 낮은 해상도 캔버스에 찍는다. (PixelSprite와 같은 쓰임새)
export const CELL = 96;
export const ACTS = { idle: [0, 4], attack: [1, 6], hit: [2, 3], down: [3, 4], victory: [4, 4], walk_down: [5, 6], walk_left: [6, 6], walk_right: [7, 6], walk_up: [8, 6] };
const cache = new Map();

export function loadAnim(id) {
  if (cache.has(id)) return cache.get(id);
  const p = new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
      const frames = {};
      for (const [name, [row, n]] of Object.entries(ACTS)) frames[name] = Array.from({ length: n }, (_, i) => new Uint32Array(g.getImageData(i * CELL, row * CELL, CELL, CELL).data.buffer));
      res(frames);
    };
    img.onerror = rej; img.src = `assets/art/anim/${id}.png`;
  });
  cache.set(id, p); return p;
}
const ready = new Map();
export async function preload(ids) { await Promise.all(ids.map(async (id) => ready.set(id, await loadAnim(id)))); }

export class FrameSprite {
  constructor(id, rig = {}) {
    this.frames = ready.get(id);
    this.w = this.h = CELL; this.pad = rig.pad ?? 6;
    this.W = this.H = CELL + this.pad * 2;
    this.rig = rig; this.foot = rig.foot || [46, 89];
    this.canvas = document.createElement('canvas'); this.canvas.width = this.W; this.canvas.height = this.H;
    this.ctx = this.canvas.getContext('2d');
    this.img = this.ctx.createImageData(this.W, this.H);
    this.out = new Uint32Array(this.img.data.buffer);
    this.buf = new Uint32Array(this.W * this.H);
    this.pose = { lean: 0, sx: 1, sy: 1, flash: 0, tint: null, gray: 0, dark: 0, parts: {} };
    this.act = 'idle'; this.fi = 0; this.time = 0;
    this.render();
  }
  fwd(x, y) {
    const { lean, sx, sy } = this.pose; const fy = this.foot[1];
    return [this.foot[0] + (x - this.foot[0]) * sx + lean * ((fy - y) / 60) + this.pad, fy - (fy - y) * sy + this.pad];
  }
  locate(x, y) { return this.fwd(x, y); }
  render() {
    const { W, H, pad, buf, pose } = this; const { lean, sx, sy } = pose;
    const src = this.frames[this.act][Math.min(this.fi, this.frames[this.act].length - 1)];
    const fx = this.foot[0], fy = this.foot[1];
    buf.fill(0);
    const plain = !lean && sx === 1 && sy === 1;
    for (let Y = 0; Y < H; Y++) {
      const y = plain ? Y - pad : Math.floor(fy - (fy - (Y - pad + 0.5)) / sy);
      if (y < 0 || y >= CELL) continue;
      const shear = lean * ((fy - y) / 60);
      for (let X = 0; X < W; X++) {
        const x = plain ? X - pad : Math.floor(fx + (X - pad + 0.5 - shear - fx) / sx);
        if (x < 0 || x >= CELL) continue;
        const v = src[y * CELL + x]; if (v >>> 24) buf[Y * W + X] = v;
      }
    }
    const { flash, tint, gray, dark } = pose; const o = this.out;
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
      const i = Y * W + X; const v = buf[i];
      if (v) {
        let r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255;
        if (gray) { const l = r * 0.3 + g * 0.59 + b * 0.11; r += (l - r) * gray; g += (l - g) * gray; b += (l - b) * gray; }
        if (tint) { r += (tint[0] - r) * tint[3]; g += (tint[1] - g) * tint[3]; b += (tint[2] - b) * tint[3]; }
        if (dark) { r *= 1 - dark; g *= 1 - dark; b *= 1 - dark; }
        if (flash) { r += (255 - r) * flash; g += (255 - g) * flash; b += (255 - b) * flash; }
        o[i] = 0xff000000 | (b << 16) | (g << 8) | r;
      } else {
        const nb = (X > 0 && buf[i - 1]) || (X < W - 1 && buf[i + 1]) || (Y > 0 && buf[i - W]) || (Y < H - 1 && buf[i + W]);
        if (nb) {
          let r = (nb & 255) * 0.22 + 10, g = ((nb >> 8) & 255) * 0.18 + 6, b = ((nb >> 16) & 255) * 0.26 + 16;
          if (flash) { r += (255 - r) * flash; g += (255 - g) * flash; b += (255 - b) * flash; }
          o[i] = 0xff000000 | (b << 16) | (g << 8) | r;
        } else o[i] = 0;
      }
    }
    this.ctx.putImageData(this.img, 0, 0);
  }
}
