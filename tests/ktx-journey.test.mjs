import test from "node:test";
import assert from "node:assert/strict";
import {
  ARM_DISTANCE,
  ENVELOPE_FLOOR,
  KTX_SEGMENTS,
  KTX_STATIONS,
  MAX_SPEED,
  STAR3_WINDOW,
  ZONE_LENGTH,
  envelopeSpeed,
  segmentBand,
  stopDistance
} from "../src/ktx-route-data.mjs";
import {
  DOOR_COUNTDOWN_MS,
  createKtxJourney,
  distanceGauge,
  distanceToMarker,
  ktxSummary,
  pressKtxSpace,
  routeSegments,
  selectKtxRoute,
  tickKtx
} from "../src/ktx-journey.mjs";
import { KTX_ROUTES, KTX_ROUTE_STATIONS } from "../src/ktx-route-data.mjs";
import { mulberry } from "../src/ktx-route-data.mjs";

const TICK = 150;

function drain(state, held, ms) {
  let current = state;
  const events = [];
  for (let spent = 0; spent < ms; spent += TICK) {
    const result = tickKtx(current, held, TICK);
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events };
}

// 수서 탑승을 끝내고 문 닫고 출발 준비까지.
function readyToDrive(state) {
  let current = state;
  while (current.queue.length > 0) current = pressKtxSpace(current).state;
  current = drain(current, {}, 1500).state;         // 합계 잠금 해제
  current = pressKtxSpace(current).state;           // 문 닫기
  assert.equal(current.phase, "ready");
  return current;
}

test("노선 데이터가 정합하다 — 5역 4구간, 밴드는 1로 끝난다", () => {
  assert.equal(KTX_STATIONS.length, 5);
  assert.equal(KTX_STATIONS[0], "수서");
  assert.equal(KTX_STATIONS.at(-1), "부산");
  assert.equal(KTX_SEGMENTS.length, 4);
  KTX_SEGMENTS.forEach((seg, index) => {
    assert.equal(seg.from, KTX_STATIONS[index]);
    assert.equal(seg.to, KTX_STATIONS[index + 1]);
    assert.ok(seg.length > ZONE_LENGTH * 3, `${seg.to} 구간 길이`);
    assert.equal(seg.bands.at(-1).until, 1, `${seg.to} 밴드 끝`);
    for (const event of seg.events) {
      assert.ok(event.at < event.until && event.until <= 1, event.type);
    }
  });
});

test("사용자 요구 배경 4종(바다·산·터널·밤)이 전부 노선에 있다", () => {
  const lands = new Set();
  const skies = new Set();
  for (const seg of KTX_SEGMENTS) {
    for (const band of seg.bands) {
      lands.add(band.land);
      skies.add(band.sky);
    }
  }
  for (const wanted of ["sea", "mountain", "tunnel"]) {
    assert.ok(lands.has(wanted), wanted);
  }
  assert.ok(skies.has("night"), "밤 하늘");
});

test("봉투는 바닥 35와 천장 300을 지킨다", () => {
  assert.equal(envelopeSpeed(10000), MAX_SPEED);
  assert.equal(envelopeSpeed(4), ENVELOPE_FLOOR, "가까우면 바닥");
  assert.equal(envelopeSpeed(-5), ENVELOPE_FLOOR, "지나쳐도 바닥");
  assert.ok(Math.abs(envelopeSpeed(625) - 300) < 1, "12·√625 = 300");
  // 바닥이 없으면 마커에서 저절로 서는 결함 — 바닥 실존이 별 변별의 전제
  assert.ok(stopDistance(ENVELOPE_FLOOR) > 5 && stopDistance(ENVELOPE_FLOOR) < 15);
});

test("같은 시드는 같은 여정을 만든다", () => {
  const one = createKtxJourney(42, "ktx");
  const two = createKtxJourney(42, "ktx");
  assert.deepEqual(one.manifest, two.manifest);
  assert.deepEqual(one.schedule, two.schedule);
  assert.equal(one.train.id, "ktx");
  assert.equal(createKtxJourney(1, "없는기차").train.id, "srt", "모르면 SRT");
});

test("수서에서 문이 열린 채 시작하고 Space로 한 명씩 태운다", () => {
  let state = createKtxJourney(3);
  assert.equal(state.phase, "boarding");
  assert.equal(state.doors, "open");
  assert.ok(state.queue.length >= 3);

  const first = pressKtxSpace(state);
  assert.equal(first.events[0].type, "boarded");
  assert.equal(first.events[0].ordinal, 1, "세기는 그 역에서 탄 인원");
  state = first.state;
  assert.equal(state.boarded.length, 1);
});

