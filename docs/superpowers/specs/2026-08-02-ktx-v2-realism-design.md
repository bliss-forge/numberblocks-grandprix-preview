# 칙칙폭폭 기관사 v2 — 사실감 리뉴얼 확정 설계 (조정 판정본)

사용자 요구: "어느정도 사실감과 인터페이스적으로도 운전 및 사람을 태우는 것까지" — 레퍼런스: City Train Driver(3D 원근·레버), 로블록스 KTX(1인칭·원형 속도계·고정속도), MSTS KTX 승무일지(노선 주행감·교행·역 진입).

협회 산출물: [렌즈 4개](2026-08-02-ktx-v2-realism-lenses.md) · [반증 3건](2026-08-02-ktx-v2-realism-verdicts.md) · [컨텍스트](2026-08-02-ktx-v2-realism-context.md). 이 문서는 렌즈 간 충돌에 대한 조정 판정과 최종 수치만 담는다. 세부 구현 스펙은 렌즈 문서가 원본.

## 조정 판정 (렌즈 충돌 5건 + 반증 수용)

| # | 충돌 | 판정 |
|---|---|---|
| R1 | cab 기하 3안 상충 (A5/D1) | **소유권 분할**: 세계(원근 평면·지물·터널·교행·역 접근) = cab3d 렌즈, 계기(다이얼·레버·스트립·문 패널) = cockpit 렌즈. 수치 단일표는 아래 §기하. rotateX 84°/perspective 500px 채택(반증 검산 통과 — kid 상한 52~60°는 출처 없는 임의값, 캡 프레임+reduced-motion이 멀미 완화 담당) |
| R2 | 정차 단서 4중화 (F1-1) | cockpit **접근 스트립 + ✋** 단일 소유. cab3d의 조준선·점 5개 게이지 재배치 삭제. 세계의 승강장 성장은 유지(모델 구동이라 스트립과 자동 정합) |
| R3 | 스로틀 이중 경로 (M1) | cockpit `state.ktxHeld` 직접 전달 채택, cab3d vΔ 추론 폐기. `data-lever` = power/cruise/neutral/brake |
| R4 | 계기 감량 (F2-1) | 크루즈 필 삭제 — 고정속도는 레버 D 위치 + ▶글리프 halo가 표현. 전광판·문 패널·next-key 필 유지. 계기 6종 확정 |
| R5 | 색 거버넌스 (F6-1) | 신규 회색은 ktx-scene-art.mjs에 명명 토큰으로 등재(RAIL 파생 2단계 + TUNNEL_HOLE=#262c3a). gskin city는 기존 #9fb0c2. 캡 프레임은 train.nose |
| R6 | 명멸 규칙 (F6-2/A4) | 문 경고 점멸 1s 주기. 연속 transform 루프(스트릭·바퀴)는 명멸이 아니므로 기간 제한 없음 — 스타일 테스트는 opacity 점멸 계열(-warn/-blink)만 0.8s 하한 검사 |
| R7 | 터널 공포 (F3-1) | 포털 홀 #262c3a, 최종 scale 12, 암전 .45 유지(상향 취소) |
| R8 | 진동 (F3-2) | 상시 스웨이 삭제. 교행 셰이크 ±2px 1회(자식 래퍼에 분리 — A6) |
| R9 | 문 카운트다운 (F5-1) | DOOR_COUNTDOWN_MS=6000, 비프·숫자는 3·2·1만(앞 3초는 감상 유예). Space 즉시 닫기·↑ 지름길 유지 |
| R10 | speedTier | `v===0 ? 0 : min(5, ceil(v/60))` |
| R11 | 단계 출시 | 한 브랜치에서 cab→side 순차 구현, 검증 게이트 통과 후 일괄 사용자 승인(스크린샷 제시) |

반증 수용(전부 구현에 반영): A1 침목 델타 가드 `|dx|<50`, A2 finale z30+`.ktx-view{isolation:isolate}`, A3 horizon `bottom:0;height:33.3%`(backdrop 기준), B2 near/ground 레이어에 정수배 wrap 이식, B3 터널 조명 60m 간격, B4 doorCountdown은 closeDoors에서 리셋, B5 t 클램프 `max(0,…)`, B7 숨은 뷰 visibility 게이트+`animation-play-state:paused`(A2 수정판 transition), C2 스트릭은 translate 루프(배경 위치 애니 폐기), C3 지평선 헤이즈 밴드, C5 워커 델타는 스폰 시 실측, A6 3건(글로우 data-filled 조건, 셰이크 래퍼, data-nearstop root 미러), F1-2 존 디클러터(기둥 감쇠 .25·풍선 억제·스폰 중단), F7-1 킬로포스트는 reduced-motion에서 손실 수용.

## 기하 단일표 (1280×720, 스테이지 ≈1217×540)

| 항목 | 값 |
|---|---|
| 지평선(VP) | y 36%, x 50% |
| 하늘(backdrop) | inset 0 0 64% 0 (기존 5장 유지) |
| 원경(horizon 스트립) | backdrop 자식, bottom:0, height:33.3% (기존 6장 유지) |
| 세계(cab-world) | top 36% ~ bottom 0, perspective 500px, origin 50% 0 |
| 지면 평면 | 1300×500px, rotateX(84°), origin 상단 — 카메라면 침범 없음(497.3<500) |
| 침목 | 주기 16px(=16m), 벨트 252px 폭, 델타 누적 + 640px 정수배 무봉합 wrap |
| 자기 선로 | 레일 x=±36(평면), 복선 중심 x=−120 |
| 대시 | height 28%, 다이얼 200px binnacle(립 위로 솟음) |
| 속도계 | 바늘 deg = v×0.8 − 120 (0~300 → ±120°), `.ktx-speed-number` 셀렉터 유지 |
| 접근 스트립 | 260×64px, 1.3833px/m (d 120m→0), ⭐⭐⭐ 밴드 x182~210 |
| 지물 비행 | 쌍곡선 6-스톱 keyframes, 스폰 시 duration 고정(1600~6500ms), 풀 10개 라운드로빈 |
| 기둥 간격 | 55m(동시 ≤3 스태거), 신호기 400m(항상 초록), 킬로포스트 1km, 터널 조명 60m |
| side 패럴랙스 | 원경 0.12 / 중경 0.45 / 지면 1.0 / 전경(전신주) 1.6 — 전 레이어 정수배 wrap |
| 탑승 안무 | 걷기 780ms(74px, 스폰 시 실측) + 세기 팝 300ms 지연 — BOARD_LOCK 1200ms 내 완결 |
| 출발 컷 | depart → 900ms 후 cab (사용자가 그 사이 뷰 전환 시 skip) |

## 모델 변경 (유일한 ktx-journey.mjs 변경)

- `DOOR_COUNTDOWN_MS = 6000`, 상태 필드 `doorCountdownMs`(초기 null)
- 대기열 0 + lock 0 → 카운트다운 시작 이벤트, 3·2·1 경계 이벤트, 0에서 자동 closeDoors
- boarding + 빈 대기열 + held.up → 즉시 closeDoors (↑ 지름길)
- closeDoors가 doorCountdownMs 리셋. 기존 12s boarding 자동 닫힘 분기는 대체됨
- 기존 21개 테스트 계약과 양립(반증 C2 전수 추적 완료) + 신규 테스트 추가

## 검증 게이트

1. `npm test` 실패 0 (기존 375 + 신규)
2. 1280×720 스크린샷: 주간 주행(침목·기둥 흐름) / 야간(전조등·계기 백라이트) / 터널(포털→암전→출구) / armed(스트립+✋) / 탑승 안무 / 교행
3. 209km/h 주행 3초 관찰에서 속도감 체감(침목 하단 ≥400px/s 상당)
4. 전 여정 오토파일럿 완주(무스톨·별·피날레) + 콘솔 오류 0
5. reduced-motion 에뮬레이션에서 게임 성립(지물·스트릭 숨김, 판정 채널 유지)
6. 마지막 승객 후 ↑만 눌러도 출발(문 함정 해소 확인)
