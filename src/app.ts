// LEDIM/src/app.ts
// ------------------------------------------------------------
// Entry point for the LED‑Info‑Matrix runtime.  It loads the
// compiled configuration, initialises the LED matrix driver,
// and hands off to the AreaManager which in turn calls each
// active module on every frame.
// ------------------------------------------------------------

import { LedMatrix, LedMatrixInstance, MatrixOptions, RuntimeOptions } from "rpi-led-matrix";
import { loadConfig } from "./core/configManager";
import { AreaManager } from "./core/areaManager";

async function main() {
  const cfg = loadConfig();

  const matrixOpts: MatrixOptions = {
    ...LedMatrix.defaultMatrixOptions(),
    rows:        cfg.matrix.rows        as 16 | 32 | 64,
    cols:        cfg.matrix.cols        as 16 | 32 | 40 | 64,
    chainLength: (cfg.matrix.chainLength ?? 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
    pwmBits:     (cfg.matrix.pwmBits    ?? 11) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11,
  };

  const runtimeOpts: RuntimeOptions = {
    ...LedMatrix.defaultRuntimeOptions(),
    gpioSlowdown: 2,
  };

  const matrix: LedMatrixInstance = new LedMatrix(matrixOpts, runtimeOpts);
  const areaManager = new AreaManager(matrix, cfg.areas, cfg.modules);

  if (areaManager.initModules) await areaManager.initModules();

  setInterval(async () => {
    try {
      await areaManager.renderFrame();
    } catch (err) {
      console.error("Render error", err);
    }
  }, 50);
}

main().catch(err => {
  console.error("Fatal error", err);
  process.exit(1);
});
