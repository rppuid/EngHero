// 전투 화면의 글자·메뉴: 차례 표시, 이름표, 명령 메뉴, 문장 조립, 숫자 튀어나오기, 말풍선, 박자 입력
import { ADJ, PREP, INTO, TIMES, SKILLS, MAKE_ADJ, ULTS, VERB_EN, VERB_KO2, DESC_FX } from './data.js';
import { MAX_VOICE, SEG, GAUGE_MAX } from './engine.js';
import { iconImg } from '../gfx/icons.js';
import { sfx } from '../audio.js';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const ORDER = ['N', 'H', 'N2', 'V1', 'V2', 'V3', 'A', 'P', 'O', 'T', 'X'];
const ASK = { N: '누구에게?', N2: '또 누구에게?', A: '지금 어떤 모습일까?', P: '지금 어디에 있을까?', O: '어디로 밀까?', X: '어떻게 만들까?', H: '어디에 숨을까?', T: '몇 번?', V1: '첫 번째 동작', V2: '두 번째 동작', V3: '세 번째 동작' };
const MORE = { A: '모습을 말한다', P: '위치를 말한다', O: '어디로 밀지 말한다', T: '여러 번 한다', N2: '하나 더 노린다' };
const SHOUT_CLASS = { A: 'A', X: 'A', N: 'N', N2: 'N', P: 'P', O: 'P', H: 'P', T: 'P', V1: 'V', V2: 'V', V3: 'V' };