test("마지막 승객 뒤 1.2초 잠금 — 그동안 Space는 무시된다", () => {
  let state = createKtxJourney(3);
  while (state.queue.length > 0) state = pressKtxSpace(state).state;
  assert.ok(state.lockMs > 0);
  const during = pressKtxSpace(state);
  assert.equal(during.events.length, 0, "잠금 중 무시");
  assert.equal(during.state.doors, "open");

  state = drain(state, {}, 1500).state;
  const close = pressKtxSpace(state);
  assert.equal(close.events[0].type, "doors-closed");
  assert.equal(close.state.phase, "ready");
});

test("다 태우면 문이 스스로 닫힌다 — 6초 카운트다운, 3·2·1만 알린다", () => {
  let state = createKtxJourney(3);
  while (state.queue.length > 0) state = pressKtxSpace(state).state;
  const run = drain(state, {}, 1500 + DOOR_COUNTDOWN_MS + 300);
  const types = run.events.map(event => event.type);
  assert.ok(types.includes("door-countdown-start"), "카운트다운 시작");
  const seconds = run.events
    .filter(event => event.type === "door-countdown")
    .map(event => event.secondsLeft);
  assert.deepEqual(seconds, [3, 2, 1], "앞 3초는 감상 유예, 알림은 3·2·1만");
  assert.ok(types.includes("doors-closed"), "자동 문닫힘");
  assert.equal(run.state.phase, "ready");
  assert.equal(run.state.doorCountdownMs, null, "닫힐 때 리셋(경고 램프 소등)");
});

test("다 태운 뒤 ↑만 잡아도 문 닫고 출발한다 — Space 함정 해소", () => {
  let state = createKtxJourney(3);
  while (state.queue.length > 0) state = pressKtxSpace(state).state;
  state = drain(state, {}, 1500).state;             // 합계 잠금 해제
  const run = drain(state, { up: true }, 600);       // ↑ 홀드만
  const types = run.events.map(event => event.type);
  assert.ok(types.includes("doors-closed"), "↑ 지름길이 문을 닫는다");
  assert.ok(types.includes("depart"), "이어서 바로 출발");
  assert.equal(run.state.phase, "driving");
});

test("카운트다운 중 Space는 즉시 닫는다 — 기존 학습 보존", () => {
  let state = createKtxJourney(3);
  while (state.queue.length > 0) state = pressKtxSpace(state).state;
  state = drain(state, {}, 3000).state;              // 잠금 해제 + 카운트다운 진입
  assert.ok(state.doorCountdownMs !== null && state.doorCountdownMs > 0);
  const close = pressKtxSpace(state);
  assert.equal(close.events[0].type, "doors-closed");
  assert.equal(close.state.doorCountdownMs, null);
});

test("↑를 놓아도 감속하지 않는다 — 코스트 순항", () => {
  let state = readyToDrive(createKtxJourney(3));
  state = drain(state, { up: true }, 6000).state;   // 6초 가속
  const cruising = state.v;
  assert.ok(cruising > 60, `가속됨: ${cruising}`);
  state = drain(state, {}, 6000).state;              // 6초 방치
  assert.equal(Math.round(state.v), Math.round(cruising), "놓아도 그대로");
});

test("전속으로 달려도 봉투가 역 앞에서 느리게 만든다", () => {
  let state = readyToDrive(createKtxJourney(3));
  let armed = false;
  for (let guard = 0; guard < 2000 && !armed; guard += 1) {
    const result = tickKtx(state, { up: true }, TICK);
    state = result.state;
    if (result.events.some(event => event.type === "armed")) armed = true;
  }
  assert.ok(armed, "무장 구간에 닿는다");
  // 무장 다음 틱에는 판정 속도 35로 수렴해 있어야 한다(협회 확정 규칙)
  state = tickKtx(state, { up: true }, TICK).state;
  assert.ok(state.v <= ENVELOPE_FLOOR + 0.1,
    `무장 후 속도 ${state.v} → 판정 속도로 수렴`);
});

