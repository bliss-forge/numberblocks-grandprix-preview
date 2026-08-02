아래는 담당 렌즈(운전실 1인칭 유사 3D 재건축) 확정 스펙이다. 모든 수치는 소스(src/ktx-scene.mjs, src/ktx-scene-art.mjs, src/ktx-journey.mjs, src/ktx-route-data.mjs, styles.css 5940–6535행) 실측 기준이며, 테스트를 grep으로 확인한 결과 tests/*.mjs는 모델 모듈(ktx-journey, ktx-route-data)만 import하고 씬 DOM 클래스는 참조하지 않으므로 cab 뷰 DOM/클래스는 자유 개편 가능(모델 21개 테스트는 무변경으로 보장).

---

# KTX v2 — 운전실(1인칭) 뷰 유사 3D 재건축 스펙

기준 해상도: 1280×720. 스테이지 내부 실측 ≈ 1217×540px (stage-frame `min(97vw,1760px)`, #game padding 74/12). 모든 좌표는 %로 쓰고 px 병기는 1217×540 환산값.

## 0. 전역 좌표 계약

- **지평선(=소실점 VP)**: 스테이지 y 36% (194px), x 50% (608px). 이 한 점을 §2 지면, §4 지물, §5 교행, §6 터널, §7 승강장이 전부 공유한다. CSS 변수로 고정: `.ktx-view-cab { --vp-x: 50%; --vp-y: 36%; }`
- **월드 스케일(1인칭 전용)**: 지면 평면(plane) 좌표 1px = 게임 1m (`PX_PER_M = 1`). 3인칭(side) 뷰의 `NEAR_SCALE=3`·`FAR_RATIO=0.18`은 건드리지 않는다.
- 모델 변경 0줄. app.mjs 변경 0줄(스로틀 표시는 씬에서 vΔ로 추론). 변경 파일: `src/ktx-scene-art.mjs`, `src/ktx-scene.mjs`, `styles.css`만.

## 1. 화면 재배분 (대시 34%→21%, 세계 우위)

| 층 | 영역 (stage %) | px | 내용 |
|---|---|---|---|
| 하늘 | 0–36% | 0–194 | 기존 `.ktx-cab-backdrop`(5종 sky 프리마운트) 그대로, inset을 `0 0 64% 0`으로 |
| 원경 실루엣 | 24–36% | 130–194 | 기존 `.ktx-cab-horizon`(6종 land 스트립, `--loop-px` 시차)을 지평선에 하단 정렬: `inset: auto 0 64% 0; height: 12%` |
| 지면·선로 | 36–100% | 194–540 | 신규 3D 평면(§2). 대시가 하단을 덮는다 |
| 대시보드 | 79–100% | 426–540 | height 21% (현행 34%에서 축소) |
| 캡 프레임 | 상단 밴드 0–7% + 좌우 필러 각 5.5% | — | "운전석에 앉아 있음" 연출, §1.2 |

### 1.1 대시 v2 (`cabDashSvg` 교체, viewBox `0 0 1000 150`)
- 콘솔: `<path d="M0 26 Q500 -18 1000 26 L1000 150 L0 150z" fill="${train.nose}">` + 상판 `Q500 6` 밝은 띠 `fill="${train.color}"`.
- **원형 속도계(바늘 있는 다이얼)** 중앙: SVG 링 `circle r=64` INK + `r=56` PAPER, 주눈금 7개(0·50·100·150·200·250·300)를 −120°~+120°에 40° 간격 `<line>` 으로. 다이얼 위 DOM 바늘:
  ```css
  .ktx-needle { position:absolute; left:calc(50% - 2px); bottom:9.5%;
    width:4px; height:52px; border-radius:2px; background:#e8564a;
    transform-origin:50% 92%; transform:rotate(var(--needle-deg,-120deg));
    transition:transform .16s linear; }
  ```
  틱마다 JS: `--needle-deg = state.v * 0.8 - 120` (0.8°/km/h). 기존 `.ktx-speedo` 디지털 숫자는 다이얼 바로 아래로 이동(클래스·텍스트 갱신 로직 불변 → `ktx-speed-pop` 유지).
- **노치 레버 반응**: 씬 로컬 prevV로 `vd = state.v - prevV`; `root.dataset.throttle = vd>0.4?"up":vd<-0.4?"down":"idle"`.
  ```css
  .ktx-notch-knob { transition: transform .25s ease; }
  .ktx-game[data-throttle="up"]   .ktx-notch-knob { transform: translateY(-40px); }
  .ktx-game[data-throttle="down"] .ktx-notch-knob { transform: translateY(26px); }
  ```
- 정차 게이지 5칸·손바닥·문 램프: 클래스·로직 그대로, 대시 우측(`right:20%; bottom:38%`)으로 재배치만.

### 1.2 캡 프레임
```css
.ktx-cab-frame { position:absolute; inset:0; pointer-events:none; z-index:9; }
.ktx-cab-frame::before, .ktx-cab-frame::after { content:""; position:absolute;
  top:0; bottom:21%; width:5.5%; background:var(--cab-frame); }
.ktx-cab-frame::before { left:0;  transform:skewX(-3deg); border-radius:0 18px 14px 0; }
.ktx-cab-frame::after  { right:0; transform:skewX(3deg);  border-radius:18px 0 0 14px; }
.ktx-cab-frame-top { position:absolute; top:0; left:0; right:0; height:7%;
  background:var(--cab-frame); border-radius:0 0 30px 30px; }
.ktx-game[data-train="srt"] { --cab-frame:#40265e; }
.ktx-game[data-train="ktx"] { --cab-frame:#0d3a72; }
```
`root.dataset.train`은 이미 존재. 유리 효과·그림자 광택은 넣지 않는다(파스텔 계약).

## 2. 선로면 원근 기법 — 비교와 확정

| | (a) CSS perspective+rotateX 평면 | (b) SVG 수작업 원근 + dashoffset(현행 개선) | (c) 하이브리드 |
|---|---|---|---|
| 원근 단축(foreshortening) | rotateX 투영으로 **공짜·정확** — 침목이 아래로 올수록 가속·확대 | stroke-dash는 사용자 좌표에서 등간격 → 화면에서도 등간격. 원근 간격을 내려면 침목 20+개를 개별 keyframe — 수작업·부정확 | (a)와 동일 |
| 합성 비용 | 이동을 자식 `transform: translateY`로 하면 **composite-only**(래스터 1회 후 GPU 샘플링) | dashoffset은 paint 속성 — 매 프레임 사다리꼴 전체 리페인트 | (a)와 동일 |
| background-position 대안 | 허용 목록에 있으나 paint 유발 — 회전 평면 전체 리페인트라 저사양에서 (b)와 같은 약점. **쓰지 않는다** | — | — |
| 지물·복선 확장 | 평면 위 정적 레이어 + 화면공간 스프라이트로 자연 결합 | 지물마다 SVG 좌표 수작업 | ✓ |

**확정: (c) 하이브리드 — 코어는 (a).** 지면·침목·레일·복선 = rotateX 평면(transform-only), 스쳐가는 지물·교행·터널·승강장 = 화면공간 스프라이트(keyframes/모델 구동), SVG는 정적 아트(대시·표지 얼굴·전차선)에만. 기존 `cabTrackSvg()`와 `.ktx-sleepers` transition 규칙은 삭제(씬의 `if (sleepers)` 가드가 있어 제거 안전).

### 2.1 확정 기하 (검산 완료)
```css
.ktx-cab-world { position:absolute; top:36%; left:0; right:0; bottom:0;
  perspective:500px; perspective-origin:50% 0; overflow:hidden; }
.ktx-ground3d { position:absolute; top:0; left:50%; width:1300px; height:500px;
  margin-left:-650px; transform-origin:50% 0; transform:rotateX(84deg); }
```
- rotateX(84°), origin=상단(지평선): 평면 상단이 지평선에 붙고 하단이 카메라 쪽으로 눕는다. 투영 배율 `mag(Y) = 500/(500 − Y·sin84°)`:
  - Y=100m → 1.25× (지평선 아래 13px) · Y=300m → 2.49× (78px) · Y=400m → 4.89× (204px) · **Y=437m에서 화면 하단(346px) 도달, 배율 7.6×** → 가시 선로 깊이 ≈ 437m.
  - 안전조건: Y_max=500 → z=497.3 < d=500. **평면이 카메라면(z=d)을 절대 넘지 않는다**(넘으면 클리핑 아티팩트).
- 평면 폭 1300px: 지평선 행에서 배율 1이므로 절반폭 650 ≥ 608(화면 절반) → 전 행 가로 커버 보장.

### 2.2 평면 자식 레이어 (전부 절대배치, z-index로 평탄 적층 — `preserve-3d` 금지)
```
.ktx-ground3d
 ├ .ktx-gskin ×6 [data-land]   z1  땅 색: opacity 크로스페이드 1.5s
 ├ .ktx-ballast-bed            z2  자갈밴드: 정적
 ├ .ktx-ties                   z3  침목: 유일한 이동 자식 (§3)
 ├ .ktx-rail ×4                z4  레일: 정적
 ├ .ktx-ground-shade ×3        z5  밤/노을/새벽 틴트 (§8)
 └ .ktx-headlight              z6  야간 전조등 (§8)
```
- **자기 선로**: 중심 x=0(평면 좌표, 이하 동일). 레일 x=−36·+36, 폭 9px → 화면 하단에서 궤간 547px·레일 굵기 68px(장난감 규모 ✓). `background:linear-gradient(to right,#7f8894,#c8ccd4 40%,#7f8894)`.
- **복선(맞은편)**: 중심 x=−120, 레일 −156·−84. 하단에서는 화면 왼쪽 밖으로 나가고 중거리~소실점에서 수렴해 보인다(실제 조망과 동일).
- **자갈밴드** `.ktx-ballast-bed`: x∈[−180,+72] (`left:calc(50% - 180px); width:252px`), `#cfc3ad`, 양끝 6px 어두운 숄더 `#b9ac93`.
- **침목** `.ktx-ties`: `left:calc(50% - 180px); width:252px; top:-640px; height:1140px;`
  `background:repeating-linear-gradient(to bottom, var(--tie,#7a6a55) 0 5px, transparent 5px 16px);`
  간격 16px(=16m, 만화 압축) → 화면 하단 간격 ≈122px·두께 ≈38px. `will-change:transform` 이 자식 하나에만.
- **gskin 색** (기존 buildEnvLayers 이디엄 복제, 단 클래스는 `.ktx-gskin` — `.ktx-env-land`로 하면 `querySelectorAll(".ktx-env-land")` 루프 갱신에 잘못 걸린다):
  city `#b9c4d0` / field `#a9df7d` / river `#9ccf7e` / mountain `#7d8b7a` / tunnel `#262c3a` / sea `#ded3ab`. CSS는 기존 패턴 그대로 `.ktx-game[data-land="city"] .ktx-gskin[data-land="city"] { opacity:1 }` ×6.

## 3. 속도→침목 동기화 (150ms 틱, 끊김 없는 wrap)

현행 이디엄(모델이 위치를 주고 `transition .16s linear`가 150ms 틱 사이를 보간 — transition 160ms ≥ 틱 150ms라 속도 연속) 유지. dashoffset 대신 transform:

```css
.ktx-ties { transform: translate3d(0, var(--tie-px, 0px), 0);
  transition: transform .16s linear; }
```

씬 로컬 메타(모듈 WeakMap, root 키):
```js
const meta = sceneMeta(root); // { prevSeg, prevX, tiePx, prevTieTarget, poleDebt, ... }
const dxM = state.segIndex === meta.prevSeg ? state.x - meta.prevX : 0; // 구간 전환 틱은 델타 0
meta.prevSeg = state.segIndex; meta.prevX = state.x;
meta.tiePx += dxM * 1;   // PX_PER_M=1. correcting 페이즈는 dxM<0 → 침목이 뒤로 구른다(오버런 복귀 연출 공짜)
```
- 300km/h → 83.3px/s(평면), 틱당 12.5px, 화면 하단 환산 ≈630px/s. 35km/h(봉투 바닥) → 9.7px/s — 정차 직전 슬로우 리듬.
- **누적 한계·wrap**: `WRAP = 640px`(침목 40개 주기의 정수배). 최고속에서 7.7초에 1회.
- **무봉합 wrap 알고리즘** (기존 setLoop의 "1틱 정지" 약점 제거 — 점프를 패턴 주기의 정수배로, 그리고 시작점·목표점을 동시에 이동):
```js
if (meta.tiePx >= 640) {
  ties.style.transition = "none";
  ties.style.setProperty("--tie-px", `${meta.prevTieTarget - 640}px`); // 직전 렌더 위치 - 주기배수 → 패턴 불변 = 눈에 안 보이는 점프
  void ties.offsetWidth;              // pulse()와 같은 확립된 리플로 이디엄
  ties.style.transition = "";
  meta.tiePx -= 640;
}
ties.style.setProperty("--tie-px", `${meta.tiePx}px`);
meta.prevTieTarget = meta.tiePx;
```
  transition(160ms)이 틱(150ms)과 거의 완주 상태라 `prevTieTarget ≈ 실제 렌더 위치`(오차 ≤ 10ms×83px/s ≈ 0.8px). 640은 16의 배수이므로 점프는 시각적으로 0.
- 구간 경계·정차 중에는 v=0이라 자연 정지. depart 시 x=0 리셋은 `dxM=0` 분기로 흡수 — 스냅 없음.
- 원경 스트립은 기존 `setLoop(layer, worldPx*0.18, 1000)` 그대로(주기가 커 wrap 빈도 낮음, 현행 수용 품질).

## 4. 스쳐 지나가는 지물 시스템 (화면공간 레인)

컨테이너: `.ktx-lineside { position:absolute; inset:0; pointer-events:none; opacity:1; transition:opacity .35s; }` — `data-speed-tier="0"`(v<20) 또는 phase가 driving 계열이 아니면 `opacity:0`(급제동 시 배경-지물 속도 불일치 은폐).

### 4.1 원근 비행 keyframes — 쌍곡선 6-스톱 근사
등속 접근의 화면 투영은 `1/(1−t)` 성장: **남은 시간이 절반이 될 때마다 크기·오프셋 2배**. 스톱 {0, 50, 75, 87.5, 93.75, 100}% × 배율 {1,2,4,8,16,32}, `animation-timing-function: linear`(구간별 선형 = 쌍곡선 조각 근사).

```css
@keyframes ktx-fly-r {   /* 우측 레인: 기저 (26px, 9px), s0=.09 */
  0%     { transform: translate3d(26px, 9px, 0)    scale(.09); opacity:0; }
  6%     { opacity:1; }
  50%    { transform: translate3d(52px, 18px, 0)   scale(.18); }
  75%    { transform: translate3d(104px, 36px, 0)  scale(.36); }
  87.5%  { transform: translate3d(208px, 72px, 0)  scale(.72); }
  93.75% { transform: translate3d(416px, 144px, 0) scale(1.44); }
  100%   { transform: translate3d(832px, 288px, 0) scale(2.88); opacity:1; }
}
@keyframes ktx-fly-l { /* 좌측 레인: x 부호 반전, 기저 (-30px, 9px) */ }
```
오브젝트 노드: `.ktx-obj { position:absolute; left:var(--vp-x); top:var(--vp-y); opacity:0; }` 내부 아트는 `translate(-50%,-100%)`로 밑변 앵커(바닥에 서 있는 접지감). 실행 클래스 `.ktx-obj-run { animation: var(--lane) var(--dur) linear both; }`.

### 4.2 animation-duration CSS 변수의 함정과 확정 회피책
실행 중인 애니메이션의 duration을 바꾸면 경과시간/새duration으로 진행률이 재매핑되어 **위치가 점프**한다(재시작으로 보임). 이 코드베이스에서 허용하는 속도 연동 패턴은 셋뿐:
1. **스폰-스코프 고정 duration** (지물): 스폰 순간의 v로 inline `style.animationDuration`을 굳히고 비행 중 절대 갱신 안 함. `dur = clamp(936000 / max(v,1), 1600, 6500) ms` (가상 접근거리 260m: 300km/h→3.1s, 144km/h→6.5s 상한).
2. **모델 구동 transform + transition .16s** (침목 §3, 승강장 §7): 위치 자체를 매 틱 지정 — 속도와 항상 정확 일치.
3. **고정 duration 계층 + opacity 크로스페이드** (스피드라인·§8 sway): 티어별 레이어를 미리 깔고 활성 티어만 opacity로 켠다. duration은 불변이므로 점프 없음.

### 4.3 스폰 규칙 (매 150ms 틱, updateKtxScene 내부)
풀링: `.ktx-obj` 노드 10개 라운드로빈(생성/파괴 금지). 재트리거는 기존 `pulse()` 이디엄: `classList.remove("ktx-obj-run"); void el.offsetWidth; el.style.animationDuration=…; el.dataset.kind=…; classList.add("ktx-obj-run")`.

| 지물 | 레인 | 트리거 | 아트(인라인, 신규 이미지 0) |
|---|---|---|---|
| 전차선 기둥 | 우 `ktx-fly-r` | `meta.poleDebt += dxM`, 55m마다 1개 (300km/h에서 1.5개/s, 동시 ~4개) | div: 마스트 10×120px `#8d95a0` + 캔틸레버 암 64×8px + 애자 원 2개 |
| 신호기(초록) | 좌 `ktx-fly-l` | 400m마다 | 기둥 8×96px + 두건 달린 렌즈 `circle r=12 #2fa25c` (벌점 없음 = 항상 초록) |
| 킬로포스트 | 우 | `ceil(d/1000)` 값이 바뀌는 틱 (4→3→2→1 카운트다운 — 세기 교육 접점) | 흰 팻말 44×56px + `<span>` 숫자(폰트 900, INK) |
| 속도표지 "35" | 좌 | `zone-enter` 이벤트 수신 시 1회 | 노란 원 r=30 `#f4c542` + 숫자 35 |
| 표지 "300" | 우 | `event: sprint300` 수신 시 1회 | 빨간 링 + 300 (기존 sprint300 아트 축소 재사용) |
| 터널 조명 | 좌우 교대 | `data-tunnel=true` 동안 30m마다 | 노란 원 r=10 + glow(정적 box-shadow) |

