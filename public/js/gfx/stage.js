// 숲 전투 무대: 3D 지형과 소품에 도트 무늬를 입히고, 빛줄기·안개·떠다니는 빛가루로 깊이를 낸다.
import * as THREE from 'three';
import { clock } from '../core/time.js';

// 자리 이름 → 무대 좌표
export const SPOTS = {
  open: [[-3.0, 0, 0.9], [-1.2, 0, 1.8], [-4.6, 0, -0.3]],
  behindRock: [[-5.5, 0, -2.5]],
  nextToTree: [[-0.95, 0, -2.3]],
  inWater: [[-1.9, 0, 3.0]],
  party: [[2.4, 0, 1.9], [4.6, 0, 0.5], [6.7, 0, -0.9]],
};
export const ROCK = new THREE.Vector3(-6.6, 0, -1.2);
export const TREE = new THREE.Vector3(0.45, 0, -2.9);
export const POND = new THREE.Vector3(-1.9, 0, 3.05);

function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

function pixTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
const loader = new THREE.TextureLoader();
// 사진에서 만든 도트 질감(tools/textures.py). 인물 도트와 칸 크기를 맞춘다: 1칸 ≈ 1/27
function tex(name, { normal = false, repeat } = {}) {
  const t = loader.load(`assets/tex/${name}${normal ? '_n' : ''}.png`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.anisotropy = 4;
  if (!normal) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.repeat.set(...repeat);
  return t;
}
// 값 잡음 (지형 높낮이, 바위 모양)
function makeNoise(seed) {
  const r = rng(seed); const P = Array.from({ length: 512 }, () => r());
  const h = (x, y, z = 0) => P[((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) & 511];
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y, z = 0) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z); const xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), xf), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), xf), yf), l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), xf), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), xf), yf), zf);
  };
}
const ARENA = { x: 0.3, z: 0.5, rx: 9.6, rz: 4.3 };
const arenaD = (x, z) => Math.hypot((x - ARENA.x) / ARENA.rx, (z - ARENA.z) / ARENA.rz);

