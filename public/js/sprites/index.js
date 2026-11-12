// 스프라이트 만들기: 인물은 장면 단위 동작 그림, 적은 도트 격자 한 장
import slime from './slime.js';
import wolf from './wolf.js';
import tree from './tree.js';
import mushroom from './mushroom.js';
import bee from './bee.js';
import boss_bear from './boss_bear.js';
import { PixelSprite, hueShift } from '../gfx/pixel.js';
import { FrameSprite } from '../gfx/frames.js';

// foot: 발 기준점. pts: 효과가 나오는 점 (장면 96×96 또는 격자 좌표)
export const RIGS = {
  maru: { anim: true, pts: { chest: [46, 56], tip: [10, 50] } },
  muji: { anim: true, pts: { chest: [46, 58], tip: [14, 40] } },
  naru: { anim: true, pts: { chest: [46, 54], tip: [14, 40] } },
  slime: { def: slime, pad: 6, pts: { chest: [20, 16], mouth: [32, 21] } },
  wolf: { def: wolf, pad: 8, foot: [50, 61], pts: { chest: [58, 34], mouth: [84, 30] } },
  tree: { def: tree, pad: 8, pts: { chest: [44, 50], mouth: [56, 44] } },
  mushroom: { def: mushroom, pad: 6, foot: [20, 45], pts: { chest: [22, 30], mouth: [34, 30] } },
  bee: { def: bee, pad: 6, pts: { chest: [26, 26], mouth: [38, 28] } },
  boss_bear: { def: boss_bear, pad: 8, pts: { chest: [60, 66], mouth: [100, 60] } },
};
export const ANIM_IDS = Object.keys(RIGS).filter((k) => RIGS[k].anim);

export function makeSprite(id, opts = {}) {
  const rig = RIGS[id];
  if (rig.anim) return new FrameSprite(id, rig);
  return new PixelSprite(rig.def, { ...rig, recolor: opts.hue ? hueShift(opts.hue) : null });
}
