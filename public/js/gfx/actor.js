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
    const sw = (opts.shadow || sp.w * 0.75) * PX * this.scale;
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw * 0.42), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.9 }));
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = 0.02;
    this.group.add(this.shadow);
    this.home = new THREE.Vector3();
    this.acc = Math.random();
    this.idle = true; this.breath = opts.breath ?? 0.014; this.phase = Math.random() * 6;
    this.dirty = true;
    this.flashT = 0;
    this.sink = 0; // 물에 잠긴 깊이
  }
  get pose() { return this.sprite.pose; }
  place(v) { this.home.copy(v); this.group.position.copy(v); }
  set(p) { Object.assign(this.sprite.pose, p); this.dirty = true; }
  part(name, v) { this.sprite.pose.parts[name] = { ...(this.sprite.pose.parts[name] || {}), ...v }; this.dirty = true; }
  flash(t = 0.09) { this.flashT = t; }

  update(realDt) {
    const dt = clock.dt;
    this.sprite.time += dt;
    this.acc += dt;
    if (this.idle) this.sprite.pose.sy = 1 + Math.sin(clock.t * 2.2 + this.phase) * this.breath;
    const f = this.flashT > 0 ? 1 : 0;
    if (this.flashT > 0) this.flashT -= realDt;
    if (f !== this._f) { this.sprite.pose.flash = f; this._f = f; this.dirty = true; }
    if (this.acc > 1 / 14 || this.dirty) { // 도트 느낌이 나도록 초당 14번만 다시 찍는다
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
  get top() { const v = this.group.position.clone(); v.y += (this.sprite.h * PX + 0.1) * this.scale + this.body.position.y; return v; }

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