export function buildStage(scene) {
  const r = rng(7); const noise = makeNoise(11);
  const FOG = new THREE.Color(0x3a6a5a);
  scene.fog = new THREE.Fog(FOG, 18, 46);
  scene.background = new THREE.Color(0x132a2a);
  const T = { value: 0 };

  // ── 먼 배경: 하늘빛과, 멀수록 안개색에 묻히는 나무 그림자 세 겹 ──────────────
  const sky = pixTex(256, 144, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#10262a'); gr.addColorStop(0.4, '#2f6a58'); gr.addColorStop(0.68, '#a9d18a'); gr.addColorStop(1, '#3a6a52');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const sun = g.createRadialGradient(w * 0.6, h * 0.52, 2, w * 0.6, h * 0.52, 110);
    sun.addColorStop(0, 'rgba(255,246,200,.9)'); sun.addColorStop(0.35, 'rgba(255,232,150,.3)'); sun.addColorStop(1, 'rgba(255,230,150,0)');
    g.fillStyle = sun; g.fillRect(0, 0, w, h);
  });
  sky.magFilter = THREE.LinearFilter;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(110, 62), new THREE.MeshBasicMaterial({ map: sky, fog: false, depthWrite: false }));
  back.position.set(0, 16, -34); back.renderOrder = -10; scene.add(back);
  const layerTex = (seed, dense) => pixTex(512, 192, (g, w, h) => {
    const q = rng(seed);
    for (let x = -10; x < w; x += dense + Math.floor(q() * dense)) {
      const tw = 3 + Math.floor(q() * 5), th = 70 + q() * 80;
      g.fillStyle = '#fff'; g.fillRect(x, h - th, tw, th);
      for (let k = 0; k < 22; k++) { g.beginPath(); g.arc(Math.round(x + tw / 2 + (q() - 0.5) * 60), Math.round(h - th + (q() - 0.7) * 60), 6 + q() * 12, 0, 7); g.fill(); }
      for (let k = 0; k < 3; k++) g.fillRect(x + (q() < 0.5 ? -8 : tw), h - th * (0.3 + q() * 0.4), 9, 3);
    }
    g.fillRect(0, h - 10, w, 10);
  });
  [[-13, 0x2f5f4f, 21, 26, 1.0], [-20, 0x3e7462, 30, 22, 1.25], [-27, 0x5f9577, 41, 30, 1.6]].forEach(([z, col, seed, dense, sc], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(92 * sc, 34 * sc), new THREE.MeshBasicMaterial({ map: layerTex(seed, dense), color: col, alphaTest: 0.5, fog: false }));
    m.position.set((i - 1) * 3, 17 * sc - 1.5, z); scene.add(m);
  });

  // ── 땅: 높낮이가 있는 풀밭 + 흙바닥 + 낙엽 바닥을 셰이더에서 섞는다 ───────────
  const gGeo = new THREE.PlaneGeometry(76, 52, 150, 104); gGeo.rotateX(-Math.PI / 2);
  const gp = gGeo.attributes.position;
  const height = (x, z) => {
    const d = arenaD(x, z); const k = Math.min(1, Math.max(0, (d - 1.05) / 0.7));
    const pondK = Math.min(1, Math.hypot(x - POND.x, (z - POND.z) * 1.4) / 2.6);
    return (noise(x * 0.22, z * 0.22) - 0.45) * 1.1 * k * k * pondK + (z < -6 ? (-6 - z) * 0.06 : 0);
  };
  for (let i = 0; i < gp.count; i++) gp.setY(i, height(gp.getX(i), gp.getZ(i)));
  gGeo.computeVertexNormals();
  const blobs = []; // 나무·바위 밑의 그늘 (x, z, 반지름)
  const gUni = { tDirt: { value: tex('dirt') }, tFloor: { value: tex('floor') }, uT: T, uBlobs: { value: [] }, uArena: { value: new THREE.Vector4(ARENA.x, ARENA.z, ARENA.rx, ARENA.rz) }, uPond: { value: new THREE.Vector3(POND.x, POND.z, 1.75) } };
  const gMat = new THREE.MeshStandardMaterial({ map: tex('grass'), normalMap: tex('grass', { normal: true }), normalScale: new THREE.Vector2(0.9, 0.9), roughness: 1 });
  gMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, gUni);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvWp = (modelMatrix * vec4(position, 1.0)).xyz;\n#ifdef USE_MAP\nvMapUv = vWp.xz / 9.5;\n#endif\n#ifdef USE_NORMALMAP\nvNormalMapUv = vWp.xz / 9.5;\n#endif');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWp; uniform sampler2D tDirt, tFloor; uniform float uT; uniform vec3 uBlobs[24]; uniform vec4 uArena; uniform vec3 uPond;
      float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hsh(i), hsh(i+vec2(1,0)), f.x), mix(hsh(i+vec2(0,1)), hsh(i+vec2(1,1)), f.x), f.y); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      vec2 tp = floor(vWp.xz * 27.0) / 27.0;               // 도트 한 칸 단위로 끊어서 경계도 도트로
      float nz = vn(tp * 0.9) * 0.22 + vn(tp * 3.1) * 0.10 + hsh(tp * 27.0) * 0.05;
      float d = length((tp - uArena.xy) / uArena.zw) + nz - 0.2;
      float mDirt = step(d, 0.93);
      float mFloor = step(0.62, vn(tp * 0.33 + 7.0) + smoothstep(-3.0, -9.0, vWp.z) * 0.35) * (1.0 - mDirt);
      diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(tFloor, vWp.xz / 9.5).rgb, mFloor);
      diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(tDirt, vWp.xz / 9.5).rgb, mDirt);
      diffuseColor.rgb *= 1.0 - step(abs(d - 0.93), 0.03) * 0.22;         // 흙과 풀의 경계선
      float pd = length((tp - uPond.xy) * vec2(1.0, 1.5)); diffuseColor.rgb *= mix(0.62, 1.0, smoothstep(uPond.z, uPond.z + 0.5, pd)); // 물가의 젖은 흙
      float ao = 1.0;
      for (int i = 0; i < 24; i++) { vec3 b = uBlobs[i]; if (b.z > 0.0) ao *= mix(0.5, 1.0, smoothstep(b.z * 0.25, b.z, distance(tp, b.xy))); }
      diffuseColor.rgb *= ao;
      // 나뭇잎 사이로 떨어지는 햇빛 얼룩이 천천히 움직인다
      float dap = vn(tp * 0.55 + vec2(uT * 0.05, uT * 0.03)) * 0.6 + vn(tp * 1.7 - uT * 0.04) * 0.4;
      diffuseColor.rgb *= mix(0.74, 1.22, smoothstep(0.42, 0.6, dap));`);
  };
  const ground = new THREE.Mesh(gGeo, gMat); ground.receiveShadow = true; scene.add(ground);

  // ── 연못 ──────────────────────────────────────────────────────────
  const pondMat = new THREE.ShaderMaterial({
    uniforms: { t: T, splash: { value: 0 } }, transparent: true,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float t, splash; varying vec2 vUv;
      float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){ vec2 p = floor(vUv * 96.0) / 96.0 - 0.5; float a = atan(p.y, p.x); float d = length(p * vec2(1.0, 1.15));
        float edge = d + sin(a * 5.0 + 1.0) * 0.014 + sin(a * 11.0) * 0.006; if (edge > 0.47) discard;
        float depth = smoothstep(0.47, 0.1, edge);
        vec3 c = mix(vec3(0.16, 0.50, 0.56), vec3(0.05, 0.22, 0.36), depth);
        float w = sin(d * 60.0 - t * 1.8) * 0.5 + 0.5; float gl = step(0.92, hsh(floor(vUv * 48.0) + floor(t * 3.0)));
        c += step(0.9, w) * 0.07 * depth + gl * 0.12 * depth + splash * 0.5;
        c += vec3(0.5, 0.75, 0.6) * smoothstep(0.3, 0.0, length(p - vec2(0.12, -0.16))) * 0.28;           // 하늘빛 비침
        float foam = step(0.445 - sin(t * 1.4 + a * 7.0) * 0.006, edge); c = mix(c, vec3(0.86, 0.97, 0.95), foam * 0.8);
        gl_FragColor = vec4(c, 0.96); }`,
  });
  const pond = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.4), pondMat);
  pond.rotation.x = -Math.PI / 2; pond.position.set(POND.x, 0.03, POND.z); scene.add(pond);

  // ── 바위: 잡음으로 찌그러뜨린 덩어리 + 이끼 낀 윗면 ────────────────────────
  const rockMat = new THREE.MeshStandardMaterial({ map: tex('rock'), normalMap: tex('rock', { normal: true }), roughness: 0.95, vertexColors: true });
  const mkRock = (x, z, s, sy = 0.75, seed = 1) => {
    const geo = new THREE.IcosahedronGeometry(1, 3); const p = geo.attributes.position; const col = new Float32Array(p.count * 3); const uv = geo.attributes.uv;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n1 = noise(v.x * 1.3 + seed * 9, v.y * 1.3, v.z * 1.3), n2 = noise(v.x * 3.2, v.y * 3.2 + seed * 5, v.z * 3.2);
      const k = 0.72 + n1 * 0.5 + n2 * 0.14; v.multiplyScalar(k); v.y *= sy; if (v.y < -0.25) v.y = -0.25;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals(); const nr = geo.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); const up = nr.getY(i);
      const ax = Math.abs(nr.getX(i)), az = Math.abs(nr.getZ(i));          // 면이 향한 쪽에 맞춰 질감을 입힌다
      if (up > 0.7) uv.setXY(i, v.x * s / 4.7, v.z * s / 4.7); else if (ax > az) uv.setXY(i, v.z * s / 4.7, v.y * s / 4.7); else uv.setXY(i, v.x * s / 4.7, v.y * s / 4.7);
      const moss = Math.min(1, Math.max(0, (up - 0.6) * 1.8)) * noise(v.x * 3, v.z * 3) * 0.9; const low = Math.min(1, Math.max(0.55, 0.62 + v.y * 0.7));
      col[i * 3] = (1.25 - moss * 0.6) * low; col[i * 3 + 1] = (1.2 - moss * 0.1) * low; col[i * 3 + 2] = (1.3 - moss * 0.7) * low;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, rockMat); m.scale.setScalar(s); m.position.set(x, 0.2 * s + height(x, z), z); m.rotation.y = r() * 6;
    m.castShadow = m.receiveShadow = true; scene.add(m); blobs.push(new THREE.Vector3(x, z, s * 1.7)); return m;
  };
  mkRock(ROCK.x, ROCK.z, 0.8, 0.75, 1); mkRock(ROCK.x - 0.85, ROCK.z + 0.7, 0.4, 0.7, 2);
  mkRock(8.4, -2.4, 0.75, 0.7, 3); mkRock(-9.6, 3.6, 0.85, 0.7, 4); mkRock(7.8, 4.3, 0.4, 0.6, 5); mkRock(-3.4, -4.6, 0.55, 0.7, 6); mkRock(POND.x + 1.9, POND.z + 0.5, 0.26, 0.6, 7); mkRock(POND.x - 1.8, POND.z - 0.4, 0.2, 0.6, 8);

  // ── 나무: 뿌리 쪽이 벌어지고 살짝 휜 줄기 + 화면을 보는 잎 뭉치 수십 장 ────────────
  const barkMat = new THREE.MeshStandardMaterial({ map: tex('bark', { repeat: [2, 3] }), normalMap: tex('bark', { normal: true, repeat: [2, 3] }), roughness: 1 });
  const clumpT = pixTex(64, 64, (g, w, h) => {
    const cols = ['#123a28', '#1b4e31', '#27683a', '#3a8544', '#5aa552', '#8cc968'];
    for (let i = 0; i < 150; i++) {
      const a = r() * 6.28, rad = Math.sqrt(r()) * 25; const x = 32 + Math.cos(a) * rad, y = 33 + Math.sin(a) * rad * 0.85;
      const lit = (1 - y / h) * 0.75 + (1 - x / w) * 0.2 + r() * 0.25; const ci = Math.max(0, Math.min(5, Math.floor(lit * 6.2 - 0.6)));
      g.fillStyle = cols[ci]; const s = 2 + Math.floor(r() * 3);
      g.fillRect(Math.round(x - s), Math.round(y - s / 2), s * 2, s); g.fillRect(Math.round(x - s / 2), Math.round(y - s), s, s * 2);
    }
  });
  const clumps = []; // [x, y, z, 크기, 밝기, 씨앗]
  const mkTree = (x, z, s = 1, shadow = true, seed = 1) => {
    const H = 7.6 * s; const geo = new THREE.CylinderGeometry(0.27 * s, 0.42 * s, H, 10, 8, true); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) + H / 2; const flare = 1 + 1.1 * Math.exp(-y * 1.5 / s) + (noise(p.getX(i) * 3 + seed, y * 0.8, p.getZ(i) * 3) - 0.5) * 0.25;
      p.setXYZ(i, p.getX(i) * flare + Math.sin(y * 0.28 + seed) * 0.22 * s, p.getY(i), p.getZ(i) * flare + Math.cos(y * 0.21 + seed * 2) * 0.12 * s);
    }
    geo.computeVertexNormals();
    const trunk = new THREE.Mesh(geo, barkMat); trunk.position.set(x, H / 2 - 0.1 + height(x, z), z); trunk.castShadow = shadow; trunk.receiveShadow = true; scene.add(trunk);
    blobs.push(new THREE.Vector3(x, z, 2.1 * s));
    const cx = x + Math.sin(H * 0.28 + seed) * 0.22 * s, top = H * 0.74;
    for (let i = 0; i < 16; i++) {
      const a = r() * 6.28, rad = Math.sqrt(r()) * 2.5 * s, yy = top + (r() - 0.4) * 3.0 * s;
      clumps.push([cx + Math.cos(a) * rad, yy, z + Math.sin(a) * rad * 0.6, (2.2 + r() * 1.3) * s, 0.45 + (yy - top) / (3.4 * s) + r() * 0.2, r()]);
    }
  };
  mkTree(TREE.x, TREE.z, 1.05, true, 1);
  [[-9.5, -4.5, 1.2], [6.8, -4.2, 1.15], [10.5, -2, 1.3], [-12.4, -1, 1.3], [2.8, -6.5, 1.25], [-5, -7, 1.3], [13, -6, 1.4], [-15, -6, 1.4], [9, -9, 1.5], [-9, -10, 1.5], [0, -11, 1.6], [16, -11, 1.6], [-18, -11, 1.6], [5, -12, 1.6], [-4.5, -12.5, 1.6]]
    .forEach(([x, z, s], i) => mkTree(x, z, s, z > -5, i + 2));
  // 덤불도 같은 잎 뭉치로
  for (let i = 0; i < 34; i++) { let x, z; do { x = (r() - 0.5) * 40; z = -11 + r() * 17; } while (arenaD(x, z) < 1.12 || Math.hypot(x - POND.x, z - POND.z) < 2.6 || Math.hypot(x - ROCK.x, z - ROCK.z) < 3.2 || Math.hypot(x - TREE.x, z - TREE.z) < 3); clumps.push([x, 0.45 + r() * 0.3 + height(x, z), z, 1.3 + r() * 1.1, 0.3 + r() * 0.35, r()]); }
  // 카메라 앞을 가리는 어두운 잎 (흐려져서 깊이를 준다)
  [[-9.6, 6.9, 9.5, 6], [-6.4, 7.7, 9.2, 4.6], [-3.4, 8.2, 9.0, 3.6], [9.8, 7.1, 9.5, 6], [6.6, 7.9, 9.2, 4.6], [3.2, 8.3, 9.0, 3.4], [-11.6, 0.9, 10.5, 4.6], [11.9, 0.8, 10.5, 4.6]].forEach(([x, y, z, s]) => clumps.push([x, y, z, s, -0.25, r()]));
  const cg = new THREE.InstancedBufferGeometry(); cg.index = new THREE.PlaneGeometry(1, 1).index; cg.setAttribute('position', new THREE.PlaneGeometry(1, 1).attributes.position); cg.setAttribute('uv', new THREE.PlaneGeometry(1, 1).attributes.uv);
  cg.setAttribute('iPos', new THREE.InstancedBufferAttribute(new Float32Array(clumps.flatMap((c) => [c[0], c[1], c[2]])), 3));
  cg.setAttribute('iInfo', new THREE.InstancedBufferAttribute(new Float32Array(clumps.flatMap((c) => [c[3], c[4], c[5]])), 3));
  cg.instanceCount = clumps.length;
  const clumpMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: clumpT }, t: T, fogColor: { value: FOG } },
    vertexShader: `attribute vec3 iPos, iInfo; uniform float t; varying vec2 vUv; varying float vShade, vFog;
      void main(){ vUv = uv; if (iInfo.z > 0.5) vUv.x = 1.0 - vUv.x;
        vec4 mv = viewMatrix * vec4(iPos, 1.0);
        mv.xy += position.xy * iInfo.x; mv.x += sin(t * 0.8 + iInfo.z * 40.0 + iPos.y) * 0.07 * iInfo.x * (uv.y + 0.3); mv.y += sin(t * 1.1 + iInfo.z * 20.0) * 0.02 * iInfo.x;
        vShade = iInfo.y; vFog = smoothstep(18.0, 46.0, -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 fogColor; varying vec2 vUv; varying float vShade, vFog;
      void main(){ vec4 c = texture2D(map, vUv); if (c.a < 0.5) discard;
        vec3 col = c.rgb * (0.42 + clamp(vShade, -0.3, 1.2) * 0.95); col += vec3(0.25, 0.22, 0.05) * max(0.0, vShade - 0.7);   // 꼭대기는 햇빛을 받아 노르스름하게
        gl_FragColor = vec4(mix(col, fogColor, vFog * step(0.0, vShade)), 1.0); }`,
  });
  const canopy = new THREE.Mesh(cg, clumpMat); canopy.frustumCulled = false; scene.add(canopy);

  // ── 풀: 뿌리는 어둡고 끝은 밝은 포기가 바람에 흔들린다 ──────────────────────
  const tuftT = pixTex(24, 24, (g) => { const cols = ['#2c5a2a', '#3f7a35', '#5b9a45', '#86c05a']; for (let i = 0; i < 15; i++) { const x = 2 + Math.floor(r() * 20), hh = 7 + Math.floor(r() * 16), lean = r() < 0.5 ? -1 : 1; for (let y = 0; y < hh; y++) { g.fillStyle = cols[Math.min(3, Math.floor((y / hh) * 3.6 + (i % 3 === 0 ? 0.6 : 0)))]; g.fillRect(x + Math.round((y / hh) ** 2 * 2.5 * lean), 23 - y, y < hh * 0.6 ? 2 : 1, 1); } } });
  const N = 1500;
  const tuftMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tuftT }, t: T, fogColor: { value: FOG } },
    vertexShader: `uniform float t; varying vec2 vUv; varying float vFog;
      void main(){ vUv = uv; vec4 wp = instanceMatrix * vec4(position, 1.0);
        float gust = sin(t * 0.6 + wp.x * 0.25) * 0.5 + 0.5;
        wp.x += (sin(t * 1.9 + wp.x * 1.1 + wp.z * 1.7) * 0.06 + gust * 0.08) * uv.y * uv.y;
        vec4 mv = viewMatrix * wp; vFog = smoothstep(18.0, 46.0, -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 fogColor; varying vec2 vUv; varying float vFog;
      void main(){ vec4 c = texture2D(map, vUv); if (c.a < 0.5) discard; gl_FragColor = vec4(mix(c.rgb * (0.8 + vUv.y * 0.3), fogColor, vFog), 1.0); }`,
  });
  const tufts = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.9, 0.9), tuftMat, N);
  const M = new THREE.Matrix4();
  for (let i = 0; i < N; i++) {
    let x, z, d;
    do { x = (r() - 0.5) * 48; z = -13 + r() * 21.5; d = arenaD(x, z); } while (d < 0.97 + r() * 0.16 || Math.hypot(x - POND.x, (z - POND.z) * 1.5) < 2.0);
    const s = (0.6 + r() * 0.8) * (d < 1.25 ? 0.75 : 1);
    M.makeScale(s * (r() < 0.5 ? -1 : 1), s, 1); M.setPosition(x, 0.42 * s + height(x, z), z); tufts.setMatrixAt(i, M);
  }
  tufts.frustumCulled = false; scene.add(tufts);
  // 꽃
  const flowerT = pixTex(16, 8, (g) => { [[0, '#fff3c4', '#ffb347'], [8, '#ffc0d8', '#ff5a8a']].forEach(([o, a, b]) => { g.fillStyle = '#3a7a36'; g.fillRect(o + 3, 4, 1, 4); g.fillStyle = a; g.fillRect(o + 2, 1, 3, 3); g.fillRect(o + 1, 2, 5, 1); g.fillStyle = b; g.fillRect(o + 3, 2, 1, 1); }); });
  [0, 0.5].forEach((off) => {
    const ft = flowerT.clone(); ft.repeat.set(0.5, 1); ft.offset.set(off, 0); ft.needsUpdate = true;
    const fl = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: ft, alphaTest: 0.5 }), 40);
    for (let i = 0; i < 40; i++) { let x, z; do { x = (r() - 0.5) * 36; z = -8 + r() * 15; } while (arenaD(x, z) < 1.0); M.makeScale(1, 1, 1); M.setPosition(x, 0.15 + height(x, z), z); fl.setMatrixAt(i, M); }
    scene.add(fl);
  });

  gUni.uBlobs.value = Array.from({ length: 24 }, (_, i) => blobs[i] || new THREE.Vector3(0, 0, 0));

  // ── 빛 ───────────────────────────────────────────────────────────
  scene.add(new THREE.HemisphereLight(0xcfe9f2, 0x2c4a34, 0.6));
  const sun = new THREE.DirectionalLight(0xffe2ac, 3.2);
  sun.position.set(7, 13, 8); sun.target.position.set(0, 0, -1);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 12, bottom: -10, near: 1, far: 40 });
  sun.shadow.bias = -0.0012; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(0x9fd0ff, 0.5); rim.position.set(-8, 6, -6); scene.add(rim);   // 뒤쪽에서 오는 푸른 빛으로 윤곽을 살린다
  const fxLight = new THREE.PointLight(0xffaa55, 0, 14, 1.6); fxLight.position.set(0, 2, 2); scene.add(fxLight);

  // 빛줄기: 줄무늬가 천천히 흐른다
  const shaftMat = () => new THREE.ShaderMaterial({
    uniforms: { t: T, seed: { value: r() * 10 }, op: { value: 0.5 } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float t, seed, op; varying vec2 vUv;
      float hsh(float p){ return fract(sin(p * 91.345 + seed) * 47453.5453); }
      void main(){ float x = vUv.x * 9.0 + sin(t * 0.07 + seed) * 0.6; float s = mix(hsh(floor(x)), hsh(floor(x) + 1.0), smoothstep(0.0, 1.0, fract(x)));
        float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x); float fall = pow(vUv.y, 1.6) * smoothstep(0.0, 0.12, vUv.y);
        float a = (0.35 + s * 0.65) * edge * fall * op * (0.8 + 0.2 * sin(t * 0.5 + seed));
        gl_FragColor = vec4(vec3(1.0, 0.94, 0.72) * a, a); }`,
  });
  [[-4.6, -3, 3.4, 0.5], [1.6, -4.6, 4.4, 0.42], [6.8, -2.6, 3.0, 0.4], [-10.5, -5, 4.6, 0.36], [3.4, 0.8, 2.4, 0.26], [-1.2, 1.6, 2.0, 0.2]].forEach(([x, z, w, op]) => {
    const mat = shaftMat(); mat.uniforms.op.value = op;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 13), mat); m.position.set(x + 1.9, 6.1, z); m.rotation.z = -0.3; m.renderOrder = 3; scene.add(m);
  });
  // 낮게 깔린 안개
  const mistT = pixTex(64, 16, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.6, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const gx = g.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.3, 'rgba(0,0,0,0)'); gx.addColorStop(0.7, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, w, h); });
  mistT.magFilter = THREE.LinearFilter;
  const mists = [[-6, -6.5, 26], [8, -8.5, 30], [-2, -10.5, 40], [3, -4.2, 20]].map(([x, z, w], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.2), new THREE.MeshBasicMaterial({ map: mistT, transparent: true, depthWrite: false, opacity: 0.2, color: 0xcfeede, fog: false }));
    m.position.set(x, 1.3, z); scene.add(m); return { m, x, p: i * 1.9 };
  });

  // 떠다니는 빛가루
  const MN = 130; const mp = new Float32Array(MN * 3); const seeds = [];
  for (let i = 0; i < MN; i++) { mp[i * 3] = (r() - 0.5) * 26; mp[i * 3 + 1] = 0.3 + r() * 6; mp[i * 3 + 2] = -6 + r() * 14; seeds.push(r() * 6); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const dotT = pixTex(4, 4, (g) => { g.fillStyle = '#fff'; g.fillRect(1, 0, 2, 4); g.fillRect(0, 1, 4, 2); });
  const motes = new THREE.Points(mg, new THREE.PointsMaterial({ map: dotT, size: 0.1, transparent: true, opacity: 0.75, color: 0xfff2b0, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(motes);

  return {
    fxLight, pond,
    update() {
      const t = clock.t; T.value = t;
      pondMat.uniforms.splash.value *= 0.92;
      mists.forEach((s) => { s.m.position.x = s.x + Math.sin(t * 0.06 + s.p) * 2.5; s.m.material.opacity = 0.16 + Math.sin(t * 0.2 + s.p) * 0.06; });
      const a = mg.attributes.position;
      for (let i = 0; i < MN; i++) { a.array[i * 3] += Math.sin(t * 0.4 + seeds[i]) * 0.003; a.array[i * 3 + 1] += Math.sin(t * 0.6 + seeds[i] * 2) * 0.002 + 0.0012; if (a.array[i * 3 + 1] > 7) a.array[i * 3 + 1] = 0.3; }
      a.needsUpdate = true;
      fxLight.intensity *= 0.86;
    },
    splash() { pondMat.uniforms.splash.value = 1; },
    light(color, intensity, pos) { fxLight.color.set(color); fxLight.intensity = intensity; if (pos) fxLight.position.set(pos.x, pos.y + 1, pos.z + 1.5); },
  };
}
