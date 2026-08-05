// 알록달록 물감 놀이 — 씬 렌더러. 상태의 읽기 전용 프로젝션.
// 갱신은 재렌더 + replaceChildren(지하철 씬 문법). 연출(붓기·소용돌이·채색
// 차오름·헹굼)은 새로 삽입된 노드에서 시작되는 CSS keyframe이 담당한다.
// 그림은 코드 SVG만 사용(신규 이미지 자산 0) — 칠해질 면은 --pp-fill 변수 fill.

import {
  PAINT_COLORS,
  PAINT_TUBES,
  RAINBOW_COUNT,
  josa
} from "./paint-play-data.mjs";
import {
  currentRound,
  currentSubject,
  equationFor,
  jarColor,
  recipeFor
} from "./paint-play.mjs";

function el(document, tag, className, text = null) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

const OUTLINE = "#b9c4d2";   // 회색 윤곽선
const PRIMER = "#eef2f7";    // 초벌(미채색) 면
const DETAIL = "#8d99a8";    // 세부선(창틀·눈 등 — 회색/채색 양쪽에서 읽힘)

// ── 그림 주제 SVG — viewBox 0 0 280 240, 칠해질 면은 pp-fillable ─────────
// 면 fill은 var(--pp-fill)이라 채색 시 CSS 변수 하나로 전체가 차오른다.

const FILL = `fill="var(--pp-fill, ${PRIMER})" stroke="${OUTLINE}" ` +
  `stroke-width="5" stroke-dasharray="12 8" class="pp-fillable"`;