### 4.4 전차선 가선(와이어) — 정적이 정답
운전석에서 보는 접촉 가선은 소실점으로 수렴하는 준정지 선(실제와 동일). `.ktx-wires`: 정적 SVG, `viewBox 0 0 1000 400`, `<path d="M500 144 L433 0" />`·`<path d="M500 144 L567 0"/>` + 드로퍼 짧은 세로선 6개, stroke `#6b7686` 3px. 3.8s `translateY(±2px)` sway만(ease-in-out alternate). 야간 stroke `#3b455c`. 터널에서는 opacity 0.

## 5. 복선 + 교행 열차 (passing)

- 맞은편 선로는 §2.2 평면에 상시 존재(교행이 없어도 복선 풍경).
- **교행 연출**: `.ktx-oncoming { position:absolute; inset:0; pointer-events:none; }` 안에 스프라이트 3량(선두+중간+후미, `eventSpriteSvg("passing")`의 초록 열차 아트를 좌우반전 단순화한 인라인 SVG, 각 폭 200px).
```css
@keyframes ktx-oncome-fly {
  0%     { transform: translate3d(-34px, 8px, 0)    scale(.07); opacity:0; }
  8%     { opacity:1; }
  50%    { transform: translate3d(-68px, 16px, 0)   scale(.14); }
  75%    { transform: translate3d(-136px, 32px, 0)  scale(.28); }
  87.5%  { transform: translate3d(-272px, 64px, 0)  scale(.56); }
  93.75% { transform: translate3d(-544px, 128px, 0) scale(1.12); }
  100%   { transform: translate3d(-1088px, 256px, 0) scale(2.24); opacity:1; }
}
.ktx-oncome { animation: ktx-oncome-fly 1500ms linear both; }
.ktx-oncome:nth-child(2) { animation-delay: 260ms; }
.ktx-oncome:nth-child(3) { animation-delay: 520ms; }
```
  경로 기저 x가 음수(−34)로 시작해 왼쪽으로 폭주 — 맞은편 선로(평면 x=−120) 위를 정확히 훑는다. 상대속도(자속+300)를 반영한 1.5s whoosh.
- 트리거: `events` 루프에서 `{type:"event", event:"passing"}` 수신 → 1회 발사. **경적 상호작용**: `{type:"horn", response:"passing"}` 수신 시 duration 1200ms로 재발사(active 창 0.12~0.30 동안 반복 재미 — 모델의 3단 에스컬레이션과 합).
- **캡 진동**: 첫 발사 후 0.7s 시점(선두가 스칠 때)에 맞춰 `animation: ktx-cab-shake .5s ease .7s` — `.ktx-scene-sway`에 pulse 클래스. `@keyframes ktx-cab-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-3px)} 40%{transform:translateX(3px)} 60%{transform:translateX(-2px)} 80%{transform:translateX(2px)} }`.

## 6. 터널 진입

- **선행 트리거(씬 로컬, 모델 무변경)**: 구간 진입 시 `KTX_SEGMENTS[segIndex].bands`에서 `bands[i+1].land==="tunnel"`인 경계 `portalAtM = bands[i].until × length`를 1회 계산. 매 틱 `x ≥ portalAtM − (v/3.6)×2.2` 이면 포털 발사(구간당 1회, meta.portalSeg 가드). 리드타임을 v로 잡았으므로 고정 duration 2200ms가 도착 시점과 자기정합.
- `.ktx-portal`: VP 앵커, 인라인 SVG 아치(외곽 `#3a4152`, 내부 홀 `#141a28`, 밑단 흰 안전띠 2줄) 폭 200px.
```css
@keyframes ktx-portal-fly {
  0%    { transform: translate3d(0, 6px, 0)  scale(.08); opacity:0; }
  10%   { opacity:1; }
  50%   { transform: translate3d(0, 10px, 0) scale(.17); }
  75%   { transform: translate3d(0, 18px, 0) scale(.36); }
  87.5% { transform: translate3d(0, 34px, 0) scale(.8);  }
  92%   { opacity:1; }
  100%  { transform: translate3d(0, 64px, 0) scale(30); opacity:0; } /* 마지막 176ms 페이드 — fill:forwards가 화면을 영구 덮는 사고 방지 */
}
```
  홀 중심을 VP에 정렬해 "구멍 속으로 들어가는" 시선. scale 30 × 200px = 6000px — 화면 전체 통과.
- **내부**: 기존 `data-tunnel` 파이프라인 재사용 — `.ktx-cab-tunnel` 암전 `rgba(20,26,40,.5)`(현 .45에서 소폭 상향), `.ktx-cab-lamp` 실내등 유지. 추가: `.ktx-tunnel-walls` 좌우 패널(각 폭 26%, `linear-gradient(to right, #262c3a, transparent)`, opacity 0→.9 .8s), 지물 스폰을 터널 조명으로 스위치(§4.3), `.ktx-wires` opacity 0. gskin tunnel(`#262c3a`)이 1.5s 크로스페이드로 지면도 어둡게.
- **출구 번쩍**: band 이벤트에서 `meta.prevLand==="tunnel" && land!=="tunnel"` 감지 → `.ktx-flash` pulse: `background:radial-gradient(circle at 50% 36%, rgba(255,255,255,.75), transparent 55%); animation: ktx-flash 900ms ease-out;` keyframes opacity 0→.32→0. 최대 0.32 — 4~6세 눈에 부담 없는 상한.

## 7. 역 접근 — 승강장이 소실점에서 커진다

키프레임이 아니라 **모델 구동**(§4.2 패턴 2): 정차 마커·거리 게이지와 어긋나면 안 되기 때문.