test("무장 구간에서 마커 근처 Space는 ⭐⭐⭐", () => {
  let state = readyToDrive(createKtxJourney(3));
  // 무장까지 달린다
  for (let guard = 0; guard < 3000 && !state.armed; guard += 1) {
    state = tickKtx(state, { up: true }, TICK).state;
  }
  // 예측 정지점이 마커 ±10m에 들어올 때까지 조금씩 전진
  while (distanceToMarker(state) -
    stopDistance(Math.min(state.v, ENVELOPE_FLOOR)) > STAR3_WINDOW - 2) {
    state = tickKtx(state, {}, TICK).state;
    assert.equal(state.phase, "driving", "아직 달리는 중");
  }
  const press = pressKtxSpace(state);
  assert.equal(press.events[0].type, "stopping");
  assert.equal(press.events[0].stars, 3, "딱 맞춘 별");

  let stopped = press.state;
  for (let guard = 0; guard < 100 && stopped.phase !== "stopped"; guard += 1) {
    stopped = tickKtx(stopped, {}, TICK).state;
  }
  assert.equal(stopped.phase, "stopped");
  assert.equal(stopped.stars[0], 3);
  assert.equal(stopped.station, "동탄");
});

test("존 진입 후 너무 이른 Space는 크리프 + 코칭(벌 없음)", () => {
  let state = readyToDrive(createKtxJourney(3));
  for (let guard = 0; guard < 3000 && !state.zoneEntered; guard += 1) {
    state = tickKtx(state, { up: true }, TICK).state;
  }
  assert.ok(distanceToMarker(state) > ARM_DISTANCE, "아직 무장 전");
  const early = pressKtxSpace(state);
  assert.equal(early.events[0].type, "early-stop");
  assert.ok(early.state.v <= ENVELOPE_FLOOR + 0.1, "크리프 속도로");
  assert.equal(early.state.phase, "driving", "달리기는 계속");
});

test("SRT는 존 밖에서 부스터, 존 안에서는 정지 조작이다", () => {
  let state = readyToDrive(createKtxJourney(3));
  const boost = pressKtxSpace({ ...state, phase: "driving" });
  assert.equal(boost.events[0]?.type, "boost-start", "존 밖에서는 부스터");

  for (let guard = 0; guard < 3000 && !state.zoneEntered; guard += 1) {
    state = tickKtx(state, { up: true }, TICK).state;
  }
  const inZone = pressKtxSpace(state);
  assert.notEqual(inZone.events[0]?.type, "boost-start", "존 안에서는 부스터 금지");
});

test("아무것도 누르지 않으면 오버런 → 통통 복귀 → 별 1개", () => {
  let state = readyToDrive(createKtxJourney(3));
  state = drain(state, {}, 13000).state;            // 자동 크리프 출발 대기
  assert.equal(state.phase, "driving");
  assert.ok(state.assist, "어시스트가 잡았다");

  const seen = [];
  for (let guard = 0; guard < 6000 && state.phase !== "stopped"; guard += 1) {
    const result = tickKtx(state, {}, TICK);
    state = result.state;
    seen.push(...result.events.map(event => event.type));
  }
  assert.ok(seen.includes("overrun"), "오버런 발생");
  assert.equal(state.phase, "stopped");
  assert.equal(state.stars[0], 1, "그래도 별 1개");
});

// 동탄 문 닫힘 직후(분기 화면)까지 자동으로 몰아간다.
function atBranch(seed = 3) {
  let state = readyToDrive(createKtxJourney(seed));
  for (let guard = 0; guard < 4000 && state.phase !== "stopped"; guard += 1) {
    if (state.phase === "driving" && state.armed) {
      state = pressKtxSpace(state).state;
    }
    state = tickKtx(state, { up: true }, TICK).state;
  }
  assert.equal(state.station, "동탄");
  state = pressKtxSpace(state).state;                 // 문 열기
  while (state.queue.length > 0) state = pressKtxSpace(state).state;
  state = drain(state, {}, 1500).state;               // 합계 잠금 해제
  state = pressKtxSpace(state).state;                 // 문 닫기 → 분기
  assert.equal(state.phase, "branch");
  return state;
}

test("목포 노선 데이터가 정합하다 — 동탄 분기, 밤·터널·바다를 지난다", () => {
  assert.deepEqual(KTX_ROUTE_STATIONS.mokpo,
    ["수서", "동탄", "익산", "광주송정", "목포"]);
  const segs = KTX_ROUTES.mokpo;
  assert.equal(segs.length, 4);
  segs.forEach((seg, index) => {
    assert.equal(seg.from, KTX_ROUTE_STATIONS.mokpo[index]);
    assert.equal(seg.to, KTX_ROUTE_STATIONS.mokpo[index + 1]);
    assert.equal(seg.bands.at(-1).until, 1);
  });
  const lands = new Set(segs.flatMap(seg => seg.bands.map(band => band.land)));
  for (const wanted of ["tunnel", "sea"]) assert.ok(lands.has(wanted), wanted);
});

