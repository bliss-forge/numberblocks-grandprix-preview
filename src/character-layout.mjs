const finitePositive = value => Number.isFinite(value) && value > 0;

export function containedBitmapDimensions({
  naturalWidth,
  naturalHeight,
  boxWidth,
  boxHeight
}) {
  if (
    ![naturalWidth, naturalHeight, boxWidth, boxHeight]
      .every(finitePositive)
  ) {
    return null;
  }

  const scale = Math.min(
    boxWidth / naturalWidth,
    boxHeight / naturalHeight
  );
  if (!finitePositive(scale)) return null;

  return {
    width: naturalWidth * scale,
    height: naturalHeight * scale
  };
}

export function characterLayoutScaleCap({
  zoneWidth,
  zoneHeight,
  imageWidth,
  imageHeight,
  metric,
  widthScale
}) {
  if (
    ![zoneWidth, zoneHeight, imageWidth, imageHeight, widthScale]
      .every(finitePositive) ||
    !metric ||
    !finitePositive(metric.width) ||
    !finitePositive(metric.height)
  ) {
    return 1;
  }

  const horizontalCap =
    (zoneWidth * 0.88) / (imageWidth * metric.width * widthScale);
  const verticalCap =
    (zoneHeight * 0.82) / (imageHeight * metric.height);
  return Math.min(horizontalCap, verticalCap);
}
