## 반증 결과 — KTX v2 4렌즈 설계 검증

소스 실측 완료(src/ktx-scene.mjs·ktx-scene-art.mjs·ktx-journey.mjs·ktx-route-data.mjs·ktx-passengers.mjs·app.mjs 1040–1240·1690–1810, styles.css 5940–6535, tests grep). cab3d §2.1 투영 수식은 전부 재계산으로 재현 확인(아래 "반증 실패" 참조). 이하 심각도순.

### A. 설계 무효 (해당 메커니즘 그대로는 성립 불가)

**A1. [kid §5] tie-belt `setLoop(belt, worldPx, 96)` — 무효.**
근거: worldPx = 3px/m이므로 300km/h에서 틱당 37.5px 이동, wrap 주기 96px → **2.56틱마다 wrap**. setLoop의 wrap 틱은 `data-no-transition`으로 transition을 죽이므로 전체 틱의 ~40%가 순간점프+150ms 정지가 된다. 침목 흐름이 6.7Hz 이산 스텝으로 퇴화 — "매 틱 리페인트 0"을 얻고 모션 연속성을 잃는다. 이 결함은 cab3d §3이 명시적으로 지적한 "setLoop 1틱 정지 약점" 그 자체다.
대안: cab3d §3 wrap 알고리즘(주기를 수 초 분량으로 크게, 점프를 패턴 주기 정수배로 시작·목표 동시 이동) 채택. kid 렌즈의 벨트는 폐기하고 cab3d ties로 통일.

**A2. [kid §5] `.ktx-env` visibility 게이트 CSS — 작성된 그대로는 크로스페이드 파괴.**
근거: base `.ktx-env { visibility:hidden; transition: opacity 1.5s, visibility 0s linear 1.5s }`에 활성 규칙이 `visibility: visible`만 추가. CSS transition은 도착 상태의 transition 선언을 쓰므로 **켜질 때도 visibility가 1.5s 지연** — 들어오는 레이어가 페이드 내내 안 보이다가 끝에 팝인한다. 같은 스니펫의 `.ktx-view`는 활성 규칙에 transition 오버라이드를 넣어 맞게 썼는데 `.ktx-env`는 빠뜨렸다.
대안: 활성 셀렉터 11개에 `transition: opacity 1.5s ease;` (visibility 지연 0) 명시. 아이디어 자체(숨은 env 페인트 차단)는 유효.

### B. 수정 필요 (유효하나 그대로 구현하면 결함)

**B1. [kid §5] pole-rush `--pole-ms`를 티어로 갈아끼움 — cab3d §4.2가 경고한 duration-var 함정을 kid 렌즈 스스로 밟음.**
실행 중 infinite 애니메이션의 duration이 바뀌면 경과시간/새duration 재매핑으로 진행률이 점프 — 티어 전환(예: 1.6s→1.1s)마다 화면의 모든 기둥이 경로 ~45% 순간이동. 대안: cab3d 패턴 1(스폰 고정 duration) 또는 패턴 3(티어별 레이어 opacity 스위치). 같은 결함의 경미판: sideview `--wheel-period`(바퀴는 회전 대칭이라 위상 점프가 거의 안 보임 — 수용 가능, 라벨만).

**B2. [sideview §0] near 레이어(배율 1.6, 주기 480px)의 wrap 히치.**
300km/h에서 400px/s → **1.2초마다 wrap, 1회당 ~60px 순간 홉**. 가장 눈에 띄는 전경 레이어가 주기적으로 덜컥인다. 기존 ground(1.0/240px)도 이미 1Hz·37px 홉이 있으나(현행 수용 품질) v2의 목적이 속도감이므로 전경에서는 치명적. mid(0.45/1000px)는 8.9초당 17px — 경계선. 대안: near·ground에 cab3d wrap 알고리즘 이식(주기를 패턴 정수배 유지).

**B3. [cab3d §4.3] 터널 조명 스폰이 풀 10개를 초과.**
30m 간격, 300km/h(83.3m/s) → 2.78개/s × 비행 3.12s ≈ **동시 8.7개** (터널 밴드는 세그먼트 중반이라 300km/h 도달 가능). 잔여 신호기·킬로포스트와 겹치면 라운드로빈이 비행 중 노드를 강탈 → 순간이동. §11 예산(기둥4 기준)도 이 케이스를 누락. 대안: 터널 조명 간격 60m 또는 풀 14개.

**B4. [sideview §6] doorCountdownMs 리셋 위치 오류.**
`data-door-warning = (doorCountdownMs != null)`인데 리셋은 openDoors에서만 — Space/↑로 문 닫으면 ready→driving 내내 **문 경고 램프가 다음 역까지 점멸**. closeDoors에서 null로 리셋해야 한다.