test("동탄에서 문을 닫으면 하늘 분기 화면 — ←목포 고르고 ⎵로 확정", () => {
  let state = atBranch(3);
  const picked = selectKtxRoute(state, "mokpo");
  assert.equal(picked.events[0].type, "route-select");
  state = picked.state;
  const confirmed = pressKtxSpace(state);
  const types = confirmed.events.map(event => event.type);
  assert.ok(types.includes("route-chosen"));
  state = confirmed.state;
  assert.equal(state.route, "mokpo");
  assert.equal(state.phase, "ready");
  assert.ok(Array.isArray(state.manifest.stops["익산"]), "익산 대기열 준비");
  // 이미 태운 수서·동탄 몫은 번호가 그대로(시드 결정성)
  const again = createKtxJourney(3);
  assert.deepEqual(state.manifest.stops["수서"], again.manifest.stops["수서"]);
});

test("분기에서 가만히 있으면 12초 뒤 부산으로 자동 확정 — 무스톨 유지", () => {
  let state = atBranch(5);
  const run = drain(state, {}, 13000);
  assert.equal(run.state.routeChosen, true);
  assert.equal(run.state.route, "busan");
  assert.equal(run.state.phase, "ready");
  assert.ok(run.events.some(event =>
    event.type === "auto" && event.what === "route"));
});

test("목포 노선도 부산처럼 반드시 완주한다", () => {
  let state = atBranch(7);
  state = selectKtxRoute(state, "mokpo").state;
  state = pressKtxSpace(state).state;
  for (let guard = 0; guard < 8000 && !state.done; guard += 1) {
    state = tickKtx(state, {}, TICK).state;
  }
  assert.ok(state.done, "목포 도달");
  assert.equal(state.station, "목포");
  assert.equal(state.stars.length, 4);
});

test("무스톨 불변식: 입력 0으로도 유한 시간 안에 부산 피날레", () => {
  let state = createKtxJourney(9);
  const events = [];
  // 실시간 ~20분 상당의 틱 — 자동 탑승·자동 문·자동 출발·오버런 복귀가 전부 맞물린다
  for (let guard = 0; guard < 8000 && !state.done; guard += 1) {
    const result = tickKtx(state, {}, TICK);
    state = result.state;
    events.push(...result.events.map(event => event.type));
  }
  assert.ok(state.done, "부산 도달");
  assert.ok(events.includes("finale"));
  assert.equal(state.stars.length, 4);
  assert.ok(state.stars.every(count => count >= 1), "별은 항상 1개 이상");
});

test("퍼즈: 아무 입력 뒤 손을 떼도 반드시 완주한다", () => {
  for (let round = 0; round < 12; round += 1) {
    const random = mulberry(round * 31 + 5);
    let state = createKtxJourney(round);
    // 무작위 입력 200틱
    for (let step = 0; step < 200; step += 1) {
      if (random() < 0.25) state = pressKtxSpace(state).state;
      const held = { up: random() < 0.4, down: random() < 0.15 };
      state = tickKtx(state, held, TICK).state;
    }
    // 이후 입력 0
    for (let guard = 0; guard < 9000 && !state.done; guard += 1) {
      state = tickKtx(state, {}, TICK).state;
    }
    assert.ok(state.done, `round ${round} 완주`);
    assert.ok(state.stars.every(count => count >= 1 && count <= 3), `round ${round} 별`);
  }
});

test("탑승을 방치하면 힌트 → 자동 탑승이 이어받는다", () => {
  let state = createKtxJourney(3);
  const first = drain(state, {}, 6000);
  assert.ok(first.events.some(event => event.type === "hint" && event.what === "board"));

  const auto = drain(first.state, {}, 30000);
  assert.ok(auto.events.some(event => event.type === "auto-board-start"));
  assert.ok(auto.events.filter(event => event.type === "boarded").every(event => event.auto));
  assert.equal(auto.state.queue.length, 0, "다 태웠다");
});

test("속도 마일스톤은 구간당 한 번씩만 부른다", () => {
  let state = readyToDrive(createKtxJourney(3));
  const { state: after, events } = drain(state, { up: true }, 30000);
  const milestones = events.filter(event => event.type === "milestone").map(event => event.speed);
  assert.deepEqual([...new Set(milestones)], milestones, "중복 없음");
  assert.ok(milestones.includes(50) && milestones.includes(100));
  void after;
});

