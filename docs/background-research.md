# HD-2D 배경 조사: 숲속 공터 무대를 "웹 게임"에서 벗어나게 하기

조사일 2026-11-12. 대상 코드: `public/js/gfx/stage.js`, `public/js/gfx/post.js` (+ `battle/scene.js`, `gfx/camera.js`, `gfx/actor.js` 참고). three.js r170, WebGL, 빌드 없는 ES 모듈.

**표기 규칙**

- **[출처 n]** — 4장 출처 목록의 해당 글에서 직접 확인한 내용.
- **[일반 지식]** — 이번 조사에서 출처로 확인하지 못했고, 그래픽스 일반 지식에서 온 내용. 적용 전에 r170 소스나 공식 예제로 확인해야 한다.
- **[제안]** — 이 프로젝트에 맞춰 쓴 구현안. 코드 조각은 실행해 보지 않은 초안이다.
- 수치 중 "성능 비용"은 측정값이 아니라 추정이다. 크롬북 실기에서 재야 한다.

**조사의 한계 (먼저 읽을 것)**

- 옥토패스 트래블러 개발진의 발표 자료(Unreal Fest East 2018 슬라이드, Unreal Fest Europe 2019 강연)와 Unreal Engine 공식 인터뷰 페이지는 본문 접근이 막혀(403) 검색 요약과 2차 기사로만 확인했다. **텍셀 밀도, 피사계 심도 설정값, 물·안개 구현 같은 수치는 공식 출처에서 하나도 확인하지 못했다.** 1장의 "공식 발언"은 방향성에 관한 것뿐이다.
- 드래곤 퀘스트 3 HD-2D, 트라이앵글 스트래티지의 CEDEC/GDC 기술 발표는 찾지 못했다. 인터뷰만 확인했다.
- three.js로 만든 공개 HD-2D 데모·저장소는 찾지 못했다(7절). 가까운 것만 적었다.
- Codrops(풀 튜토리얼), Envato Tuts+(툰 워터), iquilezles.org(타일 반복 감추기) 본문도 접근이 막혀 검색 요약만 확인했다.

**진단 시점에 관한 주의**

1장의 진단은 조사를 시작할 때 읽은 `stage.js`·`post.js` 기준이다. 조사하는 동안 두 파일이 다른 작업으로 갱신되었다(23:40–23:42 수정본을 훑어봄). 갱신본에 이미 들어간 것과 아직 남은 것은 다음과 같다.

| 3장 항목 | 갱신본 상태 (훑어본 범위) |
|---|---|
| 1. 도트 질감·텍셀 밀도 | `assets/tex` 사용 시작. 주석상 "1칸 ≈ 1/27"인데 인물은 `PX = 1/30` — 10% 차이가 남음. 풀 포기는 여전히 인스턴스마다 0.45–1.4배로 크기가 달라 도트 크기가 흔들림 |
| 2. 지형 높낮이·흙 혼합 | 반영됨(높낮이 + 셰이더에서 풀·흙·낙엽 혼합) |
| 3. 조명 | **남음.** 반구광 0.95 / 방향광 2.5로 대비가 여전히 약하고, 수관 그림자 얼룩(고보)이 없음. 푸른 림 라이트는 추가됨. `PCFSoftShadowMap` + `radius 3` 그대로 |
| 4. 깊이 기반 DoF·색 순서 | DoF는 반영됨(별도 렌더 타깃 + `DepthTexture` + CoC, 16탭). **색 보정은 여전히 톤매핑(OutputPass) 앞, 블룸보다도 앞**에서 선형값에 적용 — 비네트·대비가 블룸 입력을 바꾼다. 반해상도 흐림 미적용 |
| 5. 풀밭 | **남음.** 760포기, 조명·그림자를 받지 않는 `ShaderMaterial`, 꽃은 `MeshBasicMaterial` |
| 6. 나무 | 줄기 뿌리·휨, 잎 뭉치 수십 장 반영됨. 잎 그림 품질과 구형 법선·알파 그림자는 확인 못 함(`customDepthMaterial`이 `stage.js`에 없음) |
| 7. 안개·빛줄기 | 낮은 안개 판, 흐르는 줄무늬 빛줄기 추가됨. 재료 단위 높이 안개·깊이 페이드는 확인 못 함 |
| 8. 물 | 확인 못 함 |
| 9. 바위 | 노이즈 변형 + 이끼 윗면 반영됨 |
| 10. 전경·원경·마감 | 원경 3겹 반영됨. MSAA·블룸 임계값·LUT는 남음 |

따라서 지금 시점의 실질 우선순위는 **3(조명) → 4의 색 순서 → 5(풀밭) → 1의 밀도 맞춤 → 8(물) → 7 → 10** 순이다.

---

## 1. 현재 무대 진단 (조사 시작 시점 코드 기준)

### 1.1 한 줄 결론

요소(풀, 나무, 바위, 물, 빛줄기, 빛가루, 블룸, 틸트시프트)는 다 있는데 **전부 "기호" 수준**이다. HD-2D가 비싸 보이는 이유는 요소의 개수가 아니라 (가) 질감이 손으로 찍은 도트처럼 읽히고 (나) 3D 형태에 진짜 높낮이와 겹침이 있고 (다) 빛이 그 형태 위에서 명암 대비를 만들고 (라) 렌즈 효과가 실제 깊이를 따라가기 때문인데, 지금은 네 가지 모두 평면 위의 근사다.

### 1.2 구체적 문제 (코드 근거)

| # | 문제 | 코드 위치 | 왜 싸 보이는가 |
|---|---|---|---|
| 1 | **질감이 무작위 점무늬** | `speckle()` — 풀 64px에 점 900개, 바위 32px, 나무껍질 16×32 | 형태(풀잎 뭉치, 돌 결, 금)가 없는 균일 잡음이라 "도트 그림"이 아니라 "노이즈"로 읽힌다. 64px 타일이 26×19번 반복되어 격자 무늬도 보인다. |
| 2 | **이미 만든 질감을 안 쓴다** | `public/assets/tex/{grass,dirt,floor,bark,rock}.png` + `_n.png` (256/128px, Poly Haven 사진을 `tools/textures.py`로 도트화) — `stage.js` 어디에서도 불러오지 않음 | 가장 싼 개선이 그대로 놓여 있다. |
| 3 | **텍셀 밀도가 제각각** | 인물 30텍셀/단위(`PX = 1/30`). 풀 바닥 약 24, 흙 20, 나무껍질 가로 약 20·세로 약 13, 잎 약 31, 풀 포기 16–37(인스턴스 크기 0.7–1.6배), 꽃 27, 연못 20, 먼 배경 약 5 | 도트 크기가 물체마다 다르면 "한 장의 도트 그림"이라는 착시가 깨진다. 특히 풀 포기를 인스턴스마다 다른 배율로 키운 것, 줄기 질감이 세로로 늘어난 것이 눈에 띈다. |
| 4 | **땅이 완전한 평면** | `PlaneGeometry(70, 50)` 분할 없음, 흙은 그 위 0.01 높이의 알파 판 | 실루엣·자체 그림자·겹침이 없다. HD-2D의 디오라마 느낌은 단차와 둔덕에서 나온다. |
| 5 | **나무가 "막대 + 판"** | 7각 원기둥(굵기 0.3→0.48, 뿌리 없음) + 같은 그림의 평면 4장이 모두 정면(z축)을 봄 | 수관에 부피가 없고, 판이 모두 같은 법선이라 조명이 한 장처럼 먹는다. 13그루가 전부 같은 그림이다. |
| 6 | **바위가 20면체 그대로** | `IcosahedronGeometry(1, 0)` + 축 비율만 변경, UV는 구면 기본값 | 누가 봐도 기본 도형. 땅에 "얹혀" 있고 접지 흔적(풀, 흙, 어두운 테두리)이 없다. |
| 7 | **조명에 대비가 없다** | 반구광 1.0 + 방향광 2.3, 숲인데 그림자가 줄기 몇 개뿐 | 숲속 공터의 핵심인 "나뭇잎 그림자 얼룩 + 빛 웅덩이"가 없다. 반구광이 강해 그늘이 뜬다. 잎 판이 `castShadow`지만 `customDepthMaterial`이 없어 그림자가 사각형으로 떨어질 가능성이 높다(인물은 `actor.js`에서 처리했음). |
| 8 | **그림자 부드러움 설정이 안 먹을 수 있음** | `PCFSoftShadowMap` + `shadow.radius = 3` | [일반 지식] three.js 문서상 `radius`는 `PCFSoftShadowMap`에서는 효과가 없다. 확인 필요. |
| 9 | **피사계 심도가 화면 y좌표 기반** | `post.js` Lens: `abs(uv.y - focus)` | 깊이를 안 보므로 초점 띠 안에 걸친 먼 나무 줄기는 선명하고, 화면 아래쪽에 선 인물 발은 흐려진다. 12탭 원판 1회라 흐림 반경 5px에서 알갱이도 보인다. |
| 10 | **색 처리가 톤매핑 전에 선형 공간에서 이루어진다** | Lens 패스가 `OutputPass` 앞. `(c - 0.5) * 1.06 + 0.5`, 채도, 비네트, `flash` 모두 HDR 선형값에 적용 | 0.5 기준 대비는 표시 공간(sRGB)에서나 의미가 있다. 색 보정이 "덧칠"이 아니라 "값 왜곡"이 된다. ACES는 채도를 눌러 숲 녹색이 탁해지는 경향도 있다 [일반 지식]. |
| 11 | **빛줄기가 정면 판 5장** | `PlaneGeometry` + 가산 혼합, 깊이 무시 | 물체와 만나는 곳에서 칼같이 잘리고, 카메라가 움직이면 판이라는 게 드러난다. 태양 방향(7,13,8)과 기울기(-0.32rad)도 무관하다. |
| 12 | **물이 색칠한 타원** | 연못 셰이더: 동심원 사인파 + 고정 테두리 | 주변 지형과 관계가 없다(둑·젖은 흙·수초 없음). 거품이 실제 물가가 아니라 UV 타원에 붙어 있다. 반사·굴절·깊이감이 없다. |
| 13 | **풀이 듬성듬성** | 44×21 영역에 420포기 = 약 0.45포기/㎡, 모두 정면 판 | 바닥 질감과 풀 포기가 색·밀도로 이어지지 않아 "바닥에 스티커"로 보인다. 풀 셰이더는 조명·그림자를 받지 않는다(`c.rgb * 0.95`). |
| 14 | **꽃이 조명을 안 받음** | `MeshBasicMaterial` | 그늘에서도 발광한다. |
| 15 | **원경이 그림 한 장** | 90×50 판에 480×270 캔버스, 나무는 사각형+타원 | 중경(z -5 ~ -11의 3D 나무)과 원경 사이가 비어 있고 도트 밀도가 6배 차이 난다. |
| 16 | **가장자리 계단** | `antialias: false` + EffectComposer 기본 렌더 타깃(MSAA 없음) + `alphaTest` | 잎·풀 가장자리가 움직일 때 지글거린다. |

