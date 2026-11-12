// 전투 내용 데이터: 낱말, 기술, 인물, 적. 규칙은 engine.js, 연출은 scene.js.

// 형용사(상태). effect는 engine.js가 읽는다.
export const ADJ = {
  hot: { ko: '뜨거운', color: '#ff7a3c', turns: 3 },
  cold: { ko: '차가운', color: '#7fd4ff', turns: 3 },
  wet: { ko: '젖은', color: '#4aa8ff', turns: 3 },
  big: { ko: '큰', color: '#ffd24a', turns: 3 },
  small: { ko: '작은', color: '#c9a0ff', turns: 3 },
  sleepy: { ko: '졸린', color: '#b8b8e8', turns: 2 },
  angry: { ko: '화난', color: '#ff4d6a', turns: 3 },
  blue: { ko: '파란', color: '#59c8e8', fixed: true },
  green: { ko: '초록', color: '#7fdc6a', fixed: true },
  red: { ko: '빨간', color: '#ff6b5e', fixed: true },
};

// 위치(전치사구). spot은 stage.js의 자리 이름.
export const PREP = {
  behindRock: { en: 'behind the rock', ko: '바위 뒤에', cover: true },
  nextToTree: { en: 'next to the tree', ko: '나무 옆에' },
  inWater: { en: 'in the water', ko: '물속에' },
  open: { en: 'on the grass', ko: '풀밭 위에' },
};
export const INTO = {
  inWater: { en: 'into the water', ko: '물속으로' },
  behindRock: { en: 'behind the rock', ko: '바위 뒤로' },
  nextToTree: { en: 'next to the tree', ko: '나무 옆으로' },
};
export const TIMES = { 2: { en: 'two times', ko: '두 번 (안정)' }, 3: { en: 'three times', ko: '세 번 (마지막은 빗나갈 수 있음)' } };

// 동사(공격 종류)의 우리말
export const VERB_KO = { cut: '베기', push: '밀기', jump: '뛰기', burn: '불', freeze: '얼음', shoot: '쏘기' };

// 기술. slots: 기본 자리, ext: 목소리 1칸마다 하나씩 열리는 자리(순서대로)
// 자리 종류 N 대상 / A 대상을 꾸미는 형용사 / T 횟수 / P 대상의 위치 / O 옮길 곳 / X 만들 상태 / N2 둘째 대상
export const SKILLS = {
  cut: { verb: 'Cut', ko: '베다', type: 'cut', power: 1.0, slots: ['N'], ext: ['A', 'T'], text: 'Cut the {A} {N} {T}', target: 'enemy', anim: 'slash' },
  push: { verb: 'Push', ko: '밀다', type: 'push', power: 0.6, slots: ['N'], ext: ['O', 'A'], text: 'Push the {A} {N} {O}', target: 'enemy', anim: 'push', delay: true },
  jump: { verb: 'Jump', ko: '뛰어오르다', type: 'jump', power: 1.5, slots: ['N'], ext: ['A'], text: 'Jump on the {A} {N}', target: 'enemy', anim: 'jump', needVoice: 1 },
  burn: { verb: 'Burn', ko: '태우다', type: 'burn', power: 1.0, slots: ['N'], ext: ['A', 'N2'], text: 'Burn the {A} {N} {N2}', target: 'enemy', anim: 'fire', magic: true },
  freeze: { verb: 'Freeze', ko: '얼리다', type: 'freeze', power: 1.0, slots: ['N'], ext: ['A', 'N2'], text: 'Freeze the {A} {N} {N2}', target: 'enemy', anim: 'ice', magic: true },
  make: { verb: 'Make', ko: '~하게 만들다', type: 'make', power: 0, slots: ['N', 'X'], ext: ['N2'], text: 'Make the {N} {N2} {X}', target: 'any', anim: 'paint', magic: true },
  shoot: { verb: 'Shoot', ko: '쏘다', type: 'shoot', power: 0.95, slots: ['N'], ext: ['P', 'A'], text: 'Shoot the {A} {N} {P}', target: 'enemy', anim: 'arrow' },
  look: { verb: 'Look', ko: '살펴보다', type: 'look', power: 0, slots: ['N'], ext: [], text: 'Look at the {N}', target: 'enemy', anim: 'look' },
  hide: { verb: 'Hide', ko: '숨다', type: 'hide', power: 0, slots: ['H'], ext: [], text: 'Hide {H}', target: 'self', anim: 'hide' },
};
export const MAKE_ADJ = ['cold', 'hot', 'wet', 'small', 'big', 'sleepy'];

export const HEROES = {
  maru: { name: '마루', job: '견습 마검사', noun: 'Maru', hp: 130, atk: 24, def: 6, spd: 12, skills: ['cut', 'push', 'jump'], color: '#e0392f' },
  muji: { name: '무지', job: '색채 마법사', noun: 'Muji', hp: 96, atk: 26, def: 3, spd: 9, skills: ['burn', 'freeze', 'make'], color: '#f5c542' },
  naru: { name: '나루', job: '길잡이 궁수', noun: 'Naru', hp: 108, atk: 22, def: 4, spd: 15, skills: ['shoot', 'look', 'hide'], color: '#4f8a3c' },
};