test("경적은 이벤트 안에서 3단 에스컬레이션, 밖에서는 베이스라인 로테이션", () => {
  let state = readyToDrive(createKtxJourney(3, "ktx"));
  state = { ...state, phase: "driving" };
  const responses = [];
  for (let index = 0; index < 4; index += 1) {
    const result = pressKtxSpace(state);
    state = result.state;
    responses.push(result.events[0]);
  }
  assert.deepEqual(responses.map(event => event.response).slice(0, 3),
    ["magpie", "scarecrow", "wave"], "베이스라인 로테이션");

  // 이벤트 창 안으로 순간 이동시켜 에스컬레이션 확인
  const seg = KTX_SEGMENTS[0];
  const sprint = seg.events[0];
  state = { ...state, x: seg.length * (sprint.at + 0.01) };
  const levels = [];
  for (let index = 0; index < 5; index += 1) {
    const result = pressKtxSpace(state);
    state = result.state;
    levels.push(result.events[0].level);
  }
  assert.deepEqual(levels, [1, 2, 3, 1, 2], "3단 뒤 반복");
});

test("부스터는 즉시 점프가 아니라 +200 램프다 — 5초에 걸쳐 목표에 닿는다", () => {
  const driving = {
    ...readyToDrive(createKtxJourney(3, "srt")),
    phase: "driving",
    v: 120
  };

  const result = pressKtxSpace(driving);

  // 발동 순간 속도는 그대로 — 한 방에 500이 되지 않는다.
  assert.equal(result.state.v, 120);
  assert.equal(result.state.boostRemainingMs, 5000);
  assert.equal(result.state.boostCooldownMs, 0);
  assert.equal(result.state.boostTarget, 320, "목표 = 발동 속도 +200");
  assert.deepEqual(result.events, [{ type: "boost-start", target: 320 }]);

  // 1초 뒤 +40, 부스터가 살아 있는 동안의 정점은 목표(+200) 근처.
  // 만료 틱에서는 같은 틱 안에서 감쇠가 시작되므로 정점은 만료 직전에 잰다.
  const after1s = tickKtx(result.state, {}, 1000).state;
  assert.ok(Math.abs(after1s.v - 160) < 1, `1초 뒤 160 근처여야 한다: ${after1s.v}`);
  let state = result.state;
  let peak = state.v;
  for (let i = 0; i < 36; i += 1) {
    state = tickKtx(state, {}, 150).state;
    peak = Math.max(peak, state.v);
  }
  assert.ok(peak >= 318 && peak <= 320.5, `정점이 320 근처여야 한다: ${peak}`);
});

test("300에서 부스터를 켜면 제한이 풀려 500까지 — 끝나면 감쇠로 300 복귀", () => {
  const driving = {
    ...readyToDrive(createKtxJourney(3, "srt")),
    phase: "driving",
    v: 300
  };

  const boosted = pressKtxSpace(driving);
  assert.equal(boosted.state.boostTarget, 500, "300 +200 = 절대 상한 500");

  let state = boosted.state;
  for (let i = 0; i < 34; i += 1) state = tickKtx(state, {}, 150).state;
  assert.ok(state.v >= 495, `부스터 끝 무렵 500 근처: ${state.v}`);

  // 만료 뒤에는 뚝 떨어지지 않고 감쇠(45km/h/s)로 300에 돌아온다.
  const justAfter = tickKtx(state, {}, 300).state;
  assert.ok(justAfter.v > 300 && justAfter.v < 500,
    `만료 직후 하드클램프 금지: ${justAfter.v}`);
  for (let i = 0; i < 40; i += 1) state = tickKtx(state, {}, 150).state;
  assert.ok(state.v <= 300.5, `감쇠 후 300 복귀: ${state.v}`);
});

test("부스터가 없는 낮은 속도 발동도 +200만 준다 — 0에서 켜면 200", () => {
  const driving = {
    ...readyToDrive(createKtxJourney(3, "srt")),
    phase: "driving",
    v: 0
  };
  let state = pressKtxSpace(driving).state;
  assert.equal(state.boostTarget, 200);
  for (let i = 0; i < 40; i += 1) state = tickKtx(state, {}, 150).state;
  assert.ok(state.v <= 200.5, `0 발동 목표는 200 이하: ${state.v}`);
});

test("활성 중 Space는 시간을 늘리지 않고 종료 뒤 10초를 기다려야 다시 쓴다", () => {
  const driving = {
    ...readyToDrive(createKtxJourney(3, "srt")),
    phase: "driving"
  };
  let state = pressKtxSpace(driving).state;
  state = tickKtx(state, {}, 1000).state;
  const repeated = pressKtxSpace(state);
  assert.equal(repeated.state.boostRemainingMs, 4000);
  assert.deepEqual(repeated.events, [{
    type: "boost-unavailable",
    remainingMs: 4000
  }]);

  const expired = tickKtx(repeated.state, {}, 4000);
  assert.equal(expired.state.boostRemainingMs, 0);
  assert.equal(expired.state.boostCooldownMs, 10000);
  assert.ok(expired.events.some(event => event.type === "boost-end"));

  const almostReady = tickKtx(expired.state, {}, 9999);
  assert.equal(almostReady.state.boostCooldownMs, 1);
  assert.equal(pressKtxSpace(almostReady.state).events[0].type,
    "boost-unavailable");
  const ready = tickKtx(almostReady.state, {}, 1);
  assert.equal(ready.state.boostCooldownMs, 0);
  assert.ok(ready.events.some(event => event.type === "boost-ready"));
  assert.equal(pressKtxSpace(ready.state).events[0].type, "boost-start");
});