const SUBJECT_ART = {
  firetruck: `
    <rect x="30" y="96" width="140" height="80" rx="10" ${FILL}/>
    <path d="M170 176 L170 108 L216 108 C236 120 246 138 248 176z" ${FILL}/>
    <rect x="46" y="70" width="110" height="14" rx="7" ${FILL}/>
    <rect x="184" y="120" width="34" height="26" rx="5" fill="#dfe8f2" stroke="${DETAIL}" stroke-width="4"/>
    <line x1="58" y1="77" x2="144" y2="77" stroke="${DETAIL}" stroke-width="4"/>
    <circle cx="80" cy="184" r="24" fill="#3a4152"/><circle cx="80" cy="184" r="10" fill="#c8ccd4"/>
    <circle cx="196" cy="184" r="24" fill="#3a4152"/><circle cx="196" cy="184" r="10" fill="#c8ccd4"/>`,
  chick: `
    <path d="M140 44 C196 44 226 86 226 132 C226 182 188 208 140 208 C92 208 54 182 54 132 C54 86 84 44 140 44z" ${FILL}/>
    <path d="M226 118 L256 130 L226 144z" fill="#ff8a3d" stroke="#e8763a" stroke-width="4"/>
    <circle cx="176" cy="108" r="9" fill="#31445b"/>
    <path d="M112 208 L112 226 M132 208 L132 226" stroke="#ff8a3d" stroke-width="6" stroke-linecap="round"/>`,
  bus: `
    <rect x="28" y="64" width="224" height="118" rx="20" ${FILL}/>
    <rect x="48" y="86" width="44" height="38" rx="7" fill="#dfe8f2" stroke="${DETAIL}" stroke-width="4"/>
    <rect x="106" y="86" width="44" height="38" rx="7" fill="#dfe8f2" stroke="${DETAIL}" stroke-width="4"/>
    <rect x="164" y="86" width="44" height="38" rx="7" fill="#dfe8f2" stroke="${DETAIL}" stroke-width="4"/>
    <line x1="36" y1="146" x2="244" y2="146" stroke="${DETAIL}" stroke-width="4"/>
    <circle cx="84" cy="188" r="22" fill="#3a4152"/><circle cx="84" cy="188" r="9" fill="#c8ccd4"/>
    <circle cx="196" cy="188" r="22" fill="#3a4152"/><circle cx="196" cy="188" r="9" fill="#c8ccd4"/>`,
  carrot: `
    <path d="M96 92 C120 66 176 66 200 92 C224 116 216 158 178 196 C160 214 136 214 120 196 C84 158 74 116 96 92z"
      transform="rotate(38 148 150)" ${FILL}/>
    <path d="M186 58 C196 38 216 32 232 36 C226 52 210 64 194 66z" fill="#cfe3c8" stroke="#9fb89f" stroke-width="4"/>
    <path d="M206 70 C222 58 244 58 258 66 C248 80 228 86 212 82z" fill="#cfe3c8" stroke="#9fb89f" stroke-width="4"/>`,
  car: `
    <path d="M30 158 C28 138 36 126 58 122 L84 96 C92 86 104 82 116 82 L186 82 C200 82 210 88 218 98 L238 122 C260 126 268 136 266 154 C265 164 258 170 248 170 L48 170 C38 170 31 166 30 158z" ${FILL}/>
    <path d="M92 96 L112 88 L142 88 L142 118 L84 118z" fill="#dfe8f2" stroke="${DETAIL}" stroke-width="4"/>
    <path d="M152 88 L184 88 C194 88 200 92 206 100 L214 118 L152 118z" fill="#dfe8f2" stroke="${DETAIL}" stroke-width="4"/>
    <circle cx="86" cy="176" r="22" fill="#3a4152"/><circle cx="86" cy="176" r="9" fill="#c8ccd4"/>
    <circle cx="210" cy="176" r="22" fill="#3a4152"/><circle cx="210" cy="176" r="9" fill="#c8ccd4"/>`,
  frog: `
    <path d="M140 74 C202 74 238 116 238 158 C238 194 196 212 140 212 C84 212 42 194 42 158 C42 116 78 74 140 74z" ${FILL}/>
    <circle cx="96" cy="74" r="26" ${FILL}/>
    <circle cx="184" cy="74" r="26" ${FILL}/>
    <circle cx="96" cy="72" r="10" fill="#31445b"/>
    <circle cx="184" cy="72" r="10" fill="#31445b"/>
    <path d="M104 158 C124 174 156 174 176 158" fill="none" stroke="#31445b" stroke-width="6" stroke-linecap="round"/>`,
  tractor: `
    <path d="M132 150 L132 92 C132 82 140 76 150 76 L190 76 C200 76 206 82 208 92 L216 150z" ${FILL}/>
    <path d="M40 150 C40 130 56 116 76 116 L216 116 L226 150 L226 168 L40 168z" ${FILL}/>
    <rect x="146" y="88" width="44" height="34" rx="6" fill="#dfe8f2" stroke="${DETAIL}" stroke-width="4"/>
    <rect x="60" y="84" width="12" height="34" rx="5" ${FILL}/>
    <circle cx="86" cy="176" r="34" fill="#3a4152"/><circle cx="86" cy="176" r="15" fill="#c8ccd4"/>
    <circle cx="204" cy="184" r="24" fill="#3a4152"/><circle cx="204" cy="184" r="10" fill="#c8ccd4"/>`,
  grape: `
    <circle cx="106" cy="106" r="30" ${FILL}/>
    <circle cx="174" cy="106" r="30" ${FILL}/>
    <circle cx="72" cy="150" r="30" ${FILL}/>
    <circle cx="140" cy="150" r="30" ${FILL}/>
    <circle cx="208" cy="150" r="30" ${FILL}/>
    <circle cx="106" cy="194" r="30" ${FILL}/>
    <circle cx="174" cy="194" r="30" ${FILL}/>
    <path d="M140 76 C140 56 148 44 162 36" fill="none" stroke="#8a6a48" stroke-width="7" stroke-linecap="round"/>
    <path d="M162 40 C182 30 202 34 212 46 C198 58 178 58 164 50z" fill="#cfe3c8" stroke="#9fb89f" stroke-width="4"/>`,
  heli: `
    <path d="M74 128 C74 100 100 82 138 82 C182 82 210 104 210 132 C210 156 188 170 154 170 L112 170 C88 170 74 152 74 128z" ${FILL}/>
    <path d="M74 128 L30 116 L30 104 L80 112z" ${FILL}/>
    <rect x="128" y="46" width="12" height="30" rx="5" ${FILL}/>
    <line x1="44" y1="46" x2="224" y2="46" stroke="#3a4152" stroke-width="8" stroke-linecap="round"/>
    <path d="M148 96 L192 96 C202 102 206 112 206 122 L148 122z" fill="#dfe8f2" stroke="${DETAIL}" stroke-width="4"/>
    <path d="M96 184 L200 184 M110 170 L110 184 M182 170 L182 184" stroke="#3a4152" stroke-width="7" stroke-linecap="round" fill="none"/>`,
  blossom: `
    <circle cx="140" cy="76" r="34" ${FILL}/>
    <circle cx="204" cy="122" r="34" ${FILL}/>
    <circle cx="180" cy="196" r="34" ${FILL}/>
    <circle cx="100" cy="196" r="34" ${FILL}/>
    <circle cx="76" cy="122" r="34" ${FILL}/>
    <circle cx="140" cy="140" r="26" fill="#ffe07a" stroke="#e8b93a" stroke-width="4"/>`,
  boat: `
    <path d="M40 168 L240 168 L208 212 L72 212z" ${FILL}/>
    <path d="M140 44 L140 160" stroke="#8a6a48" stroke-width="8" stroke-linecap="round"/>
    <path d="M152 56 C196 72 216 108 218 152 L152 152z" ${FILL}/>
    <path d="M128 68 L128 148 L70 148 C76 112 96 84 128 68z" ${FILL}/>`,
  bear: `
    <circle cx="82" cy="72" r="30" ${FILL}/>
    <circle cx="198" cy="72" r="30" ${FILL}/>
    <path d="M140 52 C204 52 236 96 236 142 C236 190 196 214 140 214 C84 214 44 190 44 142 C44 96 76 52 140 52z" ${FILL}/>
    <ellipse cx="140" cy="164" rx="44" ry="34" fill="#f6efe6" stroke="${DETAIL}" stroke-width="4"/>
    <circle cx="112" cy="118" r="10" fill="#31445b"/>
    <circle cx="168" cy="118" r="10" fill="#31445b"/>
    <ellipse cx="140" cy="152" rx="13" ry="10" fill="#31445b"/>`,
  rocket: `
    <path d="M140 30 C176 58 190 100 190 146 L190 176 L90 176 L90 146 C90 100 104 58 140 30z" ${FILL}/>
    <path d="M90 140 L54 182 L90 182z" ${FILL}/>
    <path d="M190 140 L226 182 L190 182z" ${FILL}/>
    <circle cx="140" cy="112" r="24" fill="#dfe8f2" stroke="${DETAIL}" stroke-width="5"/>
    <path d="M124 186 C130 206 150 206 156 186 C152 216 128 216 124 186z" fill="#ffb15c" stroke="#e8763a" stroke-width="4"/>
    <circle cx="52" cy="60" r="5" fill="#f4c542"/><circle cx="232" cy="88" r="5" fill="#f4c542"/><circle cx="224" cy="44" r="4" fill="#f4c542"/>`
};