- 그룹: `.ktx-cab-platform { position:absolute; left:var(--vp-x); top:var(--vp-y); transform: translate3d(var(--plat-x,12px), var(--plat-y,6px), 0) scale(var(--plat-s,.07)); transform-origin:0 100%; transition:transform .16s linear; visibility:hidden; }` — `[data-nearstop="true"]`에서 visible.
- 매 틱(phase ∈ driving·stopping·correcting, `d = distanceToMarker(state) < 320` — side 뷰 320m 진입 규칙과 동일):
```js
const t = 1 - Math.min(d, 320) / 320;
setVar("--plat-x", `${12 + 96 * t * t}px`);     // t=1 → 108px
setVar("--plat-y", `${6 + 120 * t * t}px`);     // t=1 → 126px (지평선 아래)
setVar("--plat-s", String(0.07 + 2.13 * t ** 3)); // t=1 → 2.2 (t³ = 쌍곡선 근사)
```
- 아트(인라인 SVG `0 0 560 150`, 좌하단이 그룹 원점): 슬래브 사다리꼴 `#dce6f0`+흰 테두리, 안전선 `#f4c542` 줄, 기둥 2 + 지붕 `#a8bed4`, 역명판 `#31445b`(텍스트는 SVG가 아니라 겹친 `<div class="ktx-cabplat-name">` — 선명한 한글). 역명 갱신은 기존 side 뷰 `.ktx-platform-name` 갱신 지점에서 함께.
- **정차 마커 별**: 아트 로컬 x=23px에 노란 타일(46px)+★. **캘리브레이션 검산**: d=0에서 별 화면 x = VP(608) + plat-x(108) + 23×2.2 ≈ 767px = 화면 63% — 조준선과 일치.
- **조준선** `.ktx-aim { left:63%; top:40%; height:32%; border-left:3px dashed rgba(49,68,91,.4); opacity:0; }` — `[data-armed="true"]`에서 opacity 1 + 기존 손바닥 ✋ 점멸과 동시. 마커별이 조준선에 닿는 순간 = Space 타이밍. (d=10m에서 별 이탈 ≈11px — 미세하므로 1차 단서는 여전히 게이지 5칸(24m/칸)과 ✋, 조준선은 보강 단서. 수용 기준: 1280×720에서 d=0일 때 별 중심이 조준선 ±12px.)
- **기다리는 친구들**: `state.manifest.stops[KTX_SEGMENTS[segIndex].to]`(읽기 전용)에서 앞 3명을 `<img>`(characterAsset, 높이 34px×scale)로 슬래브 위에 — side 뷰 대기줄과 인물 일치. 정차 후 카메라가 side로 컷되는 기존 app.mjs 흐름(출발→cab / 도착→side)은 그대로 두므로 승하차 연기는 side 뷰 몫.

## 8. 밤/노을 밴드 색 처리 (data-sky 5종 호환)

전부 **opacity 크로스페이드(1.5s — 기존 env 전환과 동일 템포)**, 색 자체는 정적:
- 평면 틴트 `.ktx-ground-shade` ×3 (평면 자식 z5, inset:0): night `rgba(24,32,58,.42)` / sunset `rgba(239,138,90,.16)` / dawn `rgba(242,166,90,.14)`. `.ktx-game[data-sky="night"] .ktx-ground-shade[data-shade="night"] { opacity:1 }` 식 3줄. morning/day는 무틴트. 침목·레일·자갈이 한꺼번에 어두워진다(기존 `.ktx-ground-plane`/`.ktx-ballast`/`.ktx-sleepers` 야간 fill 규칙은 삭제).
- **야간 전조등** `.ktx-headlight`(평면 자식 z6): `left:calc(50% - 90px); bottom:0; width:180px; height:260px; background:linear-gradient(to top, rgba(255,244,200,.34), transparent 70%); opacity:0; transition:opacity .8s;` → `[data-sky="night"]`에서 1. 레일 두 줄이 빛 웅덩이 속에서 소실점으로 뻗는 야간 특유의 그림.
- 신호기 glow: `[data-sky="night"] .ktx-obj[data-kind="signal"] .ktx-lamp { box-shadow:0 0 16px 5px rgba(47,162,92,.85); }` — 정적 shadow(애니메이션 아님)라 페인트 1회.
- 대시 야간: `.ktx-dash-night`(대시 위 오버레이) `rgba(34,48,77,.28)` opacity 크로스페이드 + 다이얼 림 `[data-sky="night"]`에서 `#f4e9c8`(백라이트 감).
- 가선 야간색 §4.4, 터널은 §6이 자체 처리. 하늘 5종·원경 6종 프리마운트 메커니즘은 무변경.

### 8.1 속도감 보조 — 스피드라인 (티어 패턴, §4.2-3)
`root.dataset.speedTier = Math.min(5, Math.floor(state.v/60))` 를 씬이 설정(아트 파일 주석의 data-speed-tier 계약 실체화). 티어 3/4/5용 레이어 3장(duration 900/650/480ms 고정, `repeating-linear-gradient(to bottom, rgba(255,255,255,.5) 0 18px, transparent 18px 120px)` 세로 스트릭을 좌우 가장자리 폭 3% 기둥 2개에, VP 쪽으로 ±8° 기울임), 활성 티어만 opacity .22. `@keyframes ktx-streak { from{transform:translateY(-50%)} to{transform:translateY(0)} }` (요소 높이 200%).

### 8.2 생동감 — 캡 스웨이
`.ktx-scene-sway { animation: ktx-sway 3.8s ease-in-out infinite alternate; }` translateY 0→3px. `.ktx-game[data-moving="false"] .ktx-scene-sway { animation-play-state:paused; }` (data-moving 기존 속성 재사용).

## 9. DOM 트리·z-index 최종표

```
.ktx-view-cab
  z1  .ktx-cab-backdrop  (sky ×5 — 기존)
  z2  .ktx-cab-horizon   (land 스트립 ×6 — 기존, 위치만 §1)
  z3  .ktx-scene-sway
        z1 .ktx-cab-world > .ktx-ground3d (자식 §2.2)
        z2 .ktx-wires
        z3 .ktx-lineside > .ktx-obj ×10
        z4 .ktx-oncoming > .ktx-oncome ×3
        z5 .ktx-portal
        z6 .ktx-cab-platform
        z7 .ktx-tunnel-walls
  z4  .ktx-aim
  z5  .ktx-cab-tunnel (기존 암전) 
  z6  .ktx-flash
  z7  .ktx-speedlines ×3
  z8  .ktx-speed-balloon (기존)
  z9  .ktx-cab-frame (+ .ktx-cab-frame-top)
  z10 .ktx-cab-dash (신아트 + .ktx-needle + 기존 speedo/gauge/palm/door-lamp + .ktx-dash-night)
```
`.ktx-finale`(root z5, 후순위 형제)는 기존대로 최상위 유지.

## 10. prefers-reduced-motion

기존 블록 확장:
```css
@media (prefers-reduced-motion: reduce) {
  .ktx-ties, .ktx-cab-platform, .ktx-needle { transition:none; }
  .ktx-lineside, .ktx-speedlines, .ktx-oncoming, .ktx-portal { display:none; }
  .ktx-scene-sway, .ktx-obj-run, .ktx-oncome { animation:none; }
  .ktx-flash { animation:none; opacity:0; }
}
```
암전·전조등·틴트(비운동 opacity 상태 전환)는 유지 — 속도감은 기존 원칙대로 숫자·소리가 담당.

## 11. 성능 예산

- 동시 애니메이션 레이어(300km/h 최악): 침목1 + env페이드2 + 기둥4 + 스피드라인1 + sway1 + 바늘1 + (역 접근 시) 승강장1 ≈ 10 — 전부 transform/opacity 합성.
- GPU 텍스처: 평면 자식은 실크기 래스터 — ties 252×1140 ≈ 1.1MB, gskin ×6 = 1300×500 ≈ 2.6MB×6, 총 신규 ≈ 25–35MB. 허용.
- 강제 리플로(`void offsetWidth`)는 wrap 시 ≤0.13Hz + 스폰 시 ≤1.5Hz — pulse() 선례 범위.
- 페인트 유발 애니메이션 0건 (background-position도 미사용).

## 12. 리스크 목록

1. **[중] 카메라면 클리핑**: 평면 `Y_max·sin84° = 497.3 < 500` 마진이 3px뿐. Safari는 z≥d 근처 클리핑이 Chrome과 다르다 — 구현 후 Safari 검증 필수. 여유가 필요하면 height 480으로(가시 깊이 손실 0, 437m까지만 쓰므로).
2. **[중] 하단 확대 래스터 블러**: 평면 자식 텍스처가 하단에서 ~7.6× 확대 샘플링 — 침목 가장자리가 소프트해질 수 있다. 아트가 플랫 단색·두꺼운 형태라 수용 가능 예상. 심하면 노브: 모든 §2.1 길이 상수·perspective를 2배(1000px, 평면 2600×1000, 침목 32px 주기) + 최종 화면 배치는 동일 — 래스터 밀도 2배.
3. **[중] wrap 근사 오차**: `prevTieTarget ≈ 실제 렌더 위치` 가정은 틱이 정시(150ms)일 때 성립. app.mjs가 elapsed를 400ms로 클램프하므로 지연 틱 직후 wrap이 겹치면 최대 ~12px 미세 홉 1회 — 빈도 낮고(7.7s당 1회 × 지연 틱 확률) 수용.
4. **[중] 스폰-스코프 duration의 속도 불일치**: 급제동 시 비행 중 지물이 옛 속도로 계속 난다 — `.ktx-lineside` opacity 페이드(§4)로 은폐하지만 v가 요동치는 플레이(↑↓ 연타)에서 위화감 잔존 가능. 지물은 장식이므로 판정 무관.
5. **[하] 3D 자식 평탄화**: `.ktx-ground3d` 자식은 부모 transform으로 자동 평탄화(의도). 누군가 `transform-style:preserve-3d`를 추가하면 z-index 적층이 깨진다 — CSS 주석으로 금지 명시.
6. **[하] overflow+perspective 조합**: `.ktx-cab-world`의 overflow:hidden이 구형 Safari에서 3D 자식을 클립하지 못한 사례 이력 — `.ktx-stage`의 기존 overflow:hidden이 2차 방벽.
7. **[하] gskin 6장 상시 opacity transition 레이어 상주**: 기존 env 22장 선례가 있어 수용이나, 저사양 실측에서 문제 시 city/field/river를 색만 다른 3장으로 통합 가능.
8. **[하] 텍스트 지물(킬로포스트 숫자)**: div 텍스트가 scale 애니메이션으로 커질 때 서브픽셀 리샘플 — 굵은 폰트(900)로 완화.
9. **[하] 씬 로컬 meta(WeakMap)**: 뷰 재마운트(renderKtxScene 재호출) 시 meta 초기화 필요 — renderKtxScene에서 meta 리셋을 명시하지 않으면 이전 판의 tiePx가 이월된다.
10. **[정보] 테스트 영향 0**: tests는 모델만 import(확인). 단 updateKtxScene이 FakeElement 환경에서 돌 가능성 대비, 신규 querySelector 결과는 전부 `if (node)` 가드(기존 sleepers 가드 관례).

## 13. 수용 기준 (구현 후 검증 절차)

1. `npm test` 375개 통과(모델 무변경이므로 자동 충족 예상).
2. 1280×720 캡처: 209km/h 주행 중 3초 GIF에서 침목 하단 이동 ≥ 400px/s 체감, 기둥 2개 이상 동시 비행.
3. d=0 정차 스크린샷에서 마커별 중심이 조준선 ±12px.
4. 터널 밴드(대전→대구 0.55)에서 포털 성장→암전→출구 플래시 연속 확인.
5. passing 시드에서 3량 whoosh + 캡 셰이크 확인.
6. data-sky=night 밴드에서 전조등·신호 glow·대시 백라이트 동시 확인.
7. `prefers-reduced-motion: reduce` 에뮬레이션에서 지물·스트릭·포털 비표시, 숫자·게이지 정상.

**관련 절대 경로**: /Users/bosung_kim/bliss/bliss_github/D_ETC/numberblocks-minigame/src/ktx-scene.mjs · src/ktx-scene-art.mjs · src/ktx-journey.mjs · src/ktx-route-data.mjs · styles.css(5940–6535행이 현행 ktx 블록) · src/app.mjs(1055–1223행 배선, 무변경) · tests/ktx-journey.test.mjs(무변경 보장 대상)# 운전석 계기·인터페이스 렌즈 — 구현 스펙 v2

