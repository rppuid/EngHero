// 카메라 연출: 구도 전환, 흔들림, 순간 확대, 가만히 있을 때의 느린 흔들거림
import * as THREE from 'three';
import { tweenReal, E, clock } from '../core/time.js';

export const SHOTS = {
  wide: { pos: [0.6, 4.9, 17.6], look: [0.6, 0.75, 0], fov: 28 },
  intro: { pos: [-9, 2.2, 9], look: [-3.5, 1.4, 0], fov: 34 },
  party: { pos: [2.6, 3.6, 13.5], look: [2.6, 1.5, 0], fov: 27 },
  enemies: { pos: [-2.6, 3.8, 14], look: [-3.2, 1.4, 0], fov: 27 },
};

export class CameraRig {
  constructor(aspect) {
    this.cam = new THREE.PerspectiveCamera(28, aspect, 0.1, 120);
    this.pos = new THREE.Vector3(...SHOTS.wide.pos);
    this.look = new THREE.Vector3(...SHOTS.wide.look);
    this.fov = 28; this.quality = 0;
    this.shakeAmp = 0; this.kick = 0; this.roll = 0;
    this.token = 0;
    this.fit = 1;
    this.apply(0);
  }
  // 구도를 부드럽게 옮긴다. 더 새로운 요청이 오면 앞의 것은 멈춘다.
  to(shot, dur = 0.6, ease = E.inOut) {
    const s = typeof shot === 'string' ? SHOTS[shot] : shot;
    const p0 = this.pos.clone(), l0 = this.look.clone(), f0 = this.fov;
    const p1 = s.pos ? new THREE.Vector3(...s.pos) : p0, l1 = s.look ? new THREE.Vector3(...s.look) : l0, f1 = s.fov ?? f0;
    const my = ++this.token;
    return tweenReal(dur, (k) => {
      if (my !== this.token) return;
      this.pos.lerpVectors(p0, p1, k); this.look.lerpVectors(l0, l1, k); this.fov = f0 + (f1 - f0) * k;
    }, ease);
  }
  // 한 대상을 바라보는 구도
  focus(v, { dist = 9, height = 0.9, side = 0, fov = 26 } = {}) {
    return { pos: [v.x + side, v.y + height + 1.2, v.z + dist], look: [v.x, v.y + 0.2, v.z], fov };
  }
  shake(amp = 0.25) { this.shakeAmp = Math.max(this.shakeAmp, amp); }
  punch(k = 2.5) { this.kick = Math.max(this.kick, k); }
  apply(dt) {
    const t = clock.real;
    this.shakeAmp *= Math.exp(-dt * 9);
    this.kick *= Math.exp(-dt * 11);
    const a = this.shakeAmp;
    const sx = (Math.sin(t * 71) + Math.sin(t * 113 + 1.3)) * 0.5 * a;
    const sy = (Math.sin(t * 89 + 2) + Math.sin(t * 127 + 0.4)) * 0.5 * a;
    const drift = 0.06;
    this.cam.position.set(this.pos.x + sx + Math.sin(t * 0.31) * drift, this.pos.y + sy + Math.sin(t * 0.23 + 1) * drift * 0.6, this.pos.z);
    this.cam.lookAt(this.look.x + sx * 0.6, this.look.y + sy * 0.6, this.look.z);
    this.cam.rotation.z += Math.sin(t * 97) * a * 0.03;
    this.cam.fov = (this.fov - this.kick) * this.fit;
    this.cam.updateProjectionMatrix();
  }
  resize(aspect) {
    this.cam.aspect = aspect;
    this.fit = aspect < 1.5 ? Math.min(1.9, 1.5 / aspect) : 1; // 세로로 긴 화면에서는 넓게 잡는다
  }
}
