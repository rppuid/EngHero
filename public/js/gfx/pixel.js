// 팔레트 도트 스프라이트 합성기.
// 그림은 색 번호 격자(데이터)라서, 부위를 따로 돌리고(무기 휘두르기) 천을 펄럭이고(목도리)
// 몸을 기울이고 눌러서 자세를 만든 뒤 매번 낮은 해상도 캔버스에 다시 찍는다.
const CH = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function inPoly(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export class PixelSprite {
  // def: { pal, rows }  rig: { parts:[{name,poly,pivot,behind}], flutter:[{box:[x0,y0,x1,y1],anchor:'l'|'r'|'t',amp,speed}], foot:[x,y], pad, hue }
  constructor(def, rig = {}) {
    this.w = def.rows[0].length;
    this.h = def.rows.length;
    this.pad = rig.pad ?? 8;
    this.W = this.w + this.pad * 2;
    this.H = this.h + this.pad * 2;
    this.rig = rig;
    this.pal = def.pal.map(hex);
    if (rig.recolor) this.pal = this.pal.map(rig.recolor);
    this.grid = new Int8Array(this.w * this.h).fill(-1);
    this.part = new Uint8Array(this.w * this.h);
    this.flut = new Int8Array(this.w * this.h).fill(-1);
    def.rows.forEach((row, y) => {
      for (let x = 0; x < this.w; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        const i = y * this.w + x;
        this.grid[i] = CH.indexOf(ch);
        (rig.parts || []).forEach((p, n) => { if (inPoly(p.poly, x + 0.5, y + 0.5)) this.part[i] = n + 1; });
        (rig.flutter || []).forEach((f, n) => {
          const [x0, y0, x1, y1] = f.box;
          if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && !this.part[i]) this.flut[i] = n;
        });
      }
    });
    this.foot = rig.foot || [this.w / 2, this.h];
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.ctx = this.canvas.getContext('2d');
    this.img = this.ctx.createImageData(this.W, this.H);
    this.buf = new Int16Array(this.W * this.H);
    this.pose = { lean: 0, sy: 1, sx: 1, parts: {}, flash: 0, tint: null, gray: 0, dark: 0 };
    this.time = 0;
    this.render();
  }

  // 몸 변형: 발을 기준으로 위쪽이 lean칸만큼 밀리고(기울기), sx·sy로 눌리거나 늘어난다
  fwd(x, y) {
    const { lean, sx, sy } = this.pose;
    const fy = this.foot[1];
    const Y = fy - (fy - y) * sy;
    const X = this.foot[0] + (x - this.foot[0]) * sx + lean * ((fy - y) / this.h);
    return [X + this.pad, Y + this.pad];
  }

  render() {
    const { w, h, W, H, pad, buf, pose } = this;
    const { lean, sx, sy } = pose;
    buf.fill(-1);
    const fy = this.foot[1], fx = this.foot[0];
    const fl = this.rig.flutter || [];
    const t = this.time;
    // 1) 몸: 찍힐 칸에서 원본 칸을 거꾸로 찾는다
    for (let Y = 0; Y < H; Y++) {
      const y = fy - (fy - (Y - pad + 0.5)) / sy;
      if (y < 0 || y >= h) continue;
      const yi = y | 0;
      const shear = lean * ((fy - y) / h);
      for (let X = 0; X < W; X++) {
        let x = fx + (X - pad + 0.5 - shear - fx) / sx;
        let xi = Math.floor(x);
        if (xi < -6 || xi >= w + 6) continue;
        // 펄럭임: 근처 칸이 펄럭이는 영역이면 그만큼 밀어서 찾는다
        let i = xi >= 0 && xi < w ? yi * w + xi : -1;
        let found = -1;
        if (i >= 0 && this.grid[i] >= 0 && !this.part[i] && this.flut[i] < 0) found = this.grid[i];
        else {
          for (let n = 0; n < fl.length; n++) {
            const f = fl[n];
            const [x0, y0, x1, y1] = f.box;
            const span = Math.max(1, f.anchor === 't' ? y1 - y0 : x1 - x0);
            // 고정된 쪽에서 멀수록 크게 흔들린다
            const probe = (sxp, syp) => {
              const wgt = f.anchor === 'l' ? (sxp - x0) / span : f.anchor === 'r' ? (x1 - sxp) / span : (syp - y0) / span;
              if (wgt < 0) return 0;
              const ph = t * (f.speed || 5) - (f.anchor === 't' ? syp : sxp) * 0.35 + n * 1.7;
              return Math.sin(ph) * (f.amp || 1.5) * Math.min(1, wgt) + (pose.wind || 0) * wgt * 2;
            };
            let ox = 0, oy = 0;
            if (f.anchor === 't') ox = Math.round(probe(xi, yi)); else oy = Math.round(probe(xi, yi));
            const sx2 = xi - ox, sy2 = yi - oy;
            if (sx2 < 0 || sx2 >= w || sy2 < 0 || sy2 >= h) continue;
            const j = sy2 * w + sx2;
            if (this.flut[j] === n && this.grid[j] >= 0) { found = this.grid[j]; break; }
          }
        }
        if (found >= 0) buf[Y * W + X] = found;
      }
    }
    // 2) 부위: 축을 중심으로 돌려서 찍는다
    (this.rig.parts || []).forEach((p, n) => {
      const st = pose.parts[p.name] || {};
      const rot = ((st.rot || 0) * Math.PI) / 180;
      const [px, py] = this.fwd(p.pivot[0], p.pivot[1]);
      const cx = px + (st.dx || 0), cy = py + (st.dy || 0);
      const cos = Math.cos(-rot), sin = Math.sin(-rot);
      const R = p.reach || 40;
      const xa = Math.max(0, Math.floor(cx - R)), xb = Math.min(W, Math.ceil(cx + R));
      const ya = Math.max(0, Math.floor(cy - R)), yb = Math.min(H, Math.ceil(cy + R));
      for (let Y = ya; Y < yb; Y++) for (let X = xa; X < xb; X++) {
        const dx = X + 0.5 - cx, dy = Y + 0.5 - cy;
        const sxp = Math.floor(p.pivot[0] + dx * cos - dy * sin);
        const syp = Math.floor(p.pivot[1] + dx * sin + dy * cos);
        if (sxp < 0 || sxp >= w || syp < 0 || syp >= h) continue;
        const j = syp * w + sxp;
        if (this.part[j] !== n + 1 || this.grid[j] < 0) continue;
        if (p.behind && buf[Y * W + X] >= 0) continue;
        buf[Y * W + X] = this.grid[j];
      }
    });
    // 3) 색 입히기 + 바깥 테두리
    const d = this.img.data;
    const fl2 = pose.flash, tint = pose.tint, gray = pose.gray, dark = pose.dark;
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
      const o = (Y * W + X) * 4;
      const v = buf[Y * W + X];
      if (v >= 0) {
        let [r, g, b] = this.pal[v];
        if (gray) { const l = r * 0.3 + g * 0.59 + b * 0.11; r += (l - r) * gray; g += (l - g) * gray; b += (l - b) * gray; }
        if (tint) { r += (tint[0] - r) * tint[3]; g += (tint[1] - g) * tint[3]; b += (tint[2] - b) * tint[3]; }
        if (dark) { r *= 1 - dark; g *= 1 - dark; b *= 1 - dark; }
        if (fl2) { r += (255 - r) * fl2; g += (255 - g) * fl2; b += (255 - b) * fl2; }
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
      } else {
        // 이웃에 그림이 있으면 테두리. 이웃 색을 어둡게 해서 쓴다(검은 선보다 부드럽다)
        let nb = -1;
        if (X > 0 && buf[Y * W + X - 1] >= 0) nb = buf[Y * W + X - 1];
        else if (X < W - 1 && buf[Y * W + X + 1] >= 0) nb = buf[Y * W + X + 1];
        else if (Y > 0 && buf[(Y - 1) * W + X] >= 0) nb = buf[(Y - 1) * W + X];
        else if (Y < H - 1 && buf[(Y + 1) * W + X] >= 0) nb = buf[(Y + 1) * W + X];
        if (nb >= 0) {
          const c = this.pal[nb];
          let r = c[0] * 0.22 + 10, g = c[1] * 0.18 + 6, b = c[2] * 0.26 + 16;
          if (fl2) { r += (255 - r) * fl2; g += (255 - g) * fl2; b += (255 - b) * fl2; }
          d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
        } else d[o + 3] = 0;
      }
    }
    this.ctx.putImageData(this.img, 0, 0);
  }

  // 원본 격자의 한 점이 지금 자세에서 캔버스의 어디에 있는지 (부위에 속한 점이면 회전까지 반영)
  locate(x, y, partName) {
    if (partName) {
      const p = this.rig.parts.find((q) => q.name === partName);
      const st = this.pose.parts[partName] || {};
      const rot = ((st.rot || 0) * Math.PI) / 180;
      const [px, py] = this.fwd(p.pivot[0], p.pivot[1]);
      const dx = x - p.pivot[0], dy = y - p.pivot[1];
      return [px + (st.dx || 0) + dx * Math.cos(rot) - dy * Math.sin(rot), py + (st.dy || 0) + dx * Math.sin(rot) + dy * Math.cos(rot)];
    }
    return this.fwd(x, y);
  }
}

// 색상(hue)을 돌려 색 변종을 만든다
export function hueShift(deg, satMul = 1, lightAdd = 0) {
  return ([r, g, b]) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let hh = 0; const l = (mx + mn) / 2; const d = mx - mn;
    let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d) hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hh = (hh * 60 + deg + 360) % 360; s = Math.min(1, s * satMul);
    const L = Math.max(0, Math.min(1, l + lightAdd));
    const c = (1 - Math.abs(2 * L - 1)) * s, x = c * (1 - Math.abs(((hh / 60) % 2) - 1)), m = L - c / 2;
    const [R, G, B] = hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x];
    return [(R + m) * 255, (G + m) * 255, (B + m) * 255];
  };
}
