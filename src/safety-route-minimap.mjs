import { schoolMarkSvg } from "./safety-route-art.mjs";
import { busStopForNextTarget } from "./safety-route-model.mjs";

function percent(value, total) {
  return (value / total) * 100;
}

function placeDot(node, map, point) {
  node.style.setProperty("--mini-x", percent(point.x, map.width));
  node.style.setProperty("--mini-y", percent(point.y, map.height));
  return node;
}

function minimapTarget(state) {
  return busStopForNextTarget(state) ?? state.map.friends.find(
    friend => friend.number === state.nextFriend
  ) ?? state.map.goal;
}

export function renderMinimap(document, state) {
  const root = document.createElement("div");
  root.className = "route-minimap";
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", "동네 미니맵");

  for (const zone of ["left", "road", "right"]) {
    const node = document.createElement("div");
    node.className = `route-minimap-zone route-minimap-zone-${zone}`;
    node.setAttribute("aria-hidden", "true");
    root.append(node);
  }

  (state.map.sidewalkBands ?? []).forEach(band => {
    const node = document.createElement("div");
    node.className = "route-minimap-band";
    node.setAttribute("aria-hidden", "true");
    node.style.setProperty("--mini-x", percent(band.x, state.map.width));
    node.style.setProperty("--mini-y", percent(band.y, state.map.height));
    node.style.setProperty(
      "--mini-width",
      percent(band.width, state.map.width)
    );
    node.style.setProperty(
      "--mini-height",
      percent(band.height, state.map.height)
    );
    root.append(node);
  });

  const school = document.createElement("div");
  school.className = "route-minimap-school";
  school.innerHTML = schoolMarkSvg();
  school.setAttribute("aria-hidden", "true");
  const schoolPlace = state.map.places.find(
    place => place.type === "school"
  ) ?? state.map.goal;
  placeDot(school, state.map, schoolPlace);

  const target = document.createElement("div");
  target.className = "route-minimap-target";
  target.setAttribute("aria-hidden", "true");

  const player = document.createElement("div");
  player.className = "route-minimap-player";
  player.setAttribute("aria-hidden", "true");

  const signal = document.createElement("div");
  signal.className = "route-minimap-signal";
  signal.setAttribute("aria-hidden", "true");

  root.append(school, target, player, signal);
  root._minimap = { player, target, signal };
  updateMinimap(root, state);
  return root;
}

export function updateMinimap(root, state) {
  const nodes = root?._minimap;
  if (!nodes) throw new TypeError("A rendered minimap is required");
  placeDot(nodes.player, state.map, state.position);
  placeDot(nodes.target, state.map, minimapTarget(state));
  nodes.signal.dataset.phase = state.signal.phase;
  nodes.signal.hidden = Boolean(state.map.signalless);
  return root;
}
