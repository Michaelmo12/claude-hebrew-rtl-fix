#!/usr/bin/env node
/**
 * generate-icons.js — dependency-free PNG icon generator.
 *
 * Hand-encodes valid PNG files using only Node's built-in `zlib` module
 * (no ImageMagick / rsvg-convert / sharp / any npm package). Rasterizes the
 * same flat design as icons/icon.svg (a rounded square with a simplified
 * Hebrew Aleph glyph) directly to pixels at each required icon size.
 *
 * Never touches the network — reads nothing, writes only local PNG files.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZES = [16, 32, 48, 96, 128];
const OUT_DIR = __dirname;

const BG = [0x1e, 0x3a, 0x5f]; // #1E3A5F
const FG = [0xf5, 0xf1, 0xe8]; // #F5F1E8
const CORNER_RADIUS_FRAC = 24 / 128;

// Reference-space (128x128) line segments approximating the Aleph glyph in
// icon.svg, as [x1, y1, x2, y2, strokeWidth] — all fractions of the icon
// size so they scale cleanly to every output size.
const STROKES_128 = [
  [34, 94, 94, 34, 9],
  [34, 46, 58, 70, 9],
  [70, 82, 94, 106, 9],
].map(([x1, y1, x2, y2, w]) => [x1 / 128, y1 / 128, x2 / 128, y2 / 128, w / 128]);

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function insideRoundedSquare(x, y, size, radius) {
  const cx = Math.min(Math.max(x, radius), size - radius);
  const cy = Math.min(Math.max(y, radius), size - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius + 0.5;
}

function rasterize(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const radius = size * CORNER_RADIUS_FRAC;
  const strokes = STROKES_128.map(([x1, y1, x2, y2, w]) => [
    x1 * size,
    y1 * size,
    x2 * size,
    y2 * size,
    Math.max(1, w * size),
  ]);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const px = x + 0.5;
      const py = y + 0.5;

      if (!insideRoundedSquare(px, py, size, radius)) {
        // Transparent outside the rounded square.
        pixels[idx + 3] = 0;
        continue;
      }

      let color = BG;
      for (const [x1, y1, x2, y2, w] of strokes) {
        if (distToSegment(px, py, x1, y1, x2, y2) <= w / 2) {
          color = FG;
          break;
        }
      }

      pixels[idx] = color[0];
      pixels[idx + 1] = color[1];
      pixels[idx + 2] = color[2];
      pixels[idx + 3] = 255;
    }
  }

  return pixels;
}

// --- Minimal PNG encoder (RGBA, 8-bit, no interlace) ---

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(size, pixels) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // width
  ihdrData.writeUInt32BE(size, 4); // height
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(6, 9); // color type: RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  const ihdr = chunk('IHDR', ihdrData);

  // Raw scanlines: filter byte 0 (None) + 4 bytes/pixel per row.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter type None
    pixels.copy(raw, rowStart + 1, y * stride, y * stride + stride);
  }
  const idat = chunk('IDAT', zlib.deflateSync(raw));

  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function main() {
  for (const size of SIZES) {
    const pixels = rasterize(size);
    const png = encodePNG(size, pixels);
    const outPath = path.join(OUT_DIR, `icon-${size}.png`);
    fs.writeFileSync(outPath, png);
    console.log(`wrote ${outPath} (${png.length} bytes)`);
  }
}

main();
