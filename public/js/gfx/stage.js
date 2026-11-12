// 숲 전투 무대: 3D 지형과 소품에 도트 무늬를 입히고, 빛줄기·안개·떠다니는 빛가루로 깊이를 낸다.
import * as THREE from 'three';
import { clock } from '../core/time.js';

// 자리 이름 → 무대 좌표
export const SPOTS = {
  open: [[-3.3, 0, 0.6], [-1.2, 0, 1.6], [-4.6, 0, -0.5]],
  behindRock: [[-5.75, 0, -1.9]],
  nextToTree: [[-0.95, 0, -2.3]],
  inWater: [[-1.9, 0, 3.0]],
  party: [[2.4, 0, 1.9], [4.6, 0, 0.5], [6.7, 0, -0.9]],
};
export const ROCK = new THREE.Vector3(-5.9, 0, -0.75);
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
function speckle(g, w, h, base, cols, n, r) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1 + (r() < 0.3), 1 + (r() < 0.2)); }
}

export function buildStage(scene) {
  const r = rng(7);
  scene.fog = new THREE.Fog(0x2c5148, 17, 44);

  // 먼 배경: 하늘빛이 숲 사이로 비치는 그림
  const sky = pixTex(480, 270, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#132a2a'); gr.addColorStop(0.45, '#2f6455'); gr.addColorStop(0.72, '#7fb277'); gr.addColorStop(1, '#27503f');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const sun = g.createRadialGradient(w * 0.6, h * 0.5, 4, w * 0.6, h * 0.5, 170);
    sun.addColorStop(0, 'rgba(255,244,190,.75)'); sun.addColorStop(0.4, 'rgba(255,230,150,.25)'); sun.addColorStop(1, 'rgba(255,230,150,0)');
    g.fillStyle = sun; g.fillRect(0, 0, w, h);
    for (let L = 0; L < 3; L++) { // 겹겹이 선 먼 나무 그림자
      g.fillStyle = ['#2a5a4c', '#1f463d', '#16332f'][L];
      for (let x = -4; x < w; x += 12 + Math.floor(r() * 26)) {
        const tw = 5 + Math.floor(r() * 9), th = 90 + r() * 120 + L * 24;
        g.fillRect(x, h - th, tw, th);
        g.beginPath(); g.ellipse(x + tw / 2, h - th, 18 + r() * 22, 14 + r() * 18, 0, 0, 7); g.fill();
      }
    }
  });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(90, 50), new THREE.MeshBasicMaterial({ map: sky, fog: false }));
  back.position.set(0, 14, -30); scene.add(back);
  scene.background = new THREE.Color(0x16302f);

  // 땅
  const grass = pixTex(64, 64, (g, w, h) => speckle(g, w, h, '#47763a', ['#528541', '#3d6a34', '#5b8f47', '#356030', '#659a4d'], 900, r), [26, 19]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 50), new THREE.MeshStandardMaterial({ map: grass, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // 싸움터 흙바닥 (가장자리가 풀에 스며든다)
  const dirtT = pixTex(380, 168, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
      const d = Math.sqrt(dx * dx + dy * dy) + (r() - 0.5) * 0.16 + Math.sin(Math.atan2(dy, dx) * 7) * 0.03;
      const o = (y * w + x) * 4; const v = r();
      const c = v < 0.12 ? [138, 112, 80] : v < 0.3 ? [158, 130, 92] : v < 0.92 ? [171, 142, 101] : [190, 162, 118];
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = d < 0.82 ? 255 : 0;
    }
    g.putImageData(img, 0, 0);
  });
  const dirt = new THREE.Mesh(new THREE.PlaneGeometry(19, 8.4), new THREE.MeshStandardMaterial({ map: dirtT, alphaTest: 0.5, roughness: 1 }));
  dirt.rotation.x = -Math.PI / 2; dirt.position.set(0.2, 0.01, 0.4); dirt.receiveShadow = true; scene.add(dirt);

  // 연못
  const pondMat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, splash: { value: 0 } }, transparent: true,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float t, splash; varying vec2 vUv;
      void main(){ vec2 p = floor(vUv * 66.0) / 66.0 - 0.5; float d = length(p * vec2(1.0, 1.15));
        float edge = d + sin(atan(p.y, p.x) * 5.0 + 1.0) * 0.012; if (edge > 0.47) discard;
        float w = sin(d * 46.0 - t * 2.2) * 0.5 + 0.5; float w2 = sin(p.x * 30.0 + t * 1.3) * sin(p.y * 22.0 - t) ;
        vec3 c = mix(vec3(0.10, 0.36, 0.52), vec3(0.22, 0.62, 0.78), smoothstep(0.5, 0.0, d));
        c += step(0.86, w) * 0.16 + step(0.8, w2) * 0.1 + splash * 0.5;
        c = mix(c, vec3(0.75, 0.95, 1.0), step(0.435, edge) * 0.55);
        gl_FragColor = vec4(c, 0.94); }`,
  });
  const pond = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 2.1), pondMat);
  pond.rotation.x = -Math.PI / 2; pond.position.set(POND.x, 0.03, POND.z); scene.add(pond);

  // 바위
  const stoneT = pixTex(32, 32, (g, w, h) => speckle(g, w, h, '#7d8791', ['#6b757f', '#8f99a3', '#5d6770', '#a3adb6'], 260, r), [2, 2]);
  const temp = new THREE.Group(); scene.add(temp); const rockAt = [], treeAt = [];
  const mkRock = (x, y, z, s, sy = 0.8) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ map: stoneT, flatShading: true, roughness: 0.95 }));
    m.scale.set(s * 1.25, s * sy, s); m.position.set(x, y, z); m.rotation.set(r() * 3, r() * 3, r() * 3);
    m.castShadow = m.receiveShadow = true; temp.add(m); rockAt.push([x, z, s]); return m;
  };
  mkRock(ROCK.x, 0.4, ROCK.z, 0.82, 0.8); mkRock(ROCK.x - 0.9, 0.18, ROCK.z + 0.55, 0.4);
  mkRock(8.2, 0.3, -2.6, 0.7); mkRock(-9.5, 0.3, 3.4, 0.8); mkRock(7.4, 0.15, 4.2, 0.4);

  // 나무: 줄기는 3D, 잎은 도트 그림 판을 겹쳐 세운다
  const barkT = pixTex(16, 32, (g, w, h) => { speckle(g, w, h, '#6b4a34', ['#5a3d2b', '#7d5a40', '#4c3325'], 160, r); g.fillStyle = '#4c3325'; for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1, h); }, [3, 3]);
  const leafT = pixTex(144, 120, (g, w, h) => {
    const cols = ['#143f2c', '#1c5234', '#28663c', '#3a7d45', '#559a52'];
    for (let i = 0; i < 150; i++) {
      const x = 16 + r() * (w - 32), y = 16 + r() * (h - 32), rad = 7 + r() * 9;
      const d = Math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2)); if (d > 0.85) continue;
      for (let k = 0; k < 3; k++) { g.fillStyle = cols[Math.min(4, k + (y < h * 0.4 ? 1 : 0) + (r() < 0.25 ? 1 : 0))]; g.beginPath(); g.arc(Math.round(x - k * 1.5), Math.round(y - k * 2.5), Math.max(1, rad - k * 3), 0, 7); g.fill(); }
    }
  });
  const leafMat = new THREE.MeshStandardMaterial({ map: leafT, alphaTest: 0.5, roughness: 1, side: THREE.DoubleSide });
  const leaves = [];
  const mkTree = (x, z, s = 1, shadow = true) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * s, 0.48 * s, 7.4 * s, 7), new THREE.MeshStandardMaterial({ map: barkT, flatShading: true, roughness: 1 }));
    trunk.position.set(x, 3.7 * s, z); trunk.castShadow = shadow; trunk.receiveShadow = true; temp.add(trunk); treeAt.push([x, z, s, shadow]);
    for (let i = 0; i < 4; i++) {
      const lf = new THREE.Mesh(new THREE.PlaneGeometry(4.6 * s, 3.8 * s), leafMat);
      lf.position.set(x + (r() - 0.5) * 1.8 * s, (5.6 + r() * 1.8) * s, z + 0.3 + (r() - 0.5) * 0.8);
      lf.castShadow = shadow; temp.add(lf); leaves.push({ m: lf, x: lf.position.x, p: r() * 6 });
    }
  };
  mkTree(TREE.x, TREE.z, 1.05);
  [[-9.5, -4.5, 1.2], [6.8, -4.2, 1.15], [10.5, -2, 1.3], [-12, -1, 1.3], [2.8, -6.5, 1.25], [-5, -7, 1.3], [13, -6, 1.4], [-15, -6, 1.4], [9, -9, 1.5], [-9, -10, 1.5], [0, -11, 1.6], [16, -11, 1.6], [-18, -11, 1.6]]
    .forEach(([x, z, s]) => mkTree(x, z, s, z > -5));

  // 풀 포기 (바람에 흔들린다)
  const tuftT = pixTex(16, 16, (g) => { const cols = ['#33682f', '#467f3c', '#5f9a4c']; for (let i = 0; i < 9; i++) { const x = 2 + Math.floor(r() * 12), hh = 5 + Math.floor(r() * 9); g.fillStyle = cols[i % 3]; g.fillRect(x, 16 - hh, 1, hh); if (r() < 0.5) g.fillRect(x + (r() < 0.5 ? 1 : -1), 16 - hh + 1, 1, 2); } });
  const N = 420;
  const tuftMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tuftT }, t: { value: 0 }, fogColor: { value: scene.fog.color } },
    vertexShader: `uniform float t; varying vec2 vUv; varying float vFog;
      void main(){ vUv = uv; vec4 wp = instanceMatrix * vec4(position, 1.0);
        wp.x += sin(t * 1.7 + wp.x * 0.9 + wp.z * 1.3) * 0.09 * uv.y;
        vec4 mv = modelViewMatrix * wp; vFog = smoothstep(16.0, 46.0, -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 fogColor; varying vec2 vUv; varying float vFog;
      void main(){ vec4 c = texture2D(map, vUv); if (c.a < 0.5) discard; gl_FragColor = vec4(mix(c.rgb * 0.95, fogColor, vFog), 1.0); }`,
  });
  const tufts = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.62, 0.62), tuftMat, N);
  const M = new THREE.Matrix4();
  for (let i = 0; i < N; i++) {
    let x, z;
    do { x = (r() - 0.5) * 44; z = -13 + r() * 21; } while (Math.abs(x - 0.2) / 9.3 < 1 && Math.abs(z - 0.4) / 4 < 1 && ((x - 0.2) / 9.3) ** 2 + ((z - 0.4) / 4) ** 2 < 0.8 || Math.hypot(x - POND.x, (z - POND.z) * 1.5) < 2.0);
    const s = 0.7 + r() * 0.9;
    M.makeScale(s, s, 1); M.setPosition(x, 0.3 * s, z); tufts.setMatrixAt(i, M);
  }
  scene.add(tufts);

  // 꽃
  const flowerT = pixTex(8, 8, (g) => { g.fillStyle = '#3a7a36'; g.fillRect(3, 4, 1, 4); g.fillStyle = '#fff3c4'; g.fillRect(2, 2, 3, 3); g.fillStyle = '#ffb347'; g.fillRect(3, 3, 1, 1); });
  const fl = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: flowerT, alphaTest: 0.5 }), 60);
  for (let i = 0; i < 60; i++) { M.makeScale(1, 1, 1); M.setPosition((r() - 0.5) * 34, 0.15, -8 + r() * 15); fl.setMatrixAt(i, M); }
  scene.add(fl);

  // 빛
  scene.add(new THREE.HemisphereLight(0xcfe6f5, 0x2f4a36, 1.0));
  const sun = new THREE.DirectionalLight(0xffe2b0, 2.3);
  sun.position.set(7, 13, 8); sun.target.position.set(0, 0, -1);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 12, bottom: -10, near: 1, far: 40 });
  sun.shadow.bias = -0.0015; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const fxLight = new THREE.PointLight(0xffaa55, 0, 14, 1.6); fxLight.position.set(0, 2, 2); scene.add(fxLight);

  // 나뭇잎 사이로 내리는 빛줄기
  const shaftT = pixTex(16, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,240,180,.5)'); gr.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const gx = g.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.5, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, w, h); });
  shaftT.magFilter = THREE.LinearFilter;
  const shafts = [];
  [[-4.5, -3, 1.6], [1.5, -4.5, 2.2], [6.5, -2.5, 1.4], [-10, -5, 2.4], [3.5, 1, 1.1]].forEach(([x, z, w], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 11), new THREE.MeshBasicMaterial({ map: shaftT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5, fog: false }));
    m.position.set(x, 5.2, z); m.rotation.z = -0.32; scene.add(m); shafts.push({ m, p: i * 1.3 });
  });

  // 떠다니는 빛가루
  const MN = 110; const mp = new Float32Array(MN * 3); const seeds = [];
  for (let i = 0; i < MN; i++) { mp[i * 3] = (r() - 0.5) * 26; mp[i * 3 + 1] = 0.3 + r() * 6; mp[i * 3 + 2] = -6 + r() * 14; seeds.push(r() * 6); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const dotT = pixTex(4, 4, (g) => { g.fillStyle = '#fff'; g.fillRect(1, 0, 2, 4); g.fillRect(0, 1, 4, 2); });
  const motes = new THREE.Points(mg, new THREE.PointsMaterial({ map: dotT, size: 0.11, transparent: true, opacity: 0.8, color: 0xfff2b0, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(motes);

  // 카메라 바로 앞의 어두운 잎 (흐려져서 깊이를 준다)
  [[-9.6, 7.6, 9, 0.5], [9.9, 7.9, 9, -0.6]].forEach(([x, y, z, rot]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(7, 5.6), new THREE.MeshBasicMaterial({ map: leafT, alphaTest: 0.5, color: 0x1a2c22, fog: false }));
    m.position.set(x, y, z); m.rotation.z = rot; scene.add(m); leaves.push({ m, x, p: r() * 6, amp: 0.12 });
  });

  return {
    fxLight, pond,
    update() {
      const t = clock.t;
      pondMat.uniforms.t.value = t; pondMat.uniforms.splash.value *= 0.92;
      tuftMat.uniforms.t.value = t;
      leaves.forEach((l) => { l.m.position.x = l.x + Math.sin(t * 0.8 + l.p) * (l.amp || 0.05); });
      shafts.forEach((s) => { s.m.material.opacity = 0.34 + Math.sin(t * 0.5 + s.p) * 0.14; });
      const a = mg.attributes.position;
      for (let i = 0; i < MN; i++) { a.array[i * 3] += Math.sin(t * 0.4 + seeds[i]) * 0.003; a.array[i * 3 + 1] += Math.sin(t * 0.6 + seeds[i] * 2) * 0.002 + 0.0012; if (a.array[i * 3 + 1] > 7) a.array[i * 3 + 1] = 0.3; }
      a.needsUpdate = true;
      fxLight.intensity *= 0.86;
    },
    splash() { pondMat.uniforms.splash.value = 1; },
    light(color, intensity, pos) { fxLight.color.set(color); fxLight.intensity = intensity; if (pos) fxLight.position.set(pos.x, pos.y + 1, pos.z + 1.5); },
  };
}