**B5. [cab3d §7] `t = 1 − Math.min(d,320)/320`에 하한 클램프 없음.**
오버런 시 x가 marker+30까지 가서 d=−30 → t=1.094 → scale 2.86·plat-y 150px로 폭주, 별이 조준선을 지나쳐 커진다. cockpit §D는 `Math.max(0, Math.min(120, …))`로 맞게 클램프했다. 한 줄 수정.

**B6. [kid §4+§5] 자기모순 2건(경미).** ① reduced-motion 오버라이드 `transform: rotateX(57deg) translateY(0)!important` — 자기 스펙의 벨트는 `rotateX(0)`(회전은 부모 몫)이므로 이중 회전. ② `--belt-px = -wrapped`(setLoop 부호는 좌향 배경용)를 그대로 쓰면 침목이 **위로(멀어지는 방향)** 흐른다 — 전진이 후진으로 보임. cab3d는 부호를 명시적으로 처리(tiePx += dxM, 양수).

**B7. [통합 필수] 숨은 뷰의 애니메이션 비용 — kid만 대책이 있고 나머지 렌즈는 무방비.**
두 뷰 상시 마운트 + updateKtxScene이 양쪽 루프를 매 틱 갱신하는 구조에서, v2는 양쪽을 다 무겁게 만든다(cab: ties+지물+포털 / side: 바퀴+스트릭+near·mid+워커). 250ms 크로스페이드 순간(매 출발·도착)에 15~20개 애니메이션 레이어 + 페인트 유발 2건이 동시 가동 — 저사양 최악 지점이 가장 빈번한 순간과 겹친다. kid의 visibility 게이트(A2 수정 후) + 숨은 뷰 `animation-play-state: paused`를 4렌즈 공통 필수 요건으로 승격할 것.

### C. 트레이드오프 (판단 필요, 무효 아님)

**C1. [sideview §1] SVG 내부 `.ktx-wheel` CSS 회전 = 리페인트.** "리플로 0"은 맞지만 페인트 0이 아니다 — SVG 자식 transform 애니메이션은 합성 보장이 없고(Chrome 부분 지원, Safari/Firefox는 bbox 리페인트) 바퀴 7~9개가 주행 내내 60fps 무한 회전. kid 렌즈의 "매 틱 리페인트 0" 예산과 정면 충돌. 다만 Chrome invalidation은 요소 bbox 단위라 실비용이 작을 수 있음 — **파국이라는 단정은 반증 실패, 실측 필요**. 대안: 바퀴만 HTML div 오버레이.

**C2. [sideview §2] speed-streaks `background-position` 무한 애니메이션.** 절대 제약의 허용 목록에는 있으나 1217×378px 전면 리페인트/프레임 — v2 최대 단일 페인트 비용이고, cab3d는 같은 이유로 background-position을 명시 배제, kid 예산과도 충돌. 대안: cab3d §8.1 방식(높이 200% 요소 translateY) — 기능 동일, 합성 전용.

**C3. [cab3d §2.1/§11] 하단 블러 vs 래스터 메모리는 양자택일 + 지평선 모아레 미해결.** ties는 1× 래스터면 하단 7.6× 블러(리스크 2 인지), 브라우저가 스케일을 올려 잡으면 메모리 급증 — 25–35MB는 상한이 아니라 휴리스틱 의존. 추가로 **지평선 근처에서 16px 주기 침목이 화면 ~1.7px 간격으로 압축** → 스크롤 중 모아레/에일리어싱 쉬머가 스펙에 미대응. 대안: 평면 상단 ~80m 구간 침목 제거 또는 정적 헤이즈 밴드 오버레이(1회 페인트).

**C4. [cab3d §6] 포털 리드타임은 등속 가정.** 트리거 후 급제동하면 포털(2.2s 고정)이 먼저 통과·소멸하고 암전은 한참 뒤 — 리스크 4는 지물만 언급, 포털 누락. 장식이므로 수용 가능; 원하면 트리거를 v 안정 시로 게이트.

**C5. [sideview §4] 워커 74px 하드코딩은 1280×720 전용.** stage-frame이 min(97vw,1760px)이라 넓은 창에서는 열차(62% 비율 스케일)와 고정 px 대기열(+316px)이 어긋나 문 위치가 ~220px까지 이동 — 워커가 문 앞 미달. 컨텍스트가 1280×720 전용을 선언했으므로 수용 가능하나, 스폰 시 door slot getBoundingClientRect로 델타 계산이 한 줄 안전판.

### D. 렌즈 간 정면 충돌 (기술 결함 아님 — 대장 판정 필요)