// 적. weak: 약점(동사 또는 형용사). resist: 잘 안 통하는 동사. lines: 학년군별 대사(a: 3~4학년군, b: 5~6학년군)
export const ENEMIES = {
  wolf: {
    name: '불 늑대', noun: 'wolf', hp: 190, atk: 21, def: 5, spd: 11, shield: 3, scale: 1,
    weak: ['freeze', 'shoot', 'wet', 'kick'], resist: ['burn'], states: ['hot'], fixedStates: ['hot'],
    moves: [
      { id: 'bite', w: 5, en: { a: 'Bite!', b: 'You should run!' }, ko: '물어뜯기' },
      { id: 'fire', w: 3, charge: true, en: { a: 'Big fire!', b: 'Burn, all of you!' }, ko: '큰 불', warn: { a: 'Hot! Hot!', b: 'I am going to burn you all!' }, warnKo: '숨을 크게 들이쉰다' },
      { id: 'howl', w: 2, en: { a: 'I am angry!', b: 'Now I am very angry!' }, ko: '울부짖기' },
    ],
    hurt: { a: 'Ouch!', b: 'That hurts!' }, broken: { a: 'Oh no…', b: 'I can not move…' },
  },
  slime: {
    name: '파란 슬라임', noun: 'slime', hp: 62, atk: 13, def: 2, spd: 8, shield: 2, scale: 1,
    weak: ['cut', 'hot'], resist: ['push'], states: ['blue'], fixedStates: ['blue'],
    moves: [
      { id: 'tackle', w: 5, en: { a: 'Jump!', b: 'I am going to jump on you!' }, ko: '몸통 박치기' },
      { id: 'hide', w: 2, en: { a: 'Hide!', b: 'I will hide behind the rock!' }, ko: '숨기' },
    ],
    hurt: { a: 'Mmm!', b: 'Mmmph!' }, broken: { a: '…', b: '…' },
  },
  mushroom: {
    name: '졸린 버섯', noun: 'mushroom', hp: 66, atk: 12, def: 2, spd: 7, shield: 2, scale: 1,
    weak: ['burn', 'shoot'], resist: ['freeze'], states: ['red'], fixedStates: ['red'],
    moves: [
      { id: 'tackle', w: 4, en: { a: 'Jump!', b: 'I will jump on you!' }, ko: '몸통 박치기' },
      { id: 'sleep', w: 3, en: { a: 'Sleep…', b: 'You have to sleep now…' }, ko: '졸음 가루' },
    ],
    hurt: { a: 'Mmm!', b: 'Mmmph!' }, broken: { a: '…', b: '…' },
  },
};

// 첫 전투 구성
export const ENCOUNTER = {
  heroes: ['maru', 'muji', 'naru'],
  enemies: [
    { kind: 'wolf', spot: 'open' },
    { kind: 'slime', spot: 'behindRock' },
    { kind: 'mushroom', spot: 'nextToTree' },
  ],
};

// 학년 설정: band는 문장 난이도(a: 3~4학년군, b: 5~6학년군), gloss는 우리말 뜻 보조
export const GRADES = {
  3: { band: 'a', gloss: 'always', speak: 'auto' },
  4: { band: 'a', gloss: 'always', speak: 'auto' },
  5: { band: 'b', gloss: 'hover', speak: 'auto' },
  6: { band: 'b', gloss: 'hover', speak: 'auto' },
};

// 꾸미는 말이 대상의 실제 상태와 맞았을 때의 작전 효과 (engine.js가 읽는다)
export const DESC_FX = {
  cold: { ko: '얼음 깨기', note: '물리 공격 1.5배' },
  wet: { ko: '번지기', note: '얼음이 옆의 적에게도' },
  hot: { ko: '불붙이기', note: '불 1.4배' },
  sleepy: { ko: '급소', note: '반드시 치명타, 깨우지 않음' },
  angry: { ko: '빈틈', note: '방어 무시' },
  small: { ko: '날리기', note: '차례를 뒤로 민다' },
  big: { ko: '큰 표적', note: '1.25배' },
  blue: { ko: '정확히 지목', note: '1.15배' }, green: { ko: '정확히 지목', note: '1.15배' }, red: { ko: '정확히 지목', note: '1.15배' },
};

// 개인 필살기. slots: V3 동사 셋 / N 대상 / X 만들 상태 / P 위치
export const ULTS = {
  maru: { name: 'Rune Slash', ko: '룬 연격', text: '{V1}, {V2} and {V3} the {N}', slots: ['N', 'V1', 'V2', 'V3'], verbs: ['cut', 'push', 'jump', 'hit', 'kick'] },
  muji: { name: 'Rainbow Burst', ko: '무지개 폭발', text: 'Make everything {X}', slots: ['X'] },
  naru: { name: 'True Shot', ko: '꿰뚫는 화살', text: 'Shoot the {N} {P}', slots: ['N', 'P'] },
};
export const VERB_EN = { cut: 'Cut', push: 'Push', jump: 'Jump on', hit: 'Hit', kick: 'Kick' };
export const VERB_KO2 = { cut: '베다', push: '밀다', jump: '뛰어오르다', hit: '치다', kick: '차다' };

// 합동 언령: 낱말 덩이를 순서대로
export const JOINT = {
  wolf: ['Throw', 'the cold water', 'on the wolf', 'right now!'],
  slime: ['Cut', 'the little slime', 'in the water', 'right now!'],
  mushroom: ['Burn', 'the red mushroom', 'next to the tree', 'right now!'],
};
