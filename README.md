# 영어용사: 잃어버린 언령의 서

영어 문장으로 명령하는 초등 영어 RPG. 용사 시리즈 3 (코드용사 → 수학용사 → 영어용사).
3D 무대에 2D 도트 인물을 세우는 HD-2D 방식, three.js, 빌드 과정 없음.

- 계획: `docs/plan.md`
- 외부 생성 그림 의뢰: `docs/art-request.md`
- 지금 들어 있는 것: 전투 한 판 프로토타입 (마루·무지·나루 대 불 늑대, 슬라임, 버섯)

## 실행

```bash
python3 -m http.server -d public 8000
```

주소 끝에 `?q=low`를 붙이면 그림자·빛 번짐을 끄고 해상도를 낮춘다. 느린 기기에서는 자동으로 낮아진다.

## 구조

| 경로 | 내용 |
|---|---|
| `public/js/battle/data.js` | 낱말·기술·인물·적·학년 설정 (내용 데이터) |
| `public/js/battle/engine.js` | 판정 규칙 (화면과 무관) |
| `public/js/battle/scene.js` | 진행과 연출 (돌진, 타격, BREAK, 합동 언령) |
| `public/js/battle/ui.js` | 명령 메뉴, 문장 조립, 이름표, 박자 입력 |
| `public/js/gfx/` | 도트 합성기, 무대, 카메라, 후처리, 효과 |
| `public/js/sprites/` | 도트 격자 데이터와 움직임 설정 |
| `art-src/` | 원본 그림 (설정화·전신·상반신·동작·적) |
| `tools/anim.py` | 인물 동작 그림 → 인물별 도트 한 장 (40색, 또렷한 가장자리) |
| `tools/sprites.py` | 적 원화 → 도트 격자 |
| `tools/web_art.py` | 원본 그림 → 배경을 지운 웹용 그림과 얼굴 아이콘 |

도구는 Python 3와 Pillow, numpy, scipy가 필요하다.

## 배포

Cloudflare Workers 정적 자산(`wrangler.jsonc`). 저장소를 연결하면 푸시할 때마다 자동 배포된다.

## 사용한 외부 자료

- three.js (MIT). `public/vendor/THREE_LICENSE`
- 영어 읽기는 지금 브라우저 내장 음성을 쓴다(임시). 미리 만든 음성 파일로 바꿀 예정.
