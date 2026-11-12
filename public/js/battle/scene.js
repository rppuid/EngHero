// 전투 한 판: 무대를 세우고, 차례를 돌리고, 판정 결과를 연출로 옮긴다.
import * as THREE from 'three';
import { clock, tick, tween, tweenReal, wait, waitReal, hitstop, slowmo, E, rnd } from '../core/time.js';
import { Battle } from './engine.js';
import { UI } from './ui.js';
import { ADJ, PREP, SKILLS, ENCOUNTER } from './data.js';
import { Actor } from '../gfx/actor.js';
import { CameraRig } from '../gfx/camera.js';
import { makePost } from '../gfx/post.js';
import { buildStage, SPOTS } from '../gfx/stage.js';
import { Fx } from '../gfx/fx.js';
import { sfx, speak, startMusic, stopMusic, duck } from '../audio.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const JOINT = {
  wolf: ['Throw', 'the cold', 'water', 'on the wolf!'],
  slime: ['Cut', 'the little', 'slime', 'right now!'],
  slimeG: ['Shoot', 'the green', 'slime', 'right now!'],
};
const TYPE_COLOR = { cut: 0xbfe9ff, push: 0xffe2a8, jump: 0xfff1c0, burn: 0xff8a3c, freeze: 0x8fdcff, shoot: 0xfff3c0, bite: 0xff6a6a, hit: 0xffffff, joint: 0xffffff };

export class BattleScene {
  constructor(canvas, grade, onEnd) {
    this.canvas = canvas; this.grade = grade; this.onEnd = onEnd;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.low = new URLSearchParams(location.search).get('q') === 'low';
    this.renderer.shadowMap.enabled = !this.low; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.08;
    this.scene = new THREE.Scene();
    this.rig = new CameraRig(innerWidth / innerHeight);
    this.post = makePost(this.renderer, this.scene, this.rig.cam);
    this.stage = buildStage(this.scene);
    this.fx = new Fx(this.scene);
    this.actors = new Map();
    this.ui = new UI((v) => this.project(v));
    this.q = [];
    this.resize(); addEventListener('resize', () => this.resize());
    this.setup();
    this.last = performance.now(); this.running = true;
    requestAnimationFrame((t) => this.frame(t));
  }

