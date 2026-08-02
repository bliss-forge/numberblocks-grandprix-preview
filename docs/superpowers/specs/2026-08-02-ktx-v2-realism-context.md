# KTX 기관사 게임 v2 리뉴얼 — 협회 컨텍스트

## 사용자 요구 (원문)
"7번 게임이 좀 구현이 이상한것 같다. 이런식의 게임으로 어느정도 사실감과 인터페이스적으로도 운전 및 사람을 태우는 것 까지 하고싶어" + 레퍼런스 3개.

플레이어: 도하, 4~6세, 기차 애호가. PC 1280×720 전용(모바일은 별도 담당자 codex 몫 — 이번 범위 아님).

## 레퍼런스 3개 분석 결과

### 1. City Train Driver: Train Games (모바일 3D, OZI Games)
- 3D 원근 시점: 선로가 소실점으로 수렴하며 화면 하단 대부분을 채움. 병렬 선로 여러 개.
- 인터페이스: 우하단 **세로 레버형 스로틀(눈금 있는 게이지 + 드래그 핸들) + 브레이크 레버**, 경적 버튼(나팔 아이콘), 좌하단 L/R 버튼, 우상단 카메라/맵 버튼.
- 선로변: 신호등 기둥(빨강/초록), 속도제한 표지판(50), 육교, 역 승강장에 서 있는 사람들.
- "Drop the passengers safely on the destination" — 승강장 정차 → 승객 하차가 코어 루프.

### 2. 로블록스 KTX 시뮬레이터 (틱톡 @mamma_1217, "KTX운행 과속하면 생기는일")
- **1인칭 운전석 뷰**: 창문 너머 복선 선로, 선로에 초록 신호 불빛.
- 계기: **원형 속도계(다이얼)** 중앙에 디지털 숫자 "309", 그 아래 "고정속도: 0"(크루즈 설정).
- 상태 텍스트 "현재 상태: 전진", "내리기" 버튼, "튜토리얼 열기!" 버튼 — 한국어 UI.
- 같은 채널에 "광명역이 구현된 게임" — 실제 한국 역 재현이 매력 포인트.

### 3. MSTS KTX 승무일지 (네이버 블로그, 2009)
- 실제 노선 주행의 서사: 고속선 신호기, 터널 진입, 교량, 오르막, **교행 열차**(반대편 열차 스쳐 지나감), 간이역 통과, 해가 지는 하늘.
- 광명역 진입: 승강장이 멀리서 나타나 점점 커짐, 옆 선로에 대기/출발하는 다른 열차들.
- 서울역 도착: 열차 여러 대가 대기하는 큰 역의 풍경.
- 핵심 감성: "진짜 KTX 운전하는 것처럼 실감난다" — 지나가는 풍경과 철도 지물의 밀도.

## 현재 구현 (main, 배포됨)의 문제 — 스크린샷 근거

### 운전실(cab) 뷰 — cur_cab_fast.png (209km/h인데 정지 화면 같음)
1. 선로가 화면 중앙의 **작은 사다리꼴 띠**(가로 약 40%, 세로 약 90px)로만 존재. 소실점 수렴감 없음.
2. **속도감 제로**: 침목 dashoffset 애니메이션이 있으나 너무 작아 안 보임. 전차선 기둥·신호기·킬로포스트 등 스쳐 지나가는 지물이 전혀 없음. 원경 건물(회색 사각형 띠)은 사실상 정지.
3. **대시보드가 화면 40%를 차지하는 평평한 보라 띠**. 계기는 흰 원 안 숫자 "209 km/h"뿐(바늘 없음), 왼쪽 회색 원(경적?), 오른쪽 노란 원 레버(움직이지 않음), 흰 점 5개(정차 게이지)는 의미 불명.
4. 창문 프레임/필러 없음 → "운전석에 앉아 있다"는 느낌 없음.
5. 신호등·전차선·복선 등 철도 요소 부재.

### 바깥(side) 뷰 — cur_side_drive.png
1. 열차가 **장난감 애벌레**: 5칸이 분리된 보라 덩어리, 바퀴가 떨어져 보임, KTX 특유의 긴 유선형 노즈 없음, 연결부 없음.
2. 209km/h 주행 중인데 배경 건물이 거의 정지로 보임. 속도선/모션 표현 없음. 지면은 베이지 판자 띠.
3. 레일이 공중에 뜬 가는 회색 선.
4. 승강장: 지붕/기둥/안전선/역명판 구조물 없이 캐릭터가 흙바닥에 서 있는 느낌.

