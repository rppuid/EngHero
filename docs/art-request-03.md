# 외부 생성 그림 의뢰서 3차

걷기 다시 만들기, 인물 기술 동작, 적 동작, 새 적·중간 보스·보스의 원화와 동작.
지시문은 `공통` + `종류별` + `대상 묘사`를 이어 붙여 쓴다. 2차 때와 같은 방식이다.

## 0. 공통 규격

| 항목 | 값 |
|---|---|
| 동작 그림 | 장면을 가로로 이어 붙인 PNG 한 장, 투명 배경 |
| 장면 크기 | 인물·작은 적 96 × 96, 큰 적 128 × 128, 보스 192 × 192 (대상마다 표에 적음) |
| 발 위치 | 모든 장면에서 발바닥이 같은 높이(장면 아래에서 8칸 위), 몸 중심이 장면 가운데 |
| 크기 유지 | 같은 대상의 모든 장면에서 몸 크기가 같아야 한다 |
| 방향 | 인물은 왼쪽, 적은 오른쪽을 본다 (걷기만 4방향) |
| 파일 이름 | `assets/art/anim/{id}_{동작}.png`, 원화는 `assets/art/enemy/{id}_full.png` |
| 참조 | 인물은 2차 때 만든 `{id}_idle.png`를, 적은 원화를 참조 이미지로 첨부 |

### 공통 지시문 (동작 그림 맨 앞)

```
Pixel art sprite sheet for a 2D JRPG. One horizontal row of animation frames, each frame the same size,
evenly spaced, transparent background. The same character in every frame: identical face, outfit, colors
and body size as the attached reference. Feet on the same ground line in every frame, body centered in
each frame. Clean pixel art with a dark outline, no anti-aliased blur, no text, no frame numbers,
no ground shadow, no background.
```

### 공통 지시문 (원화 맨 앞)

```
2D fantasy JRPG monster art for a children's educational game. Clean confident line art, cel shading with
two tones, soft warm colors, clear readable silhouette, limited palette of 5 to 6 main colors.
Full body, three-quarter view facing right, ready-to-fight pose, whole body visible with margin.
Not gory, suitable for ages 9 to 12. No text, no watermark, no frame, no scenery, no ground shadow.
Plain pure white background, 1024 x 1024.
```

## 1. 걷기 다시 만들기 (인물 9명)

2차 걷기는 같은 쪽 발만 반복해서 나온다. 아래처럼 **장면마다 어느 발이 앞인지 적어서** 다시 만든다.
맵에서 쓰는 그림이므로 무기는 들지 않는다(검은 등이나 허리에, 지팡이·활은 등에).

- 파일: `{id}_walk.png`, 장면 96 × 96, 한 방향 8장면 × 4방향 = 가로 32장면 (3072 × 96)
- 방향 순서: 아래(정면) → 왼쪽 → 오른쪽 → 위(뒷모습)
- 대상: `maru` `sori` `muji` `naru` `garak` `dodam` `duduk` `grimo`(떠다니므로 위아래로 흔들리기만) `silence`

```
Walking cycle, 8 frames per direction, 4 directions in this order: facing down (front view), facing left,
facing right, facing up (back view). Weapon put away (not in hands), arms swinging naturally.
The legs must alternate. For each direction the 8 frames are exactly:
1. RIGHT foot forward touching the ground, LEFT foot back, left arm forward.
2. Weight on the RIGHT foot, body slightly lower, left foot lifting.
3. LEFT leg passing under the body, body at its highest, feet close together.
4. LEFT foot reaching forward, about to land.
5. LEFT foot forward touching the ground, RIGHT foot back, right arm forward. (mirror of frame 1)
6. Weight on the LEFT foot, body slightly lower, right foot lifting.
7. RIGHT leg passing under the body, body at its highest, feet close together.
8. RIGHT foot reaching forward, about to land.
In the front and back views the forward foot is drawn lower and larger, the back foot higher and smaller,
and they swap sides between frame 1 and frame 5. Hair, scarf and cloak bounce gently with each step.
```

## 2. 인물 공통 동작 (파티 7명)

대상: `maru` `sori` `muji` `naru` `garak` `dodam` `duduk`. 장면 96 × 96, 왼쪽을 본다.