export function paintSubjectSvg(subjectId) {
  const art = SUBJECT_ART[subjectId] ?? "";
  return `<svg viewBox="0 0 280 240" preserveAspectRatio="xMidYMid meet" ` +
    `aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${art}</svg>`;
}

// ── 렌더 ──────────────────────────────────────────────────────────────────

function buildGallery(document, state) {
  const gallery = el(document, "div", "pp-gallery");
  gallery.append(el(document, "b", "pp-gallery-title", "완성한 그림"));
  const total = state.rounds.length;
  for (let index = 0; index < total; index += 1) {
    const colorId = state.gallery[index];
    const frame = el(document, "span", "pp-frame");
    frame.dataset.filled = colorId ?? "";
    if (colorId) frame.style.setProperty("--frame-color", PAINT_COLORS[colorId].hex);
    gallery.append(frame);
  }
  const distinct = new Set(state.gallery).size;
  gallery.append(el(
    document, "span", "pp-rainbow-note",
    `🌈 ${Math.min(distinct, RAINBOW_COUNT)}/${RAINBOW_COUNT}색`
  ));
  return gallery;
}

function orderText(state) {
  const round = currentRound(state);
  const subject = currentSubject(state);
  if (!round || !subject) return "";
  const color = PAINT_COLORS[round.colorId].ko;
  if (round.stage === 4) return `${subject.ko}에 어울리는 ${color}! 무엇과 무엇을 섞을까?`;
  return `${subject.ko}${josa(subject.ko, "을", "를")} ` +
    `${color}${josa(color, "으로", "로")} 칠해 볼까?`;
}