### 1.3 잘 되어 있는 것 (유지)

- 망원 화각(fov 26–34)에 약간 내려다보는 구도 — 틸트시프트/미니어처에 맞다 [출처 14: 틸트시프트는 정사영에 가까운 좁은 화각에서 잘 보인다].
- 인물 스프라이트가 `customDepthMaterial`로 그림자를 던지고 `emissiveMap`으로 어둠에 묻히지 않게 한 것. HD-2D의 "스프라이트가 3D 조명에 반응" 요건에 해당 [출처 1, 6].
- 타격 시 점광원(`fxLight`) — 옥토패스 개발진이 전투 이펙트에 점광원을 더했다는 발언과 같은 방향 [출처 3의 검색 요약].
- 저사양 자동 강등(해상도 → 그림자·블룸 끔).

---

## 2. 주제별 기법 정리

### 2.1 HD-2D의 시각 요소 분해

**출처에서 확인한 것**

- 정의: 2D 도트 캐릭터 스프라이트·빌보드 + 완전한 3D 환경. 점광원이 캐릭터 그림자를 장면에 던지고, **틸트시프트, 피사계 심도, 블룸, 볼류메트릭 라이팅, 안개, 파티클**을 얹어 "디오라마" 같은 인상을 만든다 [출처 1].
- 개발 초기에 디자이너가 2D 그림에 극적인 조명만 더했을 때는 프로듀서가 "부족하다"고 했고, **3D 요소를 더해 깊이를 준 뒤** 통과했다. 목표는 "빛이 물체에 어떻게 닿고 그림자가 어떻게 지는지"를 도트와 결합해 보여 주는 것 [출처 2].
- 도트 굵기: 너무 세밀하면 "그냥 예쁜 그림"이 되고, 너무 굵으면 옛날 화면의 재현에 그친다. 한때 더 굵게 갔다가 현재 수준으로 정했다 [출처 2]. 2편에서도 "너무 세밀하게 그리면 도트의 장점이 사라진다" [출처 4]. 초기에는 "깊이를 충분히 주지 않아 재미없었고", 다른 때는 "해상도와 채도를 너무 올려 도트의 매력을 잃었다" [출처 3 검색 요약, 파미통 인터뷰 인용].
- 프로토타입 → 최종 변화: 화면 전체 스케일감 재조정, **렌즈 플레어 도입**, **환경광을 넣어 건물 그림자가 완전히 검게 뭉개지지 않게** 함. 캐릭터가 동적 광원을 갖고 도트 배경이 실시간으로 반응. 큰 기술 사용 시 캐릭터 아래에서 비추는 조명 연출 [출처 5].
- 색: DQ3 HD-2D는 기존 HD-2D(스퀘어 계열, 차가운 색조)보다 **따뜻하고 색이 풍부하게** 잡았다. 발표(2021) 이후 맵 넓이·카메라 각도·색조를 크게 네 번 갈아엎었다 [출처 7].
- 2편: 낮/밤 동적 조명, 맵 해상도 상향, 카메라 각도를 바꾸면 1편에서 가려졌던 곳까지 지어야 했다 [출처 3, 4].
- 팬 재현(Unity, 공식 설정 아님) 수치: 텍스처 필터 Point, 최대 크기 512로 낮춤 / Bloom 강도 2.5·임계값 0.6 / 비네트 강도 0.536·부드러움 1 / 색 보정 온도 +3·채도 +23·밝기 +26·대비 상향 / 스프라이트 그림자 양면 캐스팅 + 림 라이트 / 카메라에 붙인 빛줄기 쿼드(알파 140/255)와 빛가루 파티클(30×30 영역, 알파 60) [출처 6].

**[일반 지식] 실제 게임 화면을 보고 흔히 꼽는 요소 (출처 미확인)**

- 배경 질감은 "사진을 줄인 것"이 아니라 타일 단위로 찍은 도트이고, 3D 메시의 모서리가 타일 경계와 맞는다.
- 초점면은 인물이 선 띠 하나. 앞(전경 소품)과 뒤(원경)가 모두 크게 흐려진다. 전경에 일부러 흐린 큰 물체를 둔다.
- 빛을 받는 곳과 그늘의 명도 차가 크고, 그늘은 검지 않고 차가운 색이 돈다. 광원 주변에 넓고 부드러운 블룸.
- 물은 반짝이는 하이라이트와 물가 거품이 강조된다.

### 2.2 three.js 구현

#### 피사계 심도

- **BokehPass** (three 애드온): `new BokehPass(scene, camera, { focus, aperture, maxblur })`. `focus`는 카메라 시선 방향 거리(월드 단위), 기본 `aperture 0.025`, `maxblur 1`. 값은 `pass.uniforms.*.value`로 바꾼다 [출처 8]. 포럼 보고: 메시에 이음매가 보임, 물리 기반 DoF처럼 동작하지 않음, 픽셀 비율을 고려하지 않음 [출처 9 검색 요약]. [일반 지식] 내부에서 깊이용으로 장면을 한 번 더 그린다.
- **Martins Upitis 보케 셰이더** (`webgl_postprocessing_dof2` 예제): 포럼에서 틸트시프트 출발점으로 권한 것. 좁은 초점 범위로 설정하고, 화각을 좁혀 정사영에 가깝게, 필요하면 채도를 올리라는 조언 [출처 14]. [일반 지식] 탭 수가 많아 무겁다.
- **pmndrs `postprocessing`의 DepthOfFieldEffect**: `focusDistance`(기본 3.0, 월드 단위), `focusRange`(2.0), `bokehScale`(1.0), `resolutionScale`(0.5). `target`에 Vector3를 주면 그 지점에 자동 초점. 전경 CoC를 Kawase 블러로 부드럽게 함 [출처 10]. 여러 효과를 한 셰이더 패스로 합쳐 드로 콜을 줄이는 구조이며, **three 내장 EffectComposer와 섞어 쓰면 안 된다**(버퍼 형식 불일치) [출처 9 검색 요약].
- **pmndrs TiltShiftEffect**: `offset`(0), `rotation`(0), `focusArea`(0.4), `feather`(0.3), `kernelSize`(MEDIUM), `resolutionScale`(0.5) [출처 11]. 화면 공간 방식.
- **three 내장 틸트시프트 셰이더**: `HorizontalTiltShiftShader` / `VerticalTiltShiftShader`. 화면 세로 위치로 2패스 가우시안(패스당 9탭, 표준편차 2.7)을 조절. 유니폼 `h = 1/width`, `v = 1/height`, `r` = 초점선 위치 [출처 12].
- **이 프로젝트 권고 [제안]**: 내장 컴포저를 유지하고 Lens 패스를 깊이 기반으로 바꾼다(3장 4번). pmndrs로 갈아타면 블룸·DoF·비네트·LUT를 한 패스로 합칠 수 있지만 빌드 없는 환경에서 ESM 번들을 별도로 벤더링해야 하고 기존 `post.js`를 다시 써야 한다.

#### 빛줄기 (god rays)