| 동작 id | 장면 수 | 넣을 말 |
|---|---|---|
| `guard` | 3 | Guarding: 1 raises weapon or arms in front of the body, 2 braced defensive stance leaning back slightly, 3 small recoil from a blocked hit. |
| `shout` | 4 | Shouting a magic word: 1 deep breath leaning back, 2 mouth wide open shouting forward with one hand thrust out, 3 hold the shout with hair and clothes blown back, 4 return to standing. |
| `item` | 4 | Using an item: 1 reaches into a pouch, 2 holds a small glowing bottle up, 3 drinks or throws it up, 4 relieved smile. |
| `dash` | 4 | Running forward fast to the left: low leaning sprint, legs alternating, cloth streaming behind. |

## 3. 인물 기술 동작

장면 96 × 96, 왼쪽을 본다. 2차의 `attack`(기본 공격)은 그대로 쓴다.
`maru`와 `sori`는 같은 기술을 쓰므로 같은 지시문으로 둘 다 만든다.

| 인물 | 동작 id | 장면 수 | 넣을 말 |
|---|---|---|---|
| maru, sori | `push` | 5 | Shoulder push: 1 crouch and pull the shield-side shoulder back, 2 lunge forward, 3 slam forward with shoulder and open palm (impact frame), 4 follow through, 5 recover. |
| maru, sori | `jump` | 6 | Jumping sword slam: 1 deep crouch, 2 leaping up with sword raised behind the head, 3 at the top of the jump body arched, 4 falling with sword swinging down, 5 landing with sword struck into the ground, knees bent (impact frame), 6 standing up. |
| maru, sori | `cut2` | 6 | Two quick slashes: 1 wind up, 2 diagonal slash down-left (impact), 3 turn the wrist, 4 horizontal slash back (impact), 5 follow through, 6 recover. |
| muji | `cast_fire` | 6 | Fire spell: 1 raises the paintbrush staff, 2 spins it overhead with the brush tip glowing orange, 3 leans back charging, 4 swings the staff forward pointing left (release frame), 5 holds the pose, 6 recovers. Do not draw the fire itself. |
| muji | `cast_ice` | 6 | Ice spell: 1 holds the staff vertically with both hands, 2 brush tip glowing pale blue, 3 lifts the staff high, 4 stabs the staff end down onto the ground (release frame), 5 holds, 6 recovers. Do not draw the ice itself. |
| muji | `paint` | 6 | Painting magic: 1 dips the brush toward her palette, 2 draws a big circle in the air with a rainbow brush tip, 3 continues the stroke, 4 flicks the brush forward to the left (release frame), 5 twirl, 6 cheerful pose. |
| naru | `aim` | 5 | Careful aimed shot: 1 kneels on one knee, 2 nocks an arrow, 3 draws the bow fully and holds very still, 4 releases (bowstring forward, release frame), 5 lowers the bow. |
| naru | `look` | 4 | Scouting: 1 raises a hand to shade his eyes, 2 leans forward peering to the left, 3 points forward having spotted something, 4 nods. |
| naru | `hide` | 4 | Hiding: 1 pulls his hood up, 2 crouches low, 3 wraps the cloak around himself kneeling, 4 only eyes visible under the hood. |
| garak | `sing` | 6 | Singing with the lute: 1 strums, 2 mouth open singing, head tilted back, 3 strums again swaying left, 4 sways right, 5 big final strum with arm raised (release frame), 6 bow. |
| garak | `ask` | 4 | Asking a question: 1 tilts head, 2 leans forward with one hand cupped to his ear, 3 points forward with a curious smile, 4 nods. |
| dodam | `write` | 6 | Writing magic: 1 the floating book opens, 2 she raises the quill, 3 writes quickly in the air, 4 underlines with a sharp stroke to the left (release frame), 5 the book snaps shut, 6 pushes up her glasses. |
| dodam | `read` | 4 | Reading aloud: 1 holds the book in both hands, 2 reads with a finger tracing the line, 3 looks up with a realization, 4 raises one finger. |
| duduk | `throw` | 6 | Throwing coins: 1 reaches into the coin pouch, 2 winds up with a handful of coins, 3 throws forward to the left (release frame), 4 follow through, 5 pats the pouch, 6 laughs. |
| duduk | `bargain` | 4 | Bargaining: 1 strokes his mustache, 2 flicks the abacus beads, 3 holds up fingers showing a number, 4 claps hands with a big grin. |

