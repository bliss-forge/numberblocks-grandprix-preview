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
  tickKtx
} from "../src/ktx-journey.mjs";
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

test("존에서는 경적이 아니라 정지 조작이다", () => {
  let state = readyToDrive(createKtxJourney(3));
  const horn = pressKtxSpace({ ...state, phase: "driving" });
  assert.equal(horn.events[0]?.type, "horn", "존 밖에서는 경적");

  for (let guard = 0; guard < 3000 && !state.zoneEntered; guard += 1) {
    state = tickKtx(state, { up: true }, TICK).state;
  }
  const inZone = pressKtxSpace(state);
  assert.notEqual(inZone.events[0]?.type, "horn", "존 안에서는 경적 금지");
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
  let state = readyToDrive(createKtxJourney(3));
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
