# 외부 생성 그림 의뢰서

영어용사에서 **외부 생성 도구로 만드는 그림**의 목록과 지시문이다.
필드·전투의 도트 스프라이트는 여기서 받은 그림을 보고 저장소 안에서 직접 찍는다(글자 격자 + 팔레트).
인물 이름은 모두 가칭이며 바꿔도 된다.

## 1. 만드는 순서

인물마다 아래 순서를 지킨다. 설정화를 먼저 확정해야 나머지 그림의 얼굴·옷이 흔들리지 않는다.

1. **설정화**(앞·옆·뒤 3면도)를 만든다. 마음에 들 때까지 다시 뽑는다.
2. 확정한 설정화를 **참조 이미지로 첨부**하고 전신 그림을 만든다.
3. 같은 설정화를 첨부하고 상반신 표정 그림을 표정별로 만든다.

지시문은 `공통 화풍` + `그림 종류` + `인물 묘사` 세 덩어리를 이어 붙여 쓴다.

## 2. 규격과 파일 이름

| 종류 | 크기(권장) | 배경 | 파일 이름 | 넣을 폴더 |
|---|---|---|---|---|
| 설정화 | 가로 1536 × 세로 1024 | 흰색 단색 | `{id}_sheet.png` | `assets/art/sheet/` |
| 전신 | 가로 1024 × 세로 1536 | 투명 또는 흰색 단색 | `{id}_full.png` | `assets/art/full/` |
| 상반신 | 1024 × 1024 | 투명 또는 흰색 단색 | `{id}_bust_{표정}.png` | `assets/art/bust/` |

- 표정 이름: `normal` `smile` `surprise` `angry` `sad` `silent`
- 배경을 투명하게 뽑기 어려우면 흰색 단색이면 된다. 배경 제거는 이쪽에서 한다.
- 그림 안에 글자, 서명, 테두리, 그림자 바닥이 들어가지 않게 한다.
- 크기가 조금 달라도 비율만 비슷하면 된다.

## 3. 공통 화풍 (모든 지시문 맨 앞에 붙임)

```
2D fantasy JRPG character art for a children's educational game.
Clean confident line art, cel shading with two tones, soft warm colors,
slightly stylized proportions (about 5 heads tall), large expressive eyes,
clear readable silhouette, limited palette of 5 to 6 main colors per character.
Friendly and adventurous mood, suitable for ages 9 to 12.
No text, no letters, no watermark, no signature, no frame, no background scenery.
```

## 4. 그림 종류별 지시문

### 설정화

```
Character design reference sheet. The same character shown three times,
side by side, in a neutral standing pose with arms slightly away from the body:
front view, side view (facing right), back view. Full body from head to feet,
all three at the same height. Weapon or tool shown separately beside the character.
A row of flat color swatches of the character's palette at the bottom.
Plain white background.
```

### 전신

```
Full body illustration of the character in the attached reference sheet,
keeping the exact same face, hair, outfit and colors.
Standing three-quarter view facing slightly left, a confident signature pose
holding their weapon or tool. Head to feet fully visible with margin around.
Transparent background (or plain white).
```

### 상반신 표정

```
Bust-up portrait (head to waist) of the character in the attached reference sheet,
keeping the exact same face, hair, outfit and colors.
Three-quarter view facing slightly left, same framing every time.
Expression: {표정}.
Transparent background (or plain white).
```

`{표정}` 자리에 넣을 말:

| 파일 표정 이름 | 넣을 말 |
|---|---|
| `normal` | calm neutral face, gentle look |
| `smile` | big cheerful smile |
| `surprise` | surprised, eyes wide, mouth open |
| `angry` | angry and determined, eyebrows down |
| `sad` | troubled and sad, eyebrows up |
| `silent` | mouth firmly closed, worried eyes, a faint dark seal mark glowing on the throat (voice has been stolen) |

`silent`는 목소리를 빼앗긴 상태의 그림이다. 주인공 2명은 필요 없고 동료 5명만 만든다.

## 5. 인물 묘사

### 1차: 전투 프로토타입에 필요 (먼저 부탁)

**마루 `maru`** — 남자 주인공, 견습 마검사. 덤벙대지만 겁이 없다. 상징색 빨강·남색.

```
A 12-year-old boy, apprentice rune swordsman. Short messy chestnut-brown hair,
bright amber eyes, energetic grin. Long red scarf trailing behind him (his key feature).
Navy blue tunic with a brown leather belt, a single leather shoulder guard on the left,
cream trousers, sturdy brown boots. An old thick spellbook hangs from his belt on a small chain.
He carries a short sword with glowing pale-blue runes engraved along the blade.
```

**소리 `sori`** — 여자 주인공, 견습 마검사. 침착하고 호기심이 많다. 상징색 청록·흰색.

```
A 12-year-old girl, apprentice rune swordsman. Black hair in a high ponytail tied with a
white ribbon (her key feature), clear teal eyes, calm curious look.
Short white cape with teal lining over a teal tunic, dark leggings, white boots.
An old thick spellbook hangs from her belt on a small chain.
She carries a slim sword with glowing pale-blue runes engraved along the blade.
```

