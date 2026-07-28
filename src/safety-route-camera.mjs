const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

export function cameraOffset({ world, viewport, player }) {
  return {
    x: clamp(
      player.x - Math.floor(viewport.width / 2),
      0,
      Math.max(0, world.width - viewport.width)
    ),
    y: clamp(
      player.y - Math.floor(viewport.height / 2),
      0,
      Math.max(0, world.height - viewport.height)
    )
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