1. **rotateX: cab3d 84°/perspective 500 vs kid 상한 52–60°/≥700 — 상호 배타.** kid 규칙을 적용하면 cab3d §2.1 검산 전체가 무효가 된다. 정량 비교: 84°는 하단 배율 7.6×(진짜 수렴감), 57°/900은 ~1.2×로 현행 평면 사다리꼴과 큰 차이 없음. kid의 수치 상한은 출처 없는 임의값이지만 멀미는 설계 권한 문제 — 기술적으로는 84°도 안전(카메라면 미침범 검산 확인, 대시 하단 차폐 + reduced-motion 존재).
2. 지평선: 36%(cab3d) vs 44%(kid) vs 트랙 48%(cockpit).
3. 대시: 21%+DOM 바늘(cab3d) vs 28%+SVG 바늘+7계기(cockpit) — cabDashSvg 재작성이 2벌. 게이지 5칸 유지(cab3d) vs 접근 스트립 대체(cockpit)도 배타.
4. speedTier: `floor(v/60)`(cab3d) vs `ceil(v/60)`(kid·side) — v=59가 tier 0 vs 1. kid §7 테스트가 매핑을 핀하므로 먼저 확정할 것.
5. `.ktx-speed-number`: DOM 유지(cab3d) vs SVG text 이동(cockpit) — 둘 다 scene JS와 호환, 하나만.

### E. 반증 실패 (공격했으나 버팀 — confirmed로 승격)

- **cab3d §2.1 기하**: mag(Y)=500/(500−Y·sin84°) 재계산 — Y=100→13.0px, 300→77.8, 400→204.5, 437→349px(화면 하단), Y_max z=497.3<500 전부 일치. 검산 신뢰 가능.
- **cab3d §3 wrap**: 640=16×40 패턴 정수배 + 시작·목표 동시 이동 + `void offsetWidth` — 이음새 무결, 잔차 상한(정시 0.8px, 400ms 클램프 지연 틱 ~12px 1회) 계산 재현. setLoop 약점의 올바른 수정본이며 **이것을 전 레이어 공통 프리미티브로 삼는 게 A1·B2의 답**.
- **§4.2 duration-var 점프 주장**: 브라우저 실거동과 일치(경과시간 보존 → 진행률 재매핑). 회피 패턴 3종 모두 건전.
- **틱 지연 시 perspective 점프?**: transition 160ms ≥ 틱 150ms 구조상 정시 틱은 연속. 지연 틱(400ms 클램프)은 160ms 완주 후 ~240ms 정지→다음 틱 러치 — **현행 이디엄의 고유 특성이지 v2 신규 결함 아님**(perspective가 하단에서 시각적으로 증폭할 뿐). 수용.
- **§7 캘리브레이션**: d=0 별 x=767px=63%, d=10 이탈 10.8px — 재계산 일치.
- **테스트 안전 주장**: grep 확인 — tests에서 ktx는 ktx-journey.test.mjs(모델만)·app-contract(홈 카드)·srt-journey-art뿐, 씬 DOM 클래스 참조 0. 12s 자동 닫힘을 정확 핀하는 테스트 없음(드레인 창 방식) — sideview §6 모델 변경 가능.
- **cockpit keydown 즉시 호출**: app.mjs:1793이 이미 `event.repeat` 가드 — 키 리핏 폭주 없음.
- **sideview queue number 키 diff**: ktx-passengers 확인 — 한 역 큐 내 번호 중복 불가능(base 1–12 분할, 게스트 상호·BIG_GUESTS 중복 배제) — 안전.
- **cockpit의 현행 대시 크롭 버그 주장**: xMidYMax slice + 컨테이너 6.6:1 vs viewBox 4.17:1 → 상단 ~89유닛 크롭 재계산 — 방향 확인(수치는 가정 폭 차이), 실재하는 버그.
- **gskin 메모리 25–35MB**: 과대 추정(정상 상태는 부모 텍스처 1장+ties ≈ 4MB, 6장 동시 승격은 크로스페이드 순간뿐) — 안전 방향 오차, 무해.

**요약 판정**: 코어 기법(cab3d의 84° 평면 + transform-only ties + 정수배 wrap + 3패턴 duration 규율)은 수치까지 버텼다. 무너지는 곳은 kid 렌즈의 성능 스니펫 2건(A1·A2 — 아이러니하게 성능 렌즈가 자기 예산을 깨는 코드를 씀), setLoop 재사용부(B2), 스폰 예산(B3), 리셋 로직(B4)이며 전부 국소 수정으로 구제 가능. 최우선 통합 결정은 D1(rotateX 각도) — 이것이 정해져야 cab3d 기하·kid 상한 중 하나가 살아남는다.검증 완료 — 소스 실측(ktx-journey.mjs, ktx-route-data.mjs, ktx-scene-art.mjs, ktx-scene.mjs, styles.css 6069~6535, tests grep)으로 각 공격 벡터를 깨본 결과.

## 공격 1 — 시각 과밀로 정차 타이밍(✋) 놓침

