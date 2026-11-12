// 화면 후처리: 빛 번짐, 위아래 흐림(미니어처 느낌), 가장자리 어둡게, 타격 순간의 색 번짐과 섬광
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const Lens = {
  uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(1, 1) }, focus: { value: 0.46 }, blur: { value: 1 }, impact: { value: 0 }, flash: { value: 0 }, dim: { value: 0 }, sat: { value: 1.02 }, bars: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float focus, blur, impact, flash, dim, sat, bars; varying vec2 vUv;
    void main(){
      vec2 uv = vUv;
      float d = abs(uv.y - focus);
      float r = smoothstep(0.16, 0.5, d) * 5.0 * blur;
      vec2 px = r / res;
      vec3 c = vec3(0.); float w = 0.;
      for (int i = 0; i < 12; i++) {
        float a = float(i) * 2.39996; float rad = sqrt(float(i) / 12.0);
        vec2 o = vec2(cos(a), sin(a)) * rad * px;
        c += texture2D(tDiffuse, uv + o).rgb; w += 1.;
      }
      c /= w;
      // 타격 순간: 가운데에서 바깥으로 색이 갈라진다
      vec2 dir = uv - 0.5; float ca = impact * 0.012;
      if (impact > 0.001) {
        c.r = mix(c.r, texture2D(tDiffuse, uv + dir * ca).r, 0.8);
        c.b = mix(c.b, texture2D(tDiffuse, uv - dir * ca).b, 0.8);
      }
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, sat);
      c = (c - 0.5) * 1.06 + 0.5;
      float v = smoothstep(1.15, 0.35, length(dir * vec2(1.0, 1.25)));
      c *= mix(0.55, 1.0, v);
      c *= 1.0 - dim * 0.6;
      c += flash;
      float bar = step(uv.y, bars * 0.11) + step(1.0 - bars * 0.11, uv.y);
      c *= 1.0 - min(1.0, bar);
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export function makePost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.7, 0.82);
  composer.addPass(bloom);
  const lens = new ShaderPass(Lens);
  composer.addPass(lens);
  composer.addPass(new OutputPass());
  return {
    composer, bloom, u: lens.uniforms,
    resize(w, h, pr) { composer.setPixelRatio(pr); composer.setSize(w, h); lens.uniforms.res.value.set(w * pr, h * pr); },
    update(dt) {
      const u = lens.uniforms;
      u.impact.value *= Math.exp(-dt * 8);
      u.flash.value *= Math.exp(-dt * 7);
    },
    render() { composer.render(); },
  };
}
