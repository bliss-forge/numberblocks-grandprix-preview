const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

export function cameraOffset({ world, viewport, player, previous }) {
  let x = previous.x;
  let y = previous.y;
  const localX = player.x - x;
  const localY = player.y - y;

  if (localX > viewport.width - 2) {
    x = player.x - (viewport.width - 2);
  } else if (localX < 1) {
    x = player.x - 1;
  }
  if (localY > viewport.height - 2) {
    y = player.y - (viewport.height - 2);
  } else if (localY < 1) {
    y = player.y - 1;
  }

  return {
    x: clamp(x, 0, Math.max(0, world.width - viewport.width)),
    y: clamp(y, 0, Math.max(0, world.height - viewport.height))
  };
}

export function targetArrow({ viewport, camera, target }) {
  const local = {
    x: target.x - camera.x,
    y: target.y - camera.y
  };
  const visible =
    local.x < 0 ||
    local.y < 0 ||
    local.x >= viewport.width ||
    local.y >= viewport.height;
  if (!visible) {
    return { visible: false, x: local.x, y: local.y, angle: 0 };
  }

  const center = {
    x: (viewport.width - 1) / 2,
    y: (viewport.height - 1) / 2
  };
  return {
    visible: true,
    x: clamp(local.x, 0.5, viewport.width - 0.5),
    y: clamp(local.y, 0.5, viewport.height - 0.5),
    angle: Math.atan2(local.y - center.y, local.x - center.x)
  };
}
