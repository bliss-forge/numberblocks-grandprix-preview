// 가족 노선 화면. 왼쪽은 열차 창밖으로 보이는 승강장, 오른쪽은 도장판.
//
// 지하철 여행 화면과 같은 두 칸 짜임을 쓰되, 갈아탈 일도 길을 잃을 일도 없어
// 노선도 대신 일곱 칸짜리 도장판이 붙는다.

import {
  FAMILY_COUNT,
  familyBoard,
  familyHint,
  familyStation,
  metCount
} from "./family-line.mjs";
import {
  familyPersonSvg,
  familyPlatformSvg,
  familyReunionSvg,
  familyStampSvg
} from "./family-line-art.mjs";
import { lineBadgeSvg } from "./subway-art.mjs";
import { stationLabel } from "./subway-map-data.mjs";

function el(document, tag, className, text = null) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

function renderStage(document, ride) {
  const stage = el(document, "div", "family-stage");
  stage.dataset.phase = ride.phase;
  stage.style.setProperty("--line-color", ride.color);

  const member = familyStation(ride);
  // 승강장 그림이 맨 뒤. 그 위에 안내와 사람이 얹힌다.
  const backdrop = el(document, "div", "family-backdrop");
  backdrop.innerHTML = familyPlatformSvg(ride.color, stationLabel(member.station));
  backdrop.setAttribute("aria-hidden", "true");
  stage.append(backdrop);

  const sign = el(document, "div", "family-sign");
  const badge = el(document, "span", "family-sign-badge");
  badge.innerHTML = lineBadgeSvg(ride.line, ride.color);
  badge.setAttribute("aria-hidden", "true");
  // 역 이름은 뒤쪽 이름판이 크게 들고 있으니 여기서는 몇 호선인지만 말한다.
  sign.append(badge, el(document, "span", "family-sign-name",
    `${ride.line}호선 가족 노선`));
  stage.append(sign);

  const platform = el(document, "div", "family-platform");
  const host = el(document, "div", "family-person");
  host.dataset.member = member.id;
  host.dataset.met = String(ride.met.includes(member.id));
  host.innerHTML = familyPersonSvg(member.id);
  host.setAttribute("aria-hidden", "true");
  platform.append(host);
  stage.append(platform);

  const doors = el(document, "div", "family-doors");
  doors.dataset.open = String(ride.phase === "stopped");
  doors.append(el(document, "span", "family-door family-door-left"));
  doors.append(el(document, "span", "family-door family-door-right"));
  stage.append(doors);

  const bubble = el(document, "div", "family-bubble", familyHint(ride));
  bubble.setAttribute("role", "status");
  stage.append(bubble);
  return stage;
}

function renderBoard(document, ride) {
  const rail = el(document, "div", "family-rail");
  const heading = el(document, "h2", "family-board-title", "가족 도장");
  rail.append(heading);

  const board = el(document, "div", "family-board");
  for (const entry of familyBoard(ride)) {
    const cell = el(document, "div", "family-board-cell");
    cell.dataset.met = String(entry.met);
    cell.dataset.here = String(entry.here);
    const stamp = el(document, "span", "family-board-stamp");
    stamp.innerHTML = familyStampSvg(entry.id, entry.met);
    stamp.setAttribute("aria-hidden", "true");
    cell.append(stamp, el(document, "span", "family-board-name", entry.label));
    cell.setAttribute(
      "aria-label",
      `${entry.label} ${entry.met ? "만났어요" : "아직이에요"}`
    );
    board.append(cell);
  }
  rail.append(board);

  const count = el(document, "p", "family-count",
    `${metCount(ride)} / ${FAMILY_COUNT}`);
  count.setAttribute("aria-live", "polite");
  rail.append(count);
  return rail;
}

function renderFinish(document) {
  const finish = el(document, "div", "family-finish");
  const art = el(document, "div", "family-finish-art");
  art.innerHTML = familyReunionSvg();
  const words = el(document, "p", "family-finish-words", "가족을 다 만났어요!");
  finish.append(art, words);
  return finish;
}

export function renderFamilyLine(document, ride) {
  const root = el(document, "div", "family-line");
  root.dataset.done = String(ride.done);
  if (ride.done) {
    root.append(renderFinish(document));
    return root;
  }
  const layout = el(document, "div", "family-layout");
  layout.append(renderStage(document, ride), renderBoard(document, ride));
  root.append(layout);
  return root;
}

export function updateFamilyLine(root, ride) {
  const document = root.ownerDocument ?? globalThis.document;
  const fresh = renderFamilyLine(document, ride);
  root.dataset.done = fresh.dataset.done;
  root.replaceChildren(...fresh.children);
  return root;
}
