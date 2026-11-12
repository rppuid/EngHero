// 스프라이트 격자 + 움직임 설정(부위, 펄럭임, 기준점)
import maru from './maru.js';
import muji from './muji.js';
import naru from './naru.js';
import slime from './slime.js';
import wolf from './wolf.js';
import { PixelSprite, hueShift } from '../gfx/pixel.js';

// parts: 따로 도는 부위(다각형, 회전축). flutter: 펄럭이는 천(고정된 쪽 anchor). foot: 발 기준점. pts: 효과가 나오는 점
export const RIGS = {
  maru: {
    def: maru, pad: 24, foot: [23, 79],
    parts: [{ name: 'arm', poly: [[0, 3], [9, 3], [12, 14], [15, 21], [16, 27], [16, 34], [8, 36], [0, 28]], pivot: [15, 29], reach: 34 }],
    flutter: [{ box: [31, 31, 46, 62], anchor: 'l', amp: 1.6, speed: 5 }],
    pts: { tip: [4, 6, 'arm'], hand: [11, 28, 'arm'], chest: [22, 30] },
  },
  muji: {
    def: muji, pad: 12, foot: [26, 79],
    flutter: [
      { box: [2, 27, 9, 42], anchor: 't', amp: 1.2, speed: 6 },
      { box: [12, 21, 20, 33], anchor: 't', amp: 1.0, speed: 4 },
      { box: [38, 22, 46, 35], anchor: 't', amp: 1.0, speed: 4 },
    ],
    pts: { tip: [7, 10], hand: [11, 32], chest: [26, 34] },
  },
  naru: {
    def: naru, pad: 16, foot: [22, 81],
    parts: [{ name: 'bow', poly: [[33, 6], [41, 6], [41, 72], [31, 72], [31, 39], [39, 39], [39, 31], [33, 31]], pivot: [35, 35], reach: 42 }],
    flutter: [{ box: [2, 38, 12, 62], anchor: 'r', amp: 1.3, speed: 4 }],
    pts: { tip: [34, 34], hand: [35, 35], chest: [22, 30] },
  },
  slime: { def: slime, pad: 8, pts: { chest: [22, 18], mouth: [30, 26] } },
  wolf: { def: wolf, pad: 10, foot: [56, 63], pts: { chest: [70, 34], mouth: [96, 28] } },
};

export function makeSprite(id, opts = {}) {
  const rig = RIGS[id];
  return new PixelSprite(rig.def, { ...rig, recolor: opts.hue ? hueShift(opts.hue) : null });
}
