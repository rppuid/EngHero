# 외부 생성 그림 의뢰서 4차: 화면 자료와 배경

메뉴·창틀·아이콘처럼 화면에 얹는 그림. 지금은 CSS 상자와 코드로 그린 임시 아이콘을 쓰고 있다.
글꼴은 도트 글꼴 '갈무리11'(OFL)로 정했으므로, 화면 자료도 **도트 그림**으로 맞춘다.

## 0. 공통

- 투명 배경 PNG. 가장자리가 흐리지 않은 또렷한 도트.
- 분위기: 오래된 마도서와 룬. 짙은 남색 가죽 바탕, 금색 모서리 장식, 양피지색 글자 자리, 청록빛 룬.
- 그림 안에 글자를 넣지 않는다(글자는 게임이 글꼴로 얹는다).
- 파일: `assets/ui/{이름}.png`

```
Pixel art game UI asset for a fantasy JRPG, HD-2D style. Theme: an ancient spellbook, deep navy leather,
gold corner ornaments, parchment, faint teal glowing runes. Crisp pixels, no anti-aliasing, no text,
no letters, transparent background.
```

## 1. 창틀과 판 (늘려 쓰는 그림)

모서리는 그대로 두고 가운데만 늘려 쓴다. **모서리 장식은 사방 16칸 안**에 들어가야 하고, 가운데는 무늬 없는 단색이어야 한다.

| 이름 | 크기 | 넣을 말 |
|---|---|---|
| `panel_main` | 96 × 96 | A square window frame: deep navy leather panel with thin gold border and small gold corner ornaments, flat plain center. 9-slice friendly, corners within 16 px. |
| `panel_light` | 96 × 96 | Same shape as the navy panel but parchment colored with a brown ink border, for speech and help text. |
| `panel_select` | 96 × 48 | A selected-row highlight bar: glowing gold outline with soft inner light, plain center. |
| `bubble` | 96 × 64 | A speech bubble made of parchment with a dark ink outline and a small tail at the bottom center. |
| `bubble_warn` | 96 × 64 | Same speech bubble but with a jagged spiky outline in red, for a monster's warning shout. |
| `sentence_bar` | 192 × 48 | A long horizontal plate like an open spellbook page strip, navy with gold ends, plain center, for building a sentence on. |
| `word_tile` | 64 × 32 | A small rune stone tile, slightly rounded, plain face, in neutral stone gray so it can be tinted. |
| `banner_break` | 256 × 64 | A cracked glass burst shape, white and pale blue shards radiating from the center, plain center area for a word. |
| `banner_ult` | 256 × 64 | A dramatic diagonal gold ribbon banner with pointed ends and small rune marks at both ends, plain center. |
| `cutin_band` | 256 × 96 | A diagonal slash-shaped band with speed lines, monochrome white so it can be tinted with a character color. |
| `modal_scroll` | 192 × 192 | A large unrolled parchment scroll with wooden rods at top and bottom, plain center, for result and help windows. |

## 2. 버튼과 커서

| 이름 | 크기 | 넣을 말 |
|---|---|---|
| `button` | 96 × 32 | A wide button: carved wood with a gold rim, plain center. Three states side by side in one image (normal, highlighted, pressed) = 288 × 32. |
| `button_round` | 32 × 32 | A round gold-rimmed button, plain navy center. Three states side by side = 96 × 32. |
| `cursor_hand` | 32 × 32 | A small gloved hand pointing right, classic JRPG menu cursor. |
| `cursor_target` | 32 × 32 | A downward arrow made of gold with a tiny rune, for pointing at a target. 4 frames bobbing = 128 × 32. |
| `key_hint` | 24 × 24 | A blank keyboard keycap, light stone color, plain top face. |

## 3. 전투 표시

| 이름 | 크기 | 넣을 말 |
|---|---|---|
| `shield` | 32 × 32 | A small silver kite shield with a sealed mouth mark (a simple X) on it, plain enough for a number on top. |
| `shield_broken` | 32 × 32 | The same shield cracked in two, red glow in the crack. |
| `bar_frame` | 96 × 12 | A thin gauge frame, gold ends, empty dark inside. |
| `bar_fill` | 8 × 8 | A plain glossy bar fill tile in white (to be tinted green, red or blue). |
| `voice_pip` | 16 × 16 | A small musical-note-like rune crystal. Two states side by side: empty socket and glowing gold = 32 × 16. |
| `gauge_frame` | 192 × 20 | A long ornate gauge frame split into three sections by small gems, empty dark inside. |
| `turn_frame` | 40 × 40 | A round portrait frame, gold ring. Three versions side by side: hero (blue gem), enemy (red gem), current turn (bigger glowing ring) = 120 × 40. |
| `rune_circle` | 128 × 128 | A magic circle seen from above: concentric rings with abstract rune shapes (not real letters), white on transparent so it can be tinted. |
| `weak_unknown` | 20 × 20 | A small dark stone tile with a question-mark-like swirl rune (abstract, not a real question mark). |