- **화면 공간 방사형 블러** (`GodRaysShader` 애드온, pmndrs `GodRaysEffect`): 광원을 흰색·가리는 물체를 검정으로 그린 뒤 광원 위치에서 방사형으로 흐린다. 싸지만 **광원이 화면 밖으로 나가면 사라진다** [출처 15 검색 요약]. 이 무대는 해가 화면 위쪽 밖에 있어 그대로는 부적합.
- **three-good-godrays**: 그림자 맵을 레이마칭해 실제로 가려진 곳만 어둡게 하는 볼류메트릭. pmndrs `postprocessing` 기반, three 0.125–0.182에서 시험됨. 방향광·점광 지원. 기본값 `density 1/128`, `maxDensity 0.5`, `raymarchSteps 60`, `distanceAttenuation 2`, `blur true`. `BasicShadowMap`/`PCFSoftShadowMap` 권장 [출처 16]. 60스텝 레이마칭은 크롬북에 무겁다 [추정].
- **지금 방식(가산 판) 개선 [일반 지식/제안]**: 저사양에서는 이쪽이 현실적이다. 판을 태양 방향에 맞춰 기울이고, 깊이 텍스처로 "소프트 파티클" 페이드를 넣고, 카메라와 판이 이루는 각으로 투명도를 줄이고, 노이즈를 세로로 흘려 먼지 낀 빛처럼 만든다(3장 7번).

#### 안개

- three 내장 `Fog`/`FogExp2`는 카메라 거리만 본다.
- 높이 안개는 `onBeforeCompile`로 `fog_pars_fragment`/`fog_fragment` 청크를 재료별로 바꿔 넣는다. `ShaderChunk`를 전역으로 바꾸는 방식은 깨지기 쉽다는 포럼 보고가 있고, 패치한 재료에는 `customProgramCacheKey`를 줘야 캐시된 미패치 프로그램이 재사용되지 않는다 [출처 17 검색 요약].
- 포럼 공개 예: 월드 Y로만 밀도를 정하고 FBM 노이즈로 흐름을 준 지면 안개. 안개 상단 위·반경 밖 프래그먼트는 일찍 빠져나가고, 노이즈 변조는 ±5%로 좁혀야 계단 현상이 없었다. 모바일 DPR 1.5 상한, 6년 된 아이폰에서 약 60fps라고 작성자가 보고 [출처 18].

#### 톤매핑·색 보정(LUT)

- `LUTPass` + `LUTCubeLoader`(.cube) / `LUTImageLoader`가 three 애드온에 있다. `LUTPass`에 3D 텍스처를 주고 컴포저에 추가 [출처 19]. `webgl_postprocessing_3dlut` 예제가 저장소에 있다 [출처 20 검색 요약].
- [일반 지식] LUT와 대비·채도 조정은 **톤매핑·sRGB 변환(OutputPass) 뒤**에 와야 한다. LUT는 표시 공간 0–1 입력을 전제로 만들어지기 때문이다. r170에는 `ACESFilmicToneMapping` 외에 `AgXToneMapping`, `NeutralToneMapping`이 있고, 채도 높은 양식화 그림에는 Neutral이나 AgX 쪽이 색을 덜 비튼다. 확인 필요.

#### 그림자

- `PCFSoftShadowMap`이 느린 장면에서 VSM(`radius`, `blurSamples` 조절)을 권한 포럼 글이 있다. VSM은 빛샘(halo) 아티팩트가 있고, three 문서상 **VSM에서는 그림자를 받는 물체가 모두 그림자도 던진다** [출처 21 검색 요약].
- PCSS는 공식 예제 `webgl_shadowmap_pcss`가 기준. 커뮤니티 구현은 그림자 셰이더 청크를 문자열 치환하는 방식이라 버전 간에 깨지기 쉽다 [출처 21 검색 요약].
- [제안] 이 무대는 그림자 영역이 28×22 단위로 작아 캐스케이드(CSM)는 필요 없다. 2048² 맵이면 텍셀이 약 1.4cm/px 수준이라 해상도는 충분하다. 품질 문제는 해상도가 아니라 "그림자를 던질 형태가 없다"는 데 있다.

#### 앰비언트 오클루전

- `GTAOPass(scene, camera, width, height, parameters, aoParameters, pdParameters)`. SSAOPass보다 품질이 좋지만 더 비싸다. 디노이즈 `pdRings 2`, `pdSamples 16`. `setGBuffer()`를 인자 없이 쓰면 깊이·법선용 내부 렌더 타깃을 만든다(장면을 한 번 더 그림) [출처 22].
- [일반 지식/제안] 정적인 무대에는 **구운 AO**가 값이 0에 가깝다. 버텍스 컬러에 굽거나(`vertexColors: true`), 소품 밑에 어두운 방사형 그라디언트 데칼을 깔거나, `aoMap`을 쓴다. `aoMap`은 간접광에만 곱해지므로 반구광이 있어야 보인다.

### 2.3 픽셀아트 질감을 3D에 입히기

- **필터**: 기본은 `magFilter = minFilter = NearestFilter`. 멀어지면 선명하지만 카메라가 움직일 때 깜빡일 수 있다 [출처 23 검색 요약]. 현재 코드는 `NearestMipmapLinearFilter`로 축소 시 밉맵을 써서 이미 깜빡임을 줄이고 있다. [일반 지식] `texture.anisotropy`를 4–8로 주면 비스듬한 바닥의 밉맵 뭉개짐이 준다.
- **확대 쪽 계단 깜빡임 없애기(안티에일리어싱된 최근접)**: 선형 필터로 두고 셰이더에서 UV를 텍셀 경계 근처에서만 보간한다. Inigo Quilez 방식 요지 [출처 24]:
  ```glsl
  vec2 pixel = uv * texSize;
  vec2 seam  = floor(pixel + 0.5);
  pixel = seam + clamp((pixel - seam) / fwidth(pixel), -0.5, 0.5);
  vec4 c = texture2D(map, pixel / texSize);   // map은 LinearFilter
  ```
  같은 글이 CSantos, Klems, Ben Golus, Fat Pixel 등 변형을 비교한다. 글은 밉맵은 다루지 않는다 [출처 24]. `fwidth`는 다소 비싸다는 지적도 있다 [출처 23 검색 요약].
- **텍셀 밀도 통일 [일반 지식/제안]**: 인물이 30텍셀/단위이므로 모든 배경 질감의 `repeat`을 "메시 실제 크기 × 30 ÷ 질감 픽셀 수"로 정한다. UV가 불규칙한 메시(바위, 변형한 지형)는 월드 좌표 UV나 트라이플래너로 밀도를 고정한다. 인스턴스를 크기 변주할 때는 배율을 정수비(1×, 2×)로 제한하거나 그림을 여러 장 그린다.
- **트라이플래너**: 월드 위치를 세 축으로 투영해 법선으로 섞는다. UV가 필요 없고 스케일 값 하나가 텍셀 밀도를 정한다. `onBeforeCompile`은 `#include`가 풀리기 **전** 셰이더를 받으므로 `#include <map_fragment>` 같은 지시문을 통째로 바꿔야 한다. 물체가 움직여도 질감이 따라오게 하려면 모델 공간, 인접 물체와 무늬를 이으려면 월드 공간 [출처 25 검색 요약]. [일반 지식] 도트 질감은 세 투영을 부드럽게 섞으면 흐려지므로, 가장 큰 축 하나만 고르는(하드 블렌드) 편이 낫다.
- **타일 반복 감추기**: Inigo Quilez의 글은 타일마다 무작위 오프셋·방향을 주는 방식과, 저주파 변주 패턴으로 **텍스처 2회 조회**만 쓰는 값싼 방식을 설명한다. 헥스 타일링(Mikkelsen 2022, 3회 조회)이 더 널리 쓰인다 [출처 26 검색 요약]. [일반 지식] 도트 질감은 회전·혼합하면 격자가 깨지므로 "타일 단위 오프셋/90° 회전만" 쓰거나, 아예 큰 비반복 질감 + 저주파 색 변주(버텍스 컬러)로 가는 것이 맞다.
- **지형 높낮이 [일반 지식/제안]**: 분할한 평면의 정점을 노이즈로 올리고, 전투 영역(인물이 서는 타원)은 0으로 눌러 평평하게 둔다. 버텍스 컬러로 흙·풀·이끼 가중치와 AO를 함께 굽는다.

### 2.4 식생

- **풀**: 각 풀잎을 모델로 만들어 인스턴싱하면 가장 사실적이지만 비싸다. 저사양에서는 타일 질감 + 카드가 여전히 표준 [출처 27 검색 요약]. 바람은 사인파 + 흐르는 노이즈 질감 [출처 27 검색 요약].
- **저사양 교훈** (WebGL/안드로이드 식생 데모 작성자): 저가 기기에서는 **정점 셰이더가 병목**이었고, 그런 기기에는 밀도를 낮추고 바람 애니메이션을 뺀다. 인스턴스를 4×4 타일로 묶어 타일 단위로 컬링하면 CPU 약 1ms(인스턴스별 컬링은 약 10ms + 업로드 20ms). 가까운 큰 물체부터 그려 깊이 버퍼를 활용. 풀·꽃잎은 단순 확산 조명만 [출처 28].
- **나무(푹신한 수관)**: Michael Dougall의 three.js 글. 블렌더에서 잎 면의 UV를 0–1로 리셋하고, 정점 셰이더에서 UV를 [-1,1]로 바꿔 **뷰 공간에서 정점을 밀어** 쿼드가 카메라를 보게 한다. `MeshStandardMaterial` 기반 + `alphaMap`, `alphaTest 0.5` [출처 29]:
  ```glsl
  vec2 off = vec2(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  mv.xy += off * uSize;
  gl_Position = projectionMatrix * mv;
  ```
  바람·법선 전이는 2부에 있다(미확인). 2005년 논문은 잎 무리마다 빌보드 하나, **법선은 수관 중심에서 바깥으로** 두는 방식을 쓴다 [출처 30 검색 요약]. 잎 가장자리는 MSAA + `alphaToCoverage: true`가 매끈하다는 포럼 조언 [출처 30 검색 요약].
