export function operatorFor(mode) {
  const operators = { add: "+", sub: "−", mul: "×" };
  if (!operators[mode]) {
    throw new TypeError("operand scene requires add, sub, or mul mode");
  }
  return operators[mode];
}

export function countCharacterValues(answer) {
  if (!Number.isInteger(answer) || answer < 1 || answer > 20) {
    throw new RangeError("count answer must be between 1 and 20");
  }
  if (answer <= 10) return [answer];
  if (answer === 20) return [10, 10];
  return [10, answer - 10];
}

export function equationText(problem) {
  return `${problem.operands[0]} ${operatorFor(problem.mode)} ${problem.operands[1]}`;
}

export function operandScene(document, problem, createCharacter) {
  const scene = document.createElement("div");
  scene.className = "operand-scene";

  const friends = document.createElement("div");
  friends.className = "operand-friends";

  const left = document.createElement("div");
  left.className = "operand-slot";
  left.append(createCharacter(problem.operands[0], "operand-character"));

  const operator = document.createElement("span");
  operator.className = "operator";
  operator.textContent = operatorFor(problem.mode);
  operator.setAttribute("aria-hidden", "true");

  const right = document.createElement("div");
  right.className = "operand-slot";
  right.append(createCharacter(problem.operands[1], "operand-character"));

  const label = document.createElement("strong");
  label.className = "equation-label";
  label.textContent = equationText(problem);

  friends.append(left, operator, right);
  scene.append(friends, label);
  return scene;
}