## 4. 지금 있는 적의 동작 (6종)

원화(`{id}_full.png`)를 참조 이미지로 첨부한다. 오른쪽을 본다.

| id | 장면 크기 | 특수 동작 `special`에 넣을 말 |
|---|---|---|
| `slime` | 96 | Hiding: flattens into a puddle and slides away. |
| `mushroom` | 96 | Puffing a big cloud of purple sleep spores from under its cap. |
| `bee` | 96 | Stinger charge: curls its body and dives forward stinger first. |
| `wolf` | 128 | Fire breath: rears its head back, flames on its mane flare up, then breathes forward with jaws wide open. Do not draw the fire stream itself. |
| `tree` | 128 | Root slam: lifts both branch arms high and smashes them onto the ground. |
| `boss_bear` | 192 | Roar and stomp: stands up on its hind legs, roars with the tree on its back shaking, then crashes down on all fours. |

적마다 아래 다섯 동작을 만든다.

| 동작 id | 장면 수 | 넣을 말 |
|---|---|---|
| `idle` | 4 | Idle breathing loop: small up and down body movement, flames or leaves flicker, blinks once. |
| `attack` | 6 | Basic attack toward the right: 1 pulls back, 2 crouches, 3 lunges forward, 4 strikes with bite, claw or body (impact frame), 5 follows through, 6 returns. |
| `hit` | 3 | Taking a hit: 1 flinches backward to the left with eyes shut, 2 pushed further back, 3 recovers. |
| `down` | 4 | Defeated: 1 staggers, 2 collapses, 3 lies on the ground, 4 lies still with eyes closed. Not gory. |
| `special` | 6 | 위 표의 말. 1~2 준비, 3~4 실행, 5 유지, 6 돌아옴. |

방패가 깨진 상태용으로 `stun` 2장면도 함께 만든다.

```
Stunned loop: slumped and dizzy, head hanging, swaying slightly, little stars implied by posture only.
```

## 5. 새 적·중간 보스·보스

각각 **원화 1장 → 4장의 동작 5개 + stun** 순서로 만든다.
월드 1의 중간 보스는 `tree`, 보스는 `boss_bear`로 이미 있다.

### 월드 1 시작의 숲 (보충)

| id | 종류 | 크기 | 묘사 |
|---|---|---|---|
| `bird` | 일반 | 96 | A plump round forest bird with green and yellow feathers, a short beak tied shut with a black ribbon in an X, small angry eyebrows, flapping in the air. |
| `frog` | 일반 | 96 | A big-eyed pond frog with a lily pad on its head, a black X seal over its wide mouth, cheeks puffed, ready to hop. |

### 월드 2 메아리의 마을

| id | 종류 | 크기 | 묘사 |
|---|---|---|---|
| `bat` | 일반 | 96 | An echo bat with oversized round ears like satellite dishes, purple fur, small fangs, sound-wave rings drawn on its wings. |
| `scarecrow` | 일반 | 96 | A patched straw scarecrow with a burlap sack head, button eyes, a stitched-shut mouth, a floppy hat, holding a broom. |
| `bellghost` | 일반 | 96 | A small ghost shaped like a cracked brass bell with a worried face and tiny floating hands, no clapper inside. |
| `mid_golem` | 중간 보스 | 128 | A bell-tower golem built from village bricks and wooden beams, a big silent bronze bell for a chest, clock hands for a mustache, heavy fists. |
| `boss_mimic` | 보스 | 192 | The Echo Mimic: a tall masked jester-bard in a patchwork cloak of stolen speech bubbles, a mirror for a face, carrying a broken lute. Elegant and eerie, not gory. |

### 월드 3 시간의 사막