**F1-1 [수정 필요 · CONFIRMED] 정차 단서 소유권 충돌 — 렌즈 간 병합 불가 모순.**
근거: cab3d §1.1은 게이지 5칸+✋을 "대시 우측(right:20%; bottom:38%) 재배치"로 유지하고 §7에서 조준선(63%)+마커별을 추가. cockpit §B는 `distanceGauge` 사용을 중단하고 ✋을 접근 스트립(right 108px, bottom 112px) 위로 이설. 같은 ✋·게이지 DOM을 두 렌즈가 서로 다른 곳에 놓는다 — 그대로 병합하면 정차 단서가 게이지·✋·조준선+별·미니열차 스트립 4중, 위치는 대시우/중앙우/우중 3분산. 4세는 단서 1개만 추적한다.
대안: 단일 소유자 지정. cockpit의 접근 스트립("초록에 닿으면 ⎵" — 문해력 불요, ✋ 인접 배치)을 정차 단서 원본으로 채택, cab3d의 조준선·게이지 재배치는 삭제하거나 스트립에 흡수.

**F1-2 [수정 필요] cab3d에 존 디클러터 부재.**
근거: kid §6(zone-enter → 기둥 감쇠·balloonOn 억제)이 cab3d 스펙에 반영 안 됨 — 존 120m 안에서도 킬로포스트·기둥 스폰 지속 + 가장 큰 자극(성장하는 승강장)이 model-driven으로 커진다. 동시 기둥도 cab3d ~4개 vs kid 상한 3개.
대안: cab3d에 `data-zone` 감쇠 규칙 채택 명시(kid 스펙 그대로), 기둥 스태거를 3개 상한으로.

**반증 실패(부분)**: "과밀 때문에 게임이 깨진다"까지는 성립 안 함. 모델이 press 창 2.0s를 봉투 수렴 후 속도로 보장(ktx-journey.mjs 289행 주석 + ENVELOPE_FLOOR=35 실측), armed 40m/35km/h ≈ 4.1s 무장 구간 + armed 이벤트·음성 유지. 과밀 리스크는 별 수 저하(3→2)이지 판정 불능이 아님.

## 공격 2 — 계기판 어른용 변질

**F2-1 [수정 필요 · CONFIRMED] cockpit 텍스트 의존 계기 3종은 프리리더에게 소음.**
근거: 전광판("다음역 ▶ 대전"), 크루즈 필("고정속도 209"), next-key 워드부. 도하 하한 4세는 한글 미해득 — 로블록스 레퍼런스(어른 UI)의 직역. 완화 요소 인정: next-key는 kbd 글리프(⎵/↑)가 실질 정보고, 존 진입 시 전광판·문 패널 opacity .45 감쇠가 스펙에 이미 있음.
대안: 크루즈 필 삭제(레버 D 위치가 동일 정보의 중복), 전광판은 다음역 캐릭터 얼굴+아이콘 병기. 7계기 → 5계기로 감량.

**F2-2 [수정 필요 · CONFIRMED] 대시 높이 모순으로 기하 불성립.**
근거: cab3d 21%(스테이지 540px 기준 113px) vs cockpit 28%(151px) + 200px 속도계 다이얼. 21% 대시에 cockpit 계기는 물리적으로 안 들어간다. 통합 수치 재협상 없이는 두 스펙 동시 구현 불가.
대안: cockpit의 28% + binnacle(다이얼이 립 위로 솟음)을 기준으로 cab3d §1 표 갱신.

**반증 실패**: "바늘 다이얼 자체가 어른용" 공격은 실패. 각도=속도의 아날로그 매핑은 숫자보다 프리리더 친화적이고, 존 아크 3색은 교육적. 두 렌즈의 바늘 공식(v×0.8−120)도 동일해 충돌 없음.

## 공격 3 — 원근 뷰 멀미/공포

**F3-1 [수정 필요] 터널 포털 "삼킴" 연출 + 암전 상향이 kid 상한 위반.**
근거: cab3d §6 — #141a28 근흑 구멍이 scale 30(6000px)으로 화면 전체를 덮으며 돌진 + 암전 .45→.5 상향. 현행 .45는 아이가 이미 수용 중(styles.css 6077행 실측, 사용자 게임플레이 만족 확인)이나 "검은 구멍이 얼굴로 돌진"은 신규 자극이고, kid §1은 ".45가 최댓값"을 명시 — 직접 충돌.
대안: 홀 색 #262c3a(기존 tunnel accent 토큰)로 상향, 암전 .45 유지, 포털 최종 scale 30→12(통과감은 유지, 삼킴 제거). 출구 플래시 .32 상한은 적절 — 반증 실패.

