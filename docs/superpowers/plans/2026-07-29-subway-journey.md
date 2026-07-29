# 서울 지하철 여행 미니게임 구현 계획

## Context

아이(4~6세)가 서울 지하철을 배경으로 "몇 호선 찾아 타기 → 노선도 점 지도에서 이동 → 목적지·환승역에서 내리기 → 환승 → 도착"을 익히는 여섯 번째 미니게임. 사용자 결정: **6번째 홈 카드**(카드 계약 확장 승인됨) · **실제 노선 폭넓게(1~9호선)** · **난이도 = 환승 횟수(쉬움 0 / 차근차근 1 / 도전 2)** · **장소 스토리 목적지(아이콘+음성)**. 기존 SRT 여정(정차·하차·오답 재탑승)과 버스(방향키 탑승) 검증 패턴을 재사용한다.

## 게임 루프

1. **승강장(platform)**: 미션 제시("동물원에 가요! 4호선을 타요"). 여러 노선 색·번호의 열차가 번갈아 정차. 목표 호선 열차가 서면 **열차 쪽으로 방향키 → 탑승** (버스 탑승 UX 재사용). 다른 호선을 누르면 "그건 N호선이에요! M호선을 타요". 방향(상·하행) 개념은 자동 처리 — 아이는 호선 숫자만 맞추면 된다(숫자 학습 = 넘버블록 연계, 음성은 기존 `number-N` 재사용).
2. **탑승(ride)**: 화면이 노선도 점 지도로 전환. 경로 구간을 자동 줌(viewBox fit)한 서울 노선도 위에서 플레이어 점이 역마다 이동·정차. 정차 시 역명 표시+문 열림. 내릴 역(환승역 or 목적지)이면 **아래 방향키로 하차**; 다른 역에서 내리면 "여기는 OO역이에요. 다시 타요!"(SRT wrong-station 패턴, 벌점 없음).
3. **환승(transfer)**: 환승역 하차 → 환승 통로 연출(짧은 안내) → 다음 호선 승강장으로 복귀(1번 반복).
4. **도착(arrived)**: 목적지 장소 아이콘 + 축하 연출 + 음성. 별 획득 후 홈.

## 파일 구성 (기존 패턴 준수: model/scene 분리, 시드 RNG, FakeElement 테스트)

