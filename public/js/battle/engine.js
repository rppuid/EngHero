// 전투 규칙. 화면과 무관한 계산만 한다. scene.js가 결과(events)를 받아 연출한다.
import { ADJ, PREP, SKILLS, HEROES, ENEMIES, TIMES, INTO, ULTS, VERB_EN } from './data.js';

const rnd = (a, b) => a + Math.random() * (b - a);
export const MAX_VOICE = 5;
export const SEG = 100, GAUGE_MAX = 300; // 언령 게이지: 한 칸 100, 세 칸

export class Battle {
  constructor(enc, grade) {
    this.grade = grade;
    this.band = grade.band;
    this.units = [];
    enc.heroes.forEach((id, i) => {
      const h = HEROES[id];
      this.units.push({ uid: id, side: 'hero', kind: id, ...h, maxHp: h.hp, voice: 1, states: new Map(), spot: 'party', slot: i, alive: true, shield: 0, maxShield: 0, weak: [], known: [], broken: 0, guard: false, cover: false, spent: false });
    });
    enc.enemies.forEach((e, i) => {
      const d = ENEMIES[e.kind];
      const u = { uid: 'e' + i, side: 'enemy', kind: e.kind, sprite: d.sprite || e.kind, ...d, maxHp: d.hp, states: new Map(), spot: e.spot, slot: i, alive: true, maxShield: d.shield, known: d.weak.map(() => false), broken: 0, charge: null, intent: null };
      d.states.forEach((s) => u.states.set(s, 99));
      this.units.push(u);
    });
    this.round = 0;
    this.queue = [];
    this.gauge = 0;
    this.used = new Map();      // 문장 → 쓴 횟수 (되풀이할수록 약해진다)
    this.usedWords = new Set(); // 이번 전투에서 써 본 낱말
    this.stats = { turns: 0, perfect: 0, weak: 0, breaks: 0, sentences: [], maxHit: 0, newWords: 0 };
    this.newRound();
  }

  get heroes() { return this.units.filter((u) => u.side === 'hero'); }
  get enemies() { return this.units.filter((u) => u.side === 'enemy'); }
  live(side) { return this.units.filter((u) => u.side === side && u.alive); }
  unit(uid) { return this.units.find((u) => u.uid === uid); }
  spd(u) { return u.spd * (u.states.has('cold') ? 0.7 : 1) * (u.states.has('small') ? 1.1 : 1); }

  order() { return this.units.filter((u) => u.alive).sort((a, b) => this.spd(b) + rnd(0, 2) - this.spd(a) - rnd(0, 2)); }
  newRound() {
    this.round++;
    this.queue = (this.nextQueue || this.order()).filter((u) => u.alive);
    this.nextQueue = this.order();
    this.enemies.forEach((e) => { if (e.alive) this.planEnemy(e); });
  }
  preview() { return { now: this.queue.filter((u) => u.alive), next: this.nextQueue.filter((u) => u.alive) }; }
  next() {
    for (;;) {
      if (!this.queue.length) this.newRound();
      const u = this.queue.shift();
      if (u.alive) return u;
    }
  }
  over() { return !this.live('enemy').length ? 'win' : !this.live('hero').length ? 'lose' : null; }
  addGauge(n, ev) { const g = Math.min(GAUGE_MAX, this.gauge + n); if (g !== this.gauge) { this.gauge = g; ev?.push({ t: 'gauge', gauge: g }); } }

  // 전투 돌입 활동(선창)의 결과. score 0..1. 불이익은 없다.
  opening(score) {
    const ev = [];
    const reveal = (e) => { const i = e.known.indexOf(false); if (i >= 0) { e.known[i] = true; ev.push({ t: 'hint', u: e }); } };
    if (score >= 1) {
      this.queue = [...this.queue.filter((u) => u.side === 'hero'), ...this.queue.filter((u) => u.side === 'enemy')];
      this.live('enemy').forEach(reveal);
      this.heroes.forEach((h) => { h.voice = Math.min(MAX_VOICE, h.voice + 1); });
      this.addGauge(40, ev);
      ev.unshift({ t: 'opening', level: 2 });
    } else if (score > 0) { reveal(this.live('enemy')[0]); this.addGauge(15, ev); ev.unshift({ t: 'opening', level: 1 }); }
    else ev.push({ t: 'opening', level: 0 });
    return ev;
  }

