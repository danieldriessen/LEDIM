// LEDIM/src/core/areaManager.ts
//--------------------------------------------------------------
// Splits the physical matrix into virtual areas, lazy‑loads
// modules, and delegates drawing on every frame. Tries `.ts`
// first (ts-node) and falls back to `.js` after transpile.
//--------------------------------------------------------------

import { LedMatrixInstance } from 'rpi-led-matrix';
import path from 'path';

export interface AreaSpec {
  x: number; y: number; w: number; h: number; module: string;
}

export interface Module {
  init?(cfg: unknown): Promise<void>;
  draw(matrix: LedMatrixInstance, area: AreaSpec, cfg: unknown): Promise<void>;
}

export class AreaManager {
  private cache: Record<string, Module> = {};
  private baseDir = path.resolve(__dirname, '../modules');

  constructor(
    private matrix: LedMatrixInstance,
    private areas: AreaSpec[],
    private moduleCfgs: Record<string, unknown>
  ) {}

  async initModules() {
    for (const a of this.areas) {
      const m = this.load(a.module);
      if (m.init) await m.init(this.moduleCfgs[a.module]);
    }
  }

  async renderFrame() {
    for (const a of this.areas) {
      const m = this.load(a.module);
      await m.draw(this.matrix, a, this.moduleCfgs[a.module]);
    }
    this.matrix.sync();
  }

  /** require() so ts‑node resolves .ts; fall back to .js */
  private load(name: string): Module {
    if (this.cache[name]) return this.cache[name];

    const ts = path.join(this.baseDir, name, 'index.ts');
    const js = path.join(this.baseDir, name, 'index.js');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('fs').existsSync(ts) ? require(ts) : require(js);
    return (this.cache[name] = mod as Module);
  }
}