**F3-2 [수정 필요] 상시 스웨이·교행 셰이크가 kid 진동 상한 위반.**
근거: cab3d §8.2 스웨이 3.8s infinite ±3px + §5 교행 셰이크 .5s ±3px vs kid §1 "셰이크는 sprint300 1-shot ±2px만, 상시 진동 금지". 상시 수직 미동은 캡 프레임의 정지 기준틀(멀미 완화) 효과를 상쇄.
대안: 스웨이 진폭 1px로 축소 또는 삭제, 교행 셰이크 ±2px 준수.

**반증 실패(불확실 명시)**: "1인칭 optical flow(하단 630px/s, 지물 32× 성장) 자체가 4세 멀미 유발" — 6세 미만 VIMS 감수성 문헌 근거 부족으로 확증도 반증도 불가. 고정 캡 프레임(필러+대시)이 표준 완화책으로 스펙에 포함돼 있음은 인정. kid의 perspective≥700px/rotateX 52-60° 규칙과 cab3d 500px/84°는 좌표계가 달라(origin-top 방식) 직접 비교 무효 — 이 수치 충돌은 노이즈에 가까우나 통합 문서에서 한쪽으로 정리 필요.

## 공격 4 — 승하차 안무 지루함

**반증 실패 · CONFIRMED(안전)**: BOARD_LOCK_MS=1200 소스 확인(ktx-journey.mjs 39행) — sideview 걷기 780ms < 1200ms로 1인당 리듬 불변. 세기 팝 300ms 지연도 lock 내 완결. "1인당 1200ms 상한" 조건 충족. 연타 우려도 lockMs 게이트(239행)로 겹침 불가 — 노이즈. 출발 컷 900ms 지연은 1회성 + "열차가 움직이기 시작하는 걸 본다"는 보상이 있어 [트레이드오프] 수용.

## 공격 5 — 문 닫기 UX 변경이 기존 학습을 깨는가

**반증 실패(대체로)**: pressKtxSpace boarding+빈 대기열→closeDoors 경로 유지 명시(sideview §6.5, 소스 242행 실측 일치) — "Space로 닫는다" 학습 무손상. ↑ 지름길은 기존 ready phase의 `held.up → depart`(소스 361행 실측)와 정합 — "↑=출발" 멘탈 모델을 오히려 일관화. 12s를 테스트가 핀하지 않음도 grep으로 확인(렌즈 주장 CONFIRMED).

**F5-1 [트레이드오프] 감상 시간 12s→5.2s 단축 + 카운트다운 재촉.**
근거: 마지막 승객 창문 얼굴 점등(t=630~900ms)·글로우(~1100ms) 직후 lock 만료(1200ms)와 동시에 4s 카운트다운 비프 시작 — 결과 애니메이션을 반복 감상하는 4~6세 성향에 재촉 압력 신규 도입. 벌점은 없어 설계 무효는 아님.
대안: DOOR_COUNTDOWN_MS 4000→6000, 또는 카운트다운 시작에 lock 만료 후 1.5s 유예.

## 공격 6 — 파스텔 붕괴