**무지 `muji`** — 색채 마법사, 형용사 담당. 수다스럽고 엉뚱하다. 상징색 노랑·무지개.

```
An 11-year-old girl, color mage. Blonde twin tails whose tips fade into rainbow colors,
round pink cheeks, sparkling eyes. Oversized pointed wizard hat splattered with paint stains
(her key feature). Cream robe worn like a painter's smock with colorful paint splashes,
yellow sash, short boots. She holds a staff shaped like a giant paintbrush with a glowing tip.
```

**나루 `naru`** — 길잡이 궁수, 전치사·길 안내 담당. 과묵하고 눈이 밝다. 상징색 숲 초록.

```
A 14-year-old boy, pathfinder archer. Silver-gray hair with bangs covering one eye,
sharp green eye, quiet serious look. Forest-green hooded cloak (his key feature) over a
brown leather vest, dark trousers, tall boots. A brass compass pendant around his neck,
a rolled map case on his back. He carries a wooden longbow and a quiver of arrows.
```

### 2차: 월드 2~4 동료

**가락 `garak`** — 음유시인, 질문·대화·파닉스 담당. 늘 웃고 장난이 많다. 상징색 보라·주황.

```
A 13-year-old boy, traveling bard. Curly orange hair, freckles, always smiling.
Wide-brimmed purple hat with a long white feather (his key feature), purple vest over a
loose white shirt, striped trousers, pointed shoes. He plays a small wooden lute
decorated with a music-note carving.
```

**도담 `dodam`** — 고서 학자, 비교급·시제 담당. 차분하고 아는 것이 많다. 상징색 크림·남색.

```
A 12-year-old girl, young scholar of ancient books. Long indigo hair in a single thick braid,
large round glasses (her key feature), calm thoughtful look. Long cream scholar's coat with
indigo trim and many pockets, a satchel full of scrolls. A large open book floats beside her,
and she holds a white feather quill pen.
```

**두둑 `duduk`** — 떠돌이 상인, 수·가격·제안 담당. 넉살 좋고 셈이 빠르다. 상징색 갈색·금색.

```
A big friendly adult man, traveling merchant. Round body, thick brown mustache, warm laugh lines.
An enormous patched cloth bundle on his back, taller than his head (his key feature).
Straw hat, brown vest, gold sash, rolled-up sleeves. A coin pouch and a small wooden abacus
hang from his belt.
```

### 3차: 길잡이, 악역

**그리모 `grimo`** — 말하는 마도서, 주인공의 안내자. 전신과 표정(`normal` `smile` `surprise` `angry` `sad`)만 만들고 설정화는 앞·뒤 2면이면 된다.

```
A small magical talking spellbook character, a mascot. Thick old leather cover in deep blue
with gold corners, one large friendly eye and a small mouth on the front cover,
a red ribbon bookmark like a tail, a few glowing letters floating out of its pages. It floats in the air.
```

**침묵의 마왕 `silence`** — 최종 악역. 설정화와 전신만 만든다.

```
A tall mysterious dark lord called Lord Silence. A smooth pale mask with eyes but no mouth
(his key feature), long black and deep-violet robe with a high collar, long thin fingers.
Faint glowing letters and words drift around him as if captured, trapped inside dark bubbles.
Imposing but not gory, suitable for children.
```

## 6. 받을 그림 수

| 단계 | 인물 | 설정화 | 전신 | 상반신 | 합계 |
|---|---|---|---|---|---|
| 1차 | 마루, 소리 | 2 | 2 | 5 × 2 = 10 | 14 |
| 1차 | 무지, 나루 | 2 | 2 | 6 × 2 = 12 | 16 |
| 2차 | 가락, 도담, 두둑 | 3 | 3 | 6 × 3 = 18 | 24 |
| 3차 | 그리모 | 1 | 1 | 5 | 7 |
| 3차 | 침묵의 마왕 | 1 | 1 | 0 | 2 |
| | **합계** | 9 | 9 | 45 | **63** |

1차 30장이 있으면 전투 프로토타입의 도트 작업과 대화창을 시작할 수 있다.
그중에서도 **설정화 4장**이 가장 급하다. 도트는 설정화만 있어도 찍을 수 있다.

## 7. 이번 의뢰에 없는 것 (나중에 따로)

- **낱말 아이콘**: 낱말 데이터 표가 완성된 뒤 목록과 지시문을 따로 만든다. 전투에 자주 쓰는 약 50개는 저장소 안에서 직접 찍는다.
- **보스와 주요 주민**: 월드별 이야기를 확정한 뒤 추가한다.
- **타이틀 그림, 월드 배경 그림**: 화면 구성을 정한 뒤 추가한다.
- **코드용사·수학용사**: 전작의 그림을 참고해 저장소 안에서 만든다.
- **몬스터**: 도트로 직접 만들며 외부 그림이 필요 없다.
