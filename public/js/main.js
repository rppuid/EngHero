// 시작 화면 → 전투 한 판 → 결과
import { BattleScene } from './battle/scene.js';
import { GRADES } from './battle/data.js';
import { preload } from './gfx/frames.js';
import { ANIM_IDS } from './sprites/index.js';
import { initAudio, setMuted, isMuted, sfx } from './audio.js';

const $ = (s) => document.querySelector(s);
const y = new Date().getFullYear();
$('#current-year').textContent = y > 2026 ? `-${y}` : '';

let gradeNo = +(sessionStorage.getItem('engHero.grade') || 4);
const gradeBtns = [...document.querySelectorAll('.grades button')];
const drawGrade = () => gradeBtns.forEach((b) => { b.classList.toggle('on', +b.dataset.g === gradeNo); b.setAttribute('aria-checked', +b.dataset.g === gradeNo); });
gradeBtns.forEach((b) => { b.setAttribute('role', 'radio'); b.onclick = () => { gradeNo = +b.dataset.g; sessionStorage.setItem('engHero.grade', gradeNo); drawGrade(); }; });
drawGrade();

// 시작 화면 뒤로 무대가 미리 보인다
await preload(ANIM_IDS);
const scene = new BattleScene($('#stage'), GRADES[gradeNo], onEnd);
window.__scene = scene;
$('#start').disabled = false;

function onEnd(res, st) {
  const r = $('#result'); r.hidden = false;
  r.querySelector('h2').textContent = res === 'win' ? '승리!' : '쓰러졌다…';
  const last = st.sentences.slice(-3).map((s) => `<dd class="en">${s}</dd>`).join('');
  r.querySelector('dl').innerHTML = `<dt>걸린 차례</dt><dd>${st.turns}</dd><dt>Perfect</dt><dd>${st.perfect}</dd><dt>방패 깨뜨리기</dt><dd>${st.breaks}</dd><dt>써 본 낱말</dt><dd>${st.newWords}</dd><dt>가장 큰 한 방</dt><dd>${st.maxHit}</dd>${last}`;
}

let started = false;
$('#start').onclick = (e) => {
  if (started) return; started = true; e.currentTarget.blur(); e.currentTarget.disabled = true;
  initAudio(); sfx.ok();
  scene.grade = GRADES[gradeNo]; scene.battle.grade = GRADES[gradeNo]; scene.battle.band = GRADES[gradeNo].band;
  scene.gradeNo = gradeNo;
  document.body.classList.toggle('gloss-always', GRADES[gradeNo].band === 'a');
  $('#title').classList.add('out');
  scene.run();
};
$('#again').onclick = () => location.reload();
$('#btn-sound').onclick = (e) => { setMuted(!isMuted()); e.currentTarget.classList.toggle('off', isMuted()); };
$('#btn-help').onclick = () => { $('#help').hidden = false; };
$('#help-close').onclick = () => { $('#help').hidden = true; };