- **[제안] 이 프로젝트의 나무**: 카메라가 거의 정면 고정이므로 카메라 추적 빌보드까지는 필요 없다. 도트 잎 뭉치 그림 3–4종을 깊이를 달리해 10–20장 겹치고, 각 카드 법선을 수관 중심 기준 구형으로 덮어써 위는 밝고 아래는 어둡게 만든다. 원경은 한 그루를 미리 렌더한 임포스터 판.

### 2.5 물

- **깊이 기반 물가 거품**: 장면 깊이를 렌더 타깃에 그리고, 물 프래그먼트 깊이와의 차가 작으면 거품을 칠한다. PlayCanvas용 연재(끝에 three.js 판 소스 제공)가 깊이 버퍼로 교차선 거품을 만드는 과정을 다룬다 [출처 31 검색 요약]. three.js 포럼의 "Unlit water shader with foam"(Mugen87)이 같은 방식의 실제 데모이고 코드에 라이선스 제한이 없다고 밝혔다. WebGL2에서는 `THREE.DepthTexture`를 쓸 수 있다. 정적 지형이면 깊이 패스 대신 **지형 높이맵의 역**으로 물가를 구하는 대안도 제시됨 [출처 32].
- **깊이값이 핵심**: 색·투명도·굴절·거품을 모두 깊이 차로 구동한다는 Unity 가이드 [출처 31 검색 요약].
- **코스틱**: 위를 향한 면에만(월드 법선 Y로 마스크) 코스틱을 섞고, 셰이더 하나를 공유하라는 포럼 조언. 무늬는 보로노이 노이즈를 흘려서 만든다 [출처 33 검색 요약].
- **픽셀풍**: three.js용 픽셀 물 셰이더 글은 찾지 못했다(Godot용만 확인) [출처 31 검색 요약]. [제안] 지금처럼 UV를 30텍셀/단위 격자로 양자화(`floor(uv * N) / N`)한 뒤 위 기법을 적용하고, 시간도 8–12fps로 양자화하면 손으로 그린 애니메이션처럼 보인다.

### 2.6 절차적 생성의 한계와 CC0 자료

**한계 [판단]**: 코드로 만들 수 있는 것은 "분포"(어디에 무엇을 얼마나)와 "변형"(지형, 흔들림)이다. "그림"(잎 뭉치의 실루엣, 돌의 결, 꽃의 종류)은 무작위 점과 원으로는 도트 화가의 결과에 못 미친다. 현재 무대의 싼 느낌 중 절반은 여기서 온다. 질감·카드 그림은 자산으로 가져오고 배치·조명·후처리를 코드로 하는 분업이 맞다.

| 출처 | 라이선스 (확인) | HD-2D에 맞는 용도 | 주의 |
|---|---|---|---|
| Poly Haven | 전부 CC0. 출처 표기 불필요, 재배포 가능 [출처 34] | 사진 질감(이미 `art-src/tex`에서 사용 중) → 도트화. 바위·나무 그루터기 스캔 모델을 저폴리로 줄여 실루엣용으로 | 사진풍이라 반드시 팔레트 축소·다운샘플 필요. HDRI는 양식화 장면에 과함 |
| ambientCG | CC0 1.0. 표기 불필요 [출처 35] | 흙·이끼·돌·나무껍질 PBR 질감, 법선·AO 맵 | 위와 같음 |
| Quaternius | Stylized Nature MegaKit: CC0, 116개(나무 40, 식물·꽃 35, 바위 27, 풀·덤불), FBX/OBJ/glTF. 무료 Standard 등급은 전체의 60–70% [출처 36] | **나무 줄기·바위·덤불의 3D 형태**. 가장 바로 쓸 수 있는 후보 | 질감이 매끈한 양식화풍이라 도트 질감으로 다시 입혀야 함. glTF 로더(`GLTFLoader`) 벤더링 필요 |
| Kenney | 자산 페이지의 게임 자산은 전부 CC0, 상업 이용 가능 [출처 37]. Nature Kit이 OpenGameArt에도 CC0로 등재 [출처 38 검색 요약] | 저폴리 바위·그루터기·울타리 형태, 2D 파티클 그림 | 단색 저폴리풍이라 형태만 쓰고 질감은 교체 |
| OpenGameArt | **자산마다 다름**(CC0, CC-BY, CC-BY-SA, GPL 혼재) [일반 지식] | 도트 타일셋(풀, 꽃, 수풀) — 잎·풀 카드 그림의 재료 | 자산별 라이선스 확인 필수. CC-BY는 표기, SA/GPL은 피하는 편이 안전 |

### 2.7 참고할 공개 데모·저장소·튜토리얼

**three.js로 된 HD-2D 전용 데모나 저장소는 이번 검색에서 찾지 못했다.** 아래는 부분적으로 겹치는 것들이다.

| 무엇 | URL | 쓸모 |
|---|---|---|
| spearwolf/twopoint5d | https://github.com/spearwolf/twopoint5d/blob/main/packages/twopoint5d/README.md | three.js 2.5D·픽셀아트 라이브러리. 정사영·시차 투영. HD-2D 데모는 아님 |
| KodyJKing/hello-threejs | https://github.com/KodyJKing/hello-threejs | 3D 픽셀아트 셰이더(외곽선·모서리 하이라이트). README상 데모용이고 바로 쓸 상태는 아님. 라이선스 미표기. 영상 https://www.youtube.com/watch?v=jFevm02NJ5M |
| WoodNeck/three-pixelate-showcase | (검색 결과에 목록 페이지만 확인) https://awesome.ecosyste.ms/projects/github.com%2Fwoodneck%2Fthree-pixelate-showcase | 픽셀화 + 디더링 셰이더, MIT |
| Return of the Earthmover | https://discourse.threejs.org/t/return-of-the-earthmover-3d-pixel-art-game/56454 | three.js 3D 픽셀아트 게임 제작기 |
| HD-2D in Unity (Tech Demo) | https://gladark-dev.itch.io/2d-hd-in-unity-tech-demo | Unity 재현. 구성 참고용 |
| HD-2D 재현 글 (Unity, 일본어/영어) | https://note.com/game_shiori/n/n8e3870afb515?hl=en | 후처리 수치가 있는 유일한 글 (2.1 참고) |
| Depth based Tilt-shift (Godot) | https://godotshaders.com/shader/depth-based-tilt-shift/ | 깊이 기반 틸트시프트 로직. GLSL이라 옮기기 쉬움 |
| three.js `webgl_postprocessing_dof2` | https://threejs.org/examples/webgl_postprocessing_dof2 | 깊이 기반 보케 공식 예제 |
| Unlit water shader with foam | https://discourse.threejs.org/t/unlit-water-shader-with-foam/11641 / 데모 https://gojcn.csb.app/ / 소스 https://codesandbox.io/s/black-mountain-gojcn / 포크 https://github.com/romulolink/threejs-water-shader-with-foam | 깊이 기반 거품 |
| Creating fluffy trees with Three.js | https://douges.dev/blog/threejs-trees-1 | 잎 쿼드 수관 |
| How to make the fluffiest grass | https://tympanus.net/codrops/2025/02/04/how-to-make-the-fluffiest-grass-with-three-js/ | 풀 카드·바람 (본문 미확인) |
| Efficient WebGL vegetation rendering | https://dev.to/keaukraine/efficient-webgl-vegetation-rendering-4g2g | 저사양 식생 |
| High-Performance Ground Fog | https://discourse.threejs.org/t/high-performance-ground-fog-for-games-three-js/88522 / 데모 https://codepen.io/the-red-reddington/full/wBGQQwO | 높이 안개 |
| three-good-godrays | https://cdn.jsdelivr.net/npm/three-good-godrays@0.12.0/README.md | 그림자맵 기반 빛줄기 |
| Pixel art filtering 비교 | https://jorenjoestar.github.io/post/pixel_art_filtering | 안티에일리어싱된 최근접 샘플링 |

---

## 3. 이 프로젝트에 적용할 우선순위 10가지

순서는 "눈에 띄는 개선 ÷ (난이도 + 성능 비용)" 기준이다. 1–3번만 해도 인상이 크게 바뀐다. 난이도·비용은 추정.

### 1. 점무늬 캔버스 질감을 이미 있는 도트 질감으로 바꾸고, 텍셀 밀도를 30텍셀/단위로 통일