  // 차례 시작: 지난 차례에 목소리를 쓰지 않았으면 +1
  startTurn(u) {
    const ev = [];
    u.guard = false;
    if (u.side === 'hero') { if (!u.spent) u.voice = Math.min(MAX_VOICE, u.voice + 1); u.spent = false; u.cover = false; }
    for (const [k, t] of [...u.states]) {
      if (t >= 99) continue;
      if (t <= 1) { u.states.delete(k); ev.push({ t: 'stateOff', u, adj: k }); } else u.states.set(k, t - 1);
    }
    if (u.broken) {
      u.broken--;
      if (u.broken > 0) { ev.push({ t: 'skip', u, why: 'broken' }); return { ev, skip: true }; }
      u.shield = u.maxShield; ev.push({ t: 'recover', u });
    }
    if (u.states.has('sleepy') && Math.random() < 0.6) { ev.push({ t: 'skip', u, why: 'sleepy' }); return { ev, skip: true }; }
    return { ev, skip: false };
  }

  // ── 플레이어 선택지 ───────────────────────────────────────
  adjChoices(target) {
    const truth = [...target.states.keys()];
    const pool = Object.keys(ADJ).filter((a) => !truth.includes(a));
    const out = [...truth.slice(0, 2)];
    while (out.length < 4 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out.sort(() => Math.random() - 0.5);
  }
  prepChoices() { return ['behindRock', 'nextToTree', 'inWater', 'open']; }
  intoChoices(target) { return Object.keys(INTO).filter((s) => s !== target.spot && !this.enemies.some((e) => e.alive && e.spot === s)); }

  sentence(skillId, f) {
    const s = SKILLS[skillId];
    const t = (uid) => this.unit(uid);
    let str = s.text
      .replace('{N}', f.N ? t(f.N).noun : '___')
      .replace('{A}', f.A || '')
      .replace('{T}', f.T ? TIMES[f.T].en : '')
      .replace('{P}', f.P ? PREP[f.P].en : '')
      .replace('{O}', f.O ? INTO[f.O].en : '')
      .replace('{X}', f.X || (s.slots.includes('X') ? '___' : ''))
      .replace('{H}', f.H ? PREP[f.H].en : '___')
      .replace('{N2}', f.N2 ? 'and the ' + t(f.N2).noun : '');
    if (s.type === 'make' && f.N && t(f.N).side === 'hero') str = str.replace('the ' + t(f.N).noun, t(f.N).noun);
    return str.replace(/\s+/g, ' ').trim() + '!';
  }
  ultSentence(u, f) {
    const d = ULTS[u.kind];
    return d.text.replace('{N}', f.N ? this.unit(f.N).noun : '').replace('{X}', f.X || '').replace('{P}', f.P ? PREP[f.P].en : '')
      .replace('{V1}', VERB_EN[f.V1] || '').replace('{V2}', (VERB_EN[f.V2] || '').toLowerCase()).replace('{V3}', (VERB_EN[f.V3] || '').toLowerCase()).replace(/\s+/g, ' ').trim() + '!';
  }

  // 문장을 외칠 때마다: 되풀이 감쇠, 새 낱말 보너스
  shout(text, words, ev) {
    const n = this.used.get(text) || 0; this.used.set(text, n + 1);
    const fresh = words.filter((w) => w && !this.usedWords.has(w));
    words.forEach((w) => w && this.usedWords.add(w));
    this.stats.turns++; this.stats.sentences.push(text); this.stats.newWords += fresh.length;
    if (n === 0) this.addGauge(12, ev);
    if (fresh.length) { this.addGauge(8, ev); ev.push({ t: 'fresh', words: fresh }); }
    return { rep: Math.max(0.6, 0.85 ** n), bonus: fresh.length ? 1.15 : 1, repeat: n };
  }

  // ── 영웅 행동 판정 ───────────────────────────────────────
  act(u, skillId, f, voice) {
    const s = SKILLS[skillId];
    const ev = [];
    u.voice -= voice; u.spent = voice > 0;
    const text = this.sentence(skillId, f);
    ev.push({ t: 'say', u, text, skill: s, voice });
    const sh = this.shout(text, [s.type, f.A, f.X, f.P, f.O, f.H], ev);
    if (sh.repeat >= 2) ev.push({ t: 'stale', u });
    const targets = [f.N, f.N2].filter(Boolean).map((id) => this.unit(id));

    if (s.type === 'look') {
      const tg = targets[0];
      tg.known = tg.known.map(() => true);
      ev.push({ t: 'reveal', u: tg, intent: tg.intent });
      return ev;
    }
    if (s.type === 'hide') { u.cover = true; ev.push({ t: 'cover', u, spot: f.H }); return ev; }
    if (s.type === 'make') { for (const tg of targets) this.applyState(tg, f.X, ev, u); return ev; }

    const hits = f.T || 1;
    const physical = ['cut', 'jump', 'shoot', 'push'].includes(s.type);
    targets.forEach((tg, ti) => {
      if (!tg.alive) return;
      let mult = s.power * (hits === 2 ? 0.62 : hits === 3 ? 0.5 : 1) * (ti === 1 ? 0.8 : 1) * (1 + 0.1 * voice) * sh.rep * sh.bonus;
      const o = { precise: false, crit: false, pierce: false, keepSleep: false };
      let spread = false, fling = false;
      // 꾸미는 말: 맞으면 낱말마다 다른 작전 효과, 틀려도 감점은 없다
      if (ti === 0 && f.A) {
        const ok = tg.states.has(f.A);
        ev.push({ t: 'desc', u: tg, kind: 'A', word: f.A, ok, truth: ok ? null : [...tg.states.keys()][0] });
        if (ok) {
          this.perfect(u, ev);
          if (f.A === 'cold') mult *= physical ? 1.5 : 1.15;
          else if (f.A === 'wet') { if (s.type === 'freeze') { spread = true; mult *= 1.2; } else mult *= 1.2; }
          else if (f.A === 'hot') mult *= s.type === 'burn' ? 1.4 : 1.15;
          else if (f.A === 'sleepy') { o.crit = true; o.keepSleep = true; }
          else if (f.A === 'angry') o.pierce = true;
          else if (f.A === 'small') { fling = true; mult *= 1.15; }
          else if (f.A === 'big') mult *= 1.25;
          else mult *= 1.15;
        }
      }
      if (ti === 0 && f.P) {
        const ok = tg.spot === f.P;
        ev.push({ t: 'desc', u: tg, kind: 'P', word: PREP[f.P].en, ok, truth: ok ? null : PREP[tg.spot].en, spot: tg.spot });
        if (ok) { this.perfect(u, ev); o.precise = true; mult *= 1.2; }
      }
      for (let h = 0; h < hits; h++) {
        if (!tg.alive) break;
        if (hits === 3 && h === 2 && Math.random() < 0.5) { ev.push({ t: 'whiff', u: tg }); break; }
        ev.push(...this.damage(u, tg, s.type, mult, { ...o, last: h === hits - 1 }));
      }
      if (!tg.alive) return;
      if (spread) for (const other of this.live('enemy')) if (other !== tg) { ev.push({ t: 'spread', u: other }); ev.push(...this.damage(u, other, 'freeze', mult * 0.5, {})); if (other.alive) this.applyState(other, 'cold', ev, u, true); }
      if (s.type === 'burn' && !tg.states.has('wet')) this.applyState(tg, 'hot', ev, u, true);
      if (s.type === 'freeze') this.applyState(tg, 'cold', ev, u, true);
      if (s.type === 'push' && f.O) this.moveTo(tg, f.O, ev, u);
      if ((s.type === 'push' && s.delay) || fling) this.delay(tg, ev);
    });
    return ev;
  }
  perfect(u, ev) { this.stats.perfect++; u.voice = Math.min(MAX_VOICE, u.voice + 1); this.addGauge(25, ev); }
  delay(tg, ev) { const i = this.queue.indexOf(tg); if (i >= 0) { this.queue.splice(i, 1); this.queue.push(tg); ev.push({ t: 'delay', u: tg }); } }

  moveTo(tg, spot, ev, by) {
    tg.spot = spot;
    ev.push({ t: 'move', u: tg, spot });
    if (spot === 'inWater') this.applyState(tg, 'wet', ev, by);
  }

  applyState(tg, adj, ev, by, silent) {
    if (!tg.alive) return;
    const opposite = { hot: 'cold', cold: 'hot', big: 'small', small: 'big' }[adj];
    if (adj === 'hot' && tg.states.has('wet')) { tg.states.delete('wet'); ev.push({ t: 'stateOff', u: tg, adj: 'wet' }); return; }
    if (opposite && tg.states.has(opposite)) { tg.states.delete(opposite); ev.push({ t: 'stateOff', u: tg, adj: opposite }); }
    const had = tg.states.has(adj);
    if (!(had && tg.states.get(adj) >= 99)) tg.states.set(adj, ADJ[adj].turns + 1);
    ev.push({ t: 'state', u: tg, adj, silent, had });
    if (tg.side === 'enemy' && !had) {
      const wi = tg.weak.indexOf(adj);
      if (wi >= 0 && !tg.broken) { tg.known[wi] = true; this.chip(tg, 1, ev, adj); }
    }
  }

  chip(tg, n, ev, key) {
    if (tg.broken || tg.shield <= 0) return;
    tg.shield = Math.max(0, tg.shield - n);
    this.stats.weak++; this.addGauge(10, ev);
    ev.push({ t: 'chip', u: tg, shield: tg.shield, key });
    if (tg.shield === 0) {
      tg.broken = 2; tg.charge = null;
      const i = this.queue.indexOf(tg); if (i >= 0) { this.queue.splice(i, 1); tg.broken = 1; }
      this.stats.breaks++; this.addGauge(30, ev);
      ev.push({ t: 'break', u: tg });
    }
  }

  damage(from, tg, type, mult, o = {}) {
    const ev = [];
    const atk = from.atk * (from.states.has('big') ? 1.4 : 1) * (from.states.has('small') ? 0.6 : 1) * (from.states.has('angry') ? 1.3 : 1);
    const def = o.pierce ? 0 : tg.def * (tg.states.has('angry') ? 0.5 : 1);
    let m = mult, weak = false, resist = false;
    if (tg.side === 'enemy') {
      const wi = tg.weak.indexOf(type);
      if (wi >= 0) { weak = true; tg.known[wi] = true; m *= 1.5; }
      if (tg.resist?.includes(type)) { resist = true; m *= 0.5; }
      if (PREP[tg.spot]?.cover && !o.precise) { m *= 0.5; ev.push({ t: 'covered', u: tg }); }
    }
    if (tg.states.has('wet')) { if (type === 'freeze') m *= 1.3; if (type === 'burn') m *= 0.5; }
    if (tg.states.has('small')) m *= 1.15;
    if (tg.broken) m *= 1.6;
    if (tg.guard) m *= 0.5;
    if (tg.side === 'hero' && tg.cover && !o.aoe) { tg.cover = false; ev.push({ t: 'dodge', u: tg }); return ev; }
    const crit = o.crit || Math.random() < (o.precise ? 0.6 : 0.08);
    if (crit) m *= 1.5;
    const dmg = Math.max(1, Math.round((atk * m - def) * rnd(0.92, 1.08)));
    tg.hp = Math.max(0, tg.hp - dmg);
    if (tg.states.has('sleepy') && !o.keepSleep) tg.states.delete('sleepy');
    if (from.side === 'hero') this.stats.maxHit = Math.max(this.stats.maxHit, dmg); else this.addGauge(5, ev);
    ev.push({ t: 'hit', from, u: tg, dmg, weak, resist, crit, type, hp: tg.hp, last: o.last !== false, heavy: m >= 1.8 || o.heavy, joint: o.joint });
    if (tg.side === 'enemy' && tg.hp > 0 && weak) this.chip(tg, 1, ev, type);
    if (tg.hp <= 0) { tg.alive = false; tg.broken = 0; ev.push({ t: 'ko', u: tg }); }
    return ev;
  }

  defend(u) { u.guard = true; u.voice = Math.min(MAX_VOICE, u.voice + 1); this.stats.turns++; return [{ t: 'guard', u }]; }

  // 추격: BREAK 직후 동료의 한 방. grade 0..1
  chase(hero, tg, grade) { return this.damage(hero, tg, hero.skills[0], 0.6 + 0.6 * grade, { heavy: grade >= 1 }); }

  // 개인 필살기: 게이지 한 칸
  ult(u, f) {
    const ev = []; this.gauge -= SEG; ev.push({ t: 'gauge', gauge: this.gauge });
    const text = this.ultSentence(u, f);
    ev.push({ t: 'ultSay', u, text });
    this.shout(text, [f.V1, f.V2, f.V3, f.X, f.P], []);
    if (u.kind === 'maru') {
      const tg = this.unit(f.N);
      [f.V1, f.V2, f.V3].forEach((v, i) => { if (tg.alive) ev.push(...this.damage(u, tg, v, 1.25, { last: i === 2, heavy: i === 2 })); });
    } else if (u.kind === 'muji') {
      for (const tg of this.live('enemy')) { ev.push(...this.damage(u, tg, 'paint', 0.9, {})); if (tg.alive) this.applyState(tg, f.X, ev, u); }
    } else if (u.kind === 'naru') {
      const tg = this.unit(f.N); const ok = tg.spot === f.P;
      ev.push({ t: 'desc', u: tg, kind: 'P', word: PREP[f.P].en, ok, truth: ok ? null : PREP[tg.spot].en, spot: tg.spot });
      if (ok) this.stats.perfect++;
      ev.push(...this.damage(u, tg, 'shoot', ok ? 2.4 : 1.5, { precise: true, crit: ok, heavy: true }));
    }
    return ev;
  }

  // 합동 필살기: 게이지를 전부 쓴다. score 0..1
  joint(tg, score) {
    const ev = []; this.gauge = 0; ev.push({ t: 'gauge', gauge: 0 });
    const total = this.live('hero').reduce((a, h) => a + h.atk, 0);
    const dmg = Math.round(total * (1.8 + score * 2.2));
    tg.hp = Math.max(0, tg.hp - dmg);
    this.stats.maxHit = Math.max(this.stats.maxHit, dmg);
    ev.push({ t: 'hit', from: this.live('hero')[0], u: tg, dmg, weak: true, crit: score > 0.8, type: 'joint', hp: tg.hp, last: true, heavy: true, joint: true });
    if (tg.hp <= 0) { tg.alive = false; ev.push({ t: 'ko', u: tg }); }
    return ev;
  }

  // ── 적 ───────────────────────────────────────────────
  planEnemy(e) {
    if (e.charge) { e.intent = e.charge; return; }
    const moves = e.moves.filter((m) => !(m.id === 'hide' && (e.spot === 'behindRock' || this.enemies.some((x) => x.alive && x.spot === 'behindRock'))) && !(m.id === 'howl' && e.states.has('angry')));
    const tot = moves.reduce((a, m) => a + m.w, 0); let r = Math.random() * tot;
    e.intent = moves.find((m) => (r -= m.w) < 0) || moves[0];
  }
  enemyAct(e) {
    const ev = [];
    const m = e.intent || e.moves[0];
    const heroes = this.live('hero');
    const tgt = heroes[Math.floor(Math.random() * heroes.length)];
    const line = (o) => (typeof o === 'string' ? o : o[this.band]);
    if (m.charge && e.charge !== m) {
      e.charge = m;
      ev.push({ t: 'esay', u: e, text: line(m.warn), ko: m.warnKo, warn: true });
      ev.push({ t: 'charge', u: e });
      return ev;
    }
    e.charge = null;
    ev.push({ t: 'esay', u: e, text: line(m.en), ko: m.ko, move: m.id, target: tgt });
    const small = e.states.has('small') ? 0.6 : 1;
    const wetFire = e.states.has('wet') && e.kind === 'wolf' ? 0.75 : 1;
    if (m.id === 'bite') { ev.push({ t: 'eattack', u: e, target: tgt, anim: 'lunge' }); ev.push(...this.damage(e, tgt, 'bite', 1.0 * small * wetFire)); }
    else if (m.id === 'tackle') { ev.push({ t: 'eattack', u: e, target: tgt, anim: 'hop' }); ev.push(...this.damage(e, tgt, 'hit', 1.0 * small)); }
    else if (m.id === 'fire') {
      ev.push({ t: 'eattack', u: e, anim: 'breath' });
      heroes.forEach((h, i) => { ev.push(...this.damage(e, h, 'burn', 0.95 * small * wetFire, { aoe: true, last: i === heroes.length - 1 })); });
    } else if (m.id === 'howl') { ev.push({ t: 'eattack', u: e, anim: 'howl' }); this.applyState(e, 'angry', ev, e); }
    else if (m.id === 'hide') { ev.push({ t: 'eattack', u: e, anim: 'hop' }); this.moveTo(e, 'behindRock', ev, e); }
    else if (m.id === 'sleep') { ev.push({ t: 'eattack', u: e, target: tgt, anim: 'spore' }); this.applyState(tgt, 'sleepy', ev, e); }
    this.planEnemy(e);
    return ev;
  }
}
