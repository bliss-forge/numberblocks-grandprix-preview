export const NUMBERBLOCKS = Object.freeze({
  1: { rows: 1, cols: 1, asset: "one.png" },
  2: { rows: 2, cols: 1, asset: "two.png" },
  3: { rows: 3, cols: 1, asset: "three.png" },
  4: { rows: 2, cols: 2, asset: "four.png" },
  5: { rows: 5, cols: 1, asset: "five.png" },
  6: { rows: 3, cols: 2, asset: "six.png" },
  7: { rows: 7, cols: 1, asset: "seven.png" },
  8: { rows: 4, cols: 2, asset: "eight.png" },
  9: { rows: 3, cols: 3, asset: "nine.png" },
  10: { rows: 5, cols: 2, asset: "ten.png" }
});

const MUL_EASY = [[2,2],[2,3],[3,2],[2,4]];
const MUL_ALL = [...MUL_EASY,[4,2],[2,5],[5,2],[3,3],[1,6],[1,8]];
const pick = (items, rng) => items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
const int = (min, max, rng) => min + Math.min(max - min, Math.floor(rng() * (max - min + 1)));

export function createProblem(mode, streak, rng = Math.random) {
  if (mode === "count") {
    const max = streak.count >= 6 ? 10 : streak.count >= 3 ? 5 : 3;
    const answer = int(1, max, rng);
    return { mode, answer, characters: [answer], promptKey: "prompt-count" };
  }
  if (mode === "add") {
    const max = streak.add >= 4 ? 10 : 5;
    const a = int(1, max - 1, rng);
    const b = int(1, max - a, rng);
    return { mode, answer: a + b, characters: [a, b], operands: [a, b], promptKey: "prompt-add" };
  }
  if (mode === "mul") {
    const [a, b] = pick(streak.mul >= 4 ? MUL_ALL : MUL_EASY, rng);
    return { mode, answer: a * b, characters: [], operands: [a, b], promptKey: "prompt-mul" };
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