test("15초 큰 틱은 부스터와 쿨다운을 순서대로 모두 소비한다", () => {
  const driving = {
    ...readyToDrive(createKtxJourney(3, "srt")),
    phase: "driving"
  };
  const boosted = pressKtxSpace(driving).state;

  const result = tickKtx(boosted, {},
    15000);

  assert.equal(result.state.boostRemainingMs, 0);
  assert.equal(result.state.boostCooldownMs, 0);
  assert.deepEqual(
    result.events.filter(event => event.type.startsWith("boost-")).map(event => event.type),
    ["boost-end", "boost-ready"]
  );
});

test("잘못되거나 빠진 부스터 카운터는 0으로 보정한다", () => {
  const driving = {
    ...readyToDrive(createKtxJourney(3, "srt")),
    phase: "driving",
    boostRemainingMs: Number.NaN,
    boostCooldownMs: -20
  };

  const result = pressKtxSpace(driving);

  assert.equal(result.events[0].type, "boost-start");
  assert.equal(result.state.boostRemainingMs, 5000);
});

test("쿨다운은 정차 중에도 흐르고 SRT 외 열차는 기존 경적을 쓴다", () => {
  const stopped = {
    ...createKtxJourney(3, "srt"),
    phase: "stopped",
    boostRemainingMs: 0,
    boostCooldownMs: 5000
  };
  const cooled = tickKtx(stopped, {}, 2000);
  assert.equal(cooled.state.boostCooldownMs, 3000);

  const ktxDriving = {
    ...readyToDrive(createKtxJourney(3, "ktx")),
    phase: "driving"
  };
  assert.equal(pressKtxSpace(ktxDriving).events[0].type, "horn");
});

test("역 진입 틱은 부스터를 즉시 끝내고 기존 정차 봉투로 낮춘다", () => {
  const zoneStart = KTX_SEGMENTS[0].length - ZONE_LENGTH;
  const driving = {
    ...readyToDrive(createKtxJourney(3, "srt")),
    phase: "driving",
    // 램프 물리에서는 발동 순간 속도가 그대로다 — 존 경계를 한 틱에 넘도록
    // 최고속으로 달려 들어온다.
    v: 300,
    x: zoneStart - 10
  };
  const boosted = pressKtxSpace(driving).state;

  const result = tickKtx(boosted, {}, 150);

  assert.equal(result.state.zoneEntered, true);
  assert.equal(result.state.boostRemainingMs, 0);
  assert.equal(result.state.boostCooldownMs, 10000);
  assert.ok(result.state.v < 500);
  assert.ok(result.events.some(event =>
    event.type === "boost-end" && event.reason === "station-approach"));

  const spaceAtStation = pressKtxSpace(result.state);
  assert.notEqual(spaceAtStation.events[0].type, "boost-start");
});

test("배경 밴드가 진행률에 따라 바뀌고 알림이 온다", () => {
  const seg = KTX_SEGMENTS[2];                       // 대전→대구: 노을→밤→터널
  assert.equal(segmentBand(seg, 0.1).sky, "sunset");
  assert.equal(segmentBand(seg, 0.6).land, "tunnel");
  assert.equal(segmentBand(seg, 0.99).sky, "night");

  let state = readyToDrive(createKtxJourney(3));
  const { events } = drain(state, { up: true }, 40000);
  assert.ok(events.some(event => event.type === "band"), "밴드 알림 발생");
});

test("도착 후 Space가 문을 열고, 다음 역 친구들이 기다린다", () => {
  let state = createKtxJourney(3);
  for (let guard = 0; guard < 8000 && state.stars.length === 0; guard += 1) {
    state = tickKtx(state, {}, TICK).state;
  }
  assert.equal(state.phase === "stopped" || state.phase === "boarding", true);
  if (state.phase === "stopped") {
    const open = pressKtxSpace(state);
    assert.equal(open.events[0].type, "doors-open");
    assert.equal(open.state.phase, "boarding");
    assert.ok(open.state.queue.length >= 3, "동탄 친구들");
  }
});

