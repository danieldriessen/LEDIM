// LEDIM/src/app.ts
import fs from "fs";
import path from "path";
import {
  LedMatrix,
  LedMatrixInstance,
  MatrixOptions,
  RuntimeOptions
} from "rpi-led-matrix";
import { loadConfig } from "./core/configManager";
import { AreaManager } from "./core/areaManager";
import { runSetup } from "./setup/setup";

// ✅ Inject CLI flag to avoid root requirement (must come before any matrix init)
if (!process.argv.includes("--led-no-hardware-pulse")) {
  process.argv.push("--led-no-hardware-pulse");
}

// 🔒 Only allow supported 128x64 panel configs
function assertValidMatrixConfig(
  rows: number,
  cols: number,
  chainLength: number,
  pwmBits: number
): asserts rows is 64 {
  const validRows = [64];
  const validCols = [128, 256, 384, 512];
  const validChain = [1, 2, 3];
  const validPwm = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  if (!validRows.includes(rows)) throw new Error(`Invalid matrix.rows: ${rows}`);
  if (!validCols.includes(cols)) throw new Error(`Invalid matrix.cols: ${cols}`);
  if (!validChain.includes(chainLength)) throw new Error(`Invalid chainLength: ${chainLength}`);
  if (!validPwm.includes(pwmBits)) throw new Error(`Invalid pwmBits: ${pwmBits}`);
}

async function main() {
  const etcStatePath = "/etc/ledim/system_state.json";
  const localFallbackPath = path.resolve(__dirname, "../config/system_state.json");
  const statePath = fs.existsSync(etcStatePath) ? etcStatePath : localFallbackPath;

  const needsSetup =
    !fs.existsSync(statePath) ||
    JSON.parse(fs.readFileSync(statePath, "utf-8")).initialSetupComplete !== true;

  if (needsSetup) {
    await runSetup();
  }

  const cfg = loadConfig();

  const rows = Number(cfg.matrix.rows);
  const virtualCols = Number(cfg.matrix.cols);
  const chainLength = Number(cfg.matrix.chainLength ?? 2);
  const pwmBits = Number(cfg.matrix.pwmBits ?? 11);

  assertValidMatrixConfig(rows, virtualCols, chainLength, pwmBits);

  const matrixOpts: MatrixOptions = {
    ...LedMatrix.defaultMatrixOptions(),
    rows: 64,
    cols: 64, // always fixed at 64 per panel
    chainLength: (virtualCols / 128) as 1 | 2 | 3,
    pwmBits: pwmBits as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
  };

  const runtimeOpts: RuntimeOptions = {
    ...LedMatrix.defaultRuntimeOptions(),
    gpioSlowdown: 2
  };

  const matrix: LedMatrixInstance = new LedMatrix(matrixOpts, runtimeOpts);

  const areas = cfg.areas.map(area => ({
    ...area,
    module: area.module ?? "clock"
  }));

  const areaManager = new AreaManager(matrix, areas, cfg.modules);

  if (areaManager.initModules) {
    await areaManager.initModules();
  }

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
