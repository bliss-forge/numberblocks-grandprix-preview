export function equationText(problem) {
  if (!["add", "mul"].includes(problem.mode)) {
    throw new TypeError("operand scene requires add or mul mode");
  }

  const operator = problem.mode === "mul" ? "×" : "+";
  return `${problem.operands[0]} ${operator} ${problem.operands[1]}`;
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
  operator.textContent = problem.mode === "mul" ? "×" : "+";
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
