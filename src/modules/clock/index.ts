// LEDIM/src/modules/clock/index.ts
//--------------------------------------------------------------
// Digital clock module — loads 6×10.bdf once and displays the
// current time (HH:MM:SS) in green. Uses a path relative to this
// file so it works regardless of where the program is launched.
//--------------------------------------------------------------

import { LedMatrixInstance, Font, FontInstance } from 'rpi-led-matrix';
import path from 'path';
import fs from 'fs';
import { AreaSpec } from '../../core/areaManager';

let font: FontInstance | null = null;

export function init() {
  if (font) return;

  // fonts/6x10.bdf lives in the project root. Resolve it relative
  // to this source file so "npm start" and production builds work.
  const fontPath = path.resolve(__dirname, '../../../fonts/6x10.bdf');

  if (!fs.existsSync(fontPath)) {
    throw new Error(`Clock module cannot find font at ${fontPath}`);
  }

  font = new Font('6x10', fontPath);
}

export function draw(matrix: LedMatrixInstance, area: AreaSpec) {
  if (!font) return; // init() failed or not yet run

  const txt = new Date().toLocaleTimeString('de-DE', { hour12: false });

  // Clear this module's area
  matrix.clear(area.x, area.y, area.x + area.w - 1, area.y + area.h - 1);

  // Draw text in green
  matrix.font(font).fgColor(0x00ff00).drawText(txt, area.x + 2, area.y + font.baseline());
}