// Generates the PNG app icons (192/512 for the manifest, 180 for
// apple-touch-icon) with zero image dependencies: a minimal truecolor PNG
// encoder over node:zlib, drawing the same poster-mosaic mark as icon.svg —
// four blocks in the app's own semantic colors (dj/show/special/taster).
// Run once with `npm run icons`; outputs are committed in public/.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

const BG = hex('#FFFFFF');
const DJ = hex('#3BA55D');
const SHOW = hex('#F4801F');
const SPECIAL = hex('#CE2B37');
const TASTER = hex('#7FD4E0');

function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, drawPixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 3 + 1);
    raw[rowStart] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const [r, g, b] = drawPixel(x, y);
      const o = rowStart + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Same geometry as icon.svg (viewBox 0 0 64 64), scaled per output size.
function drawIcon(size) {
  const s = size / 64;
  const rects = [
    [8, 8, 48, 14, DJ],
    [8, 25, 48, 14, SHOW],
    [8, 42, 30, 14, SPECIAL],
    [41, 42, 15, 14, TASTER],
  ].map(([x, y, w, h, color]) => [x * s, y * s, w * s, h * s, color]);
  return (x, y) => {
    for (const [rx, ry, rw, rh, color] of rects) {
      if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) return color;
    }
    return BG;
  };
}

for (const size of [180, 192, 512]) {
  const file = path.join(OUT, `icon-${size}.png`);
  fs.writeFileSync(file, png(size, drawIcon(size)));
  console.log(`✓ ${path.relative(process.cwd(), file)}`);
}