- **`src/subway-map-data.mjs`** (신규): 1~9호선 실제 색상(1호선 `#0052A4`, 2 `#00A84D`, 3 `#EF7C1C`, 4 `#00A5DE`, 5 `#996CAC`, 6 `#CD7C2F`, 7 `#747F00`, 8 `#E6186C`, 9 `#BDB092`) + 노선별 대표역 10~14개(포함 노선 간 실제 환승역은 빠짐없이: 시청, 교대, 충무로, 동대문역사문화공원, 왕십리, 종로3가, 고속터미널, 김포공항 등). 역마다 개략 지리 기반 좌표 `(x, y)`(0~100 격자). 환승 그래프는 동일 역명 공유로 도출. **목적지 10곳**: 동물원(대공원·4), 놀이공원(잠실·2), 야구장(종합운동장·2), 경복궁(경복궁·3), 남산(명동·4), 한강공원(여의나루·5), 하늘공원(월드컵경기장·6), 어린이대공원(어린이대공원·7), 석촌호수(석촌·8), 국회의사당(국회의사당·9) — 각각 `{ id, label, station, icon, voiceKey }`.
- **`src/subway-journey.mjs`** (신규): 시드 RNG(기존 mulberry 패턴 복사). `createSubwayJourney(difficulty, seed)` — 출발역 후보에서 BFS로 **정확히 N회 환승** 경로가 존재하는 (출발, 목적지) 조합을 선택, `legs: [{line, stations[], boardAt, alightAt}]` 생성. phases: `platform → ride → (transfer → platform → ride)* → arrived`. `attemptSubwayMove(state, direction)` (탑승/하차/오답 이벤트), `advanceSubwayWorld(state, elapsedMs)` (열차 도착 주기, 정차·문 열림 타임라인 — SRT TRAVEL/STOP 타임라인 재사용), `stopAnnouncement(state)`.
- **`src/subway-scene.mjs`** (신규): `renderSubwayJourney`/`updateSubwayJourney` (phase 변경 시 rebuild — srt-journey-scene 패턴). 승강장: 노선색 열차 SVG + 번호 원형 뱃지, 스크린도어·역명판. 지도: inline SVG polyline(노선색) + 역 점 + 환승역 이중 링 + 플레이어 점 이동 애니메이션, 경로 구간 자동 줌, 비활성 노선은 저채도. 도착: 장소 아이콘 + 캐릭터 + 하트. route-pad 버튼 재사용.
- **`src/subway-art.mjs`** (신규): 지하철 정면/측면 SVG(`subwayTrainSvg(lineNumber, color)`), 장소 아이콘은 이모지 우선(escalation ladder — 필요 시에만 SVG).
- **`src/app.mjs`**: mode `subway` 추가 — 카드 6, 키 `6`, `startMode("subway")` → `startSubwayJourney()` + `scheduleSubwayTick` + `moveSubway` (SRT 통합부와 동형). 난이도 선택(7/8/9)은 기존 상태 재사용. goHome/clearTimers 정리 포함.
- **`index.html`**: 6번 카드 추가 — `data-mode="subway"`, `aria-keyshortcuts="6"`, `assets/characters/six.png`(기존 자산 재사용, 신규 생성 없음), 제목 "지하철 여행", 부제 "갈아타고 목적지까지 가요". **홈 카드 계약 확장 — CLAUDE.md 표에 6번 행 추가.**
- **`styles.css`**: 승강장/지도/도착 스타일 + reduced-motion 블록. 모바일 390px 가로 스크롤 금지(지도는 viewBox 스케일이라 안전).
- **음성**: 신규 키 — `subway-board`("N호선을 타요"는 `number-N`+`subway-board-suffix` 조합 대신 **generic 키 + 호선번호는 number-N 재생 연결**), `subway-wrong-line`, `subway-ride`, `subway-stop-check`("도착했어요. 내릴 역인지 확인해요!"), `subway-wrong-stop`, `subway-transfer`("갈아타는 역이에요!"), 목적지 10곳 각 1키("동물원에 가요!" 등). manifest+생성 스크립트에 추가하되 **TTS 실행(edge-tts 네트워크)은 별도 HOTL 승인 후** — 승인 전에는 텍스트 힌트만으로 동작(기존 관행).

## 테스트

- **`tests/subway-map-data.test.mjs`**: 노선 9개·실색상, 역 좌표 중복 없음, 포함 노선 간 환승역 연결 일관성(같은 역명 → 좌표 동일), 목적지 10곳이 실제 수록 역인지.
- **`tests/subway-journey.test.mjs`**: 같은 시드 재현성, 난이도별 환승 횟수 정확히 0/1/2, 탑승(오답 호선 블록)/정차 타임라인/오답 하차 재탑승/환승 진행/도착 이벤트, BFS 경로 유효성(legs 연결성).
- **`tests/subway-scene.test.mjs`**: phase별 렌더 계약(열차 뱃지 숫자, 지도 점·플레이어, 도착 아이콘), update 시 점 이동.
- **`tests/app-contract.test.mjs`**: 카드 6 계약(번호=6, mode=subway, six.png) 추가, 기존 1~5 검증 유지.
- **`tests/responsive-layout.test.mjs`** + browser-layout: 홈 6카드가 1280×720 한눈/390×844 무스크롤 확인 갱신.

## 작업 순서

1. 브랜치 `claude/subway-journey` → spec/plan 문서 커밋(docs/superpowers/…) 
2. subway-map-data + 테스트 → subway-journey 모델 + 테스트 → scene/art + 테스트 → app/index.html/styles 통합 + 계약 테스트 갱신 → CLAUDE.md 카드 표 확장
3. `npm test` 0 실패 → Playwright 캡처(홈 6카드, 승강장, 지도 이동, 환승, 도착 — 1280×720/390×844)
4. 음성: manifest·스크립트 키 추가는 포함, mp3 생성은 별도 승인 요청
5. 사용자 확인 후 승인 시 main 머지 + `PUSH_OK=1` 푸시 + Pages 폴링 확인

## 검증

`npm test` 전체 통과(기존 268 + 신규), 두 뷰포트 스크린샷으로 잘림·스크롤·카드/캐릭터 일치·포커스 확인, 로컬 서버에서 쉬움/차근차근/도전 각 1회 전체 여정 플레이 스모크(page.evaluate 단계 mount 방식).