export class UI {
  constructor(project) {
    this.project = project;
    this.tags = new Map();
    this.keyHandler = null;
    this.last = {}; this.missed = new Set();
    addEventListener('keydown', (e) => {
      if (e.repeat && !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      if (this.keyHandler && this.keyHandler(e) !== false) e.preventDefault();
    });
  }

  setup(battle, actors, faces) {
    this.battle = battle; this.actors = actors; this.faces = faces;
    $('#tags').innerHTML = ''; $('#pops').innerHTML = ''; this.tags.clear();
    const party = $('#party'); party.innerHTML = '';
    for (const u of battle.units) {
      const t = el('div', 'tag' + (u.side === 'hero' ? ' hero-tag' : ''));
      t.dataset.uid = u.uid; $('#tags').append(t); this.tags.set(u.uid, t);
      if (u.side === 'hero') {
        t.hidden = true;
        const c = el('div', 'hero'); c.style.setProperty('--c', u.color); c.dataset.uid = u.uid;
        c.innerHTML = `<img src="${faces[u.uid]}" alt=""><div class="nm"><span>${u.name}</span><small></small></div><div class="row2"><div class="bar"><i class="lag"></i><i></i></div><div class="pips"></div></div><div class="chips hchips"></div>`;
        party.append(c);
      }
    }
    this.refresh();
  }

  refresh() {
    for (const u of this.battle.units) {
      const t = this.tags.get(u.uid);
      if (u.side === 'hero') {
        const c = $(`.hero[data-uid="${u.uid}"]`);
        c.classList.toggle('dead', !u.alive);
        c.querySelector('small').textContent = `${u.hp} / ${u.maxHp}`;
        c.querySelectorAll('.bar i').forEach((i) => { i.style.transform = `scaleX(${u.hp / u.maxHp})`; });
        c.querySelector('.pips').innerHTML = Array.from({ length: MAX_VOICE }, (_, i) => `<b class="${i < u.voice ? (i >= u.voice - (this.spend?.[u.uid] || 0) ? 'on use' : 'on') : ''}"></b>`).join('');
        t.innerHTML = `<div class="name">${u.noun}<small>${u.name}</small></div><div class="chips">${this.chips(u)}</div>`;
        c.querySelector('.hchips').innerHTML = this.chips(u);
      } else {
        t.classList.toggle('broken', !!u.broken);
        const weak = u.weak.map((w, i) => (u.known[i] ? `<span class="${ADJ[w] ? 'a' : 'v'}">${ADJ[w] ? iconImg(w) + w : (SKILLS[w]?.verb || VERB_EN[w] || w)}</span>` : '<span>?</span>')).join('');
        t.innerHTML = `<div class="name">${u.noun}<small>${u.name}</small></div>
          <div class="info"><div class="shield">${u.broken ? '✕' : u.shield}</div><div class="weak">${weak}</div></div>
          <div class="bar ehp"><i class="lag" style="transform:scaleX(${u.hp / u.maxHp})"></i><i style="transform:scaleX(${u.hp / u.maxHp})"></i></div>
          <div class="chips">${this.chips(u)}</div>${u.showIntent && u.intent ? `<div class="intent">▶ ${u.intent.en[this.battle.band]}</div>` : ''}`;
        t.hidden = !u.alive;
      }
    }
  }
  chips(u) { return [...u.states.keys()].map((a) => iconImg(a)).join(''); }
  setGauge(g) { const e = $('#gauge'); e.style.setProperty('--g', g / GAUGE_MAX); e.dataset.seg = Math.floor(g / SEG); e.classList.toggle('full', g >= GAUGE_MAX); }
  pulse(u, sel) { const e = this.tags.get(u.uid)?.querySelector(sel); if (e) { e.classList.remove('pulse'); void e.offsetWidth; e.classList.add('pulse'); } }

  order(cur) {
    const { now, next } = this.battle.preview();
    const o = $('#order'); o.innerHTML = '';
    const add = (u, cls) => { const d = el('div', `o s-${u.side} ${cls}`); d.innerHTML = `<img src="${this.faces[u.uid]}" alt="${u.name}">`; d.title = u.name; o.append(d); };
    if (cur) add(cur, 'now');
    now.forEach((u) => add(u, ''));
    o.append(el('div', 'sep'));
    next.slice(0, Math.max(2, 8 - now.length)).forEach((u) => add(u, 'later'));
    document.querySelectorAll('.hero').forEach((h) => h.classList.toggle('now', cur?.uid === h.dataset.uid));
  }

  // 매 프레임: 이름표를 인물 머리 위로 옮긴다
  frame() {
    for (const [uid, t] of this.tags) {
      if (t.hidden) continue;
      const a = this.actors.get(uid); if (!a) continue;
      const p = this.project(a.top);
      t.style.left = p.x + 'px'; t.style.top = p.y - 6 + 'px';
    }
  }

  pop(world, text, cls = '', dx = 0, dy = 0) {
    const p = this.project(world);
    const e = el('div', 'pop ' + cls, text);
    e.style.left = p.x + dx + 'px'; e.style.top = p.y + dy + 'px';
    $('#pops').append(e); setTimeout(() => e.remove(), 1100);
    return e;
  }
  bubble(world, text, ko, cls = '', ms = 1500) {
    const p = this.project(world);
    const e = el('div', 'bubble ' + cls, `${text}${ko ? `<small>${ko}</small>` : ''}`);
    e.style.left = Math.max(140, Math.min(innerWidth - 140, p.x)) + 'px'; e.style.top = p.y - 14 + 'px';
    $('#pops').append(e); setTimeout(() => e.remove(), ms);
  }
  shout(tokens) {
    const s = $('#shout'); s.hidden = false;
    s.innerHTML = tokens.map((t, i) => `<span class="${t.c || ''}" style="animation-delay:${i * 0.07}s">${t.w}</span>`).join('');
    tokens.forEach((t, i) => setTimeout(() => sfx.word(i), i * 70));
  }
  shoutOff() { $('#shout').hidden = true; }
  banner(text, sub = '') { const b = $('#banner'); b.hidden = true; void b.offsetWidth; b.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`; b.hidden = false; clearTimeout(this._bt); this._bt = setTimeout(() => { b.hidden = true; }, 950); }
  cutin(src, color) { const c = $('#cutin'); c.hidden = true; void c.offsetWidth; c.style.setProperty('--c', color); c.querySelector('img').src = src; c.hidden = false; clearTimeout(this._ct); this._ct = setTimeout(() => { c.hidden = true; }, 900); }
  keys(text) { $('#keys').textContent = text; }
  heroHurt(u) { const c = $(`.hero[data-uid="${u.uid}"]`); c.classList.remove('hurt'); void c.offsetWidth; c.classList.add('hurt'); }

  // ── 문장 ─────────────────────────────────────────────
  // 문장 틀을 낱말과 빈칸으로 나눈다
  tokens(skillId, f, active, cur) {
    const s = SKILLS[skillId] || { text: skillId.text }; const out = [];
    const tg = f.N && this.battle.unit(f.N);
    const parts = s.text.split(' ');
    parts.forEach((p, i) => {
      const m = p.match(/^\{(\w+)\}(,?)$/);
      if (!m) {
        if (p === 'the' && tg?.side === 'hero' && parts[i + 1] === '{N}') return;
        out.push({ w: p, c: i === 0 ? 'V' : '' }); return;
      }
      const k = m[1]; if (!active.includes(k)) return;
      let w = '';
      if (k === 'N' || k === 'N2') w = f[k] ? this.battle.unit(f[k]).noun : '';
      else if (k === 'A' || k === 'X') w = f[k] || '';
      else if (k === 'P' || k === 'H') w = f[k] ? PREP[f[k]].en : '';
      else if (k === 'O') w = f.O ? INTO[f.O].en : '';
      else if (k === 'T') w = f.T ? TIMES[f.T].en : '';
      else if (k[0] === 'V') w = f[k] ? (k === 'V1' ? VERB_EN[f[k]] : VERB_EN[f[k]].toLowerCase()) + m[2] : '';
      if (k === 'N2') out.push({ w: 'and the', c: '' });
      out.push({ slot: k, w, cur: cur === k, c: SHOUT_CLASS[k] });
    });
    return out;
  }
  drawSentence(skillId, f, active, cur, justFilled) {
    $('#builder').hidden = false;
    $('#sentence').innerHTML = this.tokens(skillId, f, active, cur).map((t) => (t.slot ? `<span class="slot ${t.slot} ${t.w ? '' : 'empty'} ${t.cur ? 'cur' : ''} ${justFilled === t.slot ? 'fill' : ''}">${t.w || '___'}</span>` : `<span class="w ${t.c}">${t.w}</span>`)).join('') + '<span class="w">!</span>';
  }

  // ── 명령 고르기 ─────────────────────────────────────────
  async command(hero, hooks) {
    for (;;) {
      const m = await this.menu(hero, hooks);
      if (m.defend) { this.closeCmd(); return m; }
      if (m.joint) {
        $('#cmd').hidden = true;
        const tg = await this.pickTarget(this.battle.live('enemy').filter((e) => e.broken), '누구에게 합동 언령을?', hooks);
        if (tg) { this.closeCmd(); return { joint: true, target: tg }; }
        continue;
      }
      const f = await this.fill(hero, m, hooks);
      if (f) { this.closeCmd(); return { ...m, f }; }
    }
  }
  closeCmd() { $('#cmd').hidden = true; $('#builder').hidden = true; $('#choices').innerHTML = ''; this.keyHandler = null; this.spend = {}; this.refresh(); this.keys(''); }

  menu(hero) {
    return new Promise((resolve) => {
      const cmd = $('#cmd'); cmd.hidden = false; $('#choices').innerHTML = '';
      const b = this.battle; const ult = ULTS[hero.kind];
      const items = [];
      if (b.gauge >= GAUGE_MAX && b.live('enemy').some((e) => e.broken) && b.live('hero').length >= 2) items.push({ id: 'joint' });
      if (ult && b.gauge >= SEG) items.push({ id: 'ult', ult });
      hero.skills.forEach((id) => items.push({ id, s: SKILLS[id] }));
      items.push({ id: 'guard' });
      const firstSkill = items.findIndex((x) => x.s);
      let idx = firstSkill + (this.last[hero.uid]?.rel ?? 0);
      const base = (it) => it.s?.needVoice || 0;
      const usable = (it) => !it.s || hero.voice >= base(it);
      const row = (x, i) => {
        const on = i === idx ? 'on' : '';
        if (x.id === 'joint') return `<button class="item special joint ${on}" data-i="${i}"><span class="en">Together!</span><span class="ko">합동 언령 · 게이지 전부</span></button>`;
        if (x.id === 'ult') return `<button class="item special ${on}" data-i="${i}"><span class="en">${x.ult.name}</span><span class="ko">${x.ult.ko} · 게이지 1칸</span></button>`;
        if (x.id === 'guard') return `<button class="item guard ${on}" data-i="${i}"><span class="en">Guard</span><span class="ko">막기 · 목소리 +1</span></button>`;
        return `<button class="item ${on}" data-i="${i}" ${usable(x) ? '' : 'disabled'}><span class="en">${x.s.verb}</span><span class="ko">${x.s.ko}</span>${base(x) ? `<span class="cost">목소리 ${base(x)}</span>` : ''}</button>`;
      };
      const draw = () => {
        const it = items[idx];
        cmd.innerHTML = `<h3><b>${hero.name}</b><span>${hero.job}</span></h3>` + items.map(row).join('');
        this.spend = { [hero.uid]: it.s ? base(it) : 0 }; this.refresh();
        if (it.s) this.drawSentence(it.id, {}, it.s.slots, null);
        else if (it.ult) this.drawSentence(it.ult, {}, it.ult.slots, null);
        else $('#builder').hidden = true;
      };
      const move = (d) => { do { idx = (idx + d + items.length) % items.length; } while (!usable(items[idx])); sfx.move(); draw(); };
      const go = () => {
        const it = items[idx]; if (!usable(it)) return;
        sfx.ok(); this.last[hero.uid] = { rel: it.s ? idx - firstSkill : 0 };
        resolve(it.s ? { skill: it.id } : it.id === 'ult' ? { ult: it.ult } : it.id === 'joint' ? { joint: true } : { defend: true });
      };
      if (!usable(items[idx])) idx = firstSkill;
      draw();
      cmd.onclick = (e) => { const bt = e.target.closest('button'); if (!bt) return; const i = +bt.dataset.i; if (i === idx) go(); else { idx = i; sfx.move(); draw(); } };
      this.keys('↑↓ 기술 · Enter 확인');
      this.keyHandler = (e) => {
        if (e.key === 'ArrowUp' || e.key === 'w') move(-1);
        else if (e.key === 'ArrowDown' || e.key === 's') move(1);
        else if (e.key === 'Enter' || e.key === ' ') go();
        else return false;
      };
    });
  }

  // 빈칸 하나를 묻는다. 돌려주는 값: 고른 값, null(뒤로), undefined(물을 것이 없음)
  async askSlot(k, key, f, active, hooks, target, def) {
    const tg = f.N && this.battle.unit(f.N);
    if (k === 'N' || k === 'N2') {
      let cands = this.battle.units.filter((u) => u.alive && (target === 'any' || u.side === 'enemy'));
      if (k === 'N2') { const first = this.battle.unit(f.N); cands = cands.filter((u) => u.uid !== f.N && u.side === first.side); }
      if (!cands.length) return undefined;
      this.drawSentence(key, f, active, k);
      return this.pickTarget(cands, ASK[k], hooks);
    }
    const adj = (a) => ({ key: a, en: a, ko: ADJ[a].ko });
    let opts;
    if (k === 'A') opts = this.battle.adjChoices(tg).map(adj);
    else if (k === 'X') opts = MAKE_ADJ.map(adj);
    else if (k === 'P') opts = this.battle.prepChoices().map((p) => ({ key: p, en: PREP[p].en, ko: PREP[p].ko }));
    else if (k === 'H') opts = ['behindRock', 'nextToTree'].map((p) => ({ key: p, en: PREP[p].en, ko: PREP[p].ko }));
    else if (k === 'O') opts = this.battle.intoChoices(tg).map((p) => ({ key: p, en: INTO[p].en, ko: INTO[p].ko }));
    else if (k === 'T') opts = [2, 3].map((n) => ({ key: n, en: TIMES[n].en, ko: TIMES[n].ko, show: true }));
    else if (k[0] === 'V') opts = def.verbs.map((v) => ({ key: v, en: VERB_EN[v], ko: VERB_KO2[v] }));
    if (!opts.length) return undefined;
    this.drawSentence(key, f, active, k);
    return this.pickChip(opts, k, ASK[k]);
  }

  // 문장 채우기. 기본 자리를 채운 뒤 목소리가 있으면 "한 마디 더"를 붙일 수 있다.
  async fill(hero, m, hooks) {
    const s = m.ult ? null : SKILLS[m.skill]; const def = m.ult || null;
    const key = def || m.skill; const target = s ? s.target : 'enemy';
    $('#cmd').hidden = true;
    for (;;) {
      const f = {}; let active = [...(def ? def.slots : s.slots)]; let extra = 0; let back = false; let first = true;
      const base = s?.needVoice || 0;
      for (const k of active.slice().sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))) {
        const v = await this.askSlot(k, key, f, active, hooks, target, def);
        if (v === undefined) { active = active.filter((x) => x !== k); continue; }
        if (v === null) { back = true; break; }
        f[k] = v; sfx.ok(); first = false; this.drawSentence(key, f, active, null, k);
      }
      if (back) { sfx.back(); if (first) { $('#cmd').hidden = false; hooks.onTarget?.(null); return null; } continue; }
      // 한 마디 더
      while (s && extra < Math.min(s.ext.length, hero.voice - base)) {
        const k = s.ext[extra];
        this.spend = { [hero.uid]: base + extra }; this.refresh();
        const c = await this.pickChip([{ key: 'go', en: 'Go!', ko: '이대로 외친다', show: true }, { key: 'more', en: '+ one more', ko: `${MORE[k]} · 목소리 1`, show: true }], 'GO', '');
        if (c === null) { back = true; break; }
        if (c === 'go') break;
        active.push(k);
        const v = await this.askSlot(k, key, f, active, hooks, target, def);
        if (v === undefined) { active.pop(); extra = 99; break; }
        if (v === null) { back = true; break; }
        f[k] = v; extra++; sfx.voice(extra); this.drawSentence(key, f, active, null, k);
      }
      if (back) { sfx.back(); continue; }
      if (extra === 99) extra = active.filter((x) => s.ext.includes(x)).length;
      this.lastActive = active; this.lastKey = key;
      m.extra = extra; m.voice = base + extra;
      return f;
    }
  }

  pickTarget(cands, ask, hooks) {
    return new Promise((resolve) => {
      const sorted = cands.slice().sort((a, b) => this.project(this.actors.get(a.uid).top).x - this.project(this.actors.get(b.uid).top).x);
      let idx = Math.max(0, sorted.findIndex((u) => u.uid === this.lastTarget)); if (sorted[idx].side === 'hero' && sorted.some((u) => u.side === 'enemy')) idx = 0;
      $('#choices').innerHTML = `<div class="ask">${ask}</div>`;
      const done = (v) => { for (const [, t] of this.tags) { t.classList.remove('pickable', 'sel', 'dim'); t.onclick = null; } this.refreshHeroTags(false); this.keyHandler = null; if (v) this.lastTarget = v; resolve(v); };
      const draw = () => {
        for (const [uid, t] of this.tags) {
          const ok = sorted.some((u) => u.uid === uid);
          t.classList.toggle('pickable', ok); t.classList.toggle('dim', !ok); t.classList.toggle('sel', sorted[idx].uid === uid);
          t.onclick = ok ? () => { if (sorted[idx].uid === uid) done(uid); else { idx = sorted.findIndex((u) => u.uid === uid); sfx.move(); draw(); } } : null;
        }
        hooks.onTarget?.(sorted[idx]);
      };
      this.refreshHeroTags(sorted.some((u) => u.side === 'hero'));
      draw();
      this.keys('←→ 대상 · Enter 확인 · Esc 뒤로');
      this.keyHandler = (e) => {
        if (['ArrowLeft', 'ArrowUp', 'a', 'w'].includes(e.key)) { idx = (idx - 1 + sorted.length) % sorted.length; sfx.move(); draw(); }
        else if (['ArrowRight', 'ArrowDown', 'd', 's'].includes(e.key)) { idx = (idx + 1) % sorted.length; sfx.move(); draw(); }
        else if (e.key === 'Enter' || e.key === ' ') done(sorted[idx].uid);
        else if (e.key === 'Escape' || e.key === 'Backspace') done(null);
        else return false;
      };
    });
  }
  refreshHeroTags(show) { for (const u of this.battle.heroes) this.tags.get(u.uid).hidden = !(show && u.alive); }

  pickChip(opts, cls, ask) {
    return new Promise((resolve) => {
      let idx = 0; const box = $('#choices');
      const draw = () => { box.innerHTML = `<div class="ask">${ask}</div>` + opts.map((o, i) => `<button class="${cls} ${i === idx ? 'on' : ''} ${o.show || this.missed.has(o.en) ? 'show-ko' : ''}" data-i="${i}">${o.en}<small>${o.ko}</small></button>`).join(''); };
      const done = (v) => { this.keyHandler = null; box.onclick = null; box.innerHTML = ''; resolve(v); };
      draw();
      box.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; const i = +b.dataset.i; if (i === idx || matchMedia('(pointer: coarse)').matches) done(opts[i].key); else { idx = i; sfx.move(); draw(); } };
      this.keys('←→ 낱말 · Enter 확인 · Esc 뒤로');
      this.keyHandler = (e) => {
        if (['ArrowLeft', 'ArrowUp', 'a', 'w'].includes(e.key)) { idx = (idx - 1 + opts.length) % opts.length; sfx.move(); draw(); }
        else if (['ArrowRight', 'ArrowDown', 'd', 's'].includes(e.key)) { idx = (idx + 1) % opts.length; sfx.move(); draw(); }
        else if (e.key >= '1' && e.key <= String(opts.length)) done(opts[+e.key - 1].key);
        else if (e.key === 'Enter' || e.key === ' ') done(opts[idx].key);
        else if (e.key === 'Escape' || e.key === 'Backspace') done(null);
        else return false;
      };
    });
  }

  // ── 합동 언령 박자 입력 ───────────────────────────────────
  // words: [{w, color}], 결과: 0..1 점수. onBeat(i, grade)는 판정 순간에 불린다.
  rhythm(words, { interval = 0.62, lead = 1.5, onBeat } = {}) {
    return new Promise((resolve) => {
      const box = $('#rhythm'); box.hidden = false; const track = box.querySelector('.track'); const goal = box.querySelector('.goal');
      track.querySelectorAll('.beat').forEach((b) => b.remove());
      const t0 = performance.now() / 1000;
      const beats = words.map((w, i) => { const b = el('div', 'beat', w.w); b.style.setProperty('--c', w.color); track.append(b); return { e: b, at: lead + i * interval, done: false }; });
      let score = 0; let raf;
      const judge = (b, i, g) => { b.done = true; b.e.classList.add('done'); score += g; goal.classList.remove('hit'); void goal.offsetWidth; goal.classList.add('hit'); onBeat?.(i, g); };
      const press = () => {
        const t = performance.now() / 1000 - t0;
        const i = beats.findIndex((b) => !b.done); if (i < 0) return;
        const d = Math.abs(t - beats[i].at); if (d > 0.3) return;
        judge(beats[i], i, d < 0.09 ? 1 : d < 0.19 ? 0.6 : 0.25);
      };
      const loop = () => {
        const t = performance.now() / 1000 - t0;
        beats.forEach((b, i) => {
          if (b.done) return;
          const k = (b.at - t) / lead; b.e.style.left = 18 + k * 82 + '%';
          if (t - b.at > 0.22) judge(b, i, 0);
        });
        if (beats.every((b) => b.done)) { cleanup(); setTimeout(() => { box.hidden = true; resolve(score / beats.length); }, 220); return; }
        raf = requestAnimationFrame(loop);
      };
      const onDown = (e) => { e.preventDefault(); press(); };
      const cleanup = () => { cancelAnimationFrame(raf); this.keyHandler = null; removeEventListener('pointerdown', onDown); };
      this.keys('박자에 맞춰 Space');
      this.keyHandler = (e) => { if (e.key === ' ' || e.key === 'Enter') press(); else return false; };
      addEventListener('pointerdown', onDown);
      loop();
    });
  }

  // ── 합동 언령: 박자에 맞춰 낱말 덩이를 올바른 순서로 누른다 ───────────
  chunks(words, { interval = 0.95, onStep } = {}) {
    return new Promise((resolve) => {
      const box = $('#chunks'); box.hidden = false;
      const line = box.querySelector('.line'), btns = box.querySelector('.btns'), pulse = box.querySelector('.pulse');
      const order = words.map((w, i) => i).sort(() => Math.random() - 0.5);
      let next = 0, score = 0, lastStep = performance.now() / 1000; const t0 = lastStep; let raf;
      const draw = () => {
        line.innerHTML = words.map((w, i) => `<span class="${i < next ? 'in' : ''}">${i < next ? w : '···'}</span>`).join(' ');
        btns.innerHTML = order.map((wi, n) => `<button data-w="${wi}" ${wi < next ? 'disabled' : ''}><kbd>${n + 1}</kbd>${words[wi]}</button>`).join('');
      };
      const step = (g) => { score += g; onStep?.(next, g); next++; lastStep = performance.now() / 1000; draw(); if (next >= words.length) finish(); };
      const press = (wi) => {
        if (next >= words.length) return;
        const t = performance.now() / 1000 - t0; const d = Math.abs(((t + interval / 2) % interval) - interval / 2);
        if (wi === next) step(d < 0.17 ? 1 : 0.65); else { sfx.miss(); btns.querySelector(`[data-w="${wi}"]`)?.classList.add('wrong'); step(0); }
      };
      const loop = () => {
        const t = performance.now() / 1000 - t0; const ph = (t % interval) / interval;
        pulse.style.transform = `scale(${1 + (1 - ph) * 0.9})`; pulse.style.opacity = 0.35 + (1 - ph) * 0.65;
        if (performance.now() / 1000 - lastStep > interval * 3.2) step(0);
        if (next < words.length) raf = requestAnimationFrame(loop);
      };
      const finish = () => { cancelAnimationFrame(raf); this.keyHandler = null; btns.onclick = null; setTimeout(() => { box.hidden = true; resolve(score / words.length); }, 350); };
      btns.onclick = (e) => { const b = e.target.closest('button'); if (b && !b.disabled) press(+b.dataset.w); };
      this.keys('박자에 맞춰 1~4');
      this.keyHandler = (e) => { if (e.key >= '1' && e.key <= String(words.length)) press(order[+e.key - 1]); else return false; };
      draw(); loop();
    });
  }

  // ── 선창: 전투에 들어갈 때 이번 전투의 낱말로 짧게 겨룬다 ───────────
  // 3학년 듣고 그림 고르기 / 4학년 그림 보고 낱말 고르기 / 5학년 덩이 배열 / 6학년 타이핑
  opening(gradeNo, speak) {
    const b = this.battle; const touch = matchMedia('(pointer: coarse)').matches;
    const items = []; const seen = new Set();
    for (const e of b.live('enemy')) {
      if (!seen.has(e.noun)) { seen.add(e.noun); items.push({ en: e.noun, ko: e.name, img: this.faces[e.uid], big: true }); }
      for (const a of e.states.keys()) if (!seen.has(a)) { seen.add(a); items.push({ en: a, ko: ADJ[a].ko, img: null, icon: a }); }
    }
    const pic = (it) => (it.icon ? iconImg(it.icon, 'qpic') : `<img class="qpic" src="${it.img}" alt="">`);
    const sh = (arr) => arr.slice().sort(() => Math.random() - 0.5);
    const others = (it, n) => sh(items.filter((x) => x !== it)).slice(0, n);
    const sents = b.live('enemy').map((e) => { const a = [...e.states.keys()][0]; return e.spot !== 'open' && Math.random() < 0.5 ? { chunks: [`The ${e.noun}`, 'is', PREP[e.spot].en.split(' ')[0] + (PREP[e.spot].en.startsWith('next') ? ' to' : ''), PREP[e.spot].en.replace(/^(next to|\w+) /, '') + '.'], ko: `${e.name}은(는) ${PREP[e.spot].ko} 있다` } : { chunks: [`The ${e.noun}`, 'is', a + '.'], ko: `${e.name}은(는) ${ADJ[a].ko}` }; });
    const qs = [];
    const pool = sh(items);
    for (let i = 0; i < 3; i++) {
      const it = pool[i % pool.length];
      if (gradeNo <= 3) qs.push({ type: 'listen', it, opts: sh([it, ...others(it, 1)]) });
      else if (gradeNo === 4 || (gradeNo === 6 && touch && i < 2)) qs.push({ type: 'pick', it, opts: sh([it, ...others(it, 2)]) });
      else if (gradeNo === 5) qs.push(i < 2 ? { type: 'order', ...sents[i % sents.length] } : { type: 'pick', it, opts: sh([it, ...others(it, 2)]) });
      else qs.push(i < 2 ? { type: 'type', it } : { type: 'order', ...sents[0] });
    }
    const limit = { 3: 24, 4: 14, 5: 20, 6: 22 }[gradeNo];
    return new Promise((resolve) => {
      const box = $('#opening'); box.hidden = false; box.classList.toggle('no-timer', gradeNo <= 3);
      const body = box.querySelector('.q'), bar = box.querySelector('.timer i'), dots = box.querySelector('.dots');
      let qi = 0, right = 0; const t0 = performance.now(); let raf; let lock = false;
      const tick = () => { const k = 1 - (performance.now() - t0) / 1000 / limit; bar.style.transform = `scaleX(${Math.max(0, k)})`; if (k <= 0) return end(); raf = requestAnimationFrame(tick); };
      const end = () => { cancelAnimationFrame(raf); this.keyHandler = null; body.onclick = null; const fast = (performance.now() - t0) / 1000 < limit * 0.75; setTimeout(() => { box.hidden = true; resolve({ score: right / qs.length, fast }); }, 500); };
      const answer = (ok, q) => {
        if (lock) return; lock = true; if (ok) { right++; sfx.perfect(); } else { sfx.miss(); if (q.it) this.missed.add(q.it.en); }
        dots.children[qi].className = ok ? 'ok' : 'no';
        const en = q.it ? q.it.en : q.chunks.join(' '), ko = q.it ? q.it.ko : q.ko;
        body.innerHTML = `<div class="reveal ${ok ? 'ok' : 'no'}">${q.it ? pic(q.it) : ''}<b>${en}</b><small>${ko}</small></div>`;
        if (!ok || q.type !== 'listen') speak(en);
        setTimeout(() => { lock = false; qi++; if (qi >= qs.length) end(); else show(); }, ok ? 550 : 1100);
      };
      const show = () => {
        const q = qs[qi]; this.keyHandler = null; body.onclick = null;
        if (q.type === 'listen') {
          body.innerHTML = `<p class="ask"><button class="again" type="button">🔊</button> 들은 낱말의 그림은?</p><div class="opts pics">${q.opts.map((o, i) => `<button data-i="${i}">${pic(o)}</button>`).join('')}</div>`;
          speak(q.it.en);
          body.onclick = (e) => { const bt = e.target.closest('button'); if (!bt) return; if (bt.classList.contains('again')) return speak(q.it.en); answer(q.opts[+bt.dataset.i] === q.it, q); };
          this.keyHandler = (e) => { if (e.key >= '1' && e.key <= String(q.opts.length)) answer(q.opts[+e.key - 1] === q.it, q); else if (e.key === 'ArrowLeft') answer(q.opts[0] === q.it, q); else if (e.key === 'ArrowRight') answer(q.opts[1] === q.it, q); else return false; };
        } else if (q.type === 'pick') {
          body.innerHTML = `<div class="show">${pic(q.it)}</div><div class="opts">${q.opts.map((o, i) => `<button data-i="${i}"><kbd>${i + 1}</kbd>${o.en}</button>`).join('')}</div>`;
          body.onclick = (e) => { const bt = e.target.closest('button'); if (bt) answer(q.opts[+bt.dataset.i] === q.it, q); };
          this.keyHandler = (e) => { if (e.key >= '1' && e.key <= String(q.opts.length)) answer(q.opts[+e.key - 1] === q.it, q); else return false; };
        } else if (q.type === 'order') {
          const ord = sh(q.chunks.map((_, i) => i)); let n = 0, clean = true;
          const draw = () => { body.innerHTML = `<p class="ask">${q.ko}</p><div class="line">${q.chunks.map((c, i) => `<span class="${i < n ? 'in' : ''}">${i < n ? c : '···'}</span>`).join(' ')}</div><div class="opts">${ord.map((ci, k) => `<button data-c="${ci}" ${ci < n ? 'disabled' : ''}><kbd>${k + 1}</kbd>${q.chunks[ci].replace('.', '')}</button>`).join('')}</div>`; };
          const press = (ci) => { if (ci < n) return; if (ci === n) { n++; sfx.word(n); } else { clean = false; sfx.miss(); n++; } if (n >= q.chunks.length) answer(clean, q); else draw(); };
          draw();
          body.onclick = (e) => { const bt = e.target.closest('button'); if (bt && !bt.disabled) press(+bt.dataset.c); };
          this.keyHandler = (e) => { if (e.key >= '1' && e.key <= String(ord.length)) press(ord[+e.key - 1]); else return false; };
        } else {
          const w = q.it.en; let n = 1, clean = true;
          const draw = () => { body.innerHTML = `<div class="show">${pic(q.it)}</div><div class="typing">${[...w].map((ch, i) => `<span class="${i < n ? 'in' : i === n ? 'cur' : ''}">${i < n ? ch : '_'}</span>`).join('')}</div><p class="ask">자판으로 이어서 쓰기</p>`; };
          draw();
          this.keyHandler = (e) => { if (e.key.length !== 1 || !/[a-z]/i.test(e.key)) return false; if (e.key.toLowerCase() === w[n]) sfx.word(n); else { clean = false; sfx.miss(); } n++; if (n >= w.length) answer(clean, q); else draw(); };
        }
      };
      dots.innerHTML = qs.map(() => '<i></i>').join('');
      show(); tick();
    });
  }
}