function buildHost(document, state) {
  const host = el(document, "div", "pp-host");
  const img = document.createElement("img");
  img.className = "pp-host-img";
  img.src = "assets/characters/seven.png";
  img.alt = "무지개 일곱이";
  host.append(img);
  const bubble = el(document, "div", "pp-bubble");
  bubble.append(el(document, "strong", "pp-order-text", orderText(state)));
  const round = currentRound(state);
  if (round) {
    const swatch = el(document, "span", "pp-swatch");
    swatch.style.setProperty("--swatch-color", PAINT_COLORS[round.colorId].hex);
    bubble.append(swatch);
  }
  host.append(bubble);
  return host;
}

function buildEasel(document, state) {
  const easel = el(document, "div", "pp-easel");
  const canvas = el(document, "div", "pp-canvas");
  const round = currentRound(state);
  canvas.dataset.subject = round?.subjectId ?? "";
  canvas.dataset.painted = "false";
  canvas.innerHTML = round ? paintSubjectSvg(round.subjectId) : "";
  easel.append(canvas);
  easel.append(el(document, "div", "pp-easel-legs"));
  return easel;
}

function buildJar(document, state) {
  const zone = el(document, "div", "pp-jarzone");
  const jar = el(document, "div", "pp-jar");
  jar.append(el(document, "span", "pp-jar-cap"));
  jar.append(el(document, "span", "pp-jar-spoon"));
  const glass = el(document, "div", "pp-jar-glass");
  const mixed = jarColor(state);
  state.jar.forEach((colorId, index) => {
    const layer = el(document, "span", "pp-jar-layer");
    layer.dataset.slot = String(index);
    layer.style.setProperty("--layer-color", PAINT_COLORS[colorId].hex);
    glass.append(layer);
  });
  if (mixed) {
    const overlay = el(document, "span", "pp-jar-mixed");
    overlay.style.setProperty("--mix-color", PAINT_COLORS[mixed].hex);
    glass.append(overlay);
  }
  jar.append(glass);
  zone.append(jar);

  // 수식 칩 — "빨강 + 노랑 = ?" 학습의 상시 원본(사용자 강조 지점)
  const round = currentRound(state);
  const equation = el(document, "div", "pp-equation");
  const parts = equationFor(state);
  const need = round ? recipeFor(round.colorId).length : 2;
  equation.append(el(document, "span", "pp-eq pp-eq-a", parts?.a ?? "?"));
  if (need === 2) {
    equation.append(el(document, "span", "pp-eq-op", "+"));
    equation.append(el(document, "span", "pp-eq pp-eq-b", parts?.b ?? "?"));
  }
  equation.append(el(document, "span", "pp-eq-op", "="));
  equation.append(el(
    document, "span",
    `pp-eq pp-eq-result${parts?.result ? " pp-eq-solved" : ""}`,
    parts?.result ?? "?"
  ));
  zone.append(equation);
  return zone;
}

