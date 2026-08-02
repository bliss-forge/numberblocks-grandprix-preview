# M0 저장소 감사 — 칙칙폭폭 기관사 (2026-08-02)

설계 초안(같은 날짜 design-draft)이 [감사 대기]로 표기한 항목 ①~⑦을 실제 코드베이스에서
전부 확인했다. 초안 작성 세션들은 저장소 접근이 거부됐지만 이 감사는 전체 접근으로 수행했다.
기준 커밋: `6fbd0f2` (main, 테스트 349개 전부 통과 상태).

## ① 홈 키맵·카드 구조 — 초안의 추정이 대체로 맞았고, 충돌 1개가 실재한다

- 카드 6장: `index.html`에 하드코딩, `aria-keyshortcuts` 1~6. 레지스트리·difficulty 플래그 시스템 없음.
  카드 추가 = index.html 카드 1장 + `app.mjs` startMode 분기 + `tests/app-contract.test.mjs`(22개) 확장 + CLAUDE.md 계약 표 확장.
- 난이도 버튼: `7`=쉬움, `8`=차근차근, `9`=도전 (`app.mjs:1627`). **7키는 홈에서 이미 점유** — 카드 7에 7키 배정 불가.
- 홈에서 `0`키는 미사용 (subway 목적지 화면의 0=10번은 게임 안 이야기).
- `zero.png` 캐릭터 자산 없음 (one~ten + number-011~150). 카드 번호=캐릭터 번호=키 계약(CLAUDE.md)과
  7번 카드가 충돌 → **해결안 결정 필요** (협회 안건 A).
- 이탈 컨벤션: **`Escape` = 전역 goHome이 이미 모든 게임에 존재** (`app.mjs:1495`).
  초안의 "0키 2초 홀드" 신규 장치는 불필요 — 초안 스스로 "기존 컨벤션 확인 시 그것을 따름"이라 했으므로 Escape 채택.

## ② 렌더링·루프 컨벤션 — 초안의 60fps 고정 스텝 rAF 시뮬은 코드베이스에 이질적

- 게임 루프: `setTimeout` 모델 틱 (safety 100ms, subway 150ms) + **연속 운동은 CSS 애니메이션**.
- 모델-CSS 위상 동기 패턴 실증됨: 폴짝 게임의 `--hop-phase`/`--hop-period` + `animation-delay: calc(-1 * var(--hop-phase))`
  (styles.css:5098). 모델 시계와 CSS 애니메이션을 정렬하는 검증된 방식.
- rAF는 캐릭터 레이아웃 측정 1곳뿐. 씬 파일 34개 중 rAF 게임 루프 0개.
- 배경 전환의 직계 선례: `subway-station-art.mjs` `trainSceneSvg`가 **노선별 창밖 환경 3종(지상/한강/터널)을
  이미 구현** — `--scene-drift` CSS 변수 + keyframes 무한 스크롤. 바다/산/터널/밤 배경 전환은 이 패턴 확장.
- `srt-scenery-scroll` keyframes도 실존 (기존 SRT 게임 배경 스크롤). "parallax.mjs 추출"보다
  이 두 선례를 참조한 신규 씬 작성이 더 싸다 (추출할 공용 모듈이라 부를 실체가 없음).

## ③ 음성 자산 — 초안 1순위 우려는 기우, 전량 실존

- **number-1 ~ number-150, KO/EN 각 150개 전부 실존** (30/50/70/100 포함). 세기 놀이의 심장은 이미 있다.
- SRT 역명 음성 실존: `srt-station-dongtan/daejeon/daegu/busan` (KO/EN). **단, 기존 게임은 "대구"** —
  초안의 "동대구"를 쓰면 신규 녹음 필요. 재사용하려면 **대구** 채택 (협회 안건 B).
- 수서 역명 음성은 없음 (출발역이라 기존 게임에서 불필요했음).
- srt-depart/arrive/board 등 여정 계열 음성 다수 실존 — 문구가 맞으면 재사용 가능.
- 생성 파이프라인: `scripts/generate_voice_pack.py` (edge-tts, **네트워크 필요 → 신규 라인은 HOTL 승인 후**).
- 음소거: AudioManager 단일 토글 실존. 덕킹(-12dB)·우선순위 큐는 신규 (cancel() 단일 채널 컨벤션만 있음).

## ④ 테스트 컨벤션 — 초안 가정과 정합

- `node --test` + `FakeElement`/`FakeStyle` 테스트 더블 (subway-scene.test 등 3파일에 선례).
- 브라우저 레이아웃 테스트: **글로벌 playwright를 optional 로드, 없으면 skip** 하는 패턴 실존
  (safety-route-browser-layout, mobile-games-browser-layout). M1 프로토 검증에 그대로 쓸 수 있다.
- 기존 테스트 349개 — 초안의 "323개"는 구버전 수치.

## ⑤ 저장·라우팅 — 별 영속화만 신규

- localStorage 선례 2개: 난이도(`difficulty-preference.mjs`), 사진첩(`photo-hunt.mjs`,
  키 `numberblocks:photo-album`, **storage 주입식이라 테스트 용이**). "만난 친구"는 photo-hunt 패턴 복제.
- **별(state.stars)은 세션 메모리뿐, 영속화 없음** → "별 30개 KTX 스킨 해금"은 신규 영속 저장 필요.
- 장면 라우터: `startMode(mode)` 스위치. 신규 mode 1개 추가가 전부.
- `prefersReducedMotion()` 헬퍼 실존 (subway 폴짝 assist에 사용 중).

## ⑥ BGM — 없음, 효과음은 이미 WebAudio 합성

- `audio-manager.mjs` `playSfx`가 AudioContext + createOscillator 절차 합성 (파일 아님).
  초안의 "절차 합성" 방향은 기존 idiom과 정합. BGM 루프는 코드베이스 최초 시도 — 음소거 연동 필수.

## ⑦ 정차역 — 게임 내 일관성 우선

- 기존 SRT 게임: **수서 → 동탄 → 대전 → 대구 → 부산** (`SRT_STATIONS`). 같은 세계관의 같은 노선이
  이미 이 5역이므로 신규 게임도 동일 표기 채택 (실제 SRT의 "동대구" 표기보다 게임 내 일관성 우선).

## 추가 사실 (초안이 몰랐던 것)

- `characterAsset(1..150)` 헬퍼로 승객 1~150 전 범위 렌더 가능 (1~10 전용 파일 + number-###.png).
- **PC 우선 방침**: 사용자 지시(2026-08-02)로 지하철 게임은 1280×720 기준 구현, 모바일은 codex 분담.
  신규 게임도 동일 분담 적용 권고 → 초안 §2의 모바일 컨트롤 밴드는 v1 범위에서 제외하고 codex에 위임.
- 도착지 그림 무대 컨벤션: viewBox 1000×520, 하늘 0-330/지평선 330-400/땅 400-520.
- 카드 계약 표(CLAUDE.md)는 사용자 승인 하에 7행으로 확장해야 함.
