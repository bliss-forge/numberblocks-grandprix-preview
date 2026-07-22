import { inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
]);

function paethPredictor(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) {
    return left;
  }
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

export function visiblePngBounds(png) {
  if (!png.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new TypeError("expected PNG data");
  }

  let offset = PNG_SIGNATURE.length;
  let width;
  let height;
  const imageData = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (
        data[8] !== 8 ||
        data[9] !== 6 ||
        data[10] !== 0 ||
        data[11] !== 0 ||
        data[12] !== 0
      ) {
        throw new TypeError("expected non-interlaced 8-bit RGBA PNG data");
      }
    } else if (type === "IDAT") {
      imageData.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const encoded = inflateSync(Buffer.concat(imageData));
  const previous = Buffer.alloc(stride);
  const current = Buffer.alloc(stride);
  let sourceOffset = 0;
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  let opaquePixels = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = encoded[sourceOffset];
    sourceOffset += 1;
    for (let x = 0; x < stride; x += 1) {
      const raw = encoded[sourceOffset + x];
      const prior = previous[x];
      const leftByte = x >= bytesPerPixel ? current[x - bytesPerPixel] : 0;
      const upperLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      if (filter === 0) current[x] = raw;
      else if (filter === 1) current[x] = (raw + leftByte) & 0xff;
      else if (filter === 2) current[x] = (raw + prior) & 0xff;
      else if (filter === 3) {
        current[x] = (raw + Math.floor((leftByte + prior) / 2)) & 0xff;
      } else if (filter === 4) {
        current[x] = (raw + paethPredictor(leftByte, prior, upperLeft)) & 0xff;
      } else {
        throw new TypeError(`unsupported PNG filter ${filter}`);
      }
    }
    sourceOffset += stride;

    for (let x = 0; x < width; x += 1) {
      if (current[x * bytesPerPixel + 3] === 0) continue;
      opaquePixels += 1;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }

    previous.set(current);
  }

  if (right < left || bottom < top) return null;
  return Object.freeze({
    left,
    right,
    top,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
    opaquePixels
  });
}