function buildShelf(document, state) {
  const shelf = el(document, "div", "pp-shelf");
  const round = currentRound(state);
  const recipe = round ? recipeFor(round.colorId) : [];
  PAINT_TUBES.forEach((tube, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pp-tube";
    button.dataset.tube = tube.id;
    button.dataset.focus = String(state.focusIndex === index);
    // 힌트: 물방울(레시피 재료 표시) / 반짝(정답 튜브 강조)
    const inRecipe = recipe.includes(tube.id);
    const level = round?.hintLevel ?? 0;
    button.dataset.hint = inRecipe && level >= 2
      ? "sparkle"
      : inRecipe && level >= 1 ? "drop" : "";
    button.setAttribute(
      "aria-label",
      `${PAINT_COLORS[tube.id].ko} 물감 (숫자 ${tube.keyDigit})`
    );
    const badge = el(document, "span", "pp-tube-num", String(tube.number));
    const body = el(document, "span", "pp-tube-body");
    body.style.setProperty("--tube-color", PAINT_COLORS[tube.id].hex);
    const mascot = document.createElement("img");
    mascot.className = "pp-tube-mascot";
    mascot.src = `assets/characters/${tube.char}.png`;
    mascot.alt = "";
    const name = el(document, "small", "pp-tube-name", PAINT_COLORS[tube.id].ko);
    button.append(badge, body, mascot, name);
    shelf.append(button);
  });

  // 확인 버튼 없음 — 튜브를 다 고르면 저절로 섞이고 저절로 칠해진다.
  // 남는 버튼은 첫 선택을 무르는 헹구기 하나뿐이다.
  const actions = el(document, "div", "pp-actions");
  const rinse = document.createElement("button");
  rinse.type = "button";
  rinse.className = "pp-action pp-rinse";
  rinse.dataset.focus = String(state.focusIndex === PAINT_TUBES.length);
  rinse.textContent = "💧 다시 담기";
  actions.append(rinse);
  shelf.append(actions);
  return shelf;
}

function buildFinale(document, state) {
  const finale = el(document, "div", "pp-finale");
  finale.dataset.on = String(state.finale);
  if (!state.finale) return finale;
  finale.append(el(
    document, "h2", "pp-finale-title",
    state.rainbow ? "🌈 무지개 화가 탄생!" : "⭐ 오늘의 그림 완성!"
  ));
  const shelfRow = el(document, "div", "pp-finale-row");
  state.gallery.forEach(colorId => {
    const chip = el(document, "span", "pp-finale-chip", PAINT_COLORS[colorId].ko);
    chip.style.setProperty("--frame-color", PAINT_COLORS[colorId].hex);
    shelfRow.append(chip);
  });
  finale.append(shelfRow);
  finale.append(el(
    document, "p", "pp-finale-note",
    `별 ${state.stars}개 — 고마워요, 꼬마 화가님!`
  ));
  return finale;
}

export function renderPaintPlay(document, state) {
  const root = el(document, "div", "paint-play");
  const round = currentRound(state);
  root.dataset.stage = String(round?.stage ?? 0);
  root.dataset.finale = String(state.finale);
  root.append(buildGallery(document, state));
  root.append(buildHost(document, state));
  root.append(buildEasel(document, state));
  root.append(buildJar(document, state));
  root.append(buildShelf(document, state));
  root.append(buildFinale(document, state));
  return root;
}

// 갱신 = 재렌더 + 교체(지하철 씬 문법 — FakeElement·실DOM 양쪽 동작)
export function updatePaintPlay(root, state, document) {
  const rebuilt = renderPaintPlay(document, state);
  root.dataset.stage = rebuilt.dataset.stage;
  root.dataset.finale = rebuilt.dataset.finale;
  root.replaceChildren(...rebuilt.children);
  return root;
}

// 성공 순간의 채색 상태 — 앱이 성공 이벤트 직후 캔버스에 칠을 입힐 때 사용.
export function paintCanvasNode(canvas, colorHex) {
  canvas.dataset.painted = "true";
  canvas.style.setProperty("--pp-fill", colorHex);
}

export { PAINT_COLORS };