**F6-1 [수정 필요 · CONFIRMED] 신규 HEX 대량 도입이 kid의 색 거버넌스·신규 테스트와 정면 충돌.**
근거: 소스 팔레트 전수 추출 결과 cab3d의 #7f8894/#c8ccd4/#b9ac93/#b9c4d0/#7d8b7a/#ded3ab/#6b7686/#3b455c/#141a28/#40265e/#0d3a72, sideview의 #2a3648/#4a5a72/#cfd9e4/#cfe3f5/#b98a5a 등이 기존 토큰 집합에 없음. kid §7의 ktx-scene-art.test 계획("신규 지물 색이 토큰 집합 내")대로 구현하면 두 렌즈 스펙이 즉시 테스트 실패. "붕괴"까지는 아님 — 지면 64%는 gskin land 파스텔이라 총량 유지, 회색은 레일·와이어 등 선형 요소 국한. 단 city 밴드는 지면 회청+레일 회색+암색 캡 프레임이 겹쳐 저채도 화면.
대안: gskin은 LAND_PALETTES.base 그대로(city #9fb0c2 기존값), 신규 회색은 RAIL(#8d95a0) 밝기 파생 2단계로 토큰화해 테스트 허용 집합에 등재. 캡 프레임 #40265e/#0d3a72는 train.nose 기존값으로 대체 검토.

**F6-2 [수정 필요 · CONFIRMED] sideview 문 경고 2Hz 점멸이 kid 명멸 규칙·스타일 테스트에 걸림.**
근거: `ktx-warn .5s step-end infinite` vs kid §1 "0.8s 미만 infinite 금지" + §7 regex 테스트(`.5s…infinite` 매치). WCAG 2.3.1(3Hz)에는 미달이라 안전 자체는 통과 — 렌즈 간 계약 충돌.
대안: 주기 1s로 완화(예고 기능 유지).

## 공격 7 — reduced-motion에서 게임 성립

**반증 실패(게임 성립함)**: 판정 재료 전부 모델 구동 이산 갱신 — ties·미니열차·승강장은 transition만 제거되고 150ms 스텝 위치 갱신은 유지, ✋은 blink만 끄고 opacity 1 유지(현행 6532행 블록 관례 확인), 숫자+음성+게이지 채널 보존. 세 렌즈 모두 이 원칙 준수.

**F7-1 [수정 필요, 경미] cab3d `.ktx-lineside display:none`이 킬로포스트 카운트다운(4→3→2→1 세기 교육 접점)까지 제거.**
대안: reduced-motion에서 킬로포스트만 정적 표시(HUD 숫자)로 대체. 또 cockpit reduced-motion에서 `.ktx-door-countdown` 숫자 텍스트 잔존 여부 명시 필요, 세 렌즈가 각자 확장하는 reduced-motion 블록의 최종 병합 소유자 지정 필요.

## 메타 발견

**M1 [수정 필요 · CONFIRMED] cab3d "app.mjs 변경 0줄" 전제 vs cockpit·sideview의 app.mjs 변경 — 스로틀 정보 이중 경로.**
cab3d는 노치 레버를 vΔ 추론으로, cockpit은 `state.ktxHeld` 직접 전달로 구동 — 같은 정보의 중복 구현. held 전달이 0-지연으로 우월하므로 cab3d의 vΔ 추론(§1.1 `data-throttle`)은 폐기하고 cockpit의 `data-lever`로 통일 권장.

**M2 [노이즈] "씬 DOM 테스트 0개" 주장** — tests/ 전수 grep으로 ktx-journey.test.mjs(모델만)임을 재확인. 세 렌즈 공통 전제 CONFIRMED, 공격 실패.

**종합**: 설계 무효 0건. 렌즈 각각은 4세 관점 방어선(벌점 없음, 판정 창 모델 보장, Space 학습 보존, reduced-motion 성립)을 지켰다. 실제 위험은 개별 렌즈가 아니라 **3렌즈 병합 시의 상호 모순**(정차 단서 4중화 F1-1, 대시 기하 F2-2, 색·명멸 거버넌스 F6-1/F6-2, 스로틀 이중 경로 M1) — 통합 조정자가 이 5건을 판정하지 않으면 구현 단계에서 kid 렌즈의 신규 테스트가 다른 두 렌즈 스펙을 즉시 깬다.반증 완료 — 소스 실측(tests/ktx-journey.test.mjs 21개 전수, src/ktx-journey.mjs, src/ktx-scene.mjs, src/app.mjs 1038–1242·1693–1815, src/ktx-scene-art.mjs, styles.css 5940–6535) 기준. 심각도순.

## A. 확정 결함 (CONFIRMED)

**A1. [수정 필요·상] cab3d §3 침목 델타 — depart 리셋 흡수 주장이 거짓**
근거: segIndex 증가는 도착 시(src/ktx-journey.mjs:148 `arriveStopped`)이고, depart는 x:0으로 리셋하되 segIndex 불변(src/ktx-journey.mjs:215–230). 정차~boarding 틱 동안 meta.prevX는 마커값(~4370)으로 갱신돼 있으므로, depart 틱에 `segIndex===prevSeg && x=0` → dxM = −4370. `dxM=0 분기(구간 전환)`는 발동 안 함. tiePx가 −4370px로 영구 오프셋(wrap은 ≥640만 처리) → 2구간부터 침목이 화면 밖. 최소 수정: `const dxM = (state.segIndex===meta.prevSeg && Math.abs(state.x-meta.prevX) < 50) ? state.x-meta.prevX : 0;` (correcting 틱당 최대 −0.9m라 50 가드는 오버런 후진 연출 보존).

**A2. [수정 필요·상] cab3d §9 "finale 기존대로 최상위" 무효**
근거: `.ktx-stage`(position:relative, z auto)·`.ktx-view`(absolute, z auto)는 스태킹 컨텍스트를 만들지 않음 → 신설 `.ktx-cab-dash` z10·`.ktx-cab-frame` z9가 `.ktx-finale` z-index:5(styles.css:6463)와 같은 컨텍스트에서 경쟁해 finale를 덮는다(현재는 cab 요소에 z가 없어서만 finale가 이겼음). 게다가 `.ktx-view`는 opacity 크로스페이드 중에만 일시 스태킹 컨텍스트가 생겨 페이드 중/후 적층이 달라짐. 최소 수정: kid 렌즈안(finale z 30) 채택 + `.ktx-view { isolation: isolate }`.

**A3. [수정 필요·중] cab3d §1 `.ktx-cab-horizon` 좌표 기준 오류**
근거: horizon은 `.ktx-cab-backdrop`의 자식(src/ktx-scene.mjs:103–105, 현행 CSS styles.css:6050 `inset:auto 0 0 0; height:26%`도 backdrop 기준). 스펙의 `inset:auto 0 64% 0; height:12%`는 스테이지 기준 수치인데 backdrop(높이 36%) 기준으로 해석되어 스트립이 지평선(y36%)이 아니라 backdrop 중간(~스테이지 y9–13%)에 뜬다. 최소 수정: backdrop 기준으로 `bottom:0; height:33.3%`.

**A4. [수정 필요·중] kid §7 스타일 테스트 ↔ sideview·cab3d 애니메이션 스펙 정면 충돌**
- sideview §5 `ktx-warn .5s step-end infinite`(문 경고 2Hz)는 kid §1 명멸 상한(주기 ≥0.8s)과 kid 테스트 regex `/animation:[^;]*0?\.[0-7]\d*s[^;]*infinite/` 매치 → 구현 즉시 신규 테스트 실패.
- cab3d §8.1 스피드라인 480/650ms infinite, sideview `--streak-dur .4s/.6s`도 동일 취지 위반(var 간접이라 regex만 회피 — 테스트가 형해화).
최소 수정: 문 경고 주기 1s(4s 카운트다운에 4회 점멸로 충분), 스트릭은 kid 렌즈와 상한 재합의 후 regex를 var 포함형으로 정비.

**A5. [설계 무효(정합 불가) — 병합 결정 필요] cab 뷰 기하·대시가 3안으로 상충**
같은 요소에 세 값: 하늘/트랙 경계(cab3d 36% vs cockpit 44–48% vs kid 44%), perspective(500 vs — vs ≥700 상한규칙), rotateX(84° vs — vs 52–60° 고정 규칙 → cab3d 84°는 kid 상한 명시 위반), 대시 높이(21% vs 28%), 바늘(DOM div `.ktx-needle` vs SVG g), dash viewBox(1000×150 vs 1000×220), 정차 게이지(cab3d "5칸 클래스·로직 그대로" vs cockpit "gauge/palm/door-lamp DOM 교체→접근 스트립"), 캡 프레임(CSS pseudo vs `cabFrameSvg`), 트랙(cab3d cabTrackSvg 삭제 vs cockpit z2 `.ktx-cab-track` 유지). 기존 테스트는 안 깨지나(§C1) 두 스펙을 그대로 합치면 같은 셀렉터에 상충 구현. 렌즈 단일화(계기=cockpit, 세계=cab3d 식 소유권 분할 + 수치 단일표) 없이는 구현 착수 불가. 부속 충돌: speedTier 공식(cab3d `floor(v/60)` vs sideview·kid `ceil(v/60)` — v=59에서 0 vs 1), kid 테스트안이 `.ktx-tie-belt`+`--belt-px`(worldPx×3)를 핀하는데 cab3d는 `.ktx-ties`+델타 누적 — 클래스·알고리즘 모두 불일치.

**A6. [수정 필요·소] 3건**
- sideview §4 창 글로우: `.ktx-window-glow { animation: … 700ms both }` 무조건 선언은 마운트 시 1회 재생으로 끝, 탑승 순간엔 안 터짐. updateWindows는 `slot.dataset.filled`를 바꾸므로(src/ktx-scene.mjs:247) `[data-filled]:not([data-filled=""]) .ktx-window-glow`로 조건화하면 해결(image만 remove하므로 프리베이크 rect 잔존은 확인 ✓ :249–250).
- cab3d §5 캡 셰이크: `.ktx-scene-sway`에 pulse 클래스를 걸면 animation 쇼트핸드가 상시 sway(§8.2)를 대체 → 종료 후 sway 위상 리셋 점프. 셰이크는 자식 래퍼에 분리.
- cab3d §7 `.ktx-cab-platform`의 `[data-nearstop="true"]` — 이 속성은 `.ktx-view-side`에만 세팅됨(src/ktx-scene.mjs:324–325), cab 승강장의 조상이 아님. 씬에서 root(또는 view-cab)에도 세팅 필요.

## B. 트레이드오프 (사용자/대장 결정 필요)

**B1. depart→cab 900ms 지연(sideview §7)**: kid §3 "카메라 컷 불변" 및 cab3d §7 "기존 흐름 그대로" 전제와 상충. 기능 파손은 없음 — updateKtxScene은 뷰 무관하게 양쪽 DOM을 갱신하므로 지연 중 cab 상태 오염 없음(검증: src/app.mjs:1207은 매 틱 호출). 단 아이가 지연 창에서 3(side)을 명시 선택하면 900ms 콜백이 cab으로 덮어씀 — 콜백에 "지연 시작 후 사용자가 switchKtxView 했으면 skip"(ktxViewMs 비교) 가드 권장.

**B2. kid §1 지물 상한 vs cab3d §4.3**: 킬로포스트·속도표지·신호기는 kid가 명시적으로 "기둥과 택일" 제외, 동시 기둥도 ≤3 vs cab3d ~4개. cab3d gskin 신규 HEX 5종(#b9c4d0 등)도 kid 색 규칙(신규 HEX 금지) 위반. 어느 쪽이 이기는지 확정 필요.

## C. 반증 실패 (깨려고 시도했으나 계약 안전 확인)

**C1. 씬 DOM 개편은 기존 테스트를 못 깬다** — grep 전수: tests/ktx-journey.test.mjs는 모델 2모듈만 import(:14,:22), tests/app-contract.test.mjs는 홈 카드 `["ktx","7","seven"]`만, tests/srt-journey-art.test.mjs는 별개 모듈(src/srt-journey-art.mjs). 세 렌즈의 "씬 자유" 전제 유효. 단 실질 계약은 updateKtxScene 내부 셀렉터 — 특히 `.ktx-speed-number`(src/ktx-scene.mjs:292, **null 가드 없음** → 제거 시 즉시 크래시), `.ktx-platform`(:317), `.ktx-view-side`(:324), `.ktx-queue`(:267), `.ktx-event-stage`(:377). 세 렌즈 모두 유지 선언 ✓.

**C2. 문 자동 닫힘(sideview §6) vs 21개 테스트** — 전수 추적 결과 무충돌. "마지막 승객 뒤 1.2초 잠금"(tests:110–122): drain 1500ms는 잠금 1200 소진 후 카운트다운 잔여 ~3.7s 상태에서 Space → `closeDoors`가 events[0]=doors-closed 유지 ✓. `readyToDrive` 헬퍼 동일 ✓. 무스톨(tests:214)·퍼즈(tests:229): 4s < 12s라 진행만 빨라짐, held.up 지름길도 "빈 대기열" 한정이라 세기 루프 무손상 ✓. "탑승 방치"(tests:248): hint/auto-board만 검사 ✓. 12s boarding auto-close 삭제: ASSIST_IDLE_MS를 핀하는 테스트는 ready auto-depart(drain 13000, tests:199)와 stopped auto-open 경유뿐 — 그 분기들은 유지 대상이라 안전. deepEqual은 manifest/schedule만(tests:91) → 신규 필드 doorCountdownMs 무해. 단 held.up 지름길은 기존 lockMs 이른 리턴(src/ktx-journey.mjs:320–322) **뒤**에 둬야 잠금 의미 유지(스펙 구조상 자연 충족).

**C3. 수치 검산 통과**: cockpit 접근 스트립 스케일(1.3833px/m — d=19.6에서 코끝 x≈183=⭐⭐⭐밴드 시작, d=34.6에서 162=2별 밴드, ARM 40m→155 전부 정합), cab3d 원근 클리핑(500·sin84°=497.3<500), 무봉합 wrap(640=16×40, pulse 리플로 이디엄 유효), 터널 포털 밴드 계산(seg2 bands[1].until 0.55×4800 ✓), kid의 "이벤트 until≤0.95 < 존 시작" 여백(실측 최소 0.9714 — kid의 0.973은 미세 오기, 결론 불변).

## D. 노이즈

cab3d 킬로포스트 "4→3→2→1"은 구간 4.4~4.8km라 실제 5부터 · cab3d speed-tier "0=(v<20)" 서술과 floor(v/60) 공식 불일치 · sideview 워커 74px 상수는 스테이지 폭 가변(min(97vw,1760px))에 취약하나 1280 전제면 수용 · passing eventSpriteSvg 제거 시 `.ktx-event-stage[data-event="passing"]`가 빈 채 opacity:1(styles.css:6333) — 무해 · sideview 교행 infinite 5.5s 루프는 같은 열차가 이벤트 창(~12s) 동안 2–3회 재등장 — kid "급습 금지"와 감성 마찰 · correcting 중 data-moving=false라 바퀴 정지(뒤로 통통과 미세 불일치) · kid 거부권 6 "그라디언트 금지"는 자기 §5 repeating-linear-gradient와 모순(SVG 그라디언트 한정으로 읽어야 — 기존 CSS 그라디언트 선례 styles.css:6207) · cockpit이 door-lamp DOM을 교체하면 sideview §5의 `[data-door-warning] .ktx-door-lamp` 동조 셀렉터 갱신 필요.

**요약 판정**: 모델 추가(문 카운트다운)는 테스트 계약과 양립(C2). 진짜 위험은 테스트가 아니라 (1) cab3d 침목 depart 버그(A1) — 스펙 그대로 구현하면 2구간부터 속도감 소실, (2) finale 적층(A2), (3) 세 렌즈의 cab 기하·대시 소유권 미정(A5)과 kid 테스트안이 타 렌즈 구현을 즉시 떨어뜨리는 상수 불일치(A4·A5) — 구현 전 단일 수치표 합의가 선행 조건.