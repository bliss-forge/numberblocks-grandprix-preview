const KEY_DIRECTIONS = Object.freeze({
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right"
});

const BLOCKED_CUES = Object.freeze({
  wall: {
    message: "길이 아니에요. 도로를 따라가 볼까요?",
    voiceKey: null
  },
  "red-light": {
    message: "빨간불이에요. 초록불이 될 때까지 기다려요!",
    voiceKey: "safety-red-light"
  },
  manhole: {
    message: "열린 맨홀이에요. 가까이 가지 말고 돌아가요!",
    voiceKey: "safety-manhole"
  },
  construction: {
    message: "공사 중이에요. 안전 울타리 밖으로 돌아가요!",
    voiceKey: "safety-construction"
  },
  scooter: {
    message: "길에 놓인 킥보드예요. 부딪히지 않게 돌아가요!",
    voiceKey: "safety-scooter"
  },
  bicycle: {
    message: "자전거가 지나가요. 멈추고 지나간 뒤 움직여요!",
    voiceKey: "safety-bicycle"
  },
  car: {
    message: "자동차가 지나가요. 안전한 곳에서 기다려요!",
    voiceKey: "safety-car"
  }
});

export function directionForKey(key) {
  if (typeof key !== "string") return null;
  return KEY_DIRECTIONS[key] ?? KEY_DIRECTIONS[key.toLowerCase()] ?? null;
}

export function safetyCueForEvent(event, nextFriend) {
  if (!event) return null;

  if (event.type === "friend") {
    return nextFriend <= 10
      ? {
          message:
            `${event.number} 친구를 만났어요! 이제 ${nextFriend} 친구를 만나러 가요.`,
          voiceKey: `safety-next-${nextFriend}`,
          tone: "success"
        }
      : {
          message: "친구들을 모두 만났어요. 이제 학교로 가요!",
          voiceKey: "safety-next-10",
          tone: "success"
        };
  }

  if (event.type === "blocked") {
    const cue = BLOCKED_CUES[event.reason] ?? BLOCKED_CUES.wall;
    return { ...cue, tone: "safety" };
  }

  if (event.type === "wrong-friend") {
    return {
      message:
        `${event.number} 친구도 반가워요! 먼저 ${nextFriend} 친구를 만나러 가요.`,
      voiceKey: "safety-wrong-order",
      tone: "guide"
    };
  }

  if (event.type === "need-friends") {
    return {
      message: `학교에 가기 전에 ${event.nextFriend} 친구를 먼저 만나요.`,
      voiceKey: `safety-next-${event.nextFriend}`,
      tone: "guide"
    };
  }

  if (event.type === "complete") {
    return {
      message: "모든 친구를 만났어요! 안전하게 도착했어요!",
      voiceKey: "safety-finish",
      tone: "success"
    };
  }

  return null;
}