## 4. 상태 아이콘 (각 24 × 24)

적의 상태를 글자 대신 그림으로 보여 준다. 한눈에 뜻이 읽혀야 한다. 굵은 어두운 테두리.

| 이름 | 넣을 말 |
|---|---|
| `st_hot` | A bright flame. |
| `st_cold` | A snowflake with icy blue shine. |
| `st_wet` | A water drop with a small splash. |
| `st_big` | A chunky arrow pointing up with a growing star. |
| `st_small` | A chunky arrow pointing down, shrinking. |
| `st_sleepy` | A crescent moon with three small floating Z-like curls (abstract). |
| `st_angry` | A red anger vein mark, classic cartoon style. |
| `st_happy` | A smiling yellow sun face. |
| `st_sad` | A blue teardrop face. |
| `st_hungry` | An empty bowl with a spoon. |
| `st_tired` | A drooping wilted leaf. |
| `st_fast` | A winged boot. |
| `st_slow` | A snail shell. |
| `st_strong` | A flexed arm. |
| `st_heavy` | An iron weight. |
| `st_light` | A white feather. |
| `st_dark` | A black crescent with a purple glow. |
| `st_bright` | A shining yellow star burst. |
| `col_red` `col_blue` `col_green` `col_yellow` `col_black` `col_white` | A faceted gem of that color. Same gem shape for all six. |

## 5. 동작(공격 종류) 아이콘 (각 24 × 24)

약점 칸과 명령 메뉴에 쓴다.

| 이름 | 넣을 말 |
|---|---|
| `act_cut` | A short sword with a slash arc. |
| `act_push` | An open palm pushing forward with motion lines. |
| `act_jump` | A boot springing upward with a curved arrow. |
| `act_hit` | A fist with an impact star. |
| `act_kick` | A boot kicking sideways. |
| `act_throw` | A small rock flying with an arc trail. |
| `act_burn` | A staff tip with fire. |
| `act_freeze` | A staff tip with an ice crystal. |
| `act_make` | A paintbrush with a rainbow stroke. |
| `act_shoot` | A bow with an arrow nocked. |
| `act_look` | An eye with a sparkle. |
| `act_hide` | A hood with two eyes peeking. |
| `act_sing` | A lute with a music note. |
| `act_ask` | A speech bubble with a curled hook rune inside (abstract). |
| `act_write` | A feather quill writing a glowing line. |
| `act_read` | An open book with light rising. |
| `act_guard` | A round shield held up. |
| `act_item` | A small potion bottle. |

## 6. 위치 아이콘 (각 32 × 32)

전치사를 그림으로. 작은 공 하나와 상자 하나의 위치 관계로 통일한다.

| 이름 | 넣을 말 |
|---|---|
| `pos_in` | A red ball inside an open wooden box. |
| `pos_on` | A red ball on top of a closed wooden box. |
| `pos_under` | A red ball under a small table-like box on legs. |
| `pos_behind` | A red ball half hidden behind a wooden box. |
| `pos_next_to` | A red ball right beside a wooden box. |
| `pos_between` | A red ball between two wooden boxes. |
| `pos_in_front_of` | A red ball in front of a wooden box, overlapping it. |

## 7. 타이틀과 그 밖

| 이름 | 크기 | 넣을 말 |
|---|---|---|
| `logo_emblem` | 256 × 256 | An emblem for the game logo: an open ancient spellbook with a rune sword standing through it and glowing letters-like sparks rising (abstract shapes, no readable text), gold and teal. |
| `title_frame` | 512 × 128 | A wide ornamental plate for a game title: gold filigree left and right, plain dark center. |
| `grimoire_icon` | 48 × 48 | The talking spellbook mascot's face as a menu icon: deep blue book, one big friendly eye, red ribbon. |
| `coin` | 16 × 16 | A gold coin with a rune mark. 4-frame spin = 64 × 16. |
| `phonics_gem` | 32 × 32 | A hexagonal crystal gem with a flat blank face for one letter, in neutral white so it can be tinted. |
| `map_marker` | 24 × 32 | A map pin shaped like a small rune banner flag. |
| `loading` | 32 × 32 | A tiny open spellbook with a page turning. 6 frames = 192 × 32. |