전제 확인(코드 실측): 대시는 `.ktx-cab-dash` height 34% + `cabDashSvg` viewBox 1000×240(`xMidYMax slice` → 상단 ~67유닛 크롭되는 버그성 왜곡 있음), 속도는 DOM `.ktx-speed-number` 숫자만, 레버는 정적 rect+circle, 게이지는 `distanceGauge()` 0~5를 흰 점 5개에 매핑. held 키는 `state.ktxHeld`(app.mjs:165)에 있으나 씬에 전달 안 됨. 씬 DOM을 참조하는 테스트는 없음(전수 grep — `tests/ktx-journey.test.mjs`는 모델만) → 대시 DOM 전면 재구성은 테스트 안전. `distanceGauge` export는 모델 계약이므로 유지, 씬에서만 사용 중단.

핵심 결정 3개: (1) **원형 계기·레버·접근 스트립은 대시 배경 SVG에서 분리해 각자 고정 px 크기의 인라인 SVG DOM 노드로** — 배경은 `preserveAspectRatio="none"`으로 늘려도 되지만 다이얼이 찌그러지면 안 되므로. (2) **대시 높이 34%→28% 축소**(현재 "화면 40% 보라 띠" 문제 해소), 다이얼·레버는 대시 립 위로 살짝 솟는 binnacle 형태. (3) **점 5개 게이지 → "미니 열차가 승강장 그림 위를 미끄러지는" 접근 스트립** — 초록 밴드에 닿으면 ⎵, 그림 자체가 규칙.

---

## A. 레이아웃 스펙 (스테이지 내부 기준, PC 1280×720 전용)

레이어(전부 `.ktx-view-cab`의 absolute 자식, z-index 명시):

| z | 요소 | 위치/크기 |
|---|---|---|
| 1 | `.ktx-cab-backdrop`(기존) | inset 0 0 44% 0 (하늘 확대) |
| 2 | `.ktx-cab-track`(기존) | inset 48% 0 0 0 (풍경 렌즈 소관) |
| 3 | (풍경 props 예약) | — |
| 4 | `.ktx-cab-tunnel`(기존) | inset 0 |
| 5 | `.ktx-cab-frame` **신규** | inset 0, SVG viewBox `0 0 1000 720` `preserveAspectRatio="none"`, pointer-events none |
| 6 | `.ktx-cab-dash` | inset auto 0 0 0, **height 28%**, SVG viewBox `0 0 1000 220` `preserveAspectRatio="none"` |
| 7 | 계기 7종 (아래) | 고정 px |
| 8 | `.ktx-speed-balloon`(기존) | 유지 |

계기 배치(px, 스테이지 내부 ~1248×620 기준):

| 계기 | class | 위치 | 크기 |
|---|---|---|---|
| 전광판 | `.ktx-destboard` | left 50%, translateX(-50%), bottom calc(28% - 23px) — 대시 립에 걸침 | 320×46 |
| 속도계 다이얼 | `.ktx-speedo` | left 50%, translateX(-50%), bottom 10px | 200×200 (viewBox 220×220) |
| 레버 | `.ktx-lever` | right 12px, bottom 8px | 80×180 (viewBox 84×190) |
| 접근 스트립 | `.ktx-approach` | right 108px, bottom 112px | 260×64 |
| 고정속도 필 | `.ktx-cruise-pill` | right 100px, bottom 12px | 110×26 |
| 문 패널 | `.ktx-door-panel` | left 20px, bottom 96px | 120×84 |
| 다음 키 필 | `.ktx-next-key` | left 20px, bottom 12px | 168×54 |

## B. SVG 요소 목록 (ktx-scene-art.mjs 신규/개정 함수)

**`cabFrameSvg(train)` 신규** — "운전석에 앉음" 프레이밍:
- 헤더(천장 립): `path "M0 0 H1000 V34 Q500 56 0 34 Z"` fill `train.nose`
- A필러 좌: `path "M0 0 H62 L20 520 H0 Z"` fill `train.nose` + 안쪽 하이라이트 `path` fill `rgba(255,255,255,.18)` 폭 8; 우측 미러 `"M1000 0 H938 L980 520 H1000 Z"` (520 = 대시 상단 72%×720)
- 유리 모서리 라운드: 4개 quarter-arc path r=26 fill `train.nose`
- 와이퍼: `<g transform="translate(250 520)"><g class="ktx-wiper-arm"><rect x="-3" y="-170" width="6" height="170" rx="3" fill="#31445b"/><rect x="-26" y="-176" width="52" height="8" rx="4" fill="#31445b"/></g></g>` — 평시 CSS `rotate(-24deg)`, 경적 시 1회 스윕(§D)

**`cabDashSvg(train)` 개정** — 배경 판만(계기 도형 전부 제거), viewBox `0 0 1000 220`:
- 립: `path "M0 22 Q500 -14 1000 22 L1000 220 L0 220z"` fill `train.nose`
- 본판: `path "M0 44 Q500 8 1000 44 L1000 220 L0 220z"` fill `train.color`
- 계기 웰 3개 fill `rgba(255,255,255,.16)`: 좌 `rect x=40 y=70 w=250 h=140 rx=24`, 중앙 `circle cx=500 cy=170 r=130`, 우 `rect x=690 y=70 w=270 h=140 rx=24`
- 장난감 디테일: 나사 점 `circle r=5` fill `train.nose` ×4, 통풍구 `rect 40×6 rx=3` ×3 (그라디언트·필터 금지 규칙 유지)

**`speedoDialSvg()` 신규** — viewBox `0 0 220 220`, 각도 매핑 **`deg(v) = v × 0.8 − 120`** (0→−120°, 150→0°(12시), 300→+120°, 240° 스윕):
- 베젤 `circle cx=110 cy=110 r=106 fill #31445b`, 페이스 `r=94 fill #fff`
- 존 아크(r=84, stroke-width 12, fill none — 경고가 아니라 "빠름 단계", 벌점 없음 톤): 0–150 `#bfe8ff` / 150–250 `#a9df7d` / 250–300 `#f4c542`. 아크 path는 헬퍼로 생성: `polar(r,deg)=(110+r·sin, 110−r·cos)`, `arcPath(r,v1,v2)` (large-arc-flag = 스윕>180°?1:0, sweep-flag=1) — 순수 함수라 단위테스트 가능
- 주 눈금 50 간격 7개: r94→r78, stroke `#31445b` w5 round; 보조 25 간격: r94→r86, `#7d8ea1` w3
- 숫자는 **0/100/200/300만** r=62, font 17 900 `#31445b` (프리리더 클러터 최소화; 50단위는 눈금만)
- 바늘: `<g class="ktx-needle"><path d="M103 120 L110 30 L117 120 L110 132z" fill="#e8564a"/></g>` + 허브 `circle r=11 #31445b` / `r=4.5 #fff`
- 디지털 창(다이얼 하부, 바늘 궤적과 비간섭 실측: ±120° 바늘 끝 (40.7,150)/(179.3,150), 창 x58–162): `rect x=58 y=134 w=104 h=44 rx=10 fill #eaf3fb stroke #31445b stroke-width=3` + `<text class="ktx-speed-number" x="110" y="166" text-anchor="middle" font-size="34" font-weight="900" fill="#31445b">0</text>` + `<text x="110" y="189" font-size="12" fill="#7d8ea1">km/h</text>` — **기존 `.ktx-speed-number` 셀렉터 그대로**라 updateKtxScene의 textContent 갱신 코드 무변경

**`leverSvg()` 신규** — viewBox `0 0 84 190`, 노치 4단(위→아래) **P·D·N·B**, 중심 y = 30/74/112/148:
- 슬롯 `rect x=36 y=14 w=12 h=150 rx=6 fill #31445b`
- 노치 표식 `rect x=20 w=14 h=5 rx=2.5 fill #7d8ea1` ×4 + 글리프(x=62): ▲삼각 `#2fa25c`(P) / ▶삼각 `#5aa9e6`(D=달림·크루즈) / ●원 r5 `#7d8ea1`(N) / ▼삼각 `#e8564a`(B); 각 글리프 뒤 halo `circle r=11 fill #fff opacity 0` class `ktx-halo-p/d/n/b`
- 손잡이 `<g class="ktx-lever-knob"><circle cx="42" cy="0" r="19" fill="#f4c542" stroke="#fff" stroke-width="4"/><rect x="34" y="-4" width="16" height="3" fill="#31445b" opacity=".4"/><rect x="34" y="2" width="16" height="3" fill="#31445b" opacity=".4"/></g>`

**`approachStripSvg(trainColor)` 신규** — viewBox `0 0 260 64`, 스케일 **1.3833px/m** (d 120m→0 = 166px):
- 선로 `rect y=46 h=6 w=260 rx=3 fill #8d95a0` + 침목 `line dasharray 4 10 #cfc3ad`
- ⭐⭐ press밴드 `rect x=162 y=54 w=48 h=8 rx=4 fill #a9df7d`, 그 위 ⭐⭐⭐ 밴드 `rect x=182 w=28 fill #2fa25c` — **press 창 기준**(35km/h 활강 9.6m 반영: d∈[0,20]에서 누르면 3별) → "초록에 닿으면 ⎵"가 문자 그대로 승리 조작. ARM 40m(x=155)와 연한 밴드 시작 161이 정합
- 승강장 `rect x=196 y=18 w=58 h=28 rx=6 fill #f4c542` + 상면 흰선; 기존 DOM `.ktx-palm`("✋")을 이 스트립 위 right 18px top -8px로 이설 — 기존 `[data-armed] .ktx-palm` blink 규칙 재사용
- 미니 열차 `<g class="ktx-mini"><g transform="translate(0 26)"><rect width="44" height="20" rx="9" fill="${trainColor}"/><path d="M44 26 Q56 22 56 10 Q56 2 44 2 z" fill="${trainColor}"/><circle cx="12" cy="20" r="4" fill="#31445b"/><circle cx="34" cy="20" r="4" fill="#31445b"/></g></g>` — 코 끝 로컬 x=56, 목표 x=210(✋)

**`doorPanelSvg()` 신규** — viewBox `0 0 120 84`: 램프 `circle (60,12) r=8` + glow링 `r=13 opacity .35`(open만), 문틀 `rect x=34 y=26 w=52 h=50 rx=6 fill #31445b`, 내부 초록판 `rect x=37 y=29 w=46 h=44 fill #2fa25c`, 문짝 `rect.ktx-door-leaf-l x=37 y=29 w=23 h=44 fill #dce6f0` + `-r x=60`

