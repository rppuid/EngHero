// 소리: 효과음과 전투 음악을 모두 코드로 만든다(파일 없음). 영어 문장 읽기는 브라우저 음성을 쓴다(임시).
let ctx, master, musicGain, sfxGain, noiseBuf;
let muted = false;

export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor(); comp.connect(master);
  sfxGain = ctx.createGain(); sfxGain.gain.value = 0.8; sfxGain.connect(comp);
  musicGain = ctx.createGain(); musicGain.gain.value = 0.22; musicGain.connect(comp);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.9; if (m) speechSynthesis?.cancel(); }
export const isMuted = () => muted;

function tone(f0, f1, dur, { type = 'square', vol = 0.2, at = 0, attack = 0.005, out = sfxGain } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + at; const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, { vol = 0.3, f0 = 4000, f1 = 400, q = 0.8, type = 'lowpass', at = 0, out = sfxGain } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + at; const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out); s.start(t, Math.random()); s.stop(t + dur + 0.02);
}

export const sfx = {
  move: () => tone(660, 660, 0.04, { vol: 0.08 }),
  ok: () => { tone(660, 660, 0.05, { vol: 0.1 }); tone(990, 990, 0.08, { vol: 0.1, at: 0.05 }); },
  back: () => tone(330, 220, 0.08, { vol: 0.1 }),
  word: (i = 0) => tone(520 + i * 90, 520 + i * 90, 0.09, { type: 'triangle', vol: 0.22 }),
  voice: (n) => { tone(400 + n * 120, 800 + n * 160, 0.16, { type: 'sawtooth', vol: 0.1 }); },
  whoosh: () => noise(0.18, { vol: 0.35, f0: 600, f1: 5000, type: 'bandpass', q: 1.2 }),
  dash: () => noise(0.14, { vol: 0.3, f0: 2500, f1: 300, type: 'bandpass', q: 0.9 }),
  hit: (power = 1) => { noise(0.14, { vol: 0.5 * power, f0: 3200, f1: 200 }); tone(170, 50, 0.16, { type: 'sine', vol: 0.55 * power }); tone(900, 300, 0.05, { vol: 0.12 }); },
  heavy: () => { noise(0.35, { vol: 0.7, f0: 2400, f1: 80 }); tone(120, 32, 0.4, { type: 'sine', vol: 0.8 }); tone(60, 30, 0.5, { type: 'triangle', vol: 0.5 }); },
  slash: () => { noise(0.11, { vol: 0.4, f0: 7000, f1: 1800, type: 'highpass' }); tone(1800, 500, 0.08, { type: 'sawtooth', vol: 0.08 }); },
  weak: () => { tone(880, 880, 0.07, { type: 'triangle', vol: 0.25 }); tone(1320, 1320, 0.12, { type: 'triangle', vol: 0.25, at: 0.06 }); },
  perfect: () => [0, 4, 7, 12].forEach((s, i) => tone(660 * 2 ** (s / 12), 660 * 2 ** (s / 12), 0.1, { type: 'triangle', vol: 0.18, at: i * 0.045 })),
  miss: () => tone(200, 120, 0.2, { type: 'sawtooth', vol: 0.1 }),
  break: () => { noise(0.6, { vol: 0.6, f0: 9000, f1: 1200, type: 'highpass' }); [0, 1, 2, 3, 4].forEach((i) => tone(2400 - i * 330, 800, 0.2, { type: 'triangle', vol: 0.14, at: i * 0.035 })); tone(90, 30, 0.7, { type: 'sine', vol: 0.8, at: 0.05 }); },
  fire: () => { noise(0.6, { vol: 0.5, f0: 300, f1: 2400, type: 'bandpass', q: 0.6 }); tone(110, 60, 0.5, { type: 'sawtooth', vol: 0.18 }); },
  ice: () => { [0, 1, 2, 3, 4, 5].forEach((i) => tone(1800 + Math.random() * 2400, 1200, 0.12, { type: 'triangle', vol: 0.12, at: i * 0.03 })); noise(0.3, { vol: 0.3, f0: 8000, f1: 3000, type: 'highpass' }); },
  arrow: () => { noise(0.1, { vol: 0.4, f0: 3000, f1: 8000, type: 'bandpass', q: 2 }); tone(300, 140, 0.09, { type: 'triangle', vol: 0.3 }); },
  draw: () => tone(180, 420, 0.25, { type: 'triangle', vol: 0.12 }),
  splash: () => noise(0.5, { vol: 0.5, f0: 1200, f1: 5000, type: 'bandpass', q: 0.7 }),
  paint: () => [0, 3, 7, 10, 14].forEach((s, i) => tone(520 * 2 ** (s / 12), 540 * 2 ** (s / 12), 0.14, { type: 'sine', vol: 0.18, at: i * 0.05 })),
  charge: () => tone(120, 900, 0.7, { type: 'sawtooth', vol: 0.1 }),
  growl: () => { tone(140, 70, 0.35, { type: 'sawtooth', vol: 0.3 }); noise(0.35, { vol: 0.2, f0: 500, f1: 150 }); },
  boing: () => tone(240, 520, 0.14, { type: 'sine', vol: 0.3 }),
  hurt: () => { tone(320, 110, 0.2, { type: 'square', vol: 0.2 }); noise(0.12, { vol: 0.3, f0: 2000, f1: 300 }); },
  ko: () => { tone(500, 60, 0.5, { type: 'sawtooth', vol: 0.2 }); noise(0.5, { vol: 0.3, f0: 4000, f1: 100 }); },
  guard: () => tone(300, 380, 0.14, { type: 'triangle', vol: 0.25 }),
  turn: () => tone(784, 784, 0.07, { type: 'triangle', vol: 0.14 }),
  tick: () => tone(1200, 1200, 0.03, { vol: 0.12 }),
  win: () => [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => tone(523 * 2 ** (s / 12), 523 * 2 ** (s / 12), 0.2, { type: 'square', vol: 0.14, at: i * 0.11 })),
  lose: () => [7, 5, 3, 0].forEach((s, i) => tone(330 * 2 ** (s / 12), 320 * 2 ** (s / 12), 0.4, { type: 'triangle', vol: 0.2, at: i * 0.3 })),
};

