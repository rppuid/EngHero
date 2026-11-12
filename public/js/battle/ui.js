// 전투 화면의 글자·메뉴: 차례 표시, 이름표, 명령 메뉴, 문장 조립, 숫자 튀어나오기, 말풍선, 박자 입력
import { ADJ, PREP, INTO, TIMES, SKILLS, MAKE_ADJ } from './data.js';
import { MAX_VOICE } from './engine.js';
import { sfx } from '../audio.js';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const ORDER = ['N', 'H', 'N2', 'A', 'P', 'O', 'T', 'X'];
const ASK = { N: '누구에게?', N2: '또 누구에게?', A: '어떤 상태일까? 맞는 말을 고르면 Perfect', P: '어디에 있을까? 맞는 말을 고르면 Perfect', O: '어디로 밀까?', X: '어떻게 만들까?', H: '어디에 숨을까?' };
const SHOUT_CLASS = { A: 'A', X: 'A', N: 'N', N2: 'N', P: 'P', O: 'P', H: 'P', T: 'P' };

export class UI {
  constructor(project) {
    this.project = project;
    this.tags = new Map();
    this.keyHandler = null;
    this.last = {};
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
        c.innerHTML = `<img src="${faces[u.uid]}" alt=""><div class="nm"><span>${u.name}</span><small></small></div><div class="row2"><div class="bar"><i class="lag"></i><i></i></div><div class="pips"></div></div>`;
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
      } else {
        t.classList.toggle('broken', !!u.broken);
        const weak = u.weak.map((w, i) => (u.known[i] ? `<span class="${ADJ[w] ? 'a' : 'v'}">${ADJ[w] ? w : SKILLS[w].verb}</span>` : '<span>?</span>')).join('');
        t.innerHTML = `<div class="name">${u.noun}<small>${u.name}</small></div>
          <div class="info"><div class="shield">${u.broken ? '✕' : u.shield}</div><div class="weak">${weak}</div></div>
          <div class="bar ehp"><i class="lag" style="transform:scaleX(${u.hp / u.maxHp})"></i><i style="transform:scaleX(${u.hp / u.maxHp})"></i></div>
          <div class="chips">${this.chips(u)}</div>
          <div class="where">${PREP[u.spot]?.en || ''}</div>${u.showIntent && u.intent ? `<div class="intent">▶ ${u.intent.en[this.battle.band]}</div>` : ''}`;
        t.hidden = !u.alive;
      }
    }
  }
  chips(u) { return [...u.states.keys()].map((a) => `<span class="chip" style="--c:${ADJ[a].color}">${a}</span>`).join(''); }
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
    const s = SKILLS[skillId]; const out = [];
    const tg = f.N && this.battle.unit(f.N);
    const parts = s.text.split(' ');
    parts.forEach((p, i) => {
      const m = p.match(/^\{(\w+)\}$/);
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
      else if (k === 'T') w = f.T ? TIMES[f.T].en : TIMES[2].en;
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
      const f = await this.fill(hero, m, hooks);
      if (f) { this.closeCmd(); return { ...m, f }; }
    }
  }
  closeCmd() { $('#cmd').hidden = true; $('#builder').hidden = true; $('#choices').innerHTML = ''; this.keyHandler = null; this.spend = {}; this.refresh(); this.keys(''); }

  menu(hero, hooks) {
    return new Promise((resolve) => {
      const cmd = $('#cmd'); cmd.hidden = false; $('#choices').innerHTML = '';
      const items = [...hero.skills.map((id) => ({ id, s: SKILLS[id] })), { id: 'guard' }];
      let idx = this.last[hero.uid]?.idx ?? 0; let extra = 0;
      const base = (it) => it.s?.needVoice || 0;
      const maxExtra = (it) => (it.s ? Math.max(0, Math.min(it.s.ext.length, hero.voice - base(it))) : 0);
      const usable = (it) => !it.s || hero.voice >= base(it);
      const draw = () => {
        const it = items[idx]; extra = Math.min(extra, maxExtra(it));
        cmd.innerHTML = `<h3><b>${hero.name}</b><span>${hero.job}</span></h3>` + items.map((x, i) => (x.s
          ? `<button class="item ${i === idx ? 'on' : ''}" data-i="${i}" ${usable(x) ? '' : 'disabled'}><span class="en">${x.s.verb}</span><span class="ko">${x.s.ko}</span>${base(x) ? `<span class="cost">목소리 ${base(x)}</span>` : ''}</button>`
          : `<button class="item guard ${i === idx ? 'on' : ''}" data-i="${i}"><span class="en">Guard</span><span class="ko">막기 · 목소리 +1</span></button>`)).join('')
          + `<div class="voice"><span>목소리로 문장 늘리기</span><div class="ctl"><button data-v="-1" ${extra <= 0 ? 'disabled' : ''}>−</button><div class="pips">${Array.from({ length: Math.max(1, it.s ? it.s.ext.length : 1) }, (_, i) => `<b class="${i < extra ? 'on' : ''}"></b>`).join('')}</div><button data-v="1" ${extra >= maxExtra(it) ? 'disabled' : ''}>+</button></div></div>`;
        this.spend = { [hero.uid]: it.s ? base(it) + extra : 0 }; this.refresh();
        if (it.s) this.drawSentence(it.id, {}, [...it.s.slots, ...it.s.ext.slice(0, extra)], null); else $('#builder').hidden = true;
      };
      const move = (d) => { do { idx = (idx + d + items.length) % items.length; } while (!usable(items[idx])); sfx.move(); draw(); };
      const volt = (d) => { const it = items[idx]; const n = Math.max(0, Math.min(maxExtra(it), extra + d)); if (n !== extra) { extra = n; sfx.voice(extra); draw(); } };
      const go = () => {
        const it = items[idx]; if (!usable(it)) return;
        sfx.ok(); this.last[hero.uid] = { idx };
        resolve(it.s ? { skill: it.id, voice: base(it) + extra, extra } : { defend: true });
      };
      if (!usable(items[idx])) idx = 0;
      draw();
      cmd.onclick = (e) => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.v) return volt(+b.dataset.v);
        const i = +b.dataset.i; if (i === idx) go(); else { idx = i; sfx.move(); draw(); }
      };
      this.keys('↑↓ 기술 · ←→ 목소리 · Enter 확인');
      this.keyHandler = (e) => {
        if (e.key === 'ArrowUp' || e.key === 'w') move(-1);
        else if (e.key === 'ArrowDown' || e.key === 's') move(1);
        else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'e') volt(1);
        else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'q') volt(-1);
        else if (e.key === 'Enter' || e.key === ' ') go();
        else return false;
      };
    });
  }

  async fill(hero, m, hooks) {
    const s = SKILLS[m.skill];
    let active = [...s.slots, ...s.ext.slice(0, m.extra)];
    const f = {};
    let seq = active.slice().sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    $('#cmd').hidden = true;
    let i = 0;
    while (i < seq.length) {
      const k = seq[i];
      if (k === 'T') { f.T = 2; i++; continue; }
      let val;
      if (k === 'N' || k === 'N2') {
        let cands = this.battle.units.filter((u) => u.alive && (s.target === 'any' || u.side === 'enemy'));
        if (k === 'N2') { const first = this.battle.unit(f.N); cands = cands.filter((u) => u.uid !== f.N && u.side === first.side); }
        if (!cands.length) { active = active.filter((x) => x !== k); seq.splice(i, 1); continue; }
        this.drawSentence(m.skill, f, active, k);
        val = await this.pickTarget(cands, ASK[k], hooks);
      } else {
        const tg = f.N && this.battle.unit(f.N);
        let opts;
        if (k === 'A') opts = this.battle.adjChoices(tg).map((a) => ({ key: a, en: a, ko: ADJ[a].ko }));
        else if (k === 'X') opts = MAKE_ADJ.map((a) => ({ key: a, en: a, ko: ADJ[a].ko }));
        else if (k === 'P') opts = this.battle.prepChoices().map((p) => ({ key: p, en: PREP[p].en, ko: PREP[p].ko }));
        else if (k === 'H') opts = ['behindRock', 'nextToTree'].map((p) => ({ key: p, en: PREP[p].en, ko: PREP[p].ko }));
        else if (k === 'O') opts = this.battle.intoChoices(tg).map((p) => ({ key: p, en: INTO[p].en, ko: INTO[p].ko }));
        if (!opts.length) { active = active.filter((x) => x !== k); seq.splice(i, 1); continue; }
        this.drawSentence(m.skill, f, active, k);
        val = await this.pickChip(opts, k, ASK[k]);
      }
      if (val === null) { // 뒤로
        sfx.back();
        do { i--; } while (i >= 0 && seq[i] === 'T');
        if (i < 0) { $('#cmd').hidden = false; hooks.onTarget?.(null); return null; }
        delete f[seq[i]]; continue;
      }
      f[k] = val; sfx.ok();
      this.drawSentence(m.skill, f, active, null, k);
      i++;
    }
    this.lastActive = active;
    return f;
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
      const draw = () => { box.innerHTML = `<div class="ask">${ask}</div>` + opts.map((o, i) => `<button class="${cls} ${i === idx ? 'on' : ''}" data-i="${i}">${o.en}<small>${o.ko}</small></button>`).join(''); };
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
}