- **기대 효과**: 매우 큼. "노이즈"가 "그림"이 된다. 인물과 배경의 도트 크기가 맞아 한 장의 그림처럼 붙는다.
- **난이도**: 낮음. **성능 비용**: 거의 0 (질감 5장 + 법선맵 약 870KB 내려받기).
- **구현 [제안]**:
  ```js
  const loader = new THREE.TextureLoader();
  function tex(name, px, color = true) {
    const t = loader.load(`assets/tex/${name}.png`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestMipmapLinearFilter;
    t.anisotropy = 4;
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    t.userData.px = px;                       // 한 변 픽셀 수
    return t;
  }
  const TEXEL = 30;                            // actor.js의 PX = 1/30과 같은 값
  const fit = (t, w, h) => t.repeat.set(w * TEXEL / t.userData.px, h * TEXEL / t.userData.px);
  // 70×50 땅 + 256px 풀 → repeat (8.2, 5.86)
  ```
  - 법선맵(`_n.png`)은 `normalMap`으로 주되 `colorSpace`를 지정하지 않는다. `normalScale`은 0.5 안팎에서 시작.
  - 바위·변형 지형처럼 UV가 고르지 않은 메시는 월드 좌표로 UV를 다시 쓴다(생성 시 `uv = (x, z) * TEXEL / px`), 세로 면이 많으면 2.3의 트라이플래너(하드 블렌드).
  - 풀 포기·꽃 인스턴스는 **배율을 고정**(1× 또는 정확히 2×)하고 변주는 그림 종류로 낸다.
  - 256px 타일이 8×6번 반복되는 것은 4번·2번(버텍스 컬러 변주, 풀 카드)이 가려 준다. 그래도 보이면 타일 단위 오프셋(2.3).

### 2. 땅에 높낮이를 주고, 흙·풀을 버텍스 컬러로 섞기

- **기대 효과**: 큼. 실루엣과 자체 그림자가 생겨 디오라마가 된다. 흙 "스티커"가 사라진다.
- **난이도**: 중간. **성능 비용**: 낮음 (정점 수천 개, 질감 조회 1회 추가).
- **구현 [제안]**:
  - `PlaneGeometry(70, 50, 140, 100)`(0.5단위 격자, 삼각형 2.8만)을 만들고 정점 y를 값 노이즈 2옥타브로 올린다. 전투 타원(중심 (0.2, 0.4), 반지름 9.3×4) 안은 0, 바깥 3단위에 걸쳐 `smoothstep`으로 0.3–0.8까지, 뒤쪽(z < -6)은 1.5–2.5의 둔덕. `computeVertexNormals()` 후 `receiveShadow`.
  - `SPOTS` 좌표가 서는 곳은 반드시 y = 0으로 남긴다(인물 배치 코드가 y=0 전제).
  - 정점 색 `color` 속성에 R=흙 가중치(타원 거리 + 노이즈), G=AO(오목한 곳·소품 밑 어둡게), B=색 변주(저주파 노이즈)를 넣고 `onBeforeCompile`에서 `map_fragment`를 바꿔 풀·흙 두 질감을 섞는다. 도트가 흐려지지 않게 가중치를 질감 격자에 맞춰 양자화한 뒤 `step`으로 자른다:
    ```glsl
    vec2 cell = floor(vUv * texSize) / texSize;            // 텍셀 단위로 고정
    float w = vColor.r + (hash(cell) - 0.5) * 0.25;         // 경계를 텍셀 단위로 흩뜨림
    vec4 base = mix(texture2D(map, vUv), texture2D(dirtMap, vUv), step(0.5, w));
    base.rgb *= mix(0.55, 1.0, vColor.g) * mix(0.9, 1.08, vColor.b);
    ```
  - 연못 자리는 0.4 깊이로 파고(8번), 공터 가장자리에 바위 단과 쓰러진 통나무를 놓아 평면의 끝을 가린다.

### 3. 조명 다시 잡기: 나뭇잎 그림자 얼룩 + 따뜻한 빛/차가운 그늘

- **기대 효과**: 매우 큼. HD-2D의 "강한 조명"이 여기서 나온다. 개발진이 처음부터 요구한 것이 빛과 그림자의 표현이다 [출처 2].
- **난이도**: 낮음–중간. **성능 비용**: 낮음 (그림자 패스에 판 몇 장 추가).
- **구현 [제안]**:
  - **수관 그림자판(고보)**: 화면 밖 위쪽(y 9–12)에 구멍 뚫린 잎 무늬 알파 질감 판을 몇 장 눕혀 두고 `castShadow = true`, 색 쓰기는 끄고(`material.colorWrite = false`) `customDepthMaterial`에 `alphaTest`를 준다. 전투 공간에 빛 웅덩이와 그늘 얼룩이 생긴다. 판을 `sin`으로 0.1단위쯤 흔들면 그림자가 일렁인다.
  - 잎 판·풀 카드에도 `customDepthMaterial`(알파 반영)을 준다. `actor.js`가 이미 쓰는 방식 그대로.
  - **대비**: 반구광 1.0 → 0.35–0.5, 하늘색은 푸른 쪽(`0x9fc4ff`), 땅색은 어두운 녹색. 방향광 2.3 → 3–3.5, 색은 더 따뜻하게(`0xffd9a0`). 프로토타입에서 최종으로 가며 "환경광을 넣어 그림자가 완전히 검어지지 않게" 했다는 것 [출처 5]의 반대 방향 조절이므로, 그늘이 뭉개지면 반구광을 조금씩 되돌린다.
  - **그림자 부드러움**: `PCFShadowMap` + `shadow.radius 2–4`, 또는 `VSMShadowMap` + `radius 4`, `blurSamples 8`로 바꿔 비교한다. VSM은 받는 물체가 모두 던지기도 한다는 점 [출처 21]을 감안. `PCFSoftShadowMap`에서 `radius`가 먹는지 먼저 확인.
  - **악센트 점광**: 빛 웅덩이 자리에 약한 따뜻한 점광(그림자 없음) 1–2개, 연못 위에 청록 점광 1개. 점광은 재료 셰이더 비용을 올리므로 합쳐 3개 이내.
  - 꽃 재료를 `MeshLambertMaterial`로 바꿔 그늘을 받게 한다. 풀 셰이더도 조명·그림자를 받게(5번).

### 4. 피사계 심도를 깊이 기반으로 바꾸고, 색 처리 순서를 바로잡기

- **기대 효과**: 큼. 인물은 선명하고 앞·뒤가 실제 거리대로 흐려져 미니어처 느낌이 제대로 난다. 색이 의도대로 나온다.
- **난이도**: 중간. **성능 비용**: 중간 (전체 화면 패스 12–16탭. 지금 Lens 패스와 비슷하고, 반해상도로 내리면 더 싸다).
- **구현 [제안]**:
  - 컴포저에 깊이 텍스처가 붙은 렌더 타깃을 준다. 추가 장면 렌더 없이 깊이를 얻는다 [일반 지식, r170에서 확인 필요]:
    ```js
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType });
    rt.depthTexture = new THREE.DepthTexture(size.x, size.y);
    const composer = new EffectComposer(renderer, rt);
    // EffectComposer는 rt를 복제해 두 번째 버퍼를 만든다. 깊이는 RenderPass가 쓴 쪽에만 유효하므로
    // RenderPass 직후 패스에서 읽거나, 장면을 별도 rt에 한 번 그리고 TexturePass로 넘기는 구조가 안전하다.
    ```
  - Lens 셰이더의 흐림 반경을 깊이에서 구한다:
    ```glsl
    #include <packing>
    uniform sampler2D tDepth; uniform float cameraNear, cameraFar, focusZ, focusRange, maxBlur;
    float viewZ(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar); }
    float coc(vec2 uv){ float d = viewZ(uv); return clamp((abs(d - focusZ) - focusRange) / focusRange, 0.0, 1.0); }
    // r = max(coc(uv), 기존 화면 y 기반 값 * 0.4) * maxBlur;   ← 깊이 주도 + 틸트시프트 약간
    ```
    `focusZ`는 카메라에서 인물 줄까지의 거리(와이드 샷 기준 약 17.5), `focusRange`는 2–3. 카메라 연출(`CameraRig.to`) 때 `focusZ`를 시선 대상 거리로 갱신한다.
  - **번짐 방지**: 탭마다 `min(coc(uv), coc(uv + o))`로 가중해 선명한 인물이 흐린 배경으로 새지 않게 한다.
  - **반해상도**: 흐림을 반해상도 타깃에서 계산하고 CoC로 원본과 섞으면 비용이 약 1/4.
  - **순서**: `RenderPass → Bloom → DoF(선형) → OutputPass(톤매핑+sRGB) → 색 보정 패스(대비·채도·비네트·LUT·섬광·띠)`. 지금 Lens의 색 관련 줄을 OutputPass 뒤 새 패스로 옮긴다. `OutputPass`가 마지막이 아니게 되므로 마지막 패스의 `renderToScreen` 처리를 확인.
  - 톤매핑을 `NeutralToneMapping`이나 `AgXToneMapping`으로 바꿔 숲 녹색 채도를 비교한다 [일반 지식].
  - 가벼운 대안: 내장 `HorizontalTiltShiftShader`/`VerticalTiltShiftShader` [출처 12] — 깊이는 안 보지만 2패스 분리형이라 지금 12탭 1패스보다 매끈하다.
  - 무거운 대안: `BokehPass` [출처 8] — 장면을 깊이용으로 한 번 더 그리고 포럼에 이음매·픽셀 비율 문제가 보고되어 [출처 9] 권하지 않는다.

