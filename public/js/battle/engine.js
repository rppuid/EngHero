// 전투 규칙. 화면과 무관한 계산만 한다. scene.js가 결과(events)를 받아 연출한다.
import { ADJ, PREP, SKILLS, HEROES, ENEMIES, TIMES, INTO } from './data.js';

const rnd = (a, b) => a + Math.random() * (b - a);
export const MAX_VOICE = 5;

export class Battle {
  constructor(enc, grade) {
    this.grade = grade;
    this.band = grade.band;
    this.units = [];
    enc.heroes.forEach((id, i) => {
      const h = HEROES[id];
      this.units.push({ uid: id, side: 'hero', kind: id, ...h, maxHp: h.hp, voice: 1, states: new Map(), spot: 'party', slot: i, alive: true, shield: 0, maxShield: 0, weak: [], known: [], broken: 0, guard: false, cover: false });
    });
    enc.enemies.forEach((e, i) => {
      const d = ENEMIES[e.kind];
      const u = { uid: 'e' + i, side: 'enemy', kind: e.kind, sprite: d.sprite || e.kind, ...d, maxHp: d.hp, states: new Map(), spot: e.spot, slot: i, alive: true, maxShield: d.shield, known: d.weak.map(() => false), broken: 0, charge: null, intent: null };
      d.states.forEach((s) => u.states.set(s, 99));
      this.units.push(u);
    });
    this.round = 0;
    this.queue = [];
    this.stats = { turns: 0, perfect: 0, weak: 0, breaks: 0, sentences: [], maxHit: 0 };
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
  // 화면 위 차례 표시용: 이번 라운드의 남은 차례 + 다음 라운드
  preview() { return { now: this.queue.filter((u) => u.alive), next: this.nextQueue.filter((u) => u.alive) }; }

  next() {
    for (;;) {
      if (!this.queue.length) this.newRound();
      const u = this.queue.shift();
      if (u.alive) return u;
    }
  }
  over() { return !this.live('enemy').length ? 'win' : !this.live('hero').length ? 'lose' : null; }

  // 차례 시작: 목소리 +1, 상태 지속 시간 줄이기
  startTurn(u) {
    const ev = [];
    u.guard = false;
    if (u.side === 'hero') { u.voice = Math.min(MAX_VOICE, u.voice + 1); u.cover = false; }
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
  // 형용사 보기: 대상에 실제로 맞는 말 + 헷갈리는 말
  adjChoices(target) {
    const truth = this.trueAdjs(target);
    const pool = Object.keys(ADJ).filter((a) => !truth.includes(a));
    const out = [...truth.slice(0, 2)];
    while (out.length < 4 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out.sort(() => Math.random() - 0.5);
  }
  trueAdjs(u) { return [...u.states.keys()]; }
  prepChoices() { return ['behindRock', 'nextToTree', 'inWater', 'open']; }
  intoChoices(target) { return Object.keys(INTO).filter((s) => s !== target.spot && !this.enemies.some((e) => e.alive && e.spot === s)); }

  // 문장 만들기
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

  // ── 영웅 행동 판정 ───────────────────────────────────────
  act(u, skillId, f, voice) {
    const s = SKILLS[skillId];
    const ev = [];
    u.voice -= voice;
    const text = this.sentence(skillId, f);
    this.stats.turns++; this.stats.sentences.push(text);
    ev.push({ t: 'say', u, text, skill: s, voice });
    const targets = [f.N, f.N2].filter(Boolean).map((id) => this.unit(id));

    if (s.type === 'look') {
      const tg = targets[0];
      tg.known = tg.known.map(() => true);
      ev.push({ t: 'reveal', u: tg, intent: tg.intent });
      return ev;
    }
    if (s.type === 'hide') { u.cover = true; u.spotHide = f.H; ev.push({ t: 'cover', u, spot: f.H }); return ev; }

    if (s.type === 'make') {
      for (const tg of targets) {
        if (!tg.alive) continue;
        const adj = f.X;
        this.applyState(tg, adj, ev, u);
      }
      return ev;
    }

    // 꾸미는 말이 대상에 실제로 맞는지 (정확한 묘사)
    const hits = f.T || 1;
    targets.forEach((tg, ti) => {
      if (!tg.alive) return;
      const desc = [];
      if (ti === 0 && f.A) desc.push({ kind: 'A', word: f.A, ok: tg.states.has(f.A) });
      if (ti === 0 && f.P) desc.push({ kind: 'P', word: PREP[f.P].en, ok: tg.spot === f.P });
      const good = desc.filter((d) => d.ok).length, bad = desc.length - good;
      desc.forEach((d) => ev.push({ t: 'desc', u: tg, ...d }));
      this.stats.perfect += good;
      for (let h = 0; h < hits; h++) {
        if (!tg.alive) break;
        let mult = s.power * (hits > 1 ? 0.62 : 1) * (ti === 1 ? 0.8 : 1);
        mult *= 1 + 0.12 * voice;
        mult *= 1.3 ** good * 0.7 ** bad;
        const r = this.damage(u, tg, s.type, mult, { precise: f.P && tg.spot === f.P, descGood: h === 0 ? good : 0, last: h === hits - 1 });
        ev.push(...r);
      }
      if (!tg.alive) return;
      // 덧붙는 효과
      if (s.type === 'burn' && !tg.states.has('wet')) this.applyState(tg, 'hot', ev, u, true);
      if (s.type === 'freeze') this.applyState(tg, 'cold', ev, u, true);
      if (s.type === 'push') {
        if (f.O) this.moveTo(tg, f.O, ev, u);
        if (s.delay) { const i = this.queue.indexOf(tg); if (i >= 0) { this.queue.splice(i, 1); this.queue.push(tg); ev.push({ t: 'delay', u: tg }); } }
      }
    });
    return ev;
  }

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
    // 약점인 상태를 걸면 방패가 깎인다
    if (tg.side === 'enemy' && !had) {
      const wi = tg.weak.indexOf(adj);
      if (wi >= 0 && !tg.broken) { tg.known[wi] = true; this.chip(tg, 1, ev, adj); }
    }
  }

  chip(tg, n, ev, key) {
    if (tg.broken || tg.shield <= 0) return;
    tg.shield = Math.max(0, tg.shield - n);
    this.stats.weak++;
    ev.push({ t: 'chip', u: tg, shield: tg.shield, key });
    if (tg.shield === 0) {
      tg.broken = 2; tg.charge = null;
      const i = this.queue.indexOf(tg); if (i >= 0) { this.queue.splice(i, 1); tg.broken = 1; }
      this.stats.breaks++;
      ev.push({ t: 'break', u: tg });
    }
  }

  damage(from, tg, type, mult, o = {}) {
    const ev = [];
    let atk = from.atk * (from.states.has('big') ? 1.4 : 1) * (from.states.has('small') ? 0.6 : 1) * (from.states.has('angry') ? 1.3 : 1);
    let def = tg.def * (tg.states.has('angry') ? 0.5 : 1);
    let m = mult;
    let weak = false, resist = false;
    if (tg.side === 'enemy') {
      const wi = tg.weak.indexOf(type);
      if (wi >= 0) { weak = true; tg.known[wi] = true; m *= 1.5; }
      if (tg.resist?.includes(type)) { resist = true; m *= 0.5; }
      if (PREP[tg.spot]?.cover && !o.precise) { m *= 0.5; ev.push({ t: 'covered', u: tg }); }
    }
    if (tg.states.has('cold') && ['cut', 'jump', 'shoot', 'push'].includes(type)) m *= 1.25;
    if (tg.states.has('wet')) { if (type === 'freeze') m *= 1.5; if (type === 'burn') m *= 0.5; }
    if (tg.states.has('small')) m *= 1.2;
    if (tg.states.has('big') && tg.side === 'enemy') m *= 0.85;
    if (tg.broken) m *= 1.6;
    if (tg.guard) m *= 0.5;
    if (tg.side === 'hero' && tg.cover && !o.aoe) { tg.cover = false; ev.push({ t: 'dodge', u: tg }); return ev; }
    const crit = Math.random() < (o.precise ? 0.5 : 0.08);
    if (crit) m *= 1.5;
    const dmg = Math.max(1, Math.round((atk * m - def) * rnd(0.92, 1.08)));
    tg.hp = Math.max(0, tg.hp - dmg);
    if (tg.states.has('sleepy')) tg.states.delete('sleepy');
    this.stats.maxHit = Math.max(this.stats.maxHit, from.side === 'hero' ? dmg : 0);
    ev.push({ t: 'hit', from, u: tg, dmg, weak, resist, crit, type, hp: tg.hp, last: o.last !== false, heavy: m >= 1.8 });
    if (tg.side === 'enemy' && tg.hp > 0) {
      if (weak) this.chip(tg, 1, ev, type);
      if (o.descGood) this.chip(tg, o.descGood, ev, 'desc');
    }
    if (tg.hp <= 0) { tg.alive = false; tg.broken = 0; ev.push({ t: 'ko', u: tg }); }
    return ev;
  }

  defend(u) { u.guard = true; u.voice = Math.min(MAX_VOICE, u.voice + 1); this.stats.turns++; return [{ t: 'guard', u }]; }

  // 합동 언령: score 0..1
  joint(tg, score) {
    const ev = [];
    const total = this.live('hero').reduce((a, h) => a + h.atk, 0);
    const dmg = Math.round(total * (1.3 + score * 1.7));
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
    let tot = moves.reduce((a, m) => a + m.w, 0), r = Math.random() * tot;
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