### UX 함정 (모델 검증으로 확인)
- 마지막 승객 탑승 후 **Space 한 번 더** 눌러야 문이 닫히고(phase ready) 그다음 ↑가 먹힘. 이 상태에서 ↑만 누르면 아무 일도 안 일어남(힌트는 있으나 약함).

## 절대 제약 (변경 불가)
1. **의존성 0**: 바닐라 ES 모듈 + CSS + 인라인 SVG. WebGL/three.js/캔버스 게임루프 금지. **CSS 3D transform(perspective)은 네이티브 기능이라 허용.**
2. **rAF 게임루프 금지**: 150ms setTimeout 모델 틱 + CSS transition/animation 보간이 이 코드베이스의 확립된 이디엄 (지하철 --hop-phase, ktx 침목 dashoffset 선례).
3. 조작 불변: ↑ 가속(놓아도 유지) · ↓ 브레이크 · ⎵ 경적/정차/태우기 · 1/3 뷰 전환 · Escape 홈. 새 키 추가 금지(4~6세).
4. 게임 모델(src/ktx-journey.mjs)의 물리·별 판정·무스톨 보장·이벤트 계약은 유지. 시각/연출 개편이 중심. 모델에 이벤트 추가는 소폭 허용(예: 문 자동 닫힘).
5. 신규 이미지 자산 0장 — 캐릭터 PNG(assets/characters/)만 사용, 나머지는 전부 코드가 그린 SVG/CSS.
6. 기존 테스트 370+개(신규 지하철 환승 포함 375개) 통과 유지. 시각 개편이어도 계약 테스트(tests/ktx-journey.test.mjs 21개)는 깨지면 안 됨.
7. 벌점 없음, 밝은 파스텔 장난감 스타일 유지(과도한 사실주의로 무섭거나 칙칙해지면 안 됨 — "어느정도 사실감").
8. prefers-reduced-motion 대응 필수.
9. 성능: transform/opacity/background-position만 애니메이션(리플로 유발 속성 금지). 1280×720에서 저사양도 부드럽게.

## 현재 코드 지도 (모두 읽기 가능)
- /Users/bosung_kim/bliss/bliss_github/D_ETC/numberblocks-minigame/src/ktx-route-data.mjs — MAX_SPEED=300, 세그먼트 4400~4800m, 밴드(sky×land), 이벤트(sprint300/river/tunnel/seagull/passing/cows), SPEED_MILESTONES
- src/ktx-journey.mjs — 순수 시뮬레이션(phase: boarding/ready/driving/stopping/…, tickKtx 150ms, pressKtxSpace, 별 판정 ±10m/±25m, 어시스트)
- src/ktx-passengers.mjs — 역당 3~6명 + 큰 손님(30/50/70/100)
- src/ktx-scene-art.mjs — SKY_PALETTES 5종/LAND_PALETTES 6종, skyLayerSvg/landLayerSvg(2배폭 루프), sideTrainSvg(8창), cabTrackSvg(사다리꼴+침목 dasharray), cabDashSvg, eventSpriteSvg
- src/ktx-scene.mjs — 두 뷰 동시 마운트 + data-view 크로스페이드, worldPx=(segIndex*100000+x)*3 → dashoffset/translateX, 플랫폼 --platform-x, HUD
- src/app.mjs — ktx 배선(handleKtxEvents 카메라 컷: 정차→바깥/출발→운전실, scheduleKtxTick 150ms)
- styles.css — body[data-mode="ktx"] 블록 ~600줄
- tests/ktx-journey.test.mjs — 21개 (무스톨 퍼즈, 별 창, 경적 에스컬레이션 등)
- 배경 전환: data-sky/data-land 속성 스왑 + 1.5s 크로스페이드. "하루의 여정" 아크(아침→낮→노을→밤→새벽→낮) 유지할 것.

## 이미 있는 자산 (재사용 대상)
- 음성: number-1~150(KO/EN), srt-station-{dongtan,daejeon,daegu,busan}, srt-depart, cheer-1~4. 신규 음성 생성은 이번 범위 밖(네트워크 게이트).
- 효과음: WebAudio 합성 프리셋(horn 포함).
- KTX_RANDOM_EVENTS에 "passing"(교행) 이벤트가 이미 모델에 존재 — 시각화만 빈약.