### 5. 풀밭을 빽빽하게: 조명 받는 인스턴스 풀 카드 2,000–4,000장

- **기대 효과**: 큼. 바닥이 "칠한 판"에서 "풀밭"이 된다. 흙과의 경계, 소품 밑동이 자연스럽게 가려진다.
- **난이도**: 중간. **성능 비용**: 중간. 알파 테스트 카드의 겹침(오버드로)과 정점 셰이더가 비용이다. 저가 기기에서는 정점 셰이더가 병목이었다는 보고 [출처 28]에 따라 저사양 모드에서 개수 절반·바람 끔.
- **구현 [제안]**:
  - 그림: 16×16 한 장 → 풀 뭉치 4종 + 꽃 3종 + 고사리·덤불 2종을 한 아틀라스(예: 64×64)에. 그림은 자산으로 준비(절차 생성의 한계, 2.6).
  - 배치: 2번의 흙 가중치가 낮은 곳에만, 공터 가장자리와 소품 밑동에 몰아서. 카메라에서 먼 곳(z < -8)은 밀도를 1/3로.
  - 색을 바닥과 잇기: 카드 아래쪽 색을 그 자리 바닥 질감 색에 맞춘다(인스턴스 속성으로 바닥 색 변주값 전달, `mix(groundTint, bladeColor, uv.y)`).
  - 조명: `MeshLambertMaterial` + `onBeforeCompile`로 바람만 주입하면 그림자·안개·점광을 공짜로 받는다. 법선은 (0,1,0)으로 덮어써 바닥과 같은 밝기를 받게 한다(카드가 판처럼 안 보이는 핵심):
    ```js
    mat.onBeforeCompile = (s) => {
      s.uniforms.uT = uT;
      s.vertexShader = 'uniform float uT;\n' + s.vertexShader
        .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);')
        .replace('#include <begin_vertex>', `vec3 transformed = position;
          vec4 ip = instanceMatrix * vec4(position, 1.0);
          float g = sin(uT * 1.7 + ip.x * 0.9 + ip.z * 1.3) + 0.5 * sin(uT * 3.1 + ip.x * 2.3);
          transformed.x += g * 0.06 * uv.y;`);
    };
    mat.customProgramCacheKey = () => 'grass-wind';
    ```
  - 바람은 사인 2개의 합이면 충분하다. 노이즈 질감을 흘리는 방식 [출처 27]은 정점 셰이더 질감 조회가 추가된다.
  - 도트풍을 지키려면 흔들림을 1/30단위(1텍셀)로 양자화하고 8–12fps로 갱신한다 [제안].
  - 인스턴스를 4×4 구역별 `InstancedMesh`로 나누면 구역 단위 절두체 컬링이 자동으로 된다 [출처 28의 타일 컬링과 같은 원리].

### 6. 나무를 "막대 + 판 4장"에서 부피 있는 수관으로

- **기대 효과**: 큼. 화면의 위쪽 절반을 차지하는 요소다.
- **난이도**: 중간–높음(그림 품질에 좌우). **성능 비용**: 낮음–중간(카드 수백 장, 알파 테스트 오버드로).
- **구현 [제안]**:
  - **줄기**: `CylinderGeometry`의 반지름 분할을 8–10, 높이 분할을 6으로 늘리고 아래 1/6 구간 정점을 바깥으로 벌려 뿌리 굴곡을 만든다. 높이별로 약간 휘게. 질감은 `bark.png`를 30텍셀/단위로(둘레 약 2.4단위 → 가로 repeat 0.56, 세로 7.4단위 → repeat 1.73). 또는 Quaternius 나무 모델의 줄기만 가져와 도트 질감을 입힌다 [출처 36].
  - **수관**: 잎 뭉치 도트 그림 3–4종(밝은 것·중간·어두운 것). 타원체 표면에 12–20장을 흩고, 카메라 쪽 카드일수록 밝은 그림을 쓴다. 카드 법선은 `normalize(카드 중심 - 수관 중심)`으로 덮어써 구처럼 명암이 지게 한다 [출처 30의 방식]. 한 나무의 카드는 병합해 드로 콜 1회.
  - 카메라가 크게 돌지 않으므로 뷰 공간 빌보드 [출처 29]는 선택 사항. 넣는다면 2.4의 조각 그대로.
  - **변주**: 그루마다 카드 배치 시드·수관 높이·색조(±5%)를 달리한다.
  - **원경(z < -8)**: 완성된 나무 한 그루를 작은 렌더 타깃에 미리 그려 임포스터 판으로 3–4겹 세우고 안개 색을 단계별로 섞는다. 지금의 사각형+타원 캔버스 배경을 대체해 중경과 도트 밀도가 이어진다.
  - 잎 카드에 `customDepthMaterial`(3번).

### 7. 공기감: 높이 안개 + 빛줄기 다듬기 + 빛가루

- **기대 효과**: 중간–큼. 깊이의 층이 갈리고 빛이 "공기 속을 지나가는" 느낌이 난다.
- **난이도**: 중간. **성능 비용**: 낮음(안개는 프래그먼트당 연산 몇 개, 빛줄기는 판 몇 장).
- **구현 [제안]**:
  - **높이 안개**: 지형·줄기·바위 재료에만 `onBeforeCompile`로 넣는다. 월드 좌표 varying을 추가하고 `fog_fragment`를 교체:
    ```glsl
    float dist = smoothstep(fogNear, fogFar, vFogDepth);
    float low  = exp(-max(vWorldPos.y, 0.0) * 0.9) * smoothstep(6.0, 22.0, vFogDepth) * 0.55;
    float f = clamp(max(dist, low), 0.0, 1.0);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(fogColor, sunFogColor, sunAmount), f);
    ```
    `customProgramCacheKey` 필수, 전역 청크 교체는 피한다 [출처 17]. 노이즈를 넣는다면 변조 폭을 ±5% 수준으로 [출처 18].
  - **안개 색을 방향에 따라**: 해 쪽을 볼 때 따뜻한 색, 반대쪽은 청록. 단색 안개보다 훨씬 그림 같다 [일반 지식].
  - **빛줄기**: (가) 판을 실제 `sun.position` 방향에 맞춰 기울이고 (나) 4번의 깊이 텍스처로 `smoothstep(0.0, 1.5, sceneZ - fragZ)` 소프트 페이드 (다) 세로로 흐르는 노이즈로 줄무늬·먼지 (라) 3번 고보의 구멍 위치에 맞춰 배치해 빛 웅덩이와 줄기가 일치하게. 팬 재현 글도 카메라에 붙인 쿼드 방식을 쓴다 [출처 6].
  - 그림자맵 레이마칭(three-good-godrays [출처 16])은 고사양 옵션으로만 고려. pmndrs 컴포저가 필요해 구조 변경이 크다.
  - **빛가루**: 지금 110개 유지. 빛줄기 안에 있을 때만 밝게(판의 x 범위와 비교) 하면 설득력이 오른다. 크기를 깊이에 따라 줄이는 `sizeAttenuation`은 켜 둔다.
  - **렌즈 플레어**: 개발진이 최종판에서 효과적으로 도입했다고 한 요소 [출처 5]. 해 방향 화면 가장자리에 가산 스프라이트 1–2장이면 된다.

### 8. 연못: 지형에 파 넣고, 깊이 기반 물가 거품·바닥 비침·코스틱

- **기대 효과**: 중간. 화면에서 차지하는 면적은 작지만 "물이 반짝인다"는 HD-2D의 대표 인상 [출처 1의 요소 목록, DQ3 발표 영상 기사 요약].
- **난이도**: 중간. **성능 비용**: 낮음(작은 면적의 셰이더).
- **구현 [제안]**:
  - 2번 지형에서 연못 자리를 0.4 깊이의 그릇으로 판다. 물은 y = -0.05의 평면. 바닥에는 `floor.png`나 자갈 질감, 가장자리 정점 색은 젖은 흙(어둡게).
  - 물가는 **지형 높이로 직접 계산**한다(정적 지형이면 깊이 패스가 필요 없다 [출처 32의 대안]). 지형 높이를 작은 `DataTexture`(예: 64×64)로 넘기거나, 물 메시 정점에 "바닥까지 깊이"를 속성으로 굽는다:
    ```glsl
    vec2 q = floor(vUv * texels) / texels;                  // 30텍셀/단위 격자
    float tq = floor(t * 10.0) / 10.0;                      // 10fps로 양자화
    float depth = vDepth;                                   // 정점 속성: 수면 - 바닥 높이
    float foam = step(depth, 0.06 + 0.03 * sin(tq * 2.0 + q.x * 40.0));
    vec3 col = mix(shallow, deep, smoothstep(0.0, 0.35, depth));
    float caustic = step(0.78, voronoi(q * 14.0 + tq * 0.3)) * (1.0 - smoothstep(0.0, 0.3, depth));
    float glint = step(0.93, noise(q * 30.0 + vec2(tq * 0.8, 0.0)));   // 반짝임
    col += caustic * 0.12 + glint * 0.5;  col = mix(col, vec3(0.85, 0.97, 1.0), foam);
    gl_FragColor = vec4(col, mix(0.55, 0.92, smoothstep(0.0, 0.3, depth)));
    ```
  - 얕은 곳은 투명도를 낮춰 바닥이 비치게. 인물이 물에 설 때(`inWater`, y -0.32)는 인물 주위에도 거품 고리를 그린다(인물 위치 유니폼 1–2개).
  - **반사 흉내**: 진짜 반사(Reflector)는 장면을 한 번 더 그리므로 쓰지 않는다. 수면 색에 하늘·수관 색 그라디언트를 화면 y 기준으로 섞고, 위 `glint`가 블룸 임계값을 넘도록 밝게(>1.0) 내보내면 반짝임이 번진다.
  - 코스틱은 위를 향한 면에만 [출처 33]. 여기서는 연못 바닥이 곧 위를 향한 면이므로 물 셰이더 안에서 처리하면 충분하다.
  - 물가에 수초 카드·돌·젖은 흙 테두리를 5번 방식으로 두른다. 물 자체보다 **물가 장식**이 품질을 정한다.

