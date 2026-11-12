// 타격 효과: 입자, 베기 궤적, 충격 고리, 불기둥, 얼음, 화살, 잔상
import * as THREE from 'three';
import { clock, tween, E, rnd } from '../core/time.js';

const MAX = 900;
function canvasTex(w, h, draw, linear) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.magFilter = linear ? THREE.LinearFilter : THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Fx {
  constructor(scene) {
    this.scene = scene;
    // 네모 입자 (도트 느낌)
    this.geo = new THREE.PlaneGeometry(1, 1);
    this.add = new THREE.InstancedMesh(this.geo, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), MAX);
    this.add.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.add.frustumCulled = false; this.add.count = 0; scene.add(this.add);
    this.ps = [];
    this.M = new THREE.Matrix4(); this.C = new THREE.Color(); this.Q = new THREE.Quaternion(); this.S = new THREE.Vector3(); this.P = new THREE.Vector3();
    this.ghosts = [];
    // 베기 궤적 그림 (초승달)
    this.slashT = canvasTex(64, 64, (g) => {
      const img = g.createImageData(64, 64);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const dx = x - 32, dy = y - 32, d = Math.hypot(dx, dy), d2 = Math.hypot(dx + 7, dy + 2);
        const a = Math.atan2(dy, dx);
        let v = d < 30 && d2 > 27 ? 1 : 0; v *= Math.max(0, Math.cos(a * 0.9 + 0.2));
        const o = (y * 64 + x) * 4; const edge = d > 27 ? 1 : 0.75;
        img.data[o] = 255; img.data[o + 1] = 255; img.data[o + 2] = 255; img.data[o + 3] = v > 0.12 ? 255 * edge * Math.min(1, v * 1.6) : 0;
      }
      g.putImageData(img, 0, 0);
    });
    this.ringT = canvasTex(64, 64, (g) => { g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.stroke(); }, true);
    this.glowT = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }, true);
    this.arrowT = canvasTex(24, 5, (g) => { g.fillStyle = '#6b4a34'; g.fillRect(3, 2, 18, 1); g.fillStyle = '#e8eef5'; g.fillRect(0, 1, 4, 3); g.fillRect(0, 2, 5, 1); g.fillStyle = '#fff'; g.fillRect(19, 0, 5, 5); g.fillStyle = '#c94a3c'; g.fillRect(20, 1, 3, 3); });
    this.shardT = canvasTex(8, 16, (g) => { g.fillStyle = '#dff6ff'; g.beginPath(); g.moveTo(4, 0); g.lineTo(8, 9); g.lineTo(4, 16); g.lineTo(0, 9); g.fill(); g.fillStyle = '#8fd8ff'; g.beginPath(); g.moveTo(4, 0); g.lineTo(8, 9); g.lineTo(4, 16); g.fill(); });
    this.sprites = [];
  }

  // 입자 하나
  p(pos, vel, o = {}) {
    if (this.ps.length >= MAX) this.ps.shift();
    this.ps.push({ x: pos.x, y: pos.y, z: pos.z, vx: vel.x, vy: vel.y, vz: vel.z || 0, life: o.life || 0.5, max: o.life || 0.5, size: o.size || 0.1, g: o.g ?? 9, drag: o.drag ?? 1.5, c0: new THREE.Color(o.color || 0xffffff), c1: new THREE.Color(o.color2 || o.color || 0xffffff), grow: o.grow || 0, floor: o.floor ?? true });
  }
  burst(pos, n, o = {}) {
    const sp = o.speed || 5;
    for (let i = 0; i < n; i++) {
      const a = o.dir !== undefined ? o.dir + rnd(-(o.spread ?? 3.14), o.spread ?? 3.14) : rnd(0, 6.28);
      const s = sp * rnd(0.3, 1);
      this.p({ x: pos.x + rnd(-0.1, 0.1), y: pos.y + rnd(-0.1, 0.1), z: pos.z + 0.1 }, { x: Math.cos(a) * s, y: Math.sin(a) * s + (o.up || 0), z: rnd(-1, 1) * (o.zs ?? 1) }, { ...o, life: (o.life || 0.5) * rnd(0.6, 1.2), size: (o.size || 0.1) * rnd(0.6, 1.3) });
    }
  }
  // 화면을 향한 판 한 장을 잠깐 띄운다
  sprite(tex, pos, o = {}) {
    const m = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: o.normal ? THREE.NormalBlending : THREE.AdditiveBlending, color: o.color || 0xffffff, opacity: o.opacity ?? 1, fog: false, side: THREE.DoubleSide }));
    m.position.copy(pos); m.position.z += o.z ?? 0.2; m.scale.set(o.sx || 1, o.sy || o.sx || 1, 1); m.rotation.z = o.rot || 0;
    if (o.flat) { m.rotation.x = -Math.PI / 2; m.position.y = 0.05; }
    m.renderOrder = 5; this.scene.add(m); return m;
  }
  async flare(tex, pos, o = {}) {
    const m = this.sprite(tex, pos, o);
    const s0 = o.sx || 1, s1 = o.to || s0 * 2, sy0 = o.sy || s0;
    await tween(o.dur || 0.25, (k) => { const s = s0 + (s1 - s0) * k; m.scale.set(s, o.sy ? sy0 + (s1 - s0) * k * (sy0 / s0) : s, 1); m.material.opacity = (o.opacity ?? 1) * (1 - k) ** (o.fade || 1); if (o.spin) m.rotation.z += o.spin * clock.dt; }, o.ease || E.outCubic);
    this.scene.remove(m); m.material.dispose();
  }
  slash(pos, o = {}) {
    const col = o.color || 0xbfe9ff;
    this.flare(this.slashT, pos, { sx: (o.size || 2.4) * 0.6, to: o.size || 2.4, rot: o.rot ?? -0.6, dur: 0.2, color: col, fade: 1.6, z: 0.3 });
    this.flare(this.slashT, pos, { sx: (o.size || 2.4) * 0.5, to: (o.size || 2.4) * 1.25, rot: (o.rot ?? -0.6) + 0.12, dur: 0.3, color: 0xffffff, opacity: 0.6, fade: 2, z: 0.31 });
  }
  ring(pos, o = {}) { return this.flare(this.ringT, pos, { sx: 0.3, to: o.size || 3, dur: o.dur || 0.35, color: o.color || 0xffffff, flat: o.flat, fade: 1.5, opacity: o.opacity ?? 0.9 }); }
  glow(pos, o = {}) { return this.flare(this.glowT, pos, { sx: o.size || 2, to: (o.size || 2) * (o.grow || 1.8), dur: o.dur || 0.3, color: o.color || 0xffffff, fade: 1.2, opacity: o.opacity ?? 1 }); }
  impact(pos, o = {}) {
    const c = o.color || 0xfff1c0;
    this.glow(pos, { size: 1.4 * (o.power || 1), color: c, dur: 0.18 });
    this.ring(pos, { size: 2.6 * (o.power || 1), color: c, dur: 0.28 });
    this.burst(pos, Math.round(14 * (o.power || 1)), { color: 0xffffff, color2: c, speed: 9 * (o.power || 1), life: 0.4, size: 0.11, g: 14 });
    for (let i = 0; i < 4; i++) { // 긋는 선
      const a = rnd(0, 6.28);
      this.flare(this.glowT, pos, { sx: 0.12, sy: 2.4 * (o.power || 1), to: 0.02, rot: a, dur: 0.16, color: 0xffffff, z: 0.35 });
    }
  }
  fire(pos, power = 1) {
    this.glow(pos, { size: 2.6 * power, color: 0xff7a2a, dur: 0.45, grow: 1.5 });
    this.ring({ x: pos.x, y: 0, z: pos.z }, { size: 3.6 * power, color: 0xffb04a, flat: true, dur: 0.4 });
    for (let i = 0; i < 46 * power; i++) this.p({ x: pos.x + rnd(-0.7, 0.7) * power, y: rnd(0, 0.6), z: pos.z + rnd(-0.2, 0.4) }, { x: rnd(-0.6, 0.6), y: rnd(3, 8) * power, z: 0 }, { color: 0xfff2a0, color2: 0xe8401e, life: rnd(0.35, 0.8), size: rnd(0.12, 0.3), g: -3, drag: 1.2, floor: false });
    this.burst(pos, 12, { color: 0xffd27a, color2: 0xff5a1e, speed: 6, life: 0.6, size: 0.09, g: 4, up: 3 });
  }
  ice(pos, power = 1) {
    this.glow(pos, { size: 2.4 * power, color: 0x8fdcff, dur: 0.4 });
    this.ring({ x: pos.x, y: 0, z: pos.z }, { size: 3.4 * power, color: 0xbff0ff, flat: true, dur: 0.45 });
    for (let i = 0; i < 6; i++) {
      const m = this.sprite(this.shardT, { x: pos.x + (i - 2.5) * 0.34 * power, y: 0, z: pos.z + rnd(-0.2, 0.3) }, { sx: 0.34, sy: 0.1, rot: (i - 2.5) * 0.14, normal: true, z: 0.25 });
      const h = rnd(1.2, 2.4) * power;
      tween(0.12, (k) => { m.scale.y = 0.1 + h * k; m.position.y = (m.scale.y / 2); }, E.outBack).then(() => tween(0.35, () => {}, E.lin)).then(() => tween(0.2, (k) => { m.material.opacity = 1 - k; })).then(() => { this.scene.remove(m); m.material.dispose(); });
    }
    this.burst(pos, 26 * power, { color: 0xffffff, color2: 0x7fd4ff, speed: 7, life: 0.7, size: 0.1, g: 10, up: 2 });
  }
  splash(pos) {
    this.ring({ x: pos.x, y: 0, z: pos.z }, { size: 3, color: 0xbfeaff, flat: true, dur: 0.5 });
    this.burst({ x: pos.x, y: 0.2, z: pos.z }, 34, { color: 0xeaf8ff, color2: 0x4aa8ff, speed: 7, life: 0.8, size: 0.11, g: 16, dir: 1.57, spread: 0.9, up: 3 });
  }
  paint(pos, color) {
    this.glow(pos, { size: 2, color, dur: 0.4 });
    const cols = [0xff5a6a, 0xffc23a, 0x5ad36a, 0x4aa8ff, 0xb06aff];
    for (let i = 0; i < 30; i++) { const c = cols[i % 5]; this.burst(pos, 1, { color: c, color2: c, speed: 6, life: 0.7, size: 0.16, g: 10, up: 2 }); }
    this.ring(pos, { size: 3, color, dur: 0.4 });
  }
  // 화살: from에서 to로 날아간다
  async arrow(from, to, o = {}) {
    const m = this.sprite(this.arrowT, from, { sx: 1.1, sy: 0.24, normal: true, z: 0.3 });
    const dx = to.x - from.x, dy = to.y - from.y; m.rotation.z = Math.atan2(dy, dx) + Math.PI;
    await tween(o.dur || 0.14, (k) => {
      m.position.set(from.x + dx * k, from.y + dy * k + Math.sin(k * 3.14) * (o.arc || 0), to.z + 0.3);
      this.p(m.position, { x: rnd(-0.5, 0.5), y: rnd(-0.5, 0.5) }, { color: o.color || 0xfff3c0, life: 0.22, size: 0.09, g: 0, floor: false });
    }, E.lin);
    this.scene.remove(m); m.material.dispose();
  }
  // 길게 남는 빛 줄기 (돌진 궤적 등)
  streak(a, b, color = 0xffffff, w = 0.25, dur = 0.25) {
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: Math.max(a.z, b.z) };
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    return this.flare(this.glowT, mid, { sx: len * 1.2, sy: w, to: len * 1.25, rot: Math.atan2(b.y - a.y, b.x - a.x), dur, color, fade: 1.5 });
  }
  aura(pos, color, n = 10) { for (let i = 0; i < n; i++) this.p({ x: pos.x + rnd(-0.6, 0.6), y: rnd(0, 0.5), z: pos.z + rnd(-0.2, 0.3) }, { x: 0, y: rnd(1.5, 4), z: 0 }, { color, life: rnd(0.4, 0.9), size: rnd(0.06, 0.14), g: -1, floor: false }); }
  addGhost(g) { this.ghosts.push(g); }

  update() {
    const dt = clock.dt; let n = 0;
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const q = this.ps[i]; q.life -= dt;
      if (q.life <= 0) { this.ps.splice(i, 1); continue; }
      q.vy -= q.g * dt; const dr = Math.exp(-q.drag * dt); q.vx *= dr; q.vz *= dr; if (q.g <= 0) q.vy *= dr;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (q.floor && q.y < 0.04) { q.y = 0.04; q.vy *= -0.4; q.vx *= 0.6; }
    }
    for (const q of this.ps) {
      const k = q.life / q.max; const s = q.size * (0.35 + 0.65 * k);
      this.S.set(s, s, s); this.P.set(q.x, q.y, q.z); this.M.compose(this.P, this.Q, this.S); this.add.setMatrixAt(n, this.M);
      this.C.copy(q.c1).lerp(q.c0, k).multiplyScalar(Math.min(1, k * 3)); this.add.setColorAt(n, this.C); n++;
    }
    this.add.count = n; this.add.instanceMatrix.needsUpdate = true; if (this.add.instanceColor) this.add.instanceColor.needsUpdate = true;
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i]; g.life -= dt; g.mesh.material.opacity = 0.55 * Math.max(0, g.life / g.max);
      if (g.life <= 0) { this.scene.remove(g.mesh); g.mesh.material.dispose(); g.tex.dispose(); this.ghosts.splice(i, 1); }
    }
  }
}
