// 칙칙폭폭 기관사 — 음성 큐. 순수 모듈.
//
// 단일 채널 + 대기 1슬롯(협회 공학 렌즈가 3단 덕킹 큐를 축소):
//   P1 안내      = 지금 것을 끊고 즉시 재생
//   P2 세기·칭찬 = 대기 슬롯에 넣고(교체), 재생이 끝나면 이어서
//   P3 리액션    = 바쁘면 그냥 버린다(효과음은 따로 나므로 침묵 아님)
// 예외: 탑승 세기(kind: "count")는 즉시 끊고 재생 — 연타해도 "하나, 둘,
// 셋"의 순서 완전성이 깨지지 않는다(4세 옹호 반증 수용).

export function createVoiceQueue() {
  return { playing: null, waiting: null };
}

// line: { key, priority: 1|2|3, kind? } → { queue, actions }
// actions: [{ do: "cancel" } | { do: "play", key }]
export function enqueueVoice(queue, line) {
  if (line.priority === 1 || line.kind === "count") {
    const actions = queue.playing ? [{ do: "cancel" }] : [];
    actions.push({ do: "play", key: line.key });
    return {
      queue: { playing: line, waiting: line.priority === 1 ? null : queue.waiting },
      actions
    };
  }
  if (!queue.playing) {
    return { queue: { playing: line, waiting: null }, actions: [{ do: "play", key: line.key }] };
  }
  if (line.priority === 2) {
    return { queue: { ...queue, waiting: line }, actions: [] };
  }
  return { queue, actions: [] }; // P3 드롭
}

// 재생이 끝났을 때 — 대기 슬롯이 있으면 이어 튼다.
export function voiceFinished(queue) {
  if (queue.waiting) {
    return {
      queue: { playing: queue.waiting, waiting: null },
      actions: [{ do: "play", key: queue.waiting.key }]
    };
  }
  return { queue: { playing: null, waiting: null }, actions: [] };
}