## 8. 배경 자료 (월드 1 숲)

지금 배경은 3D 지형에 사진에서 만든 도트 질감을 입히고, 잎과 풀과 먼 숲은 코드로 그린 그림을 쓴다.
아래 그림을 받으면 코드로 그린 부분부터 바꾼다. 땅·바위·줄기의 입체 모양과 조명, 안개, 빛줄기는 코드가 맡는다.

### 공통

- 투명 배경 PNG, 또렷한 도트. 인물과 칸 크기를 맞춘다: **무대 1칸 거리 = 그림 27칸**. 인물 키가 약 73칸이다.
- 세워 쓰는 그림(잎, 덤불, 나무)은 **살짝 위에서 본 옆모습**. 바닥에 까는 그림은 **바로 위에서 본 모습**.
- 빛은 **왼쪽 위에서** 온다. 따뜻한 햇빛, 그늘은 푸른 기가 도는 짙은 초록.
- 바닥 그림자를 그리지 않는다(그림자는 게임이 만든다).

```
Pixel art environment asset for a fantasy JRPG in HD-2D style, a sunlit forest clearing.
Warm sunlight from the upper left, cool blue-green shadows, rich but natural greens.
Crisp pixels, dark outline only where needed, no anti-aliasing, no text, no ground shadow,
transparent background.
```

### 8-1. 잎과 풀 (세워 쓰는 그림)

| 이름 | 크기 | 수 | 넣을 말 |
|---|---|---|---|
| `leaf_clump_a` ~ `d` | 128 × 128 | 4 | A dense round clump of tree leaves seen from the side, like one puff of a tree canopy. Individual leaf shapes readable at the edge, bright yellow-green highlights on the upper left, deep green shadow at the lower right, a few gaps showing darkness inside. Four different silhouettes: round, wide, drooping, ragged. |
| `leaf_hang_a` ~ `b` | 192 × 128 | 2 | A hanging branch tip with leaves drooping down from the top edge of the image, for framing the top of the screen. Dark, almost silhouette, with a thin rim of light. |
| `bush_a` ~ `c` | 96 × 64 | 3 | A low forest bush: (a) round leafy bush, (b) bush with small white flowers, (c) bush with red berries. |
| `fern_a` ~ `b` | 64 × 48 | 2 | A fern with arching fronds spreading from a center. |
| `grass_tuft_a` ~ `d` | 48 × 48 | 4 | A tuft of grass blades growing from the bottom center: dark at the roots, bright at the tips. Variations: short, tall, bent by wind, with a seed head. |
| `flower_a` ~ `d` | 24 × 32 | 4 | A single small wildflower on a stem: white daisy, pink bell, yellow buttercup, blue star. |
| `mushroom_deco_a` ~ `b` | 32 × 32 | 2 | A small cluster of forest mushrooms, brown caps and red spotted caps (scenery, not a monster). |
| `reed_a` ~ `b` | 32 × 64 | 2 | Pond reeds and cattails growing upward. |

### 8-2. 나무와 큰 소품 (세워 쓰는 그림)

싸움터 가까이의 나무는 3D 줄기에 잎 뭉치를 붙이고, 먼 나무는 통째로 그린 그림을 세운다.

| 이름 | 크기 | 수 | 넣을 말 |
|---|---|---|---|
| `tree_far_a` ~ `c` | 256 × 384 | 3 | A whole tall forest tree: thick trunk with roots flaring at the base, a wide layered leafy canopy. Three shapes: broad oak, tall slim tree, leaning old tree. |
| `stump` | 96 × 64 | 1 | A mossy tree stump with rings on top and a small mushroom on the side. |
| `log` | 160 × 64 | 1 | A fallen mossy log lying sideways with a hollow end. |
| `root_arch` | 192 × 128 | 1 | A big arching tree root rising from the ground, moss on top. |
| `signpost` | 48 × 80 | 1 | A weathered wooden signpost with a blank board (no text). |
| `ruin_stone` | 128 × 128 | 1 | A broken ancient stone pillar with faint carved rune shapes (abstract, not real letters), half covered in ivy. |

### 8-3. 먼 숲 (가로로 이어지는 띠)

카메라가 움직일 때 겹겹이 다른 속도로 흘러 깊이를 만든다. **왼쪽 끝과 오른쪽 끝이 이어지게** 그린다.