test("거리 게이지는 5→0으로 줄어든다", () => {
  let state = readyToDrive(createKtxJourney(3));
  assert.equal(distanceGauge({ ...state, phase: "driving" }), 5, "존 밖은 5");
  for (let guard = 0; guard < 3000 && !state.armed; guard += 1) {
    state = tickKtx(state, { up: true }, TICK).state;
  }
  assert.ok(distanceGauge(state) <= 2, "무장이면 2칸 이하");
});

test("요약은 별 합계와 퍼펙트를 안다", () => {
  const state = createKtxJourney(3);
  const summary = ktxSummary({ ...state, stars: [3, 3, 3, 3], boarded: [1, 2, 3] });
  assert.equal(summary.stars, 12);
  assert.equal(summary.perfect, true);
  assert.equal(ktxSummary({ ...state, stars: [3, 1, 3, 3] }).perfect, false);
});

// ── 게임성 시스템(협회 게임 디자인 2026-08-10) — 서행·부드러운 도착·골드 ──

test("서행 존은 난이도별 개수로 배치되고 0구간·접근 존·이벤트 창을 피한다", () => {
  for (let seed = 0; seed <= 50; seed += 1) {
    for (const [difficulty, expected] of [["easy", 1], ["steady", 1], ["challenge", 2]]) {
      const state = createKtxJourney(seed, "srt", difficulty);
      const zones = state.slowZones;
      assert.equal(zones[0], null, `seed ${seed}: 0구간은 sprint300 몫`);
      const placed = zones.filter(Boolean);
      assert.ok(placed.length <= expected, `seed ${seed} ${difficulty}`);
      zones.forEach((zone, segIndex) => {
        if (!zone) return;
        assert.ok([150, 100].includes(zone.limit), "제한은 음성 자산이 있는 150/100만");
        assert.ok(zone.until <= 0.75 + 1e-9,
          `seed ${seed}: 접근 존(마지막 25%) 침범 금지 — until ${zone.until}`);
        for (const event of state.schedule[segIndex]) {
          assert.ok(zone.until <= event.at || zone.at >= event.until,
            `seed ${seed} 구간 ${segIndex}: 이벤트 ${event.type} 창과 겹침`);
        }
      });
    }
  }
});

test("서행 존은 예고→진입→종료 순서로 알리고 회복하면 성공한다", () => {
  const state = createKtxJourney(7, "srt", "steady");
  const zones = state.slowZones;
  const segIndex = zones.findIndex(Boolean);
  assert.ok(segIndex > 0, "시드 7에 서행 존이 있어야 한다");
  const zone = zones[segIndex];
  const seg = routeSegments(state)[segIndex];

  let driving = {
    ...state, phase: "driving", segIndex,
    x: Math.max(0, zone.at * seg.length - 600), v: 300
  };
  const seen = [];
  // 전반: 300으로 초과 상태 진입(덜컹), 존 안에서 100 아래로 회복
  for (let guard = 0; guard < 600 && driving.phase === "driving"; guard += 1) {
    const inZone = driving.x / seg.length >= zone.at;
    const held = inZone && driving.v > zone.limit - 30 ? { down: true } : {};
    const result = tickKtx(driving, held, 150);
    driving = result.state;
    for (const event of result.events) {
      if (event.type.startsWith("slow-")) seen.push(event);
    }
    if (seen.some(event => event.type === "slow-clear")) break;
  }
  const order = seen.map(event => event.type);
  assert.ok(order.indexOf("slow-warn") !== -1, "예고가 온다");
  assert.ok(order.indexOf("slow-warn") < order.indexOf("slow-enter"), "예고가 진입보다 먼저");
  const clear = seen.find(event => event.type === "slow-clear");
  assert.ok(clear, "존 종료 판정이 온다");
  assert.equal(clear.success, true, "초반 초과 후 회복하면 성공(비율제)");
  assert.ok(driving.bonuses.some(bonus => bonus.type === "slow"), "성공은 배지가 된다");
});

test("서행 내내 과속하면 실패하고 덜컹은 존당 3회 상한이다", () => {
  const state = createKtxJourney(7, "srt", "steady");
  const segIndex = state.slowZones.findIndex(Boolean);
  const zone = state.slowZones[segIndex];
  const seg = routeSegments(state)[segIndex];
  let driving = {
    ...state, phase: "driving", segIndex,
    x: Math.max(0, zone.at * seg.length - 600), v: 300
  };
  let wobbles = 0;
  let clear = null;
  for (let guard = 0; guard < 600 && !clear; guard += 1) {
    const result = tickKtx(driving, { up: true }, 150);
    driving = result.state;
    wobbles += result.events.filter(event => event.type === "slow-wobble").length;
    clear = result.events.find(event => event.type === "slow-clear") ?? null;
  }
  assert.ok(clear, "존을 통과했다");
  assert.equal(clear.success, false, "내내 과속이면 실패");
  assert.ok(wobbles >= 1 && wobbles <= 3, `덜컹 상한 3회: ${wobbles}`);
  assert.equal(driving.bonuses.length, 0, "실패는 배지가 없다 — 벌점도 없다");
});