  resize() {
    const w = innerWidth, h = innerHeight, pr = this.low ? 0.6 : Math.min(devicePixelRatio || 1, 1.5) * (this.scaleDown || 1);
    this.post.bloom.enabled = !this.low; this.post.u.blur.value = this.low ? 0 : 1;
    this.renderer.setPixelRatio(pr); this.renderer.setSize(w, h, false);
    this.rig.resize(w / h); this.post.resize(w, h, pr);
  }
  project(v) {
    const p = v.clone().project(this.rig.cam);
    return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight };
  }

  setup() {
    this.battle = new Battle(ENCOUNTER, this.grade);
    const faces = {};
    let open = 0;
    for (const u of this.battle.units) {
      const a = new Actor(u.sprite || u.kind, { hue: u.hue, scale: u.scale || 1, breath: u.side === 'enemy' ? 0.03 : 0.012 });
      this.scene.add(a.group); this.actors.set(u.uid, a);
      if (u.side === 'hero') { a.place(V(...SPOTS.party[u.slot])); faces[u.uid] = `assets/art/face/${u.uid}.webp`; }
      else { if (u.spot === 'open') u.openIdx = open++; a.place(this.spotPos(u)); faces[u.uid] = this.thumb(a); }
    }
    this.ui.setup(this.battle, this.actors, faces);
  }
  thumb(a) {
    const s = a.sprite, c = document.createElement('canvas'); const n = Math.max(s.W, s.H); c.width = c.height = n;
    c.getContext('2d').drawImage(s.canvas, (n - s.W) / 2, (n - s.H) / 2); return c.toDataURL();
  }
  spotPos(u) {
    const list = SPOTS[u.spot] || SPOTS.open;
    const p = V(...list[Math.min(u.openIdx || 0, list.length - 1)]);
    if (u.spot === 'inWater') p.y = -0.32;
    return p;
  }
  A(u) { return this.actors.get(u.uid); }

  frame(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    tick(dt);
    // 느린 기기: 2초 동안 초당 40장을 못 채우면 해상도를 낮추고, 그래도 느리면 빛 번짐과 그림자를 끈다
    this.fN = (this.fN || 0) + 1; this.fT = (this.fT || 0) + (now - (this.fL || now)); this.fL = now;
    if (this.fT > 2000) {
      if (this.fN / (this.fT / 1000) < 40 && !this.low) {
        if ((this.scaleDown || 1) > 0.7) this.scaleDown = (this.scaleDown || 1) * 0.8; else { this.low = true; this.renderer.shadowMap.enabled = false; this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); }
        this.resize();
      }
      this.fN = 0; this.fT = 0;
    }
    for (const a of this.actors.values()) a.update(dt);
    this.fx.update(); this.stage.update();
    this.rig.apply(dt); this.post.update(dt);
    this.ui.frame();
    this.post.render();
    requestAnimationFrame((t) => this.frame(t));
  }

  // ── 진행 ──────────────────────────────────────────────
  async run() {
    const { battle, ui, rig } = this;
    Object.assign(rig, { fov: 34 }); rig.pos.set(-9, 2.2, 9); rig.look.set(-3.5, 1.4, 0);
    document.getElementById('ui').hidden = false;
    startMusic();
    await waitReal(0.3);
    sfx.growl();
    await rig.to('wide', 1.7, E.inOut);
    ui.banner('BATTLE!', '영어로 명령하라');
    await waitReal(0.7);
    while (!battle.over()) {
      const u = battle.next();
      ui.order(u);
      const st = battle.startTurn(u);
      const a = this.A(u);
      if (u.side === 'hero' && a.pose.dark) a.set({ dark: 0, tint: null });
      await this.playAll(st.ev);
      ui.refresh();
      if (st.skip) { await wait(0.35); continue; }
      if (u.side === 'hero') {
        sfx.turn();
        rig.to('wide', 0.5);
        this.fx.aura(a.group.position, 0xffe27a, 8);
        const stepIn = a.home.clone(); stepIn.x -= 0.45;
        tween(0.18, (k) => a.group.position.lerpVectors(a.home, stepIn, k), E.outBack);
        const cmd = await ui.command(u, { onTarget: (t) => this.aim(t) });
        if (cmd.defend) await this.playAll(battle.defend(u));
        else await this.heroAct(u, cmd);
        tween(0.2, (k) => a.group.position.lerp(a.home, k));
      } else {
        await this.enemyTurn(u);
      }
      ui.refresh();
      if (this.jointTarget) {
        const tg = this.jointTarget; this.jointTarget = null;
        if (tg.alive && battle.live('hero').length >= 2 && !battle.over()) await this.joint(tg);
      }
      rig.to('wide', 0.5);
      await wait(0.25);
    }
    await this.finish(battle.over());
  }

  aim(u) {
    if (!u) return this.rig.to('wide', 0.35);
    const p = this.A(u).group.position;
    this.rig.to({ pos: [p.x * 0.35 + 0.5, 4.7, 16.6], look: [p.x * 0.42 + 0.3, 0.8, 0], fov: 27 }, 0.3, E.outCubic);
  }

  async playAll(ev) { for (const e of ev) await this.handle(e); }
  // 무기가 닿는 순간: 다음 타격 하나와 거기 딸린 결과까지 보여 준다
  async strike() {
    let hit = false;
    while (this.q.length) {
      const e = this.q[0];
      if (hit && ['hit', 'covered', 'desc', 'dodge'].includes(e.t)) break;
      this.q.shift(); await this.handle(e);
      if (e.t === 'hit' || e.t === 'dodge') hit = true;
    }
    return hit;
  }
  async flush() { while (this.q.length) await this.handle(this.q.shift()); }

  // ── 영웅 행동 ───────────────────────────────────────────
  async heroAct(u, cmd) {
    const { battle, ui, rig } = this;
    const s = SKILLS[cmd.skill];
    const tokens = ui.tokens(cmd.skill, cmd.f, ui.lastActive, null).map((t) => ({ w: t.w, c: t.c }));
    tokens[tokens.length - 1].w += '!';
    this.q = battle.act(u, cmd.skill, cmd.f, cmd.voice);
    const say = this.q.shift();
    ui.refresh();
    const a = this.A(u);
    if (cmd.voice >= 2) {
      ui.cutin(`assets/art/bust/${u.uid}_bust_angry.webp`, u.color); sfx.voice(4);
      this.post.u.dim.value = 0.5; await waitReal(0.55); tweenReal(0.3, (k) => { this.post.u.dim.value = 0.5 * (1 - k); });
    }
    for (let i = 0; i < 6 + cmd.voice * 8; i++) this.fx.aura(a.group.position, cmd.voice ? 0xffe27a : 0xffffff, 1);
    ui.shout(tokens); speak(say.text);
    await wait(0.42 + tokens.length * 0.06);
    const targets = [cmd.f.N, cmd.f.N2].filter(Boolean).map((id) => battle.unit(id));
    a.idle = false;
    await this[`anim_${s.anim}`](u, cmd, targets);
    await this.flush();
    a.idle = true; a.set({ lean: 0, sx: 1, sy: 1 }); if (a.rig.parts) a.rig.parts.forEach((p) => a.part(p.name, { rot: 0, dx: 0, dy: 0 }));
    await wait(0.25);
    ui.shoutOff();
  }

  reach(t) { return (t.sprite.w * 0.5 * (1 / 30)) * t.scale + 1.05; }
  async dash(a, dest, dur, { hop = 0, ghost = true, ease = E.outQuad } = {}) {
    const from = a.group.position.clone(); let g = 0;
    await tween(dur, (k) => {
      a.group.position.lerpVectors(from, dest, k);
      a.body.position.y = Math.sin(k * Math.PI) * hop;
      if (ghost && (g += clock.dt) > 0.028) { g = 0; this.fx.addGhost(a.ghost(this.scene)); }
    }, ease);
    a.body.position.y = 0;
  }
  async goHome(a) { await this.dash(a, a.home, 0.24, { hop: 0.9, ghost: false, ease: E.inOut }); }
  shotOn(a, t, o = {}) {
    const p = a.group.position, q = t.group.position;
    const mx = (p.x + q.x) / 2;
    this.rig.to({ pos: [mx * 0.6 + q.x * 0.25, 3.5, o.dist || 13.2], look: [mx * 0.5 + q.x * 0.4, 1.4, 0], fov: o.fov || 26 }, o.dur || 0.28, E.outCubic);
  }

  async anim_slash(u, cmd, targets) {
    const a = this.A(u);
    for (const tg of targets) {
      if (!tg.alive) continue;
      const t = this.A(tg);
      this.shotOn(a, t);
      await tween(0.16, (k) => { a.set({ lean: 5 * k, sy: 1 - 0.05 * k }); a.part('arm', { rot: 42 * k }); }, E.outQuad);
      sfx.dash();
      a.set({ lean: -5, sy: 1 });
      await this.dash(a, t.group.position.clone().add(V(this.reach(t), 0, 0.12)), 0.12);
      const hits = cmd.f.T || 1;
      for (let h = 0; h < hits; h++) {
        const [r0, r1] = h % 2 === 0 ? [42, -118] : [-118, 30];
        sfx.slash();
        await tween(0.055, (k) => a.part('arm', { rot: r0 + (r1 - r0) * k }), E.lin);
        this.fx.slash(t.center, { rot: h % 2 ? 2.4 : -0.7, size: 2.8 });
        if (!(await this.strike())) break;
        await wait(0.16);
      }
      await wait(0.08);
    }
    await this.goHome(a);
  }

  async anim_push(u, cmd, targets) {
    const a = this.A(u); const tg = targets[0]; const t = this.A(tg);
    this.shotOn(a, t);
    await tween(0.14, (k) => a.set({ lean: 4 * k, sx: 1 - 0.06 * k }), E.outQuad);
    sfx.dash();
    a.set({ lean: -7, sx: 1.08 });
    await this.dash(a, t.group.position.clone().add(V(this.reach(t) - 0.35, 0, 0.12)), 0.11);
    sfx.whoosh();
    await this.strike();
    await wait(0.2);
    await this.goHome(a);
  }

  async anim_jump(u, cmd, targets) {
    const a = this.A(u); const tg = targets[0]; const t = this.A(tg);
    this.rig.to({ pos: [t.group.position.x * 0.4, 3.0, 14.5], look: [t.group.position.x * 0.5, 2.4, 0], fov: 30 }, 0.3, E.outCubic);
    await tween(0.16, (k) => a.set({ sy: 1 - 0.14 * k, sx: 1 + 0.08 * k }), E.outQuad);
    sfx.boing();
    const from = a.group.position.clone(), over = t.group.position.clone().add(V(0.5, 0, 0.14));
    a.set({ sy: 1.08, sx: 0.94 });
    let g = 0;
    await tween(0.3, (k) => {
      a.group.position.lerpVectors(from, over, k); a.body.position.y = 4.2 * (1 - (1 - k) ** 2);
      a.part('arm', { rot: 55 * k }); a.set({ lean: 3 });
      if ((g += clock.dt) > 0.03) { g = 0; this.fx.addGhost(a.ghost(this.scene)); }
    }, E.outQuad);
    await wait(0.07);
    sfx.whoosh(); a.set({ lean: -6, sy: 1.12 });
    await tween(0.075, (k) => { a.body.position.y = 4.2 * (1 - k); a.part('arm', { rot: 55 - 175 * k }); if ((g += clock.dt) > 0.012) { g = 0; this.fx.addGhost(a.ghost(this.scene, 0xfff1c0)); } }, E.inQuad);
    a.body.position.y = 0; a.set({ sy: 0.86, sx: 1.1 });
    this.fx.ring(V(over.x - 0.5, 0, over.z), { flat: true, size: 6, color: 0xfff1c0, dur: 0.45 });
    this.fx.burst(V(over.x - 0.5, 0.2, over.z), 26, { color: 0xd8c39a, speed: 7, life: 0.6, size: 0.12, up: 3 });
    this.fx.slash(t.center, { rot: -1.5, size: 3.6, color: 0xfff1c0 });
    await this.strike();
    await wait(0.22);
    a.set({ sy: 1, sx: 1 });
    await this.goHome(a);
  }

  async cast(a, color) {
    sfx.charge();
    const tip = () => a.point('tip');
    let acc = 0;
    await tween(0.34, (k) => {
      a.set({ sy: 1 - 0.05 * Math.sin(k * Math.PI), lean: 3 * k }); a.body.position.y = Math.sin(k * Math.PI) * 0.3;
      if ((acc += clock.dt) > 0.02) { acc = 0; const p = tip(); const an = rnd(0, 6.28); this.fx.p({ x: p.x + Math.cos(an) * 0.9, y: p.y + Math.sin(an) * 0.9, z: p.z }, { x: -Math.cos(an) * 3.5, y: -Math.sin(an) * 3.5 }, { color, life: 0.24, size: 0.1, g: 0, floor: false }); }
    }, E.lin);
    this.fx.glow(tip(), { size: 1.6, color, dur: 0.3 });
    this.stage.light(color, 8, tip());
    a.set({ lean: -4, sy: 1.04 }); a.body.position.y = 0;
  }
  async anim_fire(u, cmd, targets) {
    const a = this.A(u); this.shotOn(a, this.A(targets[0]), { dist: 14 });
    await this.cast(a, 0xff8a3c);
    for (const tg of targets) {
      if (!tg.alive) continue; const t = this.A(tg);
      sfx.fire(); this.fx.fire(t.group.position, 1 + cmd.voice * 0.12);
      await wait(0.1);
      if (!(await this.strike())) break;
      await wait(0.28);
    }
  }
  async anim_ice(u, cmd, targets) {
    const a = this.A(u); this.shotOn(a, this.A(targets[0]), { dist: 14 });
    await this.cast(a, 0x8fdcff);
    for (const tg of targets) {
      if (!tg.alive) continue; const t = this.A(tg);
      sfx.ice(); this.fx.ice(t.group.position, 1 + cmd.voice * 0.12);
      await wait(0.13);
      if (!(await this.strike())) break;
      await wait(0.28);
    }
  }
  async anim_paint(u, cmd, targets) {
    const a = this.A(u); const col = new THREE.Color(ADJ[cmd.f.X].color).getHex();
    this.shotOn(a, this.A(targets[0]), { dist: 14.5 });
    await this.cast(a, col);
    sfx.paint();
    const from = a.point('tip');
    await Promise.all(targets.filter((t) => t.alive).map((tg) => {
      const to = this.A(tg).center; const cols = [0xff5a6a, 0xffc23a, 0x5ad36a, 0x4aa8ff, 0xb06aff]; let n = 0;
      return tween(0.3, (k) => { const x = from.x + (to.x - from.x) * k, y = from.y + (to.y - from.y) * k + Math.sin(k * 3.14) * 1.4; for (let i = 0; i < 2; i++) this.fx.p({ x, y, z: to.z }, { x: rnd(-1, 1), y: rnd(-1, 1) }, { color: cols[n++ % 5], life: 0.4, size: 0.16, g: 2, floor: false }); }, E.inOut)
        .then(() => { this.fx.paint(to, col); this.A(tg).flash(0.07); this.rig.shake(0.08); });
    }));
    await this.flush();
    await wait(0.3);
  }

  async anim_arrow(u, cmd, targets) {
    const a = this.A(u); const tg = targets[0]; const t = this.A(tg);
    this.shotOn(a, t, { dist: 13.6 });
    sfx.draw();
    await tween(0.26, (k) => { a.part('bow', { rot: -9 * k, dx: -2 * k }); a.set({ lean: 3 * k }); }, E.outQuad);
    this.fx.glow(a.point('tip'), { size: 0.9, color: 0xfff3c0, dur: 0.25 });
    await wait(0.1);
    sfx.arrow();
    a.part('bow', { rot: 6, dx: 1 }); a.set({ lean: -2 });
    this.rig.to({ pos: [t.group.position.x * 0.55, 3.4, 12.6], look: [t.group.position.x * 0.7, 1.3, 0], fov: 25 }, 0.16, E.outCubic);
    await this.fx.arrow(a.point('tip'), t.center, { dur: 0.13 });
    await this.strike();
    await tween(0.2, (k) => { a.part('bow', { rot: 6 * (1 - k), dx: 1 - k }); a.set({ lean: -2 * (1 - k) }); });
    await wait(0.15);
  }
  async anim_look(u, cmd, targets) {
    const t = this.A(targets[0]);
    this.rig.to(this.rig.focus(t.center, { dist: 8.5 }), 0.35, E.outCubic);
    sfx.perfect(); this.fx.ring(t.center, { size: 4, color: 0xfff3c0, dur: 0.5 }); this.fx.ring(t.center, { size: 2.4, color: 0xffffff, dur: 0.35 });
    await this.flush(); await wait(0.9);
  }
  async anim_hide(u) {
    const a = this.A(u);
    sfx.boing();
    await tween(0.25, (k) => { a.body.position.y = Math.sin(k * Math.PI) * 0.7; a.set({ sy: 1 - 0.1 * k, dark: 0.45 * k }); });
    a.body.position.y = 0;
    this.fx.burst(a.center, 14, { color: 0x86c96a, speed: 4, life: 0.6, size: 0.12, g: 5 });
    await this.flush(); await wait(0.3);
  }

  // ── 적의 차례 ───────────────────────────────────────────
  async enemyTurn(u) {
    const a = this.A(u);
    this.rig.to({ pos: [0.2, 4.5, 16.6], look: [0.1, 1.1, 0], fov: 28 }, 0.4);
    this.q = this.battle.enemyAct(u);
    this.back = null;
    await this.flush();
    if (this.back) { await this.back(); this.back = null; }
    a.idle = true; a.set({ lean: 0, sx: 1, sy: 1 });
  }

  // ── 판정 결과 하나하나의 연출 ──────────────────────────────
  async handle(e) {
    const { ui, fx, rig, post } = this;
    const a = e.u && this.A(e.u);
    switch (e.t) {
      case 'desc': {
        if (e.ok) { sfx.perfect(); ui.pop(a.top, `Perfect! <i>${e.word}</i>`, 'good', 0, -30); fx.burst(a.top, 10, { color: 0x9bf28a, speed: 4, life: 0.5, size: 0.08, g: 4 }); }
        else { sfx.miss(); ui.pop(a.top, `Not ${e.word}…`, 'bad', 0, -30); }
        await wait(0.18); break;
      }
      case 'covered': ui.pop(a.top, PREP[e.u.spot].en, 'bad', 0, -8); break;
      case 'hit': this.onHit(e, a); break;
      case 'dodge': { sfx.whoosh(); ui.pop(a.top, 'Miss!', 'good'); a.set({ dark: 0 }); tween(0.3, (k) => { a.group.position.x = a.home.x + Math.sin(k * Math.PI) * 0.9; }); break; }
      case 'chip': { sfx.weak(); ui.refresh(); ui.pulse(e.u, '.shield'); ui.pop(a.top, 'WEAK!', 'weak', 40, 10); break; }
      case 'break': await this.onBreak(e, a); break;
      case 'ko': await this.onKo(e, a); break;
      case 'state': {
        const c = ADJ[e.adj].color; const hex = new THREE.Color(c).getHex();
        ui.refresh(); const p = ui.pop(a.top, e.adj, 'state', 0, e.silent ? 14 : 0); p.style.setProperty('--c', c);
        if (!e.silent) { fx.aura(a.group.position, hex, 14); await wait(0.25); }
        if (e.adj === 'small') tween(0.3, (k) => a.body.scale.setScalar(a.scale * (1 - 0.3 * k)), E.outBack);
        if (e.adj === 'big') tween(0.3, (k) => a.body.scale.setScalar(a.scale * (1 + 0.28 * k)), E.outBack);
        a.set({ tint: e.adj === 'cold' ? [150, 215, 255, 0.4] : e.adj === 'wet' ? [90, 150, 255, 0.28] : e.adj === 'angry' ? [255, 60, 60, 0.3] : e.adj === 'sleepy' ? [170, 170, 230, 0.35] : a.pose.tint });
        break;
      }
      case 'stateOff': {
        ui.refresh();
        if (e.adj === 'small' || e.adj === 'big') tween(0.3, (k) => a.body.scale.setScalar(a.body.scale.x + (a.scale - a.body.scale.x) * k));
        if (['cold', 'wet', 'angry', 'sleepy'].includes(e.adj)) a.set({ tint: null });
        break;
      }
      case 'move': {
        const dest = this.spotPos(e.u); a.home.copy(dest);
        const from = a.group.position.clone();
        await tween(0.42, (k) => { a.group.position.lerpVectors(from, dest, k); a.body.position.y = Math.sin(k * Math.PI) * 1.6; }, E.outQuad);
        a.body.position.y = 0;
        if (e.spot === 'inWater') { sfx.splash(); fx.splash(dest); this.stage.splash(); rig.shake(0.15); } else sfx.boing();
        ui.refresh(); ui.pop(a.top, PREP[e.spot].en, 'note');
        await wait(0.2); break;
      }
      case 'delay': ui.pop(a.top, '차례가 밀렸다', 'note', 0, 26); ui.order(null); break;
      case 'reveal': { e.u.showIntent = true; ui.refresh(); e.u.weak.forEach((_, i) => setTimeout(() => sfx.word(i), i * 90)); break; }
      case 'cover': ui.pop(a.top, PREP[e.spot].en, 'good'); break;
      case 'guard': { sfx.guard(); ui.pop(a.top, 'Guard', 'note'); fx.ring(a.center, { size: 2.4, color: 0xcfe6f2 }); a.set({ sx: 1.05, sy: 0.96 }); ui.refresh(); await wait(0.35); break; }
      case 'skip': { ui.pop(a.top, e.why === 'sleepy' ? 'Zzz…' : '…', 'note'); await wait(0.3); break; }
      case 'recover': { a.idle = true; a.set({ gray: 0, lean: 0 }); ui.refresh(); ui.pulse(e.u, '.shield'); break; }
      case 'esay': {
        if (e.warn) sfx.charge(); else sfx.growl();
        ui.bubble(a.top, e.text, e.ko, e.warn ? 'warn' : '', 1500);
        speak(e.text, { pitch: e.u.kind === 'wolf' ? 0.5 : 1.6, rate: 0.95 });
        tween(0.3, (k) => a.set({ sy: 1 + 0.08 * Math.sin(k * Math.PI) }));
        await wait(0.85); break;
      }
      case 'charge': { for (let i = 0; i < 4; i++) { fx.aura(a.group.position, 0xff6a2a, 10); await wait(0.1); } a.set({ tint: [255, 120, 40, 0.35] }); break; }
      case 'eattack': await this.enemyAnim(e, a); break;
      default: break;
    }
  }

  onHit(e, a) {
    const { ui, fx, rig, post } = this;
    const hero = e.u.side === 'hero';
    const power = e.joint ? 2.6 : e.heavy || e.crit ? 1.7 : e.weak ? 1.3 : e.resist ? 0.7 : 1;
    const pos = a.center; const col = TYPE_COLOR[e.type] || 0xffffff;
    a.flash(0.1);
    if (e.type === 'cut' || e.type === 'bite') fx.impact(pos, { color: col, power });
    else if (e.type === 'burn') { fx.burst(pos, 16 * power, { color: 0xfff2a0, color2: 0xe8401e, speed: 6, life: 0.5, size: 0.14, g: -2, floor: false }); if (hero) fx.fire(a.group.position, 0.7); }
    else if (e.type === 'freeze') fx.burst(pos, 14 * power, { color: 0xffffff, color2: 0x7fd4ff, speed: 7, life: 0.5, size: 0.1 });
    else fx.impact(pos, { color: col, power });
    if (power >= 1.6) sfx.heavy(); else sfx.hit(Math.min(1.2, power)); if (hero) sfx.hurt();
    hitstop(0.045 * power + (e.weak ? 0.03 : 0));
    rig.shake(0.11 * power + (hero ? 0.06 : 0)); rig.punch(1.1 * power);
    post.u.impact.value = Math.max(post.u.impact.value, 0.55 * power);
    if (e.crit || e.joint) post.u.flash.value = Math.max(post.u.flash.value, 0.22 * power);
    this.stage.light(col, 7 * power, pos);
    const cls = hero ? 'hero' : e.joint ? 'huge' : e.crit || e.heavy ? 'big' : '';
    ui.pop(pos, e.dmg, cls, rnd(-24, 24), rnd(-20, 6));
    if (e.crit) ui.pop(pos, 'CRITICAL', 'weak', 0, -64);
    if (e.resist) ui.pop(pos, 'Resist', 'bad', 0, 34);
    // 밀려났다가 돌아온다
    const dir = hero ? 1 : -1; const kb = (e.type === 'push' ? 1.1 : 0.42) * Math.min(1.8, power);
    const my = (a.kbT = (a.kbT || 0) + 1);
    a.idle = false;
    tween(0.07, (k) => { if (a.kbT !== my) return; a.group.position.x = a.home.x + dir * kb * k; a.set({ lean: dir * 5 * k, sx: 1 - 0.08 * k, sy: 1 + 0.06 * k }); }, E.outQuad)
      .then(() => tween(0.3, (k) => { if (a.kbT !== my) return; a.group.position.x = a.home.x + dir * kb * (1 - k); a.set({ lean: dir * 5 * (1 - k), sx: 1 - 0.08 * (1 - k), sy: 1 + 0.06 * (1 - k) }); }, E.outBack))
      .then(() => { if (a.kbT === my && e.u.alive && !e.u.broken) a.idle = true; });
    ui.refresh(); if (hero) ui.heroHurt(e.u);
  }

  async onBreak(e, a) {
    const { ui, fx, rig, post } = this;
    sfx.break(); hitstop(0.14);
    post.u.flash.value = 0.55; post.u.impact.value = 1.6; rig.shake(0.45);
    fx.burst(a.center, 46, { color: 0xffffff, color2: 0x8fdcff, speed: 12, life: 0.9, size: 0.14, g: 12 });
    fx.ring(a.center, { size: 7, color: 0xbfe9ff, dur: 0.6 }); fx.ring(a.center, { size: 4, color: 0xffffff, dur: 0.4 });
    ui.banner('BREAK!', '방패가 깨졌다'); ui.refresh();
    rig.to(rig.focus(a.center, { dist: 8.2, side: 1.2, fov: 27 }), 0.25, E.outCubic);
    a.idle = false; a.kbT = (a.kbT || 0) + 1; a.set({ gray: 0.55, lean: -4, sy: 0.93, tint: null });
    this.jointTarget = e.u;
    await slowmo(0.22, 0.65);
  }

  async onKo(e, a) {
    const { fx, rig, ui } = this;
    sfx.ko(); a.idle = false; a.kbT = (a.kbT || 0) + 1;
    if (e.u.side === 'enemy') {
      hitstop(0.1); rig.shake(0.3);
      await wait(0.12);
      a.set({ flash: 1 }); a._f = 1; a.flashT = 9;
      fx.burst(a.center, 50, { color: 0xffffff, color2: 0xb06aff, speed: 9, life: 0.9, size: 0.15, g: -2, floor: false });
      fx.glow(a.center, { size: 3, color: 0xffffff, dur: 0.5 });
      await tween(0.4, (k) => { a.body.scale.set(a.scale * (1 + k * 0.5), a.scale * (1 - k), 1); a.shadow.material.opacity = 1 - k; }, E.inQuad);
      a.group.visible = false; if (this.jointTarget === e.u) this.jointTarget = null;
    } else {
      a.set({ gray: 1, dark: 0.3 });
      await tween(0.45, (k) => { a.body.rotation.z = -1.45 * k; a.body.position.y = 0.25 * k; }, E.outBack);
    }
    ui.refresh(); ui.order(null);
  }

  async enemyAnim(e, a) {
    const { fx, rig } = this; a.idle = false;
    const tgt = e.target && this.A(e.target);
    if (e.anim === 'lunge' || e.anim === 'hop') {
      const dest = tgt.group.position.clone().add(V(-(this.reach(a) - 0.2), 0, 0.1));
      const home = a.home.clone();
      rig.to({ pos: [(home.x + dest.x) / 2 + 0.6, 3.6, 13.6], look: [dest.x * 0.6, 1.4, 0], fov: 27 }, 0.3, E.outCubic);
      await tween(0.18, (k) => a.set({ lean: -5 * k, sy: 1 - 0.1 * k }), E.outQuad);
      e.anim === 'hop' ? sfx.boing() : sfx.dash();
      a.set({ lean: 6, sy: 1.05 });
      await this.dash(a, dest, e.anim === 'hop' ? 0.3 : 0.14, { hop: e.anim === 'hop' ? 2.2 : 0.3 });
      this.back = async () => { await wait(0.12); a.set({ lean: 0, sy: 1 }); await this.dash(a, a.home, 0.28, { hop: 0.8, ghost: false, ease: E.inOut }); };
      if (e.anim === 'hop' && e.u.spot === 'behindRock' && !e.target) this.back = null;
    } else if (e.anim === 'breath') {
      rig.to({ pos: [0.8, 3.8, 15.4], look: [0.8, 1.5, 0], fov: 29 }, 0.3);
      a.set({ tint: null });
      await tween(0.22, (k) => a.set({ lean: -6 * k, sy: 1 + 0.06 * k }), E.outQuad);
      sfx.fire(); a.set({ lean: 7 });
      const m = a.point('mouth'); let acc = 0;
      await tween(0.55, () => {
        if ((acc += clock.dt) < 0.012) return; acc = 0;
        for (let i = 0; i < 5; i++) fx.p({ x: m.x, y: m.y + rnd(-0.1, 0.1), z: m.z + rnd(-0.2, 0.6) }, { x: rnd(13, 21), y: rnd(-1.5, 3), z: rnd(-2.5, 2.5) }, { color: 0xfff2a0, color2: 0xe8401e, life: rnd(0.3, 0.55), size: rnd(0.16, 0.36), g: -2, drag: 1.2, floor: false });
        rig.shake(0.07); this.stage.light(0xff7a2a, 10, m);
      }, E.lin);
    } else if (e.anim === 'howl') {
      await tween(0.2, (k) => a.set({ lean: -5 * k, sy: 1 + 0.1 * k }), E.outQuad);
      rig.shake(0.3); fx.ring(a.center, { size: 6, color: 0xff4d6a, dur: 0.6 }); fx.ring(a.center, { size: 9, color: 0xff4d6a, dur: 0.8, opacity: 0.5 });
      await wait(0.5); a.set({ lean: 0, sy: 1 });
    } else if (e.anim === 'spore') {
      const from = a.center, to = tgt.center; sfx.paint();
      await tween(0.5, (k) => { for (let i = 0; i < 2; i++) fx.p({ x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k + Math.sin(k * 3.14) * 1.2 + rnd(-0.2, 0.2), z: to.z }, { x: rnd(-0.5, 0.5), y: rnd(0, 1) }, { color: 0xb8b8e8, life: 0.6, size: 0.12, g: 1, floor: false }); }, E.lin);
    }
  }

  // ── 합동 언령 ───────────────────────────────────────────
  async joint(tg) {
    const { ui, fx, rig, post, battle } = this;
    const t = this.A(tg); const heroes = battle.live('hero');
    const words = JOINT[tg.kind] || ['Go', 'go', 'go', 'now!'];
    const cols = ['#ff6b5e', '#5cc0ff', '#ffd24a', '#7fdc6a'];
    duck(0.1);
    tweenReal(0.3, (k) => { post.u.bars.value = k; post.u.dim.value = 0.25 * k; });
    ui.banner('합동 언령', '박자에 맞춰 누르기');
    rig.to({ pos: [1.6, 1.9, 12.4], look: [-0.8, 1.9, 0], fov: 33 }, 0.6, E.inOut);
    await waitReal(0.5);
    const score = await ui.rhythm(words.map((w, i) => ({ w, color: cols[i] })), {
      onBeat: (i, g) => {
        const h = heroes[i % heroes.length], a = this.A(h);
        ui.pop(t.top, g >= 1 ? 'Perfect!' : g >= 0.6 ? 'Good!' : g > 0 ? 'OK' : 'Miss', g >= 0.6 ? 'good' : 'bad', (i - 1.5) * 50, -20);
        if (!g) { sfx.miss(); return; }
        sfx.word(i * 2); sfx.hit(0.6 + g * 0.4);
        fx.streak(a.center, t.center, new THREE.Color(cols[i]).getHex(), 0.3 + g * 0.3, 0.3);
        fx.impact(t.center, { color: new THREE.Color(cols[i]).getHex(), power: 0.7 + g * 0.5 });
        t.flash(0.08); rig.shake(0.1 + g * 0.1); rig.punch(1 + g); post.u.impact.value = 0.5;
        tween(0.2, (k) => { a.body.position.y = Math.sin(k * Math.PI) * 0.8; });
      },
    });
    const sentence = words.join(' ');
    ui.shout(words.map((w, i) => ({ w, c: ['V', 'A', 'N', 'P'][i] }))); speak(sentence);
    await waitReal(0.45);
    // 마무리: 모두가 한꺼번에 덮친다
    sfx.dash();
    await Promise.all(heroes.map((h, i) => { const a = this.A(h); a.idle = false; a.set({ lean: -6 }); return this.dash(a, t.group.position.clone().add(V(this.reach(t) + i * 0.5, 0, 0.1 + i * 0.25)), 0.13 + i * 0.03); }));
    post.u.flash.value = 0.9; hitstop(0.2); sfx.heavy(); sfx.break();
    fx.fire(t.group.position, 1.4); fx.ice(t.group.position, 1.2); fx.ring(t.center, { size: 10, color: 0xffffff, dur: 0.7 });
    fx.slash(t.center, { rot: -0.7, size: 4.5 }); fx.slash(t.center, { rot: 2.4, size: 4.5, color: 0xffe27a });
    rig.shake(0.7);
    await this.playAll(battle.joint(tg, score));
    slowmo(0.3, 0.5);
    await waitReal(0.7);
    await Promise.all(heroes.map((h) => { const a = this.A(h); return this.goHome(a).then(() => { a.idle = true; a.set({ lean: 0 }); }); }));
    ui.shoutOff(); ui.refresh();
    tweenReal(0.3, (k) => { post.u.bars.value = 1 - k; post.u.dim.value = 0.25 * (1 - k); });
    duck(0.22);
  }

  async finish(res) {
    const { ui, rig, battle } = this;
    await wait(0.4);
    stopMusic();
    if (res === 'win') {
      sfx.win(); rig.to({ pos: [4.2, 2.6, 10.5], look: [4.1, 1.5, 0], fov: 30 }, 1.0, E.inOut);
      battle.live('hero').forEach((h, i) => { const a = this.A(h); setTimeout(() => tween(0.5, (k) => { a.body.position.y = Math.abs(Math.sin(k * Math.PI * 2)) * 0.8; }), i * 120); });
    } else { sfx.lose(); this.post.u.dim.value = 0.5; }
    await waitReal(1.5);
    this.onEnd(res, battle.stats);
  }
  dispose() { this.running = false; stopMusic(); this.renderer.dispose(); }
}
