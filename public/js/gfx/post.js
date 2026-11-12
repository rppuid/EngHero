// 화면 후처리: 거리 기반 초점 흐림(카메라가 보는 곳이 또렷하고 앞뒤는 흐리다), 빛 번짐,
// 가장자리 어둡게, 색 보정, 타격 순간의 색 번짐과 섬광
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { TexturePass } from 'three/addons/postprocessing/TexturePass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const Lens = {
  uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, res: { value: new THREE.Vector2(1, 1) }, near: { value: 0.1 }, far: { value: 120 }, focus: { value: 17 }, range: { value: 6 }, blur: { value: 1 }, impact: { value: 0 }, flash: { value: 0 }, dim: { value: 0 }, sat: { value: 1.05 }, bars: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `
    uniform sampler2D tDiffuse, tDepth; uniform vec2 res; uniform float near, far, focus, range, blur, impact, flash, dim, sat, bars; varying vec2 vUv;
    float viewZ(vec2 uv){ float d = texture2D(tDepth, uv).x; float z = d * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
    float coc(vec2 uv){ float z = viewZ(uv); float d = z - focus; return clamp((abs(d) - range * (d < 0.0 ? 0.45 : 1.0)) / (d < 0.0 ? 5.0 : 16.0), 0.0, 1.0); }
    void main(){
      vec2 uv = vUv;
      float c0 = coc(uv);
      vec3 c = texture2D(tDiffuse, uv).rgb;
      if (blur > 0.0 && c0 > 0.02) {
        float rad = c0 * 7.0 * blur * res.y / 720.0; vec3 acc = c; float w = 1.0;
        for (int i = 0; i < 16; i++) {
          float a = float(i) * 2.39996; float rr = sqrt((float(i) + 0.5) / 16.0);
          vec2 o = vec2(cos(a), sin(a)) * rr * rad / res;
          float cs = coc(uv + o); float k = max(cs, 0.15);          // 또렷한 것이 흐린 배경으로 번지지 않게
          acc += texture2D(tDiffuse, uv + o).rgb * k; w += k;
        }
        c = acc / w;
      }
      vec2 dir = uv - 0.5; float ca = impact * 0.012;
      if (impact > 0.001) { c.r = mix(c.r, texture2D(tDiffuse, uv + dir * ca).r, 0.8); c.b = mix(c.b, texture2D(tDiffuse, uv - dir * ca).b, 0.8); }
      // 색 보정: 그늘은 푸르게, 밝은 곳은 따뜻하게
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, sat);
      c *= mix(vec3(0.94, 1.0, 1.08), vec3(1.06, 1.0, 0.92), smoothstep(0.1, 0.7, l));
      c = (c - 0.5) * 1.08 + 0.5;
      float v = smoothstep(1.15, 0.35, length(dir * vec2(1.0, 1.25)));
      c *= mix(0.5, 1.0, v);
      c *= 1.0 - dim * 0.6;
      c += flash;
      float bar = step(uv.y, bars * 0.11) + step(1.0 - bars * 0.11, uv.y);
      c *= 1.0 - min(1.0, bar);
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export function makePost(renderer, scene, camera) {
  // 장면을 깊이와 함께 따로 그려 둔다 (흐림 계산에 깊이가 필요하다)
  const sceneRT = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(2, 2) });
  sceneRT.depthTexture.type = THREE.UnsignedIntType;
  const composer = new EffectComposer(renderer);
  composer.addPass(new TexturePass(sceneRT.texture));
  const lens = new ShaderPass(Lens);
  lens.uniforms.tDepth.value = sceneRT.depthTexture;
  composer.addPass(lens);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.75, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return {
    composer, bloom, u: lens.uniforms,
    resize(w, h, pr) { composer.setPixelRatio(pr); composer.setSize(w, h); sceneRT.setSize(Math.round(w * pr), Math.round(h * pr)); lens.uniforms.res.value.set(w * pr, h * pr); },
    update(dt) {
      const u = lens.uniforms;
      u.impact.value *= Math.exp(-dt * 8);
      u.flash.value *= Math.exp(-dt * 7);
      u.near.value = camera.near; u.far.value = camera.far;
    },
    render() { renderer.setRenderTarget(sceneRT); renderer.render(scene, camera); renderer.setRenderTarget(null); composer.render(); },
  };
}