### 9. 바위·소품에 형태와 접지 주기 (구운 AO 포함)

- **기대 효과**: 중간. "기본 도형" 인상이 사라지고 물체가 땅에 붙는다.
- **난이도**: 낮음–중간. **성능 비용**: 거의 0.
- **구현 [제안]**:
  - **바위**: `IcosahedronGeometry(1, 2)`(삼각형 320개)의 정점을 저주파 노이즈로 밀고, 아래 30%는 납작하게 눌러 땅에 묻는다. 위를 향한 면에 이끼(버텍스 컬러 G, `normal.y > 0.6`). `flatShading` 유지로 각진 면을 살린다. 질감은 `rock.png`를 트라이플래너 하드 블렌드로 30텍셀/단위. 또는 Quaternius/Kenney 바위 모델의 형태만 가져온다 [출처 36, 37].
  - **구운 AO**: 바위·줄기 정점 색에 `높이에 따른 어둡기`(밑동 0.55 → 위 1.0)를 굽는다. 지형 정점 색 G 채널에는 소품 위치 주변 반지름 1–1.5단위를 어둡게(2번).
  - **접촉 그림자**: 소품 밑에 `actor.js`의 `blobTex()` 같은 부드러운 어두운 타원 데칼(`depthWrite: false`, `polygonOffset`)을 깐다. 실시간 그림자가 꺼지는 저사양 모드에서도 접지가 유지된다.
  - **밑동 가리기**: 바위·줄기 둘레에 풀 카드와 작은 돌을 5번 배치 규칙으로 몰아 둔다.
  - **소품 종류 늘리기**: 쓰러진 통나무, 그루터기, 버섯, 고사리, 덩굴 — 형태는 CC0 모델에서, 질감은 도트로.
  - 화면 공간 AO(`GTAOPass` [출처 22])는 깊이·법선 패스가 추가되어 크롬북 기본값으로는 권하지 않는다. 고사양 옵션으로만.

### 10. 전경·원경 층과 화면 마감 (가장자리 계단, 블룸, 최종 색)

- **기대 효과**: 중간. 마지막 10%의 "완성된 그림" 느낌.
- **난이도**: 낮음–중간. **성능 비용**: 낮음–중간(MSAA를 켜면 중간).
- **구현 [제안]**:
  - **전경 층**: 지금 좌우 위쪽 잎 2장에 더해, 화면 아래 모서리에 풀·고사리·바위 실루엣을 카메라 가까이(z 10–13) 둔다. 4번의 깊이 DoF가 자동으로 크게 흐려 준다. 색은 거의 검은 녹색.
  - **원경 층**: 6번의 임포스터 나무 3–4겹 + 맨 뒤 하늘 그라디언트. 층마다 안개 색을 더 섞어 대기 원근을 만든다.
  - **가장자리 계단**: (가) 컴포저 렌더 타깃에 `samples: 4`(WebGL2 MSAA)를 주고 잎·풀 재료에 `alphaToCoverage: true` [출처 30] — 고사양 전용, 깊이 텍스처와 함께 쓸 수 있는지 r170에서 확인 필요. (나) 저사양은 지금처럼 `alphaTest`만.
  - **블룸**: 임계값 0.82는 톤매핑 전 HDR 값 기준이다. 물 반짝임·빛줄기·타격 이펙트만 넘도록 임계값을 1.0 근처로 올리고 그 재료들이 1.0을 넘는 값을 내게 한다. 반경 0.7은 유지, 강도 0.55 → 0.4–0.8에서 조절. 팬 재현 글은 강도 2.5/임계값 0.6(Unity 기준이라 직접 대응되지 않음) [출처 6]. 블룸 해상도를 반으로 내리면 저사양에서 싸다 [출처 39의 일반 조언].
  - **최종 색**(4번의 새 패스에서): 따뜻한 하이라이트·차가운 그림자 분리 톤, 대비 +5–10%, 채도 +10–20%, 비네트. DQ3가 "따뜻하고 색이 풍부하게"로 방향을 잡은 것 [출처 7]을 참고. 손으로 조절하기 어려우면 `LUTPass` + `.cube` [출처 19] — 애드온 벤더링 필요.
  - **저사양 단계표**: 낮음 = 그림자·블룸·DoF 끔, 풀 절반·바람 끔, 구운 AO·데칼·안개만 / 보통 = 그림자 1024², DoF 반해상도, 블룸 반해상도 / 높음 = 2048², MSAA, 점광 3개.

### 벤더링해야 하는 것

`public/vendor/jsm`에는 지금 `EffectComposer, RenderPass, ShaderPass, UnrealBloomPass, OutputPass, MaskPass, Pass`와 셰이더 3개만 있다. 위 계획에서 추가로 필요한 것:

- 1–9번: **추가 애드온 없음** (전부 코어 + 직접 쓴 셰이더).
- 선택: `HorizontalTiltShiftShader.js`, `VerticalTiltShiftShader.js`(4번 가벼운 대안), `LUTPass.js` + `LUTCubeLoader.js`(10번), `GLTFLoader.js` + `BufferGeometryUtils.js`(CC0 모델을 쓸 때), `GTAOPass.js`와 그 의존 셰이더(고사양 AO).

---

## 4. 출처 목록

검색 결과에 실제로 나온 URL만 적었다. "본문 확인"은 페이지를 열어 읽은 것, "검색 요약"은 검색 도구의 요약으로만 확인한 것이다.

**HD-2D 아트 디렉션**

1. Wikipedia, "HD-2D" — https://en.wikipedia.org/wiki/HD-2D (본문 확인)
2. Nintendo Everything, "Octopath Traveler devs on character origins, visual style…" — https://nintendoeverything.com/octopath-traveler-devs-on-character-origins-visual-style-initial-hd-rumble-plans-much-more/ (1쪽만 본문 확인)
3. Unreal Engine, "Octopath Traveler II builds a bigger, bolder world in its stunning HD-2D style" — https://www.unrealengine.com/en-US/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style (403, 검색 요약) / Unreal Engine 스포트라이트 — https://www.unrealengine.com/en-US/spotlights/octopath-traveler-s-hd-2d-art-style-and-story-make-for-a-jrpg-dream-come-true (403, 검색 요약) / Nintendo Life — https://www.nintendolife.com/news/2022/10/octopath-traveler-ii-devs-aimed-to-make-its-hd-2d-visuals-picture-perfect (검색 요약)
4. GoNintendo, "Octopath Traveler II devs on the challenge of improving HD-2D graphics" — https://www.gonintendo.com/contents/37253-octopath-traveler-ii-devs-on-the-challenge-of-improving-hd-2d-graphics (본문 확인)
5. AUTOMATON, Unreal Fest East 2018 강연 보고 — https://automaton-media.com/devlog/report/20181023-78326 (본문 확인) / Unreal Fest Europe 2019 강연 페이지 — https://www.unrealengine.com/events/unreal-fest-europe-2019/the-fusion-of-nostalgia-and-novelty-in-the-development-of-octopath-traveler (403, 미확인)
6. しーさん, "[2022] Recreating an HD-2D world like Octopath Traveler" (Unity 팬 재현) — https://note.com/game_shiori/n/n8e3870afb515?hl=en (본문 확인)
7. ファミ通, HD-2D판 DQ3 핵심 개발자 인터뷰 — https://www.famitsu.com/article/202411/24083 (본문 확인)
   - 참고(기술 내용 없음): https://www.inside-games.jp/article/2025/01/30/163841.html , https://www.nintendolife.com/news/2022/05/triangle-strategy-producers-talk-hd-2d-and-why-other-devs-havent-used-it , https://gonintendo.com/contents/4132-triangle-strategy-producer-talks-about-recreating-an-accurate-hd-2d-style

**three.js 후처리·조명**

