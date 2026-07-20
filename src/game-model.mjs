import {
  buildCharacterSpec,
  characterAsset
} from "./character-spec.mjs";

export const NUMBERBLOCKS = Object.freeze(Object.fromEntries(
  Array.from({ length: 100 }, (_, index) => {
    const number = index + 1;
    const spec = buildCharacterSpec(number);
    return [number, Object.freeze({
      rows: spec.canvas.grid[1],
      cols: spec.canvas.grid[0],
      asset: characterAsset(number)
    })];
  })
));

export const DIFFICULTY_LIMITS = Object.freeze({
  easy: Object.freeze({ count: 10, add: 10, sub: 10, mul: 10 }),
  steady: Object.freeze({ count: 20, add: 50, sub: 20, mul: 50 }),
  challenge: Object.freeze({ count: null, add: 150, sub: 50, mul: 150 })
});

const pick = (items, rng) =>
  items[Math.min(items.length - 1, Math.floor(rng() * items.length))];

export function normalizeDifficulty(value) {
  return Object.hasOwn(DIFFICULTY_LIMITS, value) ? value : "steady";
}

export function isModeAvailable(mode, difficulty) {
  const normalized = normalizeDifficulty(difficulty);
  return mode !== "count" || DIFFICULTY_LIMITS[normalized].count !== null;
}

export function problemKey(problem) {
  if (problem.mode === "count") return `count:${problem.answer}`;
  const [left, right] = problem.operands;
  if (problem.mode === "sub") return `sub:${left}:${right}`;
  const [first, second] = [left, right].sort((a, b) => a - b);
  return `${problem.mode}:${first}:${second}`;
}

function pickFresh(candidates, recentKeys, rng) {
  const recent = new Set(recentKeys);
  const fresh = candidates.filter(problem => !recent.has(problemKey(problem)));
  return pick(fresh.length > 0 ? fresh : candidates, rng);
}

function countProblems(maxAnswer) {
  return Array.from({ length: maxAnswer }, (_, index) => {
    const answer = index + 1;
    return {
      mode: "count",
      answer,
      characters: [answer],
      promptKey: "prompt-count"
    };
  });
}

function additionProblems(maxAnswer) {
  const problems = [];
  for (let left = 1; left < maxAnswer; left += 1) {
    for (let right = 1; right <= maxAnswer - left; right += 1) {
      problems.push({
        mode: "add",
        answer: left + right,
        characters: [left, right],
        operands: [left, right],
        promptKey: "prompt-add"
      });
    }
  }
  return problems;
}

function subtractionProblems(maxAnswer) {
  const problems = [];
  for (let left = 2; left <= maxAnswer; left += 1) {
    for (let right = 1; right < left; right += 1) {
      problems.push({
        mode: "sub",
        answer: left - right,
        characters: [left, right],
        operands: [left, right],
        promptKey: "prompt-sub"
      });
    }
  }
  return problems;
}

function multiplicationProblems(maxAnswer, rightMax) {
  const problems = [];
  for (let left = 1; left <= 10; left += 1) {
    for (let right = 1; right <= rightMax; right += 1) {
      if (left * right > maxAnswer) continue;
      problems.push({
        mode: "mul",
        answer: left * right,
        characters: [],
        operands: [left, right],
        promptKey: "prompt-mul"
      });
    }
  }
  return problems;
}

export function createProblem(
  mode,
  difficulty,
  rng = Math.random,
  recentKeys = []
) {
  const normalized = normalizeDifficulty(difficulty);
  const limits = DIFFICULTY_LIMITS[normalized];

  if (mode === "count") {
    if (limits.count === null) {
      throw new RangeError("count mode is unavailable for challenge");
    }
    return pickFresh(countProblems(limits.count), recentKeys, rng);
  }

  if (mode === "add") {
    return pickFresh(additionProblems(limits.add), recentKeys, rng);
  }

  if (mode === "sub") {
    return pickFresh(subtractionProblems(limits.sub), recentKeys, rng);
  }

  if (mode === "mul") {
    const rightMax = normalized === "challenge" ? 15 : 10;
    return pickFresh(multiplicationProblems(limits.mul, rightMax), recentKeys, rng);
  }

  throw new TypeError(`Unknown mode: ${mode}`);
}

export function applyDigit(buffer, digit, answer) {
  const next = `${buffer}${digit}`;
  const target = String(answer);
  if (next === target) return { buffer: next, status: "correct" };
  if (target.startsWith(next)) return { buffer: next, status: "prefix" };
  return { buffer: "", status: "wrong" };
}

export function deleteLastDigit(buffer) {
  return String(buffer).slice(0, -1);
}
