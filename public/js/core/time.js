// 게임 시계: 느리게 가기, 타격 순간 멈춤(히트스톱), 시간에 따른 값 변화(트윈)
export const clock = { t: 0, real: 0, dt: 0, scale: 1, freeze: 0 };
const tasks = new Set();
const realTasks = new Set();

export const E = {
  lin: (x) => x,
  inQuad: (x) => x * x,
  outQuad: (x) => 1 - (1 - x) * (1 - x),
  inCubic: (x) => x * x * x,
  outCubic: (x) => 1 - (1 - x) ** 3,
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
  outBack: (x) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2,
  outExpo: (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  inBack: (x) => 2.70158 * x * x * x - 1.70158 * x * x,
  outElastic: (x) => (x === 0 || x === 1 ? x : 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};

export function tick(realDt) {
  clock.real += realDt;
  if (clock.freeze > 0) {
    clock.freeze -= realDt;
    clock.dt = 0;
  } else {
    clock.dt = realDt * clock.scale;
    clock.t += clock.dt;
  }
  for (const f of [...tasks]) if (f(clock.dt) === false) tasks.delete(f);
  for (const f of [...realTasks]) if (f(realDt) === false) realTasks.delete(f);
}

function run(set, dur, fn, ease) {
  return new Promise((res) => {
    let t = 0;
    fn(ease(0));
    if (dur <= 0) { fn(ease(1)); res(); return; }
    set.add((dt) => {
      t += dt;
      const k = Math.min(1, t / dur);
      fn(ease(k));
      if (k >= 1) { res(); return false; }
    });
  });
}
// 게임 시간으로 흐르는 변화 (멈춤·느리게의 영향을 받는다)
export const tween = (dur, fn, ease = E.outCubic) => run(tasks, dur, fn, ease);
export const wait = (s) => run(tasks, s, () => {}, E.lin);
// 실제 시간으로 흐르는 변화 (화면 흔들림, UI)
export const tweenReal = (dur, fn, ease = E.outCubic) => run(realTasks, dur, fn, ease);
export const waitReal = (s) => run(realTasks, s, () => {}, E.lin);
export const every = (fn) => { tasks.add(fn); return () => tasks.delete(fn); };

export function hitstop(s) { clock.freeze = Math.max(clock.freeze, s); }
export async function slowmo(scale, dur) {
  clock.scale = scale;
  await waitReal(dur);
  await tweenReal(0.25, (k) => { clock.scale = scale + (1 - scale) * k; }, E.inQuad);
  clock.scale = 1;
}
export const lerp = (a, b, k) => a + (b - a) * k;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