| id | 종류 | 크기 | 묘사 |
|---|---|---|---|
| `scorpion` | 일반 | 96 | A sand scorpion with a golden shell, a tail tip shaped like a clock hand, big cartoon eyes. |
| `cactus` | 일반 | 96 | A grumpy walking cactus with a flower on its head, arms crossed in a "no" pose, a little red prohibition sign hanging around its neck (plain red circle with a slash, no text). |
| `sandglass` | 일반 | 96 | A floating hourglass spirit with a sleepy face in the glass, sand trickling upward, small wings made of sand. |
| `mid_sphinx` | 중간 보스 | 128 | The Rule Keeper: a stone sphinx statue with a stern face, a headdress striped in blue and gold, one paw holding a stone tablet with a red prohibition circle (no text). |
| `boss_serpent` | 보스 | 192 | The Sand Clock Serpent: a giant desert serpent coiled around a huge broken hourglass, scales like golden clock gears, a pharaoh-like crown, glowing blue eyes. |

### 월드 4 바벨의 마왕성

| id | 종류 | 크기 | 묘사 |
|---|---|---|---|
| `imp` | 일반 | 96 | A mischievous letter imp, a small dark-purple imp carrying a sack of stolen glowing alphabet shapes (abstract glyphs, not readable text), a zipper for a mouth. |
| `armor` | 일반 | 96 | A hollow living suit of armor with a helmet visor glowing violet, no face, a big shield, a chain wrapped around the helmet's mouth guard. |
| `bookmimic` | 일반 | 96 | A monster book with sharp page-teeth, a belt strap buckled shut over its covers, one angry eye on the cover, a tongue-like bookmark. |
| `mid_twins` | 중간 보스 | 128 | Twin stone gargoyles standing side by side, one clearly small and one clearly much bigger, same design, both with wings and a stone gag over their mouths. |
| `boss_silence2` | 최종 보스 | 192 | Lord Silence, true form: the same pale mouthless mask and violet-black robe as the attached reference, now towering, the robe opening into a starry void full of trapped glowing words, six long shadow arms. Imposing but not gory. |

`boss_silence2`는 1차의 `silence_full.png`를 참조 이미지로 첨부한다.
보통 모습의 침묵의 마왕(`silence`)은 2차 동작이 있으므로 4장의 `special`과 `stun`만 추가한다.

```
silence special: Stealing a voice: raises one long hand, pulls a glowing word shape out of the air toward
his mask, closes the fist around it, robe swirling.
```

### 보스 전용 추가 동작 (보스 5종 + 중간 보스 4종)

| 동작 id | 장면 수 | 넣을 말 |
|---|---|---|
| `special2` | 6 | A second, bigger signature attack different from the first, with a long clear wind-up in frames 1 to 3 so the player can see it coming. |
| `talk` | 3 | Speaking: mouth or mask tilts as if talking, one gesture with a hand or head, then back to idle. |
| `rage` | 4 | Getting angry: shakes, glows brighter, rears up larger, then holds an enraged pose. |

## 6. 수량

| 묶음 | 대상 | 그림 수 |
|---|---|---|
| 1. 걷기 | 9명 | 9 |
| 2. 공통 동작 | 7명 × 4 | 28 |
| 3. 기술 동작 | 표의 행마다 (maru·sori는 각각) | 18 |
| 4. 지금 있는 적 | 6종 × 6 | 36 |
| 5. 새 적 원화 | 17종 | 17 |
| 5. 새 적 동작 | 17종 × 6 | 102 |
| 5. 보스 추가 | 9종 × 3, silence 2 | 29 |
| | **합계** | **239** |

급한 순서: 4(지금 있는 적) → 3의 maru·muji·naru → 1(걷기) → 2 → 5.
4와 3의 세 명만 있어도 지금의 전투 프로토타입이 완성된 모습이 된다.

## 7. 받은 뒤 저장소에서 하는 일

- 모든 장면을 대상별 40색으로 묶고 반투명을 없애 또렷한 도트로 정리한다(`tools/anim.py`).
- 발 높이와 몸 중심이 장면마다 어긋나 있으면 맞춘다.
- 걷기에서 발이 여전히 번갈아 나오지 않으면, 정면·뒷모습은 다리 부분만 좌우를 뒤집은 장면을 만들어 끼우고,
  옆모습은 닿는 장면과 지나가는 장면의 순서를 다시 짜서 자연스러운 걸음으로 고친다.