**DOM 전용**: `.ktx-destboard`(div, bg `#31445b` r12 border 3px #fff, 텍스트 `#f4c542` 22px 900 + `.ktx-dest-dot` 8px 초록 점), `.ktx-next-key`(div: `<kbd>` 44×34 흰 배경 3px INK 테두리 + `<span class="ktx-next-word">` 16px 900), `.ktx-cruise-pill`(div, border 2px `#7d8ea1`, bg `#eaf3fb`, 15px 900 INK)

## C. 상태→시각 매핑 표

| 모델 상태 | data 속성/변수 | 시각 |
|---|---|---|
| `state.v` | `--needle-deg = v·0.8−120` (틱당 최대 ±4.8° — 150ms 보간으로 연속) | 바늘 회전 + 디지털 숫자 |
| held.up ∨ (assist ∧ v<80) | `data-lever="power"` → `--lever-y:30px` | 손잡이 P, ▲halo on |
| driving ∧ !held ∧ v>0.5 | `"cruise"` → `--lever-y:74px` | 손잡이 D + **크루즈 필 "고정속도 {v}"** 표시 — "놓아도 달린다"의 시각화 |
| held.down ∨ phase stopping/correcting | `"brake"` → `--lever-y:148px` | 손잡이 B — ⎵ 정차 시 **레버가 스스로 B로 내려가** 브레이크=레버 연상 학습 |
| 그 외 | `"neutral"` → `112px` | 손잡이 N |
| `zoneEntered ∧ phase∈{driving,stopping,correcting}` | `data-zone="true"` | 접근 스트립 fade-in(opacity+translateY 8px, .3s); **비필수 계기 감쇠** `[data-zone="true"] .ktx-destboard,.ktx-door-panel{opacity:.45}` — 시선 깔때기 |
| `distanceToMarker(state)` = d | `--approach-px = 154 − 1.3833·clamp(d,0,120)` px | 미니 열차 translateX, d=0에서 코가 ✋ 정합 |
| `state.armed` | 기존 `data-armed` | ✋ blink(기존 규칙) + ⭐⭐⭐ 밴드 `ktx-here-blink` 재사용; 이때 전광판 점은 `animation:none` (**동시 blink 1개 규칙**) |
| `state.doors` | 기존 `data-doors` | open: 문짝 `translateX(∓9px)` (.5s ease), 램프 `#2fa25c`+glow링 |
| phase/queue | `data-hint` | next-key 필: boarding·queue>0 →`⎵ 태우기` / queue=0 →`⎵ 문닫기` / ready →**`↑ 출발!`**(UX함정 해소 핵심) / driving·!zone →`⎵ 빵빵`(dim) / armed →`⎵ 딱 멈추기`(bg `#f4c542`+blink) / stopped →`⎵ 문열기` / stopping·finale → 숨김 |
| phase→전광판 | textContent | boarding `여기는 {station}` / ready `{to} 출발 준비` / driving·stopping `다음역 ▶ {to}` (`KTX_SEGMENTS[segIndex].to`) / stopped `{station} 도착` / finale `종착역 부산`; 점은 driving만 blink |
| `events: horn` | pulse `ktx-cab-horn`(root) + `ktx-key-flash`(필) | 와이퍼 1회 스윕 `@keyframes ktx-wipe{0%{transform:rotate(-24deg)}45%{transform:rotate(-96deg)}100%{transform:rotate(-24deg)}}` .7s |
| `events: milestone` | 기존 `ktx-speed-pop` | svg text에 `transform-box:fill-box; transform-origin:center` 추가해 scale 애니 유지 |

## D. 모델↔CSS 동기화 (rAF 0, 150ms 틱 + transition — 기존 이디엄 준수)

1. **`updateKtxScene(root, state, view, events, held = {})`** — 5번째 옵셔널 파라미터 추가(기존 호출부·테스트 호환). 내부 추가 코드(속도 숫자 갱신 옆):
```js
const dial = root.querySelector(".ktx-speedo");
dial.style.setProperty("--needle-deg", `${speed * 0.8 - 120}deg`);
root.dataset.lever = leverPosition(state, held);   // 순수함수, §C 규칙
const inZone = state.zoneEntered && ["driving","stopping","correcting"].includes(state.phase);
root.dataset.zone = String(inZone);
if (inZone) {
  const d = Math.max(0, Math.min(120, distanceToMarker(state)));
  root.querySelector(".ktx-approach").style.setProperty("--approach-px", `${(154 - 1.3833 * d).toFixed(1)}px`);
}
```
2. CSS 보간(전부 transform/opacity만):
```css
.ktx-needle { transform: rotate(var(--needle-deg,-120deg)); transform-box: view-box; transform-origin: 50% 50%; transition: transform .16s linear; }
.ktx-lever-knob { transform: translateY(var(--lever-y,112px)); transition: transform .18s cubic-bezier(.3,1.4,.6,1); } /* 노치 "철컥" 오버슛 */
.ktx-mini { transform: translateX(var(--approach-px,-12px)); transition: transform .16s linear; }
.ktx-game[data-lever="power"]  { --lever-y: 30px; }  /* cruise 74 / neutral 112 / brake 148 */
```
3. **app.mjs**: `scheduleKtxTick`·`moveKtxSpace`의 updateKtxScene 호출 2곳에 `state.ktxHeld` 전달 + ArrowUp/Down keydown·keyup 핸들러에서 `ktxHeld` 변경 직후 `updateKtxScene(state.ktxScene, state.ktx, state.ktxView, [], state.ktxHeld)` 1회 즉시 호출(레버 0-지연 반응).
4. `prefers-reduced-motion: reduce`: `.ktx-needle,.ktx-lever-knob,.ktx-mini{transition:none}` + `.ktx-palm,.ktx-approach .ktx-band3,.ktx-next-key,.ktx-dest-dot,.ktx-wiper-arm{animation:none}`.

## E. 가독성 규칙 (4~6세)

- 최소 크기: 디지털 숫자 ≥30px 실측(34 svg유닛×0.91), 바늘 길이 80유닛(≈73px), 존 아크 폭 12, 레버 손잡이 r19, 터치 없음(표시 전용)이라 44px 규칙 비적용.
- 정보 우선순위: ① 바늘+디지털(중앙) ② 접근 스트립+✋(존에서만 등장 — 평시 0개 클러터) ③ next-key 필(다음 올바른 키 1개만) ④ 전광판 ⑤ 문 ⑥ 레버. 동시 blink 최대 1개.
- 대비: 텍스트는 항상 `#31445b`↔`#fff/#eaf3fb`(≥7:1) 또는 `#f4c542`↔`#31445b`(≈7.4:1). `#f4c542`를 흰 바탕 텍스트로 쓰지 않음.
- 톤: 신규 색 0 — 전부 기존 팔레트(INK/PAPER/RAIL + pop 3색 + 하늘 파스텔). "진짜 운전대" 느낌은 색이 아니라 웰·베젤·노치·나사 같은 형태 디테일로.

## F. 파일별 변경 목록

- `src/ktx-scene-art.mjs`: `cabDashSvg` 개정, `cabFrameSvg`·`speedoDialSvg`·`leverSvg`·`approachStripSvg`·`doorPanelSvg`·`polar`·`arcPath` 신규
- `src/ktx-scene.mjs`: `buildCabView`에서 gauge/palm/door-lamp DOM 교체(§A 7계기), `updateKtxScene` held 파라미터+§D 동기화, `leverPosition` 신규, `distanceGauge` import 제거(모델 export는 유지)
- `src/app.mjs`: updateKtxScene 호출 2곳 held 전달 + 화살표 keydown/keyup 즉시 동기화 1줄
- `styles.css` body[data-mode="ktx"] 블록: 대시 28%, 계기 7종 포지션, 레버/바늘/미니열차 transition, data-lever·data-zone·data-hint 매핑, reduced-motion
- 모델(`ktx-journey.mjs`)·테스트 무변경 — 계약 21개 그대로 통과스펙 확정 — 소스 5개(ktx-scene-art/ktx-scene/ktx-journey/ktx-route-data/app.mjs ktx블록, styles.css 5940~6535) 실측 기반. 씬 DOM 계약 테스트는 없음을 grep으로 확인(모델 21개만 고정) — 씬·CSS는 자유, 모델은 최소 추가만.

# 바깥 뷰 + 역·승하차 연출 v2 구현 스펙

## 0. 레이어 스택 (`.ktx-view-side` 내부 z-index — 전부 신설 명시)

| z | 요소 | 이동 배율(×worldPx) | 루프 주기 |
|---|------|----|----|
| 0 | `.ktx-side-backdrop` (하늘, 기존 크로스페이드) | 0 | — |
| 1 | `.ktx-env-land` 원경 (기존) | **0.12** (현 0.18에서 하향 — 원근 대비 강화) | 1000px |
| 2 | `.ktx-side-mid` **신설** 중경 실루엣 | 0.45 | 1000px |
| 3 | `.ktx-side-ground` (기존) | 1.0 | 240px |
| 5 | `.ktx-platform` | --platform-x (기존) | — |
| 6 | `.ktx-oncoming` **신설** 교행 열차 | CSS keyframe | — |
| 7 | `.ktx-side-train` | 고정 | — |
| 8 | `.ktx-side-near` **신설** 전신주(전경, 열차 앞) | **1.6** | 480px |
| 9 | `.ktx-queue` | --platform-x+316px (기존) | — |
| 10 | `.ktx-walker-host` **신설** 탑승 워커 | keyframe | — |
| 11 | `.ktx-speed-streaks` **신설** 속도선 | background-position | 640px |

동기화는 기존 이디엄 그대로: `updateKtxScene`에서 `setLoop(node, worldPx * ratio, period)` 호출 2줄 추가(mid·near). transition `.16s linear`가 150ms 틱 사이를 보간, 감김 점프는 기존 `data-no-transition` 재사용.

## 1. sideTrainSvg v2 — KTX 실루엣 (계약 유지)

**유지 계약**: `.ktx-window-slot[data-slot=0..7]` g + 내부 rect, scene JS가 62×52 `<image class="ktx-window-face">`를 append. 클래스명·슬롯 수 8·순서 불변.

viewBox `0 0 1200 170`, `preserveAspectRatio="xMidYMid meet"`. 구성(앞→뒤):

```
전두부(0~300): 긴 유선형 노즈
  <path d="M8 132 C10 92 28 66 96 52 L300 44 L300 132Z" fill={train.color}/>
  <path d="M8 132 C9 110 20 96 52 90 L300 90 L300 132Z" fill={train.nose}/>   ← 하부 컬러밴드
  운전석 창(경사): <path d="M150 88 L166 56 L238 52 L238 88Z" fill="#dff0fb"/>
  헤드라이트: <circle cx="26" cy="104" r="7" fill="#fdf3d0"/>
팬터그래프(동력차 지붕):
  <g class="ktx-panto"><rect x="196" y="40" width="70" height="6" rx="3" fill={train.nose}/>
  <path d="M208 40 L228 22 L248 40" fill="none" stroke="#31445b" stroke-width="4"/>
  <rect x="216" y="18" width="44" height="4" rx="2" fill="#31445b"/></g>
객차 4량(연속 차체): carX = 300 + i*208, 폭 200, i=0..3
  차체: <rect x={carX} y="44" width="200" height="74" rx="4" fill={train.color}/>  ← rx 4로 각지게(연속감)
  창문 띠(연속): <rect x={carX} y="52" width="200" height="56" fill={train.nose} opacity=".18"/>
  창 슬롯 2개/량: translate(carX+20, 54) / translate(carX+92, 54) — rect 62×52 rx8 #dff0fb
  창 글로우(신설, 슬롯 내부): <rect class="ktx-window-glow" width="62" height="52" rx="8" fill="#fff7cf" opacity="0"/>
  출입문(량당 1, 오른끝): §5 참조, translate(carX+156, 52)
관절 연결부(량 사이 gap 8): x=500/708/916
  <rect x={jx} y="56" width="8" height="62" rx="3" fill="#2a3648"/>
  <rect x={jx-2} y="56" width="12" height="6" rx="3" fill="#4a5a72"/>  ← 고무 주름 상단
후미(1124~1192): 전두부 미러 노즈(KTX-산천처럼 양쪽 노즈 — 실루엣 완성)
  <path d="M1192 132 C1190 92 1172 66 1104 52 L1124 44 L1124 132Z" ...>(전두부 path 미러)
하부 스커트: 량마다 <rect x={carX} y="108" width="200" height="26" fill={train.nose}/> (노즈·후미는 path에 포함)
바퀴(자코브스 대차 — 량 경계 공유가 KTX 특징): cx = 70,130 | 504,712,920 | 1100,1160, cy=140, r=14
  <g class="ktx-wheel" transform="translate(cx 140)"><circle r="14" fill="#31445b"/>
  <circle r="5" fill="#8d95a0"/><rect x="-12" y="-2" width="24" height="4" rx="2" fill="#8d95a0"/></g>  ← 스포크
레일: <rect x="0" y="156" width="1200" height="6" rx="3" fill="#8d95a0"/>
```

바퀴 회전(CSS만):
```css
.ktx-wheel { transform-box: fill-box; transform-origin: center; }
.ktx-game[data-moving="true"] .ktx-wheel { animation: ktx-wheel-spin var(--wheel-period, 1s) linear infinite; }
@keyframes ktx-wheel-spin { to { transform: rotate(1turn); } }
```
`transform` 속성 대신 CSS transform이 g에 걸리도록 `translate`는 부모 g로 분리(`<g transform="translate(..)"><g class="ktx-wheel">…`).

## 2. 속도감 — speed-tier + 패럴랙스 + 속도선

**씬 전용 추가(모델 변경 0)**: `updateKtxScene`에서
```js
const tier = state.v === 0 ? 0 : Math.min(5, Math.ceil(state.v / 60));
root.dataset.speedTier = String(tier);
```

CSS 변수 맵:
```css
.ktx-game[data-speed-tier="1"] { --wheel-period: 1.1s; --streak-op: 0; }
.ktx-game[data-speed-tier="2"] { --wheel-period: .7s;  --streak-op: 0; }
.ktx-game[data-speed-tier="3"] { --wheel-period: .45s; --streak-op: 0; }
.ktx-game[data-speed-tier="4"] { --wheel-period: .3s;  --streak-op: .45; --streak-dur: .6s; }
.ktx-game[data-speed-tier="5"] { --wheel-period: .22s; --streak-op: .75; --streak-dur: .4s; }
```

**중경 `.ktx-side-mid`** (신설 SVG, landStrip처럼 2배폭 이음): 낮은 언덕 path + 집 3채 + **간이역 실루엣 1개**(지붕 60×10 + 기둥 2 + 미니 승강장 — "역 통과" 풍경을 모델 변경 없이 표현). 단색 `#7fa06b` opacity .55, 밤에는 `[data-sky="night"]`로 `#3d4a3a`.

**전경 `.ktx-side-near`** (신설, 열차 **앞** z8 — 스쳐 지나가는 오클루전이 최고 속도 큐): 480px 주기 SVG 스트립(2배폭 960). 전신주: 마스트 `<rect x="20" y="0" width="10" height="88%">` + 팔 `<rect x="20" y="24" width="52" height="6">` + 애자 원 2개, 급전선 `<line y1="12" y2="12">` 전체 폭(루프 경계 연속). 사이에 가로수 원 1개. 색 `#5b6b81` opacity .9. **정차 근접 시 숨김**: `.ktx-view-side[data-near-stop="true"] .ktx-side-near { opacity: 0; transition: opacity .5s; }` (승하차 안 가림).

**속도선 `.ktx-speed-streaks`** (신설 div, inset `0 0 30% 0`):
```css
background: repeating-linear-gradient(100deg,
  transparent 0 140px, rgba(255,255,255,.55) 140px 188px, transparent 188px 320px);
background-size: 640px 100%;
opacity: var(--streak-op, 0); transition: opacity .4s;
animation: ktx-streaks var(--streak-dur, .6s) linear infinite;
@keyframes ktx-streaks { to { background-position: -640px 0; } }
```
background-position 애니메이션 — 허용 속성 준수.

## 3. 승강장 재건축 (--platform-x 메커니즘 위, 클래스 계약 유지)

`.ktx-platform`(480px, bottom 24%) 내부를 재구성. **JS가 만지는 `.ktx-platform-name`·`.ktx-stop-marker`는 클래스 유지.**

```
.ktx-platform-roof    : absolute; top:-172px; left:36px; width:408px; height:16px;
                        border-radius:8px; background:#fff; border-bottom:6px solid #9fb0c2;
.ktx-platform-pillar×3: left 80/240/400px; top:-156px; width:12px; height:156px;
                        border-radius:6px; background:#cfd9e4;
.ktx-platform-sign    : top:-150px(지붕에 매달림); left:300px; 흰 배경 #fff, 글자 #31445b 22px/900,
                        border-bottom:6px solid #2fa25c; ::before로 매달림 막대 2개(4×14px #8d95a0)
.ktx-platform-clock   : left:150px; top:-150px; 34px 원 #fff border 3px #31445b;
                        ::before 시침(고정 rotate(65deg)), ::after 분침 animation: 60s linear infinite rotate
.ktx-stop-marker      : 기존 left:254px 유지(±0 — 마커 px 근거 그대로), 지붕에서 내려오는 기둥 ::after 유지,
                        ::before 신설 — 바닥 정차위치 표시: 아래로 점선(border-left:4px dashed #f4c542)
데크(::before 대체)    : height:26px; 상단 8px가 노란 안전선 —
                        background: linear-gradient(#0000 0 0) , repeating-linear-gradient(90deg,
                          #f4c542 0 26px, #fff 26px 34px) top/100% 8px no-repeat, #dce6f0;
.ktx-platform-bench×2 : 40×14px #b98a5a rounded, left 120/360px
```
밤: 기존 `[data-sky="night"]` 훅으로 데크 `#8d8272`, 지붕 아래 램프 3개(pillar ::before, `#fdf3d0` + opacity 애니 없음).

## 4. 승하차 안무 — 타임라인 (BOARD_LOCK_MS=1200 정합)

**기하 상수(고정 — PC 1280×720 전용 범위)**: 정차 중 `--platform-x = 200-270 = -70px` 상수(driving 아님 → distance 0, 코드 확인). 대기열 머리 = -70+316 = **246px**. 탑승문(1호차 오른끝 문, svg x≈462 × 스케일 0.6125 + left 3%) ≈ **320px** → 워커 이동 delta **74px 상수**. 키프레임에 하드코딩 가능.

**DOM**: `buildSideView`에 `.ktx-walker-host`(absolute; left:calc(var(--platform-x) + 316px); bottom:calc(24% + 6px); z:10) 추가. `boarded` 이벤트 시 `host.replaceChildren(outerDiv(passengerImg))` — 연타 시 이전 워커 교체(대기열이 진실 원본이라 안전).

**타임라인(ms), Space 누른 t=0 기준**:

| t | 무엇 | 구현 |
|---|------|------|
| 0 | pop 사운드 + 서수 음성(기존) · 대기열 앞줄 당김 | `updateQueue`를 재생성→**diff 갱신**으로 변경: number 키로 노드 유지, `--queue-index`만 감소 → `transition: transform .3s ease` 로 스르륵 전진 |
| 0–520 | 워커 걷기 74px | 외곽 div: `animation: ktx-walk-x 780ms ease-in forwards` (0%{tx:0} 66%{tx:74px;opacity:1} 100%{tx:74px;scale:.55;opacity:0}) |
| 0–520 | 걷기 바운스 | 내부 img: `animation: ktx-walk-hop 130ms ease-in-out 4` (50%{ty:-7px}) |
| 520–780 | 문으로 흡입 | 외곽 keyframe 66→100% 구간(scale .55 + fade) |
| 300–1300 | 세기 팝(기존 ktx-board-in 1s) | `animation-delay: 300ms` 추가 — 걷기가 먼저 읽힘 |
| 630–900 | 창문 얼굴 점등 | `.ktx-window-face { animation: ktx-face-in 900ms both; }` (0%,70%{opacity:0} 100%{opacity:1}) — updateWindows가 append하는 순간 자동 시작, JS 타이머 0 |
| 700–1100 | 창 글로우 펄스 | `.ktx-window-slot [data-filled] 변화 시… ` → 간단히 `.ktx-window-glow { animation: ktx-glow 400ms 700ms both; }` (50%{opacity:.9}) — face와 같은 슬롯에 프리베이크된 rect |

마지막 승객: 걷기 780ms < lockMs 1200 안에 완결. all-aboard 힌트(t=0)는 텍스트라 겹쳐도 무해.

## 5. 문 연출

SVG 문 그룹(량당 1, §1 좌표):
```
<g class="ktx-door" transform="translate(carX+156 52)">
  <rect width="36" height="76" rx="6" fill={train.nose}/>            ← 프레임
  <rect class="ktx-door-interior" x="2" y="3" width="32" height="70" rx="4" fill="#2a3648"/>
  <g class="ktx-door-leaf ktx-door-leaf-l"><rect x="1" y="3" width="17" height="70" rx="4" fill="#cfe3f5"/></g>
  <g class="ktx-door-leaf ktx-door-leaf-r"><rect x="18" y="3" width="17" height="70" rx="4" fill="#cfe3f5"/></g>
  <circle class="ktx-door-warnlamp" cx="18" cy="-8" r="5" fill="#e8564a" opacity="0"/>
</g>
```
```css
.ktx-door-leaf { transform-box: fill-box; transition: transform .5s ease .1s; }
.ktx-game[data-doors="open"] .ktx-door-leaf-l { transform: translateX(-13px); }
.ktx-game[data-doors="open"] .ktx-door-leaf-r { transform: translateX(13px); }
/* 닫힘 예고 점멸 (2Hz) */
.ktx-game[data-door-warning="true"] .ktx-door-warnlamp { animation: ktx-warn .5s step-end infinite; }
@keyframes ktx-warn { 0%{opacity:1} 50%{opacity:0} }
/* 운전실 문 램프도 동조 — 뷰 어디서든 예고가 보인다 */
.ktx-game[data-door-warning="true"] .ktx-door-lamp { background:#e8564a; animation: ktx-warn .5s step-end infinite; }
```
개폐 사운드는 기존 doors-open/doors-closed 이벤트의 `audio.playSfx("door")` 그대로. 예고 비프는 §6 카운트다운 이벤트에 `audio.playSfx("key")` 1회/초.

## 6. 마지막 승객 후 문 닫기 함정 — 모델 최소 추가 (확정 목록)

**추가 상수**: `DOOR_COUNTDOWN_MS = 4000` (ktx-journey.mjs).
**추가 상태 필드**: `doorCountdownMs: null` (createKtxJourney).
**추가 이벤트 2종 + 분기 1개**:

1. `{ type: "door-countdown-start", ms: 4000 }` — tickKtx boarding 분기에서 `queue.length===0 && lockMs===0 && doorCountdownMs===null`일 때 세팅과 함께 1회.
2. `{ type: "door-countdown", secondsLeft }` — 1000ms 경계 넘을 때마다(4→3→2→1). 앱: 비프 + 힌트 "곧 출발! 3, 2, 1". 씬: `root.dataset.doorWarning = String(state.doorCountdownMs != null)` + `.ktx-door-countdown` 숫자 오버레이(문 위 46px/900, 초마다 ktx-pop).
3. 카운트다운 0 → `closeDoors(state, events)` + `{type:"auto", what:"doors-closed"}` (기존 이벤트 재사용, 신규 타입 없음).
4. **↑ 지름길**: 같은 boarding-빈-대기열 분기에서 `held.up`이면 즉시 `closeDoors` — 다음 틱 ready에서 기존 로직이 ↑로 depart. 아이가 "타자마자 ↑"를 눌러도 2틱(300ms) 안에 출발. 신규 이벤트 타입 불필요.
5. Space 즉시 닫기(기존 pressKtxSpace 경로) 유지 — 카운트다운은 `closeDoors`가 phase를 바꾸므로 자연 소멸(doorCountdownMs는 openDoors에서 null 리셋).

주의: 기존 12s `ASSIST_IDLE_MS` 자동 닫힘 분기는 4s 카운트다운이 먼저 발화해 사실상 사문화 — 삭제하되, **tests/ktx-journey.test.mjs 21개 중 무진행 진행 보장 테스트가 12s 타이밍을 핀하는지 구현 시 먼저 확인**(4s < 12s라 "언젠가 닫힌다" 계열은 통과, 정확 시각 핀이면 기대값 갱신).

## 7. 카메라 컷 정합

- **정차 컷(stopped→side)**: 기존 유지. 승강장 슬라이드·문 열림·안무 전부 side에서 진행 — 충돌 없음.
- **출발 컷(depart→cab)**: 현행 즉시 전환을 **900ms 지연**으로. app.mjs depart 분기에서
  `schedule(() => { if (state.mode === "ktx" && state.ktx) { state.ktxView = "cab"; updateKtxScene(state.ktxScene, state.ktx, "cab", []); } }, 900);`
  기존 schedule 타이머 인프라 사용(rAF 아님). 효과: 문 닫힌 열차가 움직이기 시작하는 것(ground·near 레이어 가속)을 900ms 보고 → 250ms 크로스페이드로 운전석 착석. 아이가 그 사이 1/3키를 누르면 switchKtxView 쿨다운(400ms)이 있으므로 지연 콜백이 덮어써도 플리커 없음 — 콜백에서 `state.ktxPicking` 아님만 확인.
- 카운트다운 중 아이가 cab 뷰여도 §5의 운전실 문 램프 점멸 + HUD 힌트로 예고 전달.

## 8. 교행·역 통과

- **교행(passing, 모델에 이미 존재 — 시각만 재건)**: 이벤트 스테이지의 정적 스프라이트 폐기. 신설 `.ktx-oncoming`(absolute; bottom:44%; width:52%; z:6 — 자기 열차 뒤, 중경 앞): 초록 `#2fa25c` 미러 열차 스트립(§1 축약 3량판, viewBox 0 0 760 100).
  ```css
  .ktx-game[data-land] .ktx-oncoming { opacity: 0; }
  .ktx-event-stage[data-event="passing"] ~ … /* 대신 */
  .ktx-game[data-event="passing"] .ktx-oncoming { opacity: 1; animation: ktx-oncoming 5.5s linear infinite; }
  @keyframes ktx-oncoming {
    0%   { transform: translateX(120vw) scaleX(-1); }
    38%  { transform: translateX(-120vw) scaleX(-1); }
    100% { transform: translateX(120vw) scaleX(-1); } /* 38~100%는 화면 밖 대기 */
  }
  ```
  씬에서 `root.dataset.event = eventKey` 1줄 추가(현재 stageHost에만 있음). 상대속도 체감: 2.1초 스윕이 자기 패럴랙스와 합쳐져 "쌩" 하고 지나감. 경적 상호작용은 기존 horn 이벤트 그대로.
- **역 통과**: 모델 이벤트 없음 — §2 중경 스트립에 구운 간이역 실루엣이 1000px마다 스쳐가는 것으로 표현(모델 변경 0, 추가 비용 0).

## 9. reduced-motion / 성능

`@media (prefers-reduced-motion: reduce)`에 추가: `.ktx-wheel, .ktx-speed-streaks, .ktx-oncoming, .ktx-walk-hop적용 img, .ktx-door-countdown, .ktx-warn적용 요소 { animation: none; }` · 워커는 외곽 keyframe 대신 opacity fade 300ms만(도착 즉시 배치) · `.ktx-side-near/mid { transition: none; }`. 전 신설 애니메이션이 transform/opacity/background-position만 사용 — 리플로 0. 신설 노드 수: mid/near/streaks/oncoming/walker-host 5개 + 승강장 정적 자식 ~8개 — 150ms 틱당 추가 스타일 쓰기는 setLoop 2회뿐.

## 파일 터치 목록

- `src/ktx-scene-art.mjs`: sideTrainSvg 재작성(§1·§5), midStripSvg/nearStripSvg/oncomingTrainSvg 신설, passing eventSpriteSvg 제거
- `src/ktx-scene.mjs`: buildSideView에 신설 레이어 5개, updateKtxScene에 speedTier·doorWarning·data-event·setLoop 2회·walker 스폰·updateQueue diff화
- `src/ktx-journey.mjs`: §6 모델 추가(상수 1, 필드 1, 이벤트 2종, held.up 분기 1)
- `src/app.mjs`: depart 컷 900ms 지연 1줄, door-countdown 이벤트 비프·힌트 분기
- `styles.css` ktx 블록: §0~§9 CSS (기존 계약 셀렉터 유지)## 렌즈 판정: 4~6세 경험 보호 + 하루의 여정 + 성능

근거 소스 확인: src/ktx-journey.mjs(순수 모델), src/ktx-scene.mjs(프로젝션), src/ktx-scene-art.mjs(SVG), src/ktx-route-data.mjs, styles.css 5940~6535행(ktx 블록), tests/ktx-journey.test.mjs(21개), tests/subway-scene.test.mjs(FakeElement 패턴), tests/safety-route-styles.test.mjs(CSS regex 패턴), src/app.mjs 카메라 컷(1104/1134행).

---

### 1. 사실감의 상한선 — 수치 규칙

| 항목 | 상한 | 근거 |
|---|---|---|
| cab 뷰 동시 가시 "지물 종류" | 7종: 하늘 천체, 원경 land 스트립, 침목 벨트, 레일 2줄, 전차선 기둥, 이벤트 미러 1종, 계기판 | 4세 시각 탐색 폭. 8종째(킬로포스트·표지판·건널목 등)는 기둥과 택일 |
| 동시 기둥(전차선주) | 화면 내 ≤ 3개 (좌2·우1 스태거) | 스침 리듬은 3개면 성립 |
| 연속 이동(매 틱 transform 갱신) 노드 | cab ≤ 6, side ≤ 6 | §5 예산과 연동 |
| 무한 반복 CSS 애니메이션 | 동시 ≤ 3 (✋손바닥, here-dot, 기둥 rush) | |
| 명멸 | 반복 주기 ≥ 0.8s(≤1.25Hz), 동시 점멸 요소 ≤ 2. `animation: * <0.8s * infinite` 전면 금지 (WCAG 2.3.1 여유폭) | 현행 palm 1s·here-blink 1.2s는 통과 |
| 원근 기하 | `perspective ≥ 700px`, 트랙 평면 `rotateX 52~60deg` 고정(주행 중 각도 변화 금지) | 멀미 방지 |
| 카메라 셰이크 | sprint300 1-shot만: translate ±2px, 1.2s, 1회. 상시 진동 금지 | |
| 어두움 | 터널 오버레이 `rgba(20,26,40,.45)` 현행 유지가 최댓값. 대시보드 대면적에 INK(#31445b)보다 어두운 색 금지 | 칙칙함 방지 |
| 교행 열차 | 화면 높이 ≤ 20%, 등장 0.8s ease(급습 금지), 효과음은 기존 horn 계열만 | |
| 색 | 신규 HEX 추가 금지 — SKY/LAND_PALETTES + INK/PAPER/RAIL/TIE 토큰 재조합만. 근경 지물에 #f4c542 금지(§6) | |

**"어느정도 사실감"의 조작적 정의**: 사실감은 ①원근 수렴 ②지물 스침 ③시차 3개 채널로만 올린다. 텍스처·그림자·그라디언트·입자로 올리는 사실감은 전부 상한 초과.

---

### 2. "하루의 여정" 아크 보존 — 원근 뷰에서의 팔레트 적용

**핵심 판정: 3D는 트랙 평면에만 국한하고, sky/land 크로스페이드 시스템은 한 줄도 안 바꾼다.** 전체 씬을 3D 공간에 넣는 제안은 거부(§거부권 2).

```
.ktx-view-cab
├ .ktx-cab-backdrop  (inset:0 0 52% 0)  ← 기존 sky 5장 동시 마운트 그대로
│ └ .ktx-cab-horizon (height:26%)       ← 기존 land 6장 스트립 그대로 (translateX 시차)
├ .ktx-cab-world     (inset:44% 0 30% 0; perspective:900px; perspective-origin:50% 0)
│ └ .ktx-track-plane (rotateX(57deg); transform-origin:50% 0)
│   ├ .ktx-tie-belt  ← §5의 합성 벨트
│   └ .ktx-rail ×2   ← 정적, perspective가 수렴을 공짜로 만든다
└ … (기둥·이벤트·대시는 §3, §5)
```

지면 색은 CSS 변수로 승격해 밴드 스왑에 편승:

```css
.ktx-game[data-land="city"]     { --ktx-ground:#b8c6b2; }
.ktx-game[data-land="field"]    { --ktx-ground:#a9df7d; }
.ktx-game[data-land="river"]    { --ktx-ground:#a9df7d; }
.ktx-game[data-land="mountain"] { --ktx-ground:#7b8a74; }
.ktx-game[data-land="tunnel"]   { --ktx-ground:#3a4152; }
.ktx-game[data-land="sea"]      { --ktx-ground:#e8d9a8; }  /* 모래 */
.ktx-game[data-sky="night"]     { --ktx-ground:#4e6247; --ktx-tie:#4d4335; --ktx-ballast:#8d8272; }
.ktx-game[data-sky="sunset"]    { --ktx-ground:#8fbf6d; }
.ktx-game[data-sky="dawn"]      { --ktx-ground:#9ccf7e; }
.ktx-ground-plane { fill: var(--ktx-ground,#a9df7d); transition: fill 1.5s ease; }
```

선언 순서상 sky 규칙을 land 규칙 뒤에 두어 밤이 이긴다(동률 특이성). fill/배경색 transition은 밴드 전환 때만 1.5s 리페인트 — 연속 리페인트 아님, 허용. 신규 지물(기둥) 실루엣은 **INK 단색 고정**으로 밤낮 오버라이드 표 폭발을 원천 차단. 터널 밴드에서는 기둥 숨김: `.ktx-game[data-land="tunnel"] .ktx-poles { opacity:0; transition:opacity .6s; }` — 터널은 기존 cab-tunnel 오버레이+램프가 전담.

**검증 게이트**: 대전→대구 구간(sunset→night→tunnel→night) 1280×720 스크린샷 4장으로 아크 육안 확인 — 기존 밴드 테스트("배경 밴드가 진행률에 따라 바뀌고…")는 모델 쪽이라 자동 유지.

---

### 3. 마법 순간 보존 체크리스트 (새 뷰 좌표까지)

| 순간 | 현재 계약 | 새 뷰에서의 위치·스펙 |
|---|---|---|
| 경적 응답 (베이스라인 magpie/scarecrow/wave 로테이션 + 이벤트 duck/gull/cow/passing 3단 에스컬레이션) | `pressKtxSpace` horn 이벤트 → side `.ktx-event-stage` data-horn-level + 펄스 | **cab 미러 무대 신설**: `.ktx-cab-event` — `position:absolute; left:5%; bottom:34%; width:220px; z-index:4`. side와 같은 `eventSpriteSvg` innerHTML 스왑(같은 data-event 키 비교), `pulse()`를 양쪽 호스트에 호출. 운전실에서 경적 눌러도 응답이 **보인다** — 이게 v2에서 반드시 얻어야 할 개선 |
| 300km/h 스프린트 | milestone 이벤트 → speedo pop + balloon pop | 풍선 위치 유지(top 16% / right 18%). 추가 허용은 1-shot 셰이크(±2px, 1.2s)뿐. `balloonOn` 조건에 `&& !state.zoneEntered` 추가(§6) |
| 별 판정 손바닥 ✋ | `data-armed` → `.ktx-palm` opacity 1 + 1s blink | 새 계기판에서도 **속도계 우측, 게이지 끝** 동일 상대 위치. blink 주기 1s 유지(§1 통과). armed 순간 다른 신규 등장 요소 0 |
| 큰 손님 "백!" | boarded 이벤트 guest → `.ktx-board-pop[data-guest]` 빨강 카운트 | root 직속이라 뷰 개편과 독립. 대시 높이 ≤ 34% 유지 시 팝(top 22%, 높이 ~150px)과 비충돌 — 대시를 34% 초과로 키우는 제안은 이 팝을 가리므로 거부 |
| 피날레 춤 | finale 이벤트 → `.ktx-finale[data-on]` 친구 전원 ktx-toot 춤 | 유지. 단 새 cab 레이어들 위에 오도록 **z-index 5 → 30 상향** 명시 |
| 카메라 컷 | app.mjs: depart→`ktxView="cab"`(1104행), stopped→`"side"`(1134행) | 불변. 뷰 크로스페이드 250ms·전환 쿨다운 400ms 유지 |
| 문 램프 | `data-doors="open"` → 초록+글로우 | 새 대시 SVG에서도 `.ktx-door-lamp` 클래스·data 계약 동일 유지 |

---

### 4. prefers-reduced-motion 전략

원칙: **연속 이동과 무한 반복만 끄고, 상태 전달용 1-shot 전환과 모델 위치 갱신은 살린다.** 판정 가능성(마커 접근 인지)은 이동 애니메이션이 아니라 150ms 스텝 위치 갱신 + 게이지 + 손바닥이 담당하므로 게임은 성립한다.

```css
@media (prefers-reduced-motion: reduce) {
  /* 연속 이동: transition 제거 → 150ms 이산 스텝(저주파, 안전) */
  .ktx-tie-belt, .ktx-env-land, .ktx-side-ground, .ktx-platform, .ktx-queue { transition: none; }
  /* 기둥 rush·모든 무한 반복 정지 */
  .ktx-pole, .ktx-palm, .ktx-plan-stop[data-here="true"] .ktx-plan-dot,
  .ktx-finale-friend { animation: none; }
  /* 침목 흐름 완전 정지(정적 텍스처화) — inline transform을 이기려면 !important */
  .ktx-tie-belt { transform: rotateX(57deg) translateY(0) !important; }
  /* 배경 크로스페이드는 저주파라 유지하되 단축 */
  .ktx-env { transition: opacity .8s ease; }
  /* 속도계 바늘: 스텝 갱신 허용(transition만 제거) */
  .ktx-needle { transition: none; }
}
```

- `--platform-x` 갱신은 **끄지 않는다** — 마커가 스텝으로라도 다가와야 조준이 된다.
- ✋손바닥은 blink만 끄고 opacity 1 표시는 유지(armed 신호 상실 금지).
- 속도감의 대체 채널: 속도 숫자(≥40px) + 마일스톤 음성 + 바늘 각도. 기존 주석("속도감은 숫자와 소리가 담당") 계승.
- 신규 연속 애니메이션 클래스는 **반드시 이 블록에 등록** — §7 스타일 테스트로 강제.

---

### 5. 성능 예산

**핵심 판정: 매 틱 리페인트를 유발하는 연속 애니메이션 0개로 간다. 현행 `.ktx-sleepers`(stroke-dashoffset transition, 풀폭 stroke 820)는 원근 확대 시 리페인트 면적이 화면 절반이 되므로 v2에서 합성 전용 벨트로 교체한다.**

침목 벨트 교체 스펙 (transform만 애니메이션):

```css
.ktx-tie-belt {
  position:absolute; inset:-100% 30% 0;   /* 높이 200% — 루프 여유분 */
  background: repeating-linear-gradient(0deg,
    var(--ktx-tie,#7a6a55) 0 26px, var(--ktx-ballast,#cfc3ad) 26px 96px);
  transform: rotateX(0) translateY(var(--belt-px,0px));  /* 평면은 부모가 회전 */
  transition: transform .16s linear;
  will-change: transform;
}
.ktx-tie-belt[data-no-transition="true"] { transition: none; }
```

모델↔CSS 동기화는 기존 `setLoop` 재사용: `setLoop(belt, worldPx, 96)` → `--belt-px = -wrapped px`, 랩 시 data-no-transition 점프(기존 이디엄 그대로). 그라디언트는 1회 페인트, 이후 전부 합성.

| 예산 항목 | 상한 | v2 추정 |
|---|---|---|
| 준풀사이즈(>50% 뷰포트) 상시 합성 레이어 | 6 | cab: land 활성 1(전환 중 2)+tie-belt 1 = 2~3 / side: ground 1+land 1~2+platform 1 = 3~4 |
| 소형(<300×300px) 상시 레이어 | 8 | 기둥 3, 이벤트 미러 1, queue 1 |
| `will-change` 선언 | **총 3곳**: `.ktx-tie-belt`, 활성 `.ktx-env-land`, `.ktx-side-ground` | 1-shot 펄스(pop/toot/board-in)에는 금지 |
| 매 틱 리페인트 요소 | 0 | dashoffset 폐기로 달성 |
| 동시 마운트 env 레이어 | 22장(sky5+land6 ×2뷰) 동결 — 밴드 종류 추가 금지 | |

숨은 레이어 비용 컷 2건:

```css
/* 비활성 뷰: 페이드 끝나면 합성·페인트 제외 */
.ktx-view { visibility: hidden; transition: opacity .25s ease, visibility 0s linear .25s; }
.ktx-game[data-view="cab"] .ktx-view-cab,
.ktx-game[data-view="side"] .ktx-view-side { visibility: visible; transition: opacity .25s ease; }
/* 비활성 env: opacity 0이어도 transform 갱신을 받으므로 페인트만 차단 */
.ktx-env { visibility: hidden; transition: opacity 1.5s ease, visibility 0s linear 1.5s; }
.ktx-game[data-sky="…"] .ktx-env[data-sky="…"] /* 기존 11개 활성 셀렉터에 */ { visibility: visible; }
```

비활성 land의 `--loop-px` 갱신은 **유지**(활성화 순간 점프 방지 — 크로스페이드 중 두 장이 동시에 보인다). 스타일 프로퍼티 셋은 싸다.

기둥 rush(모델 비동기 앰비언스 — 정밀 동기 불필요):

```css
.ktx-pole { animation: ktx-pole-rush var(--pole-ms,1.6s) linear infinite; }
@keyframes ktx-pole-rush {
  0% { transform: translate3d(0,0,-1300px); opacity:0; }
  12% { opacity:1; }
  100% { transform: translate3d(-90px,40px,140px); opacity:1; }
}
.ktx-game[data-speed-tier="0"] .ktx-pole { animation-play-state: paused; }
/* tier 1~5 → --pole-ms: 2.4s/1.6s/1.1s/.8s/.6s */
```

씬이 `root.dataset.speedTier = String(Math.min(5, Math.ceil(state.v/60)))` 세팅(신규 동기 계약, §7 테스트 대상). 저사양 폴백: **자동 FPS 감지 루프 금지**(rAF 없이는 프로빙 자체가 비용·부정확) — 정적 예산을 낮게 잡는 것으로 갈음한다. 이것이 이 렌즈의 확정 판정.

---### 6. 정보 과부하 방지 — 시선은 정차 타이밍으로

**화면 사분면 계약**: 좌하 = 이벤트 미러 · 우상 = 속도 풍선 · 중하 = 속도계+게이지+✋ · 좌중하 = 문 램프 · 상단 = HUD. 두 개 이상의 신호가 같은 사분면에 동시 등장 금지.

**존 진입 디클러터 시퀀스** (모델 신호 → data 속성 → CSS, 전부 기존 이벤트 재사용):

1. `zone-enter`(마커 320m 전 승강장 등장과 별개, 존=마지막 120m): 씬이 `root.dataset.zone="true"` 세팅(신규) → `.ktx-game[data-zone="true"] .ktx-poles { opacity:.25; transition:opacity .6s; }` — 기둥이 물러난다.
2. 풍선 억제: `balloonOn`에 `&& !state.zoneEntered` 조건 추가(ktx-scene.mjs 366행) — 존 안에서 마일스톤 풍선이 ✋과 경합하지 않는다.
3. 이벤트 스프라이트는 데이터가 이미 보장: 모든 이벤트 `until ≤ 0.95` < 존 시작 진행률(≥0.973). **이 여백을 계약 테스트로 고정**(§7) — 미래에 이벤트를 존까지 끌어넣는 실수 차단.
4. `armed`: 새로 등장·이동 시작하는 요소 0. 유일한 변화 = ✋ blink 시작 + 게이지 감소. 연속 모션(침목·배경)은 유지 — 속도 인지가 판정 재료다.

색 배타 규칙: 마커·게이지의 #f4c542(노랑)는 근경 지물(기둥·표지판·신호기)에 사용 금지. 신호기를 도입한다면 **판정과 무관한 빨강 금지** — 항상 초록, 존 진입 시 노랑 1개만(의미 = "곧 정차", 게이지와 동일 정보의 이중화만 허용).

---

### 7. 테스트 전략

기존 21개(tests/ktx-journey.test.mjs)는 순수 모델 대상 — 시각 개편으로는 못 깨지며 **불변 기준선**. 문 자동 닫힘을 모델에 넣으면 +1~2개(마지막 승객 lockMs 만료 후 auto doors-closed 이벤트).

신규 3파일:

1. **tests/ktx-scene.test.mjs** (FakeElement 렌더 계약, subway-scene.test.mjs 패턴 이식, ~14개). ktx-scene.mjs는 subway와 달리 `querySelector/querySelectorAll/classList/ownerDocument`를 쓰므로 FakeElement 확장 필요: `classList`=Set 기반 add/remove/contains, `querySelector(".x")`=클래스 셀렉터 한정 descendants 필터, `remove()`, `ownerDocument`→fake document. 검증 항목: 두 뷰 동시 마운트+data-view 크로스페이드(노드 참조 불변) · env 22장 전 마운트 · `worldPx=(segIndex*100000+x)*3` → `--belt-px`/`--loop-px` 수치 일치 · setLoop 랩 시 `data-no-transition` · `data-speed-tier` 매핑(v=0→0, v=300→5) · `data-zone`/`data-armed`/✋ 계약 · horn 이벤트 → side+cab 미러 양쪽 펄스+data-horn-level · boarded→pop 텍스트/guest · finale 친구 수=boarded 수.
2. **tests/ktx-scene-art.test.mjs** (SVG 문자열 계약, ~5개): 전 sky/land 키에 SVG 생성 · 출력에 `<animate`(SMIL)·`filter`·`Gradient` 부재 · 신규 지물 색이 토큰 집합 내.
3. **tests/ktx-styles.test.mjs** (CSS regex, safety-route-styles 패턴, ~6개): reduced-motion 블록에 `.ktx-tie-belt`·`.ktx-pole`·`.ktx-env-land`·`.ktx-side-ground` 전부 등록 · `will-change` 등장 ≤ 3회 · `/animation:[^;]*\b0?\.[0-7]?\d*s[^;]*infinite/` 매치 0건(0.8s 미만 무한 반복 금지) · `.ktx-sleepers`의 `stroke-dashoffset` transition 부재(벨트 교체 확인) · `.ktx-finale` z-index 30 · 비활성 뷰 visibility 규칙 존재.

합계: 기존 375 + 약 25 = ~400. `npm test` 실패 0 게이트 유지.

---

### 8. 단계적 출시 — 권고: **cab 먼저** (2단계)

- **Phase A (ktx-v2-cab 브랜치)**: cab 원근 월드(§2 DOM)+합성 벨트(§5)+기둥+계기판 다이얼+이벤트 미러+디클러터(§6)+reduced-motion(§4)+신규 테스트 3파일. side는 현행 유지.
- **Phase B**: side 열차 실루엣(유선형 노즈·연결부)·승강장 구조물·교행 열차 연출.

이유 1줄: 카메라 컷 구조상 주행 시간 대부분이 cab이고 현재 최대 결함("209km/h인데 정지 화면")이 cab에 있다 — 반면 side의 교육 코어(탑승 세기·별 팝)는 이미 동작하므로 리스크를 뒤로 미룬다. 각 Phase 게이트: `npm test` 0 실패 + 1280×720 스크린샷(주간/야간/터널/armed 4컷) 사용자 승인. 모바일 CSS는 불가침(codex 담당).

---

### 거부권 목록 — 다른 렌즈 제안에서 이것이 나오면 자른다

1. **rAF·setInterval(<150ms)·SMIL `<animate>`** — SMIL은 "rAF 아님"으로 위장한 프레임 루프이며 reduced-motion을 CSS로 제어할 수 없다. 무효.
2. **전체 씬(배경·HUD 포함) 3D 공간화** — sky/land 크로스페이드 22장 시스템과 HUD 가독성을 파괴하고 레이어가 폭발한다. 3D는 `.ktx-track-plane` 하나에만.
3. **매 틱 리페인트 연속 애니메이션** — left/width/box-shadow/filter/clip-path 애니메이션, dashoffset 확대 적용. 예산 0개.
4. **3Hz+ 명멸, 스트로브 터널 조명, 급습 연출**(화면 20% 초과 교행 열차, 경고음).
5. **드래그 스로틀 레버·신규 키** (레퍼런스 1 모사) — 조작 불변 위반. 레버는 ↑/↓ 상태의 표시 전용.
6. **그라디언트·필터·텍스처·신규 이미지 자산·신규 HEX** — 평면 2D 파스텔 토큰 규칙 위반.
7. **벌점성 연출** — 급정거 스크리치, 승객 넘어짐, 빨간 X, 감점.
8. **armed 40m 구간에 새로 등장/이동 시작하는 장식**.
9. **밴드(sky/land) 종류 추가** — env 동시 마운트 22장 동결. will-change 4곳 이상도 동일 사유로 컷.
10. **판정과 무관한 빨간 신호등** — 아이가 "서야 한다"로 오독한다.
11. **자동 저사양 감지(FPS 프로빙) 루프** — 정적 예산으로 대체 확정.
12. **탑승 세기 리듬의 자동화 확대** — 마지막 승객 후 문 자동 닫힘(UX 함정 해소)은 승인, 그러나 boarding 중 자동 진행 타이머 단축이나 Space 1회=다인 탑승은 세기 놀이(교육 코어) 파괴로 거부. 한국어 제목·부제 변경도 계약상 거부.