| 이름 | 크기 | 넣을 말 |
|---|---|---|
| `forest_near` | 1024 × 384 | A horizontal seamless strip of forest tree trunks and lower canopy, fairly dark and detailed, trunks reaching past the top edge, transparent gaps between trunks, undergrowth along the bottom. |
| `forest_mid` | 1024 × 384 | The same idea but farther away: smaller trunks, softer contrast, colors shifted toward misty teal-green. |
| `forest_far` | 1024 × 384 | Very distant forest: only pale blue-green silhouettes of treetops with almost no detail, fading into mist at the bottom. |
| `sky_glow` | 512 × 288 | No trees. A soft backdrop of sunlight glowing through forest haze: warm pale yellow in the center right, fading to deep teal at the top and edges. Opaque, no transparency. |

### 8-4. 바닥 (바로 위에서 본 그림)

이어 붙여 까는 그림은 **네 변이 모두 이어져야** 한다.

| 이름 | 크기 | 넣을 말 |
|---|---|---|
| `ground_grass` | 256 × 256 | Seamless tileable top-down grass: short meadow grass with subtle clumps, tiny clover and a few small flowers, no obvious repeating shapes. Opaque. |
| `ground_dirt` | 256 × 256 | Seamless tileable top-down packed dirt of a forest clearing: warm brown earth with pebbles, a few dry leaves and small grass sprouts. Opaque. |
| `ground_leaves` | 256 × 256 | Seamless tileable top-down forest floor covered with fallen leaves in brown, orange and yellow, some twigs and moss. Opaque. |
| `ground_moss_rock` | 128 × 128 | Seamless tileable rock surface with cracks and patches of moss. Opaque. |
| `bark` | 128 × 256 | Seamless tileable tree bark, vertical grooves, a little moss, tiles both ways. Opaque. |
| `decal_leaves` | 96 × 96 | A loose scatter of fallen leaves, top-down, transparent background. |
| `decal_pebbles` | 64 × 64 | A small cluster of pebbles and a twig, top-down, transparent. |
| `decal_roots` | 128 × 128 | Tree roots spreading over the ground, top-down, transparent. |
| `decal_flowers` | 96 × 96 | A patch of tiny wildflowers in grass, top-down, transparent. |
| `lilypad_a` ~ `b` | 32 × 32 | A lily pad seen from above, one with a pink flower. 2 images. |

### 8-5. 다른 월드 (나중에)

월드 1에서 방식이 검증되면 같은 틀로 요청한다. 미리 만들어 두려면 위 표의 종류를 그대로 쓰고 소재만 바꾸면 된다.

| 월드 | 바닥 | 세워 쓰는 것 | 먼 배경 |
|---|---|---|---|
| 2 메아리의 마을 | 돌길, 흙길, 잔디 | 집 정면, 울타리, 우물, 종탑, 가로등, 화분 | 지붕 실루엣, 언덕 |
| 3 시간의 사막 | 모래, 갈라진 땅, 돌바닥 | 선인장, 야자수, 부서진 기둥, 모래시계 석상, 천막 | 모래 언덕, 피라미드 실루엣 |
| 4 바벨의 마왕성 | 검은 돌바닥, 카펫, 금 간 타일 | 기둥, 횃불, 책장, 사슬, 깃발, 글자가 갇힌 수정 | 탑 내부 아치, 별 없는 하늘 |

## 9. 수량과 순서

| 묶음 | 수 |
|---|---|
| 1. 창틀과 판 | 11 |
| 2. 버튼과 커서 | 5 |
| 3. 전투 표시 | 9 |
| 4. 상태 아이콘 | 24 |
| 5. 동작 아이콘 | 18 |
| 6. 위치 아이콘 | 7 |
| 7. 타이틀과 그 밖 | 7 |
| 8. 배경 (월드 1 숲) | 48 |
| **합계** | **129** |

배경에서 급한 순서: 8-1의 잎 뭉치와 풀 포기 → 8-3 먼 숲 → 8-2 먼 나무 → 8-4 바닥.
잎 뭉치 4장과 먼 숲 3장만 있어도 화면 인상이 크게 달라진다.

화면 자료에서 급한 순서: 4(상태 아이콘 중 hot·cold·wet·big·small·sleepy·angry와 색 보석) → 1 → 3 → 2 → 5 → 6 → 7.
상태 아이콘은 지금 코드로 그린 11 × 11칸 임시 그림을 쓰고 있어 가장 먼저 바꾸고 싶다.