8. three.js 문서, BokehPass — https://threejs.org/docs/pages/BokehPass.html (본문 확인)
9. three.js 포럼, BokehPass 관련 — https://discourse.threejs.org/t/seam-in-bokeh-filter/9114 , https://discourse.threejs.org/t/understanding-the-focus-parameter-for-bokehpass/16320 / 내장·pmndrs 컴포저 비교 글 — https://skills.sh/openaec-foundation/three.js-claude-skill-package/threejs-impl-post-processing (모두 검색 요약)
10. pmndrs postprocessing, DepthOfFieldEffect — https://pmndrs.github.io/postprocessing/public/docs/class/src/effects/DepthOfFieldEffect.js~DepthOfFieldEffect.html (본문 확인)
11. pmndrs postprocessing, TiltShiftEffect — https://pmndrs.github.io/postprocessing/public/docs/class/src/effects/TiltShiftEffect.js~TiltShiftEffect.html (본문 확인)
12. three.js 문서, HorizontalTiltShiftShader — https://threejs.org/docs/pages/module-HorizontalTiltShiftShader.html (본문 확인) / VerticalTiltShiftShader — https://threejs.org/docs/pages/module-VerticalTiltShiftShader.html
13. three.js 예제, 보케 DoF — https://threejs.org/examples/webgl_postprocessing_dof2
14. three.js 포럼, "How to have a tilt shift effect on a 3D scene" — https://discourse.threejs.org/t/how-to-have-a-tilt-shift-effect-on-a-3d-scene/40606 (본문 확인)
15. three.js 문서, GodRaysShader — https://threejs.org/docs/pages/module-GodRaysShader.html / react-postprocessing God Rays — https://react-postprocessing.docs.pmnd.rs/effects/god-rays / 포럼 — https://discourse.threejs.org/t/help-with-persistent-volumetric-light-god-rays-light-shafts-sunbeam-sunburst-for-underground-cave-scene/79085 (검색 요약)
16. three-good-godrays README — https://cdn.jsdelivr.net/npm/three-good-godrays@0.12.0/README.md (본문 확인) / https://discourse.threejs.org/t/three-good-godrays-screen-space-godrays-for-three-js/43422
17. three.js 포럼·CodePen, 안개 셰이더 패치 — https://discourse.threejs.org/t/shader-error-fog-height/38665 , https://codepen.io/rob_costello/pen/qBMKeNr , https://discourse.threejs.org/t/xzfog-horizontal-distance-fog-for-three-js-top-down-isometric-games/87619 (검색 요약)
18. three.js 포럼, "High-Performance Ground Fog for Games" — https://discourse.threejs.org/t/high-performance-ground-fog-for-games-three-js/88522 (본문 확인) / 데모 https://codepen.io/the-red-reddington/full/wBGQQwO
19. three.js 문서, LUTPass — https://threejs.org/docs/pages/LUTPass.html / LUTCubeLoader — https://threejs.org/docs/pages/LUTCubeLoader.html / LUTImageLoader — https://threejs.org/docs/pages/LUTImageLoader.html (검색 요약)
20. three.js 예제 폴더 목록(3dlut, gtao, pcss, godrays 예제 존재) — https://demo.sourcebot.dev/~/browse/github.com/mrdoob/three.js@HEAD/-/tree/examples (검색 요약)
21. three.js 포럼, 그림자 — https://discourse.threejs.org/t/how-to-optimize-shadow-rendering-in-three-js-for-better-performance/64681 , https://discourse.threejs.org/t/dynamic-shadows-with-vsmshadowmap/71094 , https://discourse.threejs.org/t/performant-soft-shadows-three-js/27777 (검색 요약)
22. three.js 문서, GTAOPass — https://threejs.org/docs/pages/GTAOPass.html (본문 확인)

**픽셀아트 질감**

23. "Achieve Pixel Art Look in Three.js with NearestFilter" — https://salivity.github.io/three.js/article/achieve-pixel-art-look-in-three-js-with-nearestfilter / three.js 포럼, 밉맵 이음매 — https://discourse.threejs.org/t/seams-artifacts-between-texture-tiles-when-using-mipmaps/72979 / 3D 속 픽셀아트 데모 — https://some-games-by-bee.itch.io/bens-boxes (검색 요약)
24. Gabriel Sassone, "Pixel Art Filtering" — https://jorenjoestar.github.io/post/pixel_art_filtering (본문 확인)
25. three.js 포럼, 트라이플래너 — https://discourse.threejs.org/t/implementing-triplanar-mapping-in-threejs/59674 , https://discourse.threejs.org/t/how-to-make-textures-align-across-adjacent-objects/66193 (검색 요약)
26. Inigo Quilez, "texture repetition" — https://iquilezles.org/articles/texturerepetition (본문 접근 실패, 검색 요약) / Mikkelsen 헥스 타일링 논문 — https://jcgt.org/published/0011/03/05/paper.pdf / Unity 확률적 텍스처링 — https://unity.com/blog/engine-platform/procedural-stochastic-texturing-in-unity (검색 요약)

**식생**

27. Codrops, "How to make the fluffiest grass with Three.js" — https://tympanus.net/codrops/2025/02/04/how-to-make-the-fluffiest-grass-with-three-js/ (403, 검색 요약) / three.js 포럼 풀 글 — https://discourse.threejs.org/t/simple-instanced-grass-example/26694 , https://discourse.threejs.org/t/performance-optimizing-3m-instanced-grass-in-three-js/81286 / al-ro 풀 데모 — https://al-ro.github.io/projects/grass
28. keaukraine, "Efficient WebGL vegetation rendering" — https://dev.to/keaukraine/efficient-webgl-vegetation-rendering-4g2g (본문 확인)
29. Michael Dougall, "Creating fluffy trees with Three.js (part 1)" — https://douges.dev/blog/threejs-trees-1 (본문 확인)
30. Candussi 외 2005(잎 무리 빌보드) — https://sites.cs.ucsb.edu/~holl/pubs/Candussi-2005-EG.pdf / three.js 포럼(alphaToCoverage) — https://discourse.threejs.org/t/can-we-create-realistic-trees-with-textures-in-threejs/37183 / 쿼드 빌보드 — https://discourse.threejs.org/t/billboard-shader-from-quads/67376 (검색 요약)

**물**

31. Envato Tuts+, "Creating Toon Water for the Web" 1–3부 — https://code.tutsplus.com/creating-toon-water-for-the-web-part-1--cms-30447t , https://code.tutsplus.com/creating-toon-water-for-the-web-part-2--cms-30485t , https://code.tutsplus.com/creating-toon-water-for-the-web-part-3--cms-30487t (403, 검색 요약) / Alexander Ameye, Stylized Water Shader — https://alexanderameye.github.io/notes/stylized-water-shader / Godot Pixel Art Water Shader — https://godotshaders.com/shader/pixel-art-water-shader/ / Codrops R3F 물 — https://tympanus.net/codrops/2025/03/04/creating-stylized-water-effects-with-react-three-fiber/ (검색 요약)
32. three.js 포럼, "Unlit water shader with foam" — https://discourse.threejs.org/t/unlit-water-shader-with-foam/11641 (본문 확인) / https://github.com/romulolink/threejs-water-shader-with-foam / 깊이 텍스처 질문 — https://discourse.threejs.org/t/how-to-effectively-use-depthtexture-for-water-toon-shader/49773
33. three.js 포럼, 코스틱 — https://discourse.threejs.org/t/how-to-add-caustics-on-top-of-glb-model-just-like-convexseascapesurvey-com-virtual-experience/77468 , https://discourse.threejs.org/t/3d-water-caustics-rendering/18232 (검색 요약)

**CC0 자료**

34. Poly Haven 라이선스 — https://polyhaven.com/license (본문 확인)
35. ambientCG 라이선스 — https://docs.ambientcg.com/license/ (본문 확인)
36. Quaternius, Stylized Nature MegaKit — https://quaternius.com/packs/stylizednaturemegakit.html (본문 확인) / OpenGameArt의 Quaternius CC0 모음 — https://opengameart.org/content/all-cc0-uploader-quaternius
37. Kenney 지원 페이지(라이선스) — https://kenney.nl/support (본문 확인)
38. OpenGameArt, Nature Pack (extended) — https://opengameart.org/node/61612 / LowPoly Nature Pack — https://opengameart.org/content/lowpoly-nature-pack (검색 요약)

**성능·기타 데모**

39. pmndrs/postprocessing — https://github.com/pmndrs/postprocessing / three.js 포럼, 블룸 해상도 — https://discourse.threejs.org/t/solved-why-the-image-looks-so-low-res-after-applied-unrealbloompass/17361 (검색 요약. 크롬북 전용 측정 자료는 찾지 못함)
40. 2.7 표의 데모·저장소: https://github.com/spearwolf/twopoint5d/blob/main/packages/twopoint5d/README.md , https://github.com/KodyJKing/hello-threejs (본문 확인) , https://discourse.threejs.org/t/return-of-the-earthmover-3d-pixel-art-game/56454 , https://gladark-dev.itch.io/2d-hd-in-unity-tech-demo , https://godotshaders.com/shader/depth-based-tilt-shift/ (검색 요약)
