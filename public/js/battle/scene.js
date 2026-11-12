// 전투 한 판: 무대를 세우고, 차례를 돌리고, 판정 결과를 연출로 옮긴다.
import * as THREE from 'three';
import { clock, tick, tween, tweenReal, wait, waitReal, hitstop, slowmo, E, rnd } from '../core/time.js';
import { Battle } from './engine.js';
import { UI } from './ui.js';
import { ADJ, PREP, SKILLS, ENCOUNTER, JOINT, DESC_FX } from './data.js';
import { iconImg } from '../gfx/icons.js';
import { Actor, PX } from '../gfx/actor.js';
import { CameraRig } from '../gfx/camera.js';
import { makePost } from '../gfx/post.js';
import { buildStage, SPOTS } from '../gfx/stage.js';
import { Fx } from '../gfx/fx.js';
import { sfx, speak, startMusic, stopMusic, duck } from '../audio.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TYPE_COLOR = { cut: 0xbfe9ff, push: 0xffe2a8, jump: 0xfff1c0, burn: 0xff8a3c, freeze: 0x8fdcff, shoot: 0xfff3c0, bite: 0xff6a6a, hit: 0xffffff, joint: 0xffffff, hit: 0xfff1c0, kick: 0xffd27a, paint: 0xff9af0 };

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
      const a = new Actor(u.sprite || u.kind, { hue: u.hue, scale: (u.scale || 1) * 1.12 });
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
    const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000)); this.last = now;
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
    this.ambient(dt);
    this.fx.update(); this.stage.update();
    this.rig.apply(dt); this.post.update(dt);
    // 초점은 카메라가 바라보는 곳에 맞춘다
    const fd = this.rig.cam.position.distanceTo(this.rig.look); this.post.u.focus.value += (fd - this.post.u.focus.value) * Math.min(1, dt * 6); this.post.u.range.value = 2.2 + fd * 0.2;
    this.ui.frame();
    this.post.render();
    requestAnimationFrame((t) => this.frame(t));
  }

  // 상태를 글자 대신 모습으로: 차가우면 서리, 뜨거우면 불티, 젖으면 물방울, 졸리면 Z, 화나면 김
  ambient(dt) {
    this.ambT = (this.ambT || 0) + clock.dt; if (this.ambT < 0.16 || !this.battle) return; this.ambT = 0;
    for (const u of this.battle.units) {
      if (!u.alive) continue; const a = this.A(u); if (!a.group.visible) continue;
      const c = a.center; const w = 0.9 * a.scale;
      const at = () => ({ x: c.x + rnd(-w, w), y: c.y + rnd(-0.6, 0.9), z: c.z + 0.1 });
      const st = u.states;
      if (st.has('cold')) this.fx.p(at(), { x: rnd(-0.2, 0.2), y: -0.5 }, { color: 0xffffff, color2: 0x7fd4ff, life: 0.9, size: 0.09, g: 0.6, floor: false });
      if (st.has('hot') && Math.random() < 0.7) this.fx.p({ x: c.x + rnd(-w, w), y: c.y + 0.3, z: c.z + 0.1 }, { x: rnd(-0.3, 0.3), y: rnd(1, 2.2) }, { color: 0xfff2a0, color2: 0xe8401e, life: 0.7, size: 0.08, g: -1, floor: false });
      if (st.has('wet')) this.fx.p({ x: c.x + rnd(-w, w), y: c.y + 0.2, z: c.z + 0.1 }, { x: 0, y: -0.2 }, { color: 0x9fd8ff, color2: 0x4aa8ff, life: 0.6, size: 0.08, g: 9 });
      if (st.has('angry') && Math.random() < 0.6) this.fx.p({ x: c.x + rnd(-0.3, 0.3), y: a.top.y - 0.2, z: c.z + 0.1 }, { x: rnd(-0.6, 0.6), y: rnd(1.5, 2.5) }, { color: 0xff4d6a, color2: 0xffffff, life: 0.5, size: 0.12, g: -1, floor: false });
      if (st.has('sleepy') && Math.random() < 0.25) this.ui.pop(a.top, 'z', 'note', rnd(-10, 30), 20);
    }
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
    await waitReal(0.9);
    ui.setGauge(0);
    // 선창: 이번 전투의 낱말로 짧게 겨룬다. 잘하면 이점, 못해도 불이익은 없다
    const op = await ui.opening(this.gradeNo || 4, speak);
    await this.playAll(battle.opening(op.score >= 1 && op.fast ? 1 : Math.min(0.9, op.score)));
    ui.refresh(); await waitReal(0.5);
    while (!battle.over()) {
      const u = battle.next();
      ui.order(u);
      const st = battle.startTurn(u);
      const a = this.A(u);
      if (u.side === 'hero' && a.pose.dark) a.set({ dark: 0 });
      await this.playAll(st.ev);
      ui.refresh();
      if (st.skip) { await wait(0.35); continue; }
      if (u.side === 'hero') {
        sfx.turn();
        rig.to('wide', 0.5);
        this.fx.aura(a.group.position, 0xffe27a, 8);
        const stepIn = a.home.clone(); stepIn.x -= 0.55;
        a.play('walk_left', { fps: 12, loop: true });
        tween(0.22, (k) => a.group.position.lerpVectors(a.home, stepIn, k), E.outQuad).then(() => a.rest());
        const cmd = await ui.command(u, { onTarget: (t) => this.aim(t) });
        this.acting = u;
        if (cmd.defend) await this.playAll(battle.defend(u));
        else if (cmd.joint) await this.joint(battle.unit(cmd.target));
        else if (cmd.ult) await this.heroUlt(u, cmd);
        else await this.heroAct(u, cmd);
        tween(0.2, (k) => a.group.position.lerp(a.home, k));
      } else {
        await this.enemyTurn(u);
      }
      ui.refresh();
      if (this.chaseTarget) {
        const tg = this.chaseTarget; this.chaseTarget = null;
        if (tg.alive && !battle.over()) await this.chase(tg, u);
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
  syncLook() {
    for (const u of this.battle.units) {
      if (!u.alive) continue;
      const st = u.states; const a = this.A(u);
      const key = u.charge ? 'charge' : st.has('cold') ? 'cold' : st.has('wet') ? 'wet' : st.has('angry') ? 'angry' : st.has('sleepy') ? 'sleepy' : '';
      if (a.lookKey === key) continue; a.lookKey = key;
      a.set({ tint: { charge: [255, 120, 40, 0.35], cold: [150, 215, 255, 0.4], wet: [90, 150, 255, 0.28], angry: [255, 60, 60, 0.3], sleepy: [170, 170, 230, 0.35] }[key] || null });
    }
  }
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
    for (let i = tokens.length - 1; i >= 0; i--) if (!tokens[i].w) tokens.splice(i, 1);
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
    a.idle = true; a.set({ lean: 0, sx: 1, sy: 1 }); a.rest();
    await wait(0.25);
    ui.shoutOff();
  }

  reach(t) { return (t.framed ? 22 : t.sprite.w * 0.5) * PX * t.scale + 0.75; }
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
  shotHero(a, dur = 0.3) {
    const p = a.group.position;
    return this.rig.to({ pos: [p.x * 0.72 - 0.5, 3.3, 11.6], look: [p.x * 0.8 - 0.6, 1.45, 0], fov: 25 }, dur, E.outCubic);
  }
  // 쏜 것을 따라 휙 넘어간다: 두 사람이 다 보이는 구도를 거쳐 대상으로
  shotFollow(a, t, dur = 0.26) {
    const q = t.group.position;
    return this.rig.to({ pos: [q.x * 0.5 + 0.4, 3.7, 13.4], look: [q.x * 0.62, 1.3, 0], fov: 26 }, dur, E.inOut);
  }
  shotOn(a, t, o = {}) {
    const p = a.group.position, q = t.group.position;
    const mx = (p.x + q.x) / 2;
    this.rig.to({ pos: [mx * 0.6 + q.x * 0.25, 3.5, o.dist || 13.2], look: [mx * 0.5 + q.x * 0.4, 1.4, 0], fov: o.fov || 26 }, o.dur || 0.28, E.outCubic);
  }

  // 공격 장면 6장: 0·1 준비, 2 내딛기, 3 내지르기(타격), 4·5 거두기
  async anim_slash(u, cmd, targets) {
    const a = this.A(u);
    for (const tg of targets) {
      if (!tg.alive) continue;
      const t = this.A(tg);
      this.shotOn(a, t);
      a.frame('attack', 0); await wait(0.07); a.frame('attack', 1); a.set({ lean: 2 });
      await wait(0.11);
      sfx.dash(); a.frame('attack', 2); a.set({ lean: -2 });
      await this.dash(a, t.group.position.clone().add(V(this.reach(t) + 0.5, 0, 0.12)), 0.12);
      const hits = cmd.f.T || 1;
      for (let h = 0; h < hits; h++) {
        if (h) { a.frame('attack', 2); await wait(0.07); }
        sfx.slash(); a.frame('attack', 3); a.set({ lean: -3 });
        this.fx.slash(t.center, { rot: h % 2 ? 2.4 : -0.7, size: 2.8 });
        if (!(await this.strike())) break;
        await wait(0.16);
      }
      a.frame('attack', 4); a.set({ lean: 0 }); await wait(0.09); a.frame('attack', 5); await wait(0.05);
    }
    await this.goHome(a);
  }

  async anim_push(u, cmd, targets) {
    const a = this.A(u); const tg = targets[0]; const t = this.A(tg);
    this.shotOn(a, t);
    a.frame('attack', 1); a.set({ lean: 3, sx: 0.95 }); await wait(0.14);
    sfx.dash(); a.frame('attack', 2); a.set({ lean: -4, sx: 1.06 });
    await this.dash(a, t.group.position.clone().add(V(this.reach(t) + 0.15, 0, 0.12)), 0.11);
    sfx.whoosh(); a.frame('attack', 3);
    await this.strike();
    await wait(0.2); a.frame('attack', 5); a.set({ lean: 0, sx: 1 });
    await this.goHome(a);
  }

  async anim_jump(u, cmd, targets) {
    const a = this.A(u); const tg = targets[0]; const t = this.A(tg);
    this.rig.to({ pos: [t.group.position.x * 0.4, 3.4, 15], look: [t.group.position.x * 0.5, 2.4, 0], fov: 30 }, 0.3, E.outCubic);
    a.frame('attack', 1);
    await tween(0.16, (k) => a.set({ sy: 1 - 0.14 * k, sx: 1 + 0.08 * k }), E.outQuad);
    sfx.boing();
    const from = a.group.position.clone(), over = t.group.position.clone().add(V(0.9, 0, 0.14));
    a.frame('victory', 2); a.set({ sy: 1.06, sx: 0.96 });
    let g = 0;
    await tween(0.3, (k) => {
      a.group.position.lerpVectors(from, over, k); a.body.position.y = 4.2 * (1 - (1 - k) ** 2);
      if ((g += clock.dt) > 0.03) { g = 0; this.fx.addGhost(a.ghost(this.scene)); }
    }, E.outQuad);
    a.frame('attack', 2); await wait(0.07);
    sfx.whoosh(); a.frame('attack', 3); a.set({ lean: -3, sy: 1.1 });
    await tween(0.075, (k) => { a.body.position.y = 4.2 * (1 - k); if ((g += clock.dt) > 0.012) { g = 0; this.fx.addGhost(a.ghost(this.scene, 0xfff1c0)); } }, E.inQuad);
    a.body.position.y = 0; a.set({ sy: 0.88, sx: 1.08, lean: 0 }); a.frame('attack', 4);
    this.fx.ring(V(over.x - 0.9, 0, over.z), { flat: true, size: 6, color: 0xfff1c0, dur: 0.45 });
    this.fx.burst(V(over.x - 0.9, 0.2, over.z), 26, { color: 0xd8c39a, speed: 7, life: 0.6, size: 0.12, up: 3 });
    this.fx.slash(t.center, { rot: -1.5, size: 3.6, color: 0xfff1c0 });
    await this.strike();
    await wait(0.22);
    a.set({ sy: 1, sx: 1 }); a.frame('attack', 5);
    await this.goHome(a);
  }

  // 마법 준비: 지팡이를 들고 빛을 모은 뒤 내지른다
  async cast(a, color) {
    this.shotHero(a);
    sfx.charge();
    const tip = () => a.point('tip');
    let acc = 0; a.frame('attack', 0);
    await tween(0.36, (k) => {
      if (k > 0.3) a.frame('attack', 1);
      a.body.position.y = Math.sin(k * Math.PI) * 0.25;
      if ((acc += clock.dt) > 0.02) { acc = 0; const p = tip(); const an = rnd(0, 6.28); this.fx.p({ x: p.x + Math.cos(an) * 0.9, y: p.y + Math.sin(an) * 0.9, z: p.z }, { x: -Math.cos(an) * 3.5, y: -Math.sin(an) * 3.5 }, { color, life: 0.24, size: 0.1, g: 0, floor: false }); }
    }, E.lin);
    a.body.position.y = 0;
    a.frame('attack', 2); await wait(0.06); a.frame('attack', 3);
    this.fx.glow(tip(), { size: 1.8, color, dur: 0.3 });
    this.stage.light(color, 8, tip());
  }
  async castEnd(a) { a.frame('attack', 4); await wait(0.1); a.frame('attack', 5); await wait(0.08); a.rest(); }
  async anim_fire(u, cmd, targets) {
    const a = this.A(u);
    await this.cast(a, 0xff8a3c);
    await wait(0.12); this.shotFollow(a, this.A(targets.find((t) => t.alive) || targets[0])); await wait(0.2);
    for (const tg of targets) {
      if (!tg.alive) continue; const t = this.A(tg);
      sfx.fire(); this.fx.fire(t.group.position, 1 + cmd.voice * 0.12);
      await wait(0.1);
      if (!(await this.strike())) break;
      await wait(0.28);
    }
    await this.castEnd(a);
  }
  async anim_ice(u, cmd, targets) {
    const a = this.A(u);
    await this.cast(a, 0x8fdcff);
    await wait(0.12); this.shotFollow(a, this.A(targets.find((t) => t.alive) || targets[0])); await wait(0.2);
    for (const tg of targets) {
      if (!tg.alive) continue; const t = this.A(tg);
      sfx.ice(); this.fx.ice(t.group.position, 1 + cmd.voice * 0.12);
      await wait(0.13);
      if (!(await this.strike())) break;
      await wait(0.28);
    }
    await this.castEnd(a);
  }
  async anim_paint(u, cmd, targets) {
    const a = this.A(u); const col = new THREE.Color(ADJ[cmd.f.X].color).getHex();
    await this.cast(a, col);
    sfx.paint(); this.shotFollow(a, this.A(targets[0]), 0.34);
    const from = a.point('tip');
    await Promise.all(targets.filter((t) => t.alive).map((tg) => {
      const to = this.A(tg).center; const cols = [0xff5a6a, 0xffc23a, 0x5ad36a, 0x4aa8ff, 0xb06aff]; let n = 0;
      return tween(0.3, (k) => { const x = from.x + (to.x - from.x) * k, y = from.y + (to.y - from.y) * k + Math.sin(k * 3.14) * 1.4; for (let i = 0; i < 2; i++) this.fx.p({ x, y, z: to.z }, { x: rnd(-1, 1), y: rnd(-1, 1) }, { color: cols[n++ % 5], life: 0.4, size: 0.16, g: 2, floor: false }); }, E.inOut)
        .then(() => { this.fx.paint(to, col); this.A(tg).flash(0.07); this.rig.shake(0.08); });
    }));
    await this.flush();
    await wait(0.2);
    await this.castEnd(a);
  }

  async anim_arrow(u, cmd, targets) {
    const a = this.A(u); const tg = targets[0]; const t = this.A(tg);
    this.shotHero(a, 0.28);
    sfx.draw();
    a.frame('attack', 0); await wait(0.1); a.frame('attack', 1); await wait(0.11); a.frame('attack', 2); await wait(0.12); a.frame('attack', 3);
    this.fx.glow(a.point('tip'), { size: 0.9, color: 0xfff3c0, dur: 0.3 });
    await wait(0.2);
    sfx.arrow(); a.set({ lean: 2 }); this.rig.punch(1.2);
    const from = a.point('tip');
    this.fx.burst(from, 8, { color: 0xfff3c0, speed: 4, life: 0.25, size: 0.07, g: 0 });
    this.shotFollow(a, t, 0.24);
    await this.fx.arrow(from, t.center, { dur: 0.24, arc: 0.25 });
    await this.strike();
    a.frame('attack', 4); a.set({ lean: 0 }); await wait(0.14); a.frame('attack', 5); await wait(0.1);
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
    await tween(0.25, (k) => { a.body.position.y = Math.sin(k * Math.PI) * 0.7; a.set({ dark: 0.45 * k }); });
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
  async handle(e) { await this.handle1(e); this.syncLook(); }
  async handle1(e) {
    const { ui, fx, rig, post } = this;
    const a = e.u && this.A(e.u);
    switch (e.t) {
      case 'desc': {
        if (e.ok) {
          sfx.perfect(); ui.pop(a.top, `Perfect! <i>${e.word}</i>`, 'good', 0, -30);
          if (e.kind === 'A' && DESC_FX[e.word]) ui.pop(a.top, DESC_FX[e.word].ko, 'fx', 0, 2);
          fx.burst(a.top, 10, { color: 0x9bf28a, speed: 4, life: 0.5, size: 0.08, g: 4 });
          await wait(0.18);
        } else {
          sfx.miss(); ui.missed.add(e.word); if (e.truth) ui.missed.add(e.truth);
          // 감점은 없다. 지금 모습에 맞는 낱말을 그림과 함께 보여 준다
          if (e.truth) ui.pop(a.top, `${e.kind === 'A' ? iconImg(e.truth) : ''}${e.truth}`, 'hint', 0, -26);
          if (e.kind === 'P') fx.ring(a.center, { size: 3, color: 0xfff3c0, dur: 0.6 });
          await wait(0.55);
        }
        break;
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
        break;
      }
      case 'stateOff': {
        ui.refresh();
        if (e.adj === 'small' || e.adj === 'big') tween(0.3, (k) => a.body.scale.setScalar(a.body.scale.x + (a.scale - a.body.scale.x) * k));
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
      case 'gauge': ui.setGauge(e.gauge); break;
      case 'opening': { if (e.level === 2) { sfx.perfect(); ui.banner('FIRST!', '선공 · 약점 발견 · 목소리 +1'); await waitReal(0.9); } else if (e.level === 1) { sfx.weak(); ui.banner('HINT!', '약점 하나 발견'); await waitReal(0.8); } break; }
      case 'hint': { ui.refresh(); ui.pulse(e.u, '.weak'); break; }
      case 'fresh': { if (this.acting) ui.pop(this.A(this.acting).top, 'New word!', 'good', 0, 10); break; }
      case 'stale': { ui.pop(a.top, '같은 말은 힘이 빠진다', 'note', 0, 34); break; }
      case 'whiff': { sfx.whoosh(); ui.pop(a.top, 'Miss!', 'bad'); await wait(0.2); break; }
      case 'spread': { sfx.ice(); fx.ice(a.group.position, 0.8); await wait(0.12); break; }
      case 'ultSay': break;
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
      case 'charge': { for (let i = 0; i < 4; i++) { fx.aura(a.group.position, 0xff6a2a, 10); await wait(0.1); } break; }
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
    if (hero && e.u.alive) a.play('hit', { fps: 8 });
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
    a.idle = false; a.kbT = (a.kbT || 0) + 1; a.set({ gray: 0.55, lean: -4, sy: 0.93 });
    this.chaseTarget = e.u;
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
      a.group.visible = false; if (this.chaseTarget === e.u) this.chaseTarget = null;
    } else {
      a.set({ lean: 0, sx: 1, sy: 1 });
      await a.play('down', { fps: 7, hold: true });
      a.set({ gray: 0.7, dark: 0.25 });
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

  // ── 추격: BREAK 직후 다음 동료의 한 방 (버튼 한 번) ────────────────
  async chase(tg, by) {
    const { ui, fx, rig, battle } = this;
    const h = battle.live('hero').find((x) => x !== by) || battle.live('hero')[0]; if (!h) return;
    const a = this.A(h), t = this.A(tg);
    ui.pop(a.top, '추격!', 'good');
    const g = await ui.rhythm([{ w: 'Now!', color: '#ffd24a' }], { lead: 0.75 });
    a.idle = false; sfx.dash(); a.frame('attack', 2);
    await this.dash(a, t.group.position.clone().add(V(this.reach(t) + 0.5, 0, 0.12)), 0.1);
    a.frame('attack', 3); sfx.slash(); fx.slash(t.center, { rot: 2.2, size: 3, color: 0xffe27a });
    await this.playAll(battle.chase(h, tg, g));
    await wait(0.18);
    await this.goHome(a); a.idle = true; a.rest();
  }

  // 필살기 공통 도입: 시간 멈춤 → 검은 띠 → 컷인 → 기술 이름 → 문장
  async ultIntro(u, name, ko, tokens, text) {
    const { ui, post, rig } = this; const a = this.A(u);
    duck(0.07); sfx.voice(5); sfx.charge();
    tweenReal(0.25, (k) => { post.u.bars.value = k; post.u.dim.value = 0.45 * k; });
    ui.cutin(`assets/art/bust/${u.uid}_bust_angry.webp`, u.color);
    const n = document.getElementById('ultname'); n.hidden = true; void n.offsetWidth; n.innerHTML = `${name}<small>${ko}</small>`; n.hidden = false;
    hitstop(0.5);
    await waitReal(0.85);
    n.hidden = true;
    ui.shout(tokens); speak(text);
    // 준비: 바닥의 룬 문양과 모여드는 빛, 낮게 다가가는 카메라
    const p = a.group.position;
    rig.to({ pos: [p.x * 0.7 - 1.4, 1.5, 9.2], look: [p.x * 0.75 - 1.0, 1.7, 0], fov: 31 }, 0.5, E.outCubic);
    a.idle = false; a.frame('attack', 1);
    const col = new THREE.Color(u.color).getHex();
    for (let i = 0; i < 5; i++) {
      this.fx.ring(V(p.x, 0, p.z), { flat: true, size: 3.4 - i * 0.3, color: col, dur: 0.45 });
      this.fx.aura(p, i % 2 ? 0xffffff : col, 12); this.stage.light(col, 6 + i * 2, a.center);
      await waitReal(0.1);
    }
    tweenReal(0.3, (k) => { post.u.dim.value = 0.45 * (1 - k * 0.5); });
  }
  async ultOutro() {
    const { ui, post } = this;
    slowmo(0.3, 0.45);
    await waitReal(0.75);
    ui.shoutOff();
    tweenReal(0.3, (k) => { post.u.bars.value = 1 - k; post.u.dim.value = 0.22 * (1 - k); });
    duck(0.22);
  }

  // ── 개인 필살기 ─────────────────────────────────────────
  async heroUlt(u, cmd) {
    const { ui, fx, rig, post, battle } = this; const def = cmd.ult; const a = this.A(u);
    const tokens = ui.tokens(def, cmd.f, def.slots, null).filter((t) => t.w).map((t) => ({ w: t.w, c: t.c }));
    tokens[tokens.length - 1].w += '!';
    this.q = battle.ult(u, cmd.f);
    await this.handle(this.q.shift());
    const say = this.q.shift();
    await this.ultIntro(u, def.name, def.ko, tokens, say.text);
    if (u.kind === 'maru') {
      const t = this.A(battle.unit(cmd.f.N));
      this.shotOn(a, t, { dist: 12.4 });
      sfx.dash(); a.frame('attack', 2);
      await this.dash(a, t.group.position.clone().add(V(this.reach(t) + 0.5, 0, 0.12)), 0.1);
      for (let i = 0; i < 3; i++) {
        a.frame('attack', 2); await wait(0.06); a.frame('attack', 3); sfx.slash();
        fx.slash(t.center, { rot: [-0.7, 2.4, -1.6][i], size: 3.4 + i * 0.8, color: 0x7fd4ff });
        fx.streak(V(t.center.x + 2.5, t.center.y + [1.2, -0.8, 0][i], t.center.z), V(t.center.x - 2.5, t.center.y - [1.2, -0.8, 0][i], t.center.z), 0xbfe9ff, 0.35, 0.3);
        if (i === 2) { post.u.flash.value = 0.7; fx.ring(t.center, { size: 9, color: 0x7fd4ff, dur: 0.6 }); }
        if (!(await this.strike())) break;
        await wait(i === 2 ? 0.25 : 0.14);
      }
      await this.flush(); a.frame('attack', 5);
      await this.goHome(a);
    } else if (u.kind === 'muji') {
      rig.to('wide', 0.4);
      a.frame('attack', 2); await wait(0.08); a.frame('attack', 3); sfx.paint();
      const col = new THREE.Color(ADJ[cmd.f.X].color).getHex();
      // 무지갯빛 물감 파도가 무대를 가로지른다
      const cols = [0xff5a6a, 0xffc23a, 0x5ad36a, 0x4aa8ff, 0xb06aff];
      await tween(0.45, (k) => { const x = a.group.position.x - k * 12; for (let i = 0; i < 6; i++) fx.p({ x: x + rnd(-0.4, 0.4), y: rnd(0.1, 3.2), z: rnd(-2.5, 2.5) }, { x: rnd(-3, 0), y: rnd(-1, 3) }, { color: cols[i % 5], life: 0.7, size: rnd(0.16, 0.3), g: 3, floor: false }); }, E.lin);
      post.u.flash.value = 0.6; rig.shake(0.4);
      for (const tg of battle.live('enemy')) { fx.paint(this.A(tg).center, col); if (!(await this.strike())) break; await wait(0.12); }
      await this.flush(); await this.castEnd(a);
    } else {
      const t = this.A(battle.unit(cmd.f.N));
      a.frame('attack', 2); sfx.draw(); await wait(0.15); a.frame('attack', 3);
      for (let i = 0; i < 4; i++) { fx.glow(a.point('tip'), { size: 0.8 + i * 0.4, color: 0xfff3c0, dur: 0.25 }); await wait(0.07); }
      sfx.arrow(); sfx.heavy(); rig.punch(3);
      const from = a.point('tip');
      fx.streak(from, t.center, 0xffffff, 0.5, 0.45); fx.streak(from, t.center, 0xfff3c0, 1.1, 0.3);
      this.shotFollow(a, t, 0.16);
      await this.fx.arrow(from, t.center, { dur: 0.08 });
      post.u.flash.value = 0.6; fx.ring(t.center, { size: 8, color: 0xfff3c0, dur: 0.6 });
      await this.flush();
      a.frame('attack', 4); await wait(0.15);
    }
    a.idle = true; a.set({ lean: 0, sx: 1, sy: 1 }); a.rest();
    await this.ultOutro();
  }

  // ── 합동 필살기: 박자에 맞춰 낱말 덩이를 순서대로 ──────────────────
  async joint(tg) {
    const { ui, fx, rig, post, battle } = this;
    const t = this.A(tg); const heroes = battle.live('hero');
    const words = JOINT[tg.kind] || ['Hit', 'the monster', 'right now!'];
    const cols = ['#ff6b5e', '#5cc0ff', '#ffd24a', '#7fdc6a'];
    duck(0.08);
    tweenReal(0.3, (k) => { post.u.bars.value = k; post.u.dim.value = 0.3 * k; });
    const n = document.getElementById('ultname'); n.hidden = true; void n.offsetWidth; n.innerHTML = 'Together!<small>합동 언령</small>'; n.hidden = false;
    heroes.forEach((h, i) => setTimeout(() => ui.cutin(`assets/art/bust/${h.uid}_bust_angry.webp`, h.color), i * 260));
    sfx.voice(5);
    rig.to({ pos: [1.6, 1.9, 12.4], look: [-0.8, 1.9, 0], fov: 33 }, 0.6, E.inOut);
    await waitReal(0.4 + heroes.length * 0.26);
    n.hidden = true;
    const score = await ui.chunks(words, {
      onStep: (i, g) => {
        const h = heroes[i % heroes.length], a = this.A(h); const c = new THREE.Color(cols[i % 4]).getHex();
        ui.pop(t.top, g >= 1 ? 'Perfect!' : g > 0 ? 'Good!' : 'Miss', g > 0 ? 'good' : 'bad', (i - 1.5) * 50, -20);
        if (!g) return;
        sfx.word(i * 2); sfx.hit(0.6 + g * 0.4);
        fx.streak(a.center, t.center, c, 0.3 + g * 0.3, 0.3); fx.impact(t.center, { color: c, power: 0.7 + g * 0.5 });
        t.flash(0.08); rig.shake(0.1 + g * 0.1); rig.punch(1 + g); post.u.impact.value = 0.5;
        a.play('shout' in a.sprite.frames ? 'shout' : 'victory', { fps: 12 });
      },
    });
    const sentence = words.join(' ');
    ui.shout(words.map((w, i) => ({ w, c: ['V', 'A', 'P', 'N'][i] }))); speak(sentence);
    await waitReal(0.45);
    sfx.dash();
    await Promise.all(heroes.map((h, i) => { const a = this.A(h); a.idle = false; a.frame('attack', 3); a.set({ lean: -3 }); return this.dash(a, t.group.position.clone().add(V(this.reach(t) + 0.4 + i * 0.6, 0, 0.1 + i * 0.25)), 0.13 + i * 0.03); }));
    post.u.flash.value = 0.9; hitstop(0.2); sfx.heavy(); sfx.break();
    fx.fire(t.group.position, 1.4); fx.ice(t.group.position, 1.2); fx.ring(t.center, { size: 10, color: 0xffffff, dur: 0.7 });
    fx.slash(t.center, { rot: -0.7, size: 4.5 }); fx.slash(t.center, { rot: 2.4, size: 4.5, color: 0xffe27a });
    rig.shake(0.7);
    await this.playAll(battle.joint(tg, score));
    slowmo(0.3, 0.5);
    await waitReal(0.7);
    await Promise.all(heroes.map((h) => { const a = this.A(h); return this.goHome(a).then(() => { a.idle = true; a.set({ lean: 0 }); a.rest(); }); }));
    ui.shoutOff(); ui.refresh();
    tweenReal(0.3, (k) => { post.u.bars.value = 1 - k; post.u.dim.value = 0.3 * (1 - k); });
    duck(0.22);
  }

  async finish(res) {
    const { ui, rig, battle } = this;
    await wait(0.4);
    stopMusic();
    if (res === 'win') {
      sfx.win(); rig.to({ pos: [4.2, 2.6, 10.5], look: [4.1, 1.5, 0], fov: 30 }, 1.0, E.inOut);
      battle.live('hero').forEach((h, i) => { const a = this.A(h); setTimeout(() => a.play('victory', { fps: 6, loop: true }), i * 120); });
    } else { sfx.lose(); this.post.u.dim.value = 0.5; }
    await waitReal(1.5);
    this.onEnd(res, battle.stats);
  }
  dispose() { this.running = false; stopMusic(); this.renderer.dispose(); }
}
