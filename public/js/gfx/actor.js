// 무대 위에 서는 인물·적 한 명. 도트 캔버스를 세운 판에 입히고, 바닥 그림자와 자세 변화를 맡는다.
import * as THREE from 'three';
import { makeSprite, RIGS } from '../sprites/index.js';
import { clock } from '../core/time.js';

export const PX = 1 / 30; // 도트 한 칸의 크기(무대 단위)
let shadowTex;
function blobTex() {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (shadowTex = new THREE.CanvasTexture(c));
}

export class Actor {
  constructor(id, opts = {}) {
    this.id = id;
    this.sprite = makeSprite(id, opts);
    this.rig = RIGS[id];
    this.scale = opts.scale || 1;
    const sp = this.sprite;
    this.tex = new THREE.CanvasTexture(sp.canvas);
    this.tex.magFilter = this.tex.minFilter = THREE.NearestFilter;
    this.tex.generateMipmaps = false;
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mat = new THREE.MeshStandardMaterial({ map: this.tex, alphaTest: 0.5, roughness: 1, metalness: 0, emissive: 0xffffff, emissiveMap: this.tex, emissiveIntensity: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(sp.W * PX, sp.H * PX), this.mat);
    this.mesh.position.set(-(sp.foot[0] + sp.pad - sp.W / 2) * PX, -(sp.H / 2 - (sp.foot[1] + sp.pad)) * PX, 0);
    this.mesh.castShadow = true;
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.tex, alphaTest: 0.5 });
    this.body = new THREE.Group(); // 뛰기·넘어지기처럼 그림자와 따로 움직이는 몸
    this.body.add(this.mesh);
    this.body.scale.setScalar(this.scale);
    this.group = new THREE.Group();
    this.group.add(this.body);
    const sw = (opts.shadow || (this.rig.anim ? 44 : sp.w * 0.75)) * PX * this.scale;
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw * 0.42), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.9 }));
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = 0.02;
    this.group.add(this.shadow);
    this.home = new THREE.Vector3();
    this.acc = Math.random();
    this.idle = true; this.phase = Math.random() * 6.28;
    // 숨쉬기: 대상마다 크기(칸)와 빠르기가 다르고, 시작 시점도 제각각이다
    const br = this.rig.breath || [1, 1.2];
    this.breath = br[0] / sp.h; this.breathSpeed = br[1] * (0.9 + Math.random() * 0.2);
    this.idleFps = (this.rig.idleFps || 2.6) * (0.94 + Math.random() * 0.12);
    this.dirty = true;
    this.flashT = 0;
    this.sink = 0; // 물에 잠긴 깊이
    this.framed = !!this.rig.anim; this.anim = null;
    if (this.framed) { this.breath = 0; this.rest(Math.random() * 4); }
  }
  // 동작 재생. loop가 아니면 끝났을 때 풀리는 약속을 돌려준다. hold: 마지막 장면에서 멈춤
  play(act, { fps = 10, loop = false, hold = false, from = 0 } = {}) {
    if (!this.framed) return Promise.resolve();
    this.anim?.done?.();
    this.sprite.act = act; this.sprite.fi = from; this.dirty = true;
    return new Promise((res) => { this.anim = { act, fps, loop, hold, from, t: 0, n: this.sprite.frames[act].length, done: res }; if (loop) res(); });
  }
  // 한 장면을 골라 세운다
  frame(act, i) { if (!this.framed) return; this.anim?.done?.(); this.anim = null; this.sprite.act = act; this.sprite.fi = i; this.dirty = true; }
  rest(offset = 0) { if (!this.framed) return; this.play('idle', { loop: true, fps: this.idleFps }); this.anim.t = offset / this.idleFps; }
  get pose() { return this.sprite.pose; }
  place(v) { this.home.copy(v); this.group.position.copy(v); }
  set(p) { Object.assign(this.sprite.pose, p); this.dirty = true; }
  part(name, v) { this.sprite.pose.parts[name] = { ...(this.sprite.pose.parts[name] || {}), ...v }; this.dirty = true; }
  flash(t = 0.09) { this.flashT = t; }

  update(realDt) {
    const dt = clock.dt; const sp = this.sprite;
    this.sprite.time += dt;
    this.acc += dt;
    if (this.anim) {
      const an = this.anim; an.t += dt; let i = Math.floor(an.t * an.fps) + (an.from || 0);
      if (i >= an.n) { if (an.loop) i %= an.n; else { i = an.n - 1; const d = an.done; this.anim = null; d(); if (!an.hold) this.rest(); } }
      if (this.anim === an && i !== this.sprite.fi) { this.sprite.fi = i; this.dirty = true; }
    }
    if (this.idle && this.breath) {
      // 한 칸씩 끊어서 움직여야 도트답다: 들이쉬고(길게) 내쉬는(짧게) 모양
      const ph = (clock.t * this.breathSpeed + this.phase) % 6.28; const wave = ph < 3.9 ? Math.sin((ph / 3.9) * Math.PI) : 0;
      const sy = 1 + Math.round(wave * this.breath * sp.h) / sp.h;
      if (sy !== this.sprite.pose.sy) { this.sprite.pose.sy = sy; this.dirty = true; }
      if (this.rig.hover) this.body.position.y = Math.sin(clock.t * 3.1 + this.phase) * this.rig.hover + this.rig.hover;
    }
    const f = this.flashT > 0 ? 1 : 0;
    if (this.flashT > 0) this.flashT -= realDt;
    if (f !== this._f) { this.sprite.pose.flash = f; this._f = f; this.dirty = true; }
    if ((this.rig.flutter && this.acc > 1 / 14) || this.dirty) { // 도트 느낌이 나도록 초당 14번만 다시 찍는다
      if (this.acc > 1 / 14) this.acc = 0;
      this.sprite.render(); this.tex.needsUpdate = true; this.dirty = false;
    }
    const lift = this.body.position.y;
    const s = Math.max(0.35, 1 - lift * 0.22);
    this.shadow.scale.set(s, s, 1);
    this.shadow.material.opacity = 0.9 * s * (this.sink ? 0.2 : 1);
  }

  // 스프라이트 격자의 한 점이 무대의 어디인지
  point(name) {
    const p = this.rig.pts?.[name] || [this.sprite.w / 2, this.sprite.h / 2];
    const [cx, cy] = this.sprite.locate(p[0], p[1], p[2]);
    const sp = this.sprite;
    const v = new THREE.Vector3((cx - sp.W / 2) * PX, (sp.H / 2 - cy) * PX, 0.05).add(this.mesh.position);
    return this.body.localToWorld(v);
  }
  get center() { return this.point('chest'); }
  get top() { const v = this.group.position.clone(); v.y += ((this.framed ? 78 : this.sprite.h) * PX + 0.1) * this.body.scale.y + this.body.position.y; return v; }

  // 잔상: 지금 모습을 복사해 남긴다
  ghost(scene, color = 0x9fd8ff, life = 0.22) {
    const c = document.createElement('canvas'); c.width = this.sprite.W; c.height = this.sprite.H;
    c.getContext('2d').drawImage(this.sprite.canvas, 0, 0);
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(this.mesh.geometry, new THREE.MeshBasicMaterial({ map: t, transparent: true, color, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.mesh.getWorldPosition(m.position); m.position.z -= 0.02;
    m.scale.setScalar(this.scale);
    scene.add(m);
    return { mesh: m, life, max: life, tex: t };
  }
}