// 전투 음악: 16분음표 단위로 미리 예약한다
let musicOn = false, step = 0, nextT = 0, timer = null, intensity = 1;
const BPM = 138, STEP = 60 / BPM / 4;
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // Am F C G
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const LEAD = [0, -1, 2, -1, 1, -1, 2, 0, -1, 2, 1, -1, 2, -1, 0, 1];
function schedule() {
  if (!musicOn) return;
  while (nextT < ctx.currentTime + 0.12) {
    const at = nextT - ctx.currentTime; const bar = Math.floor(step / 16) % 4; const s = step % 16; const ch = CHORDS[bar];
    if (s % 4 === 0 || s === 10) tone(hz(ch[0] - 24), hz(ch[0] - 24), STEP * 1.8, { type: 'triangle', vol: 0.5, at, out: musicGain });
    if (s % 2 === 0) tone(hz(ch[(s / 2) % 3] + 12), hz(ch[(s / 2) % 3] + 12), STEP * 0.9, { type: 'square', vol: 0.12, at, out: musicGain });
    const l = LEAD[s]; if (l >= 0 && Math.floor(step / 64) % 2 === 1) tone(hz(ch[l] + 24), hz(ch[l] + 24), STEP * 1.4, { type: 'sawtooth', vol: 0.07 * intensity, at, out: musicGain });
    if (s % 8 === 0) { noise(0.12, { vol: 0.5, f0: 300, f1: 60, at, out: musicGain }); tone(120, 40, 0.12, { type: 'sine', vol: 0.6, at, out: musicGain }); }
    if (s % 8 === 4) noise(0.1, { vol: 0.3, f0: 5000, f1: 1500, type: 'highpass', at, out: musicGain });
    if (s % 2 === 1) noise(0.03, { vol: 0.1, f0: 9000, f1: 7000, type: 'highpass', at, out: musicGain });
    nextT += STEP; step++;
  }
}
export function startMusic() { if (!ctx || musicOn) return; musicOn = true; step = 0; nextT = ctx.currentTime + 0.1; timer = setInterval(schedule, 40); }
export function stopMusic() { musicOn = false; clearInterval(timer); }
export function duck(v) { if (musicGain) musicGain.gain.setTargetAtTime(v, ctx.currentTime, 0.08); }

// 영어 문장 읽기 (브라우저 내장 음성)
let voice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
  voice = vs.find((v) => /en-US/.test(v.lang) && /Google|Samantha|Aria|Jenny|Natural/.test(v.name)) || vs.find((v) => /en-US/.test(v.lang)) || vs[0] || null;
}
if (typeof speechSynthesis !== 'undefined') { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
export function speak(text, { pitch = 1.05, rate = 0.92 } = {}) {
  if (muted || typeof speechSynthesis === 'undefined') return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[!…]/g, '.'));
    u.lang = 'en-US'; if (voice) u.voice = voice; u.pitch = pitch; u.rate = rate; u.volume = 1;
    speechSynthesis.speak(u);
  } catch { /* 음성이 없는 기기 */ }
}