test("서행 예고 구간에서는 SRT 부스터가 안내와 함께 쉰다", () => {
  const state = createKtxJourney(7, "srt", "steady");
  const segIndex = state.slowZones.findIndex(Boolean);
  const zone = state.slowZones[segIndex];
  const seg = routeSegments(state)[segIndex];
  const driving = {
    ...state, phase: "driving", segIndex,
    x: (zone.at + 0.02) * seg.length, v: 200
  };
  const result = pressKtxSpace(driving);
  assert.deepEqual(result.events,
    [{ type: "boost-unavailable", reason: "slow", remainingMs: 0 }]);
  assert.equal(result.state.boostRemainingMs, 0, "부스터가 켜지지 않는다");
});

test("존 진입 속도가 임계 이하면 부드러운 도착 배지를 받는다", () => {
  const run = entrySpeed => {
    let state = {
      ...createKtxJourney(3, "srt", "steady"),
      phase: "driving",
      x: KTX_SEGMENTS[0].length - ZONE_LENGTH - 5,
      v: entrySpeed
    };
    // 존 진입 → 무장 → 딱 멈추기
    for (let guard = 0; guard < 400 && state.phase === "driving"; guard += 1) {
      state = tickKtx(state, {}, 150).state;
      if (state.armed) break;
    }
    let result = pressKtxSpace(state);
    state = result.state;
    let stopped = null;
    for (let guard = 0; guard < 200 && !stopped; guard += 1) {
      const tick = tickKtx(state, {}, 150);
      state = tick.state;
      stopped = tick.events.find(event => event.type === "stopped") ?? null;
    }
    return { stopped, state };
  };

  const smooth = run(120);
  assert.ok(smooth.stopped, "정차했다");
  assert.equal(smooth.stopped.smooth, true, "120 진입 = 부드러운 도착(임계 140)");
  assert.ok(smooth.state.bonuses.some(bonus => bonus.type === "smooth"));

  const rough = run(300);
  assert.ok(rough.stopped, "정차했다");
  assert.equal(rough.stopped.smooth, false, "300 박치기 진입은 부드럽지 않다");
});

test("골드(±4m)는 도전 난이도에서만 판정되고 배지가 된다", () => {
  const armAt = difficulty => {
    let state = {
      ...createKtxJourney(3, "srt", difficulty),
      phase: "driving",
      x: KTX_SEGMENTS[0].length - ZONE_LENGTH - 5,
      v: 100
    };
    for (let guard = 0; guard < 400 && !state.armed; guard += 1) {
      state = tickKtx(state, {}, 150).state;
    }
    return state;
  };

  // 무장 후 판정 속도는 35로 수렴 — 예측 정지점 오프셋은 결정적이다.
  const challenge = pressKtxSpace(armAt("challenge"));
  const stopping = challenge.events.find(event => event.type === "stopping");
  assert.ok(stopping, "정지 판정이 났다");
  if (Math.abs(stopping.offset) <= 4) {
    assert.equal(stopping.gold, true, "±4m 안이면 골드");
  } else {
    assert.equal(stopping.gold, false);
  }

  const steady = pressKtxSpace(armAt("steady"));
  const steadyStopping = steady.events.find(event => event.type === "stopping");
  assert.equal(steadyStopping.gold, false, "차근차근에서는 골드를 숨긴다");
});

test("피날레는 반짝 배지 목록을 동봉하고 요약은 개수를 안다", () => {
  let state = createKtxJourney(3, "srt", "steady");
  state = {
    ...state,
    bonuses: [{ type: "slow", segIndex: 1 }, { type: "smooth", station: "대전" }]
  };
  assert.equal(ktxSummary(state).bonuses, 2);

  const segs = routeSegments(state);
  const atEnd = {
    ...state,
    phase: "stopped",
    segIndex: segs.length - 1,
    station: "부산",
    stars: [3, 3, 3, 3],
    queue: []
  };
  const result = pressKtxSpace(atEnd);
  const finale = result.events.find(event => event.type === "finale");
  assert.ok(finale, "피날레가 난다");
  assert.equal(finale.bonuses.length, 2, "배지 목록 동봉");
});
