// LEDIM/src/setup/setup.ts
// @ts-ignore
const { Select } = require("enquirer");
import fs from "fs";
import path from "path";
import {
  LedMatrix,
  LedMatrixInstance,
  MatrixOptions,
  RuntimeOptions
} from "rpi-led-matrix";

// ------------------ Type Definitions ------------------
interface Area {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  module: string;
}
interface LayoutOption {
  id: string;
  name: string;
  description: string;
  areas: Array<Omit<Area, "module">>;
}
interface AvailableOptions {
  matrix_counts: number[];
  fonts: string[];
  modules: string[];
  area_layouts: Record<string, LayoutOption[]>;
}

// ------------------ Paths ------------------
const ETC_CONFIG_DIR = process.env.LEDIM_CONFIG_DIR ?? "/etc/ledim";
const LOCAL_CONFIG_DIR = path.resolve(__dirname, "../../config");

const AVAILABLE_OPTIONS_PATH = path.join(LOCAL_CONFIG_DIR, "available_options.json");
const USER_DEFAULTS_PATH = path.join(ETC_CONFIG_DIR, "user_defaults.json");
const SYSTEM_STATE_PATH = path.join(ETC_CONFIG_DIR, "system_state.json");

// Ensure config dir exists
if (!fs.existsSync(ETC_CONFIG_DIR)) {
  fs.mkdirSync(ETC_CONFIG_DIR, { recursive: true });
}

// ------------------ Matrix Helper ------------------
let matrixInstance: LedMatrixInstance | null = null;

function setPixelRGB(matrix: LedMatrixInstance, x: number, y: number, r: number, g: number, b: number) {
  (matrix.setPixel as any)(x, y, r, g, b);
}

function drawLayoutPreview(layout: LayoutOption) {
  if (!matrixInstance) return;

  matrixInstance.clear();

  layout.areas.forEach((area, index) => {
    const colors = [
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
      { r: 255, g: 255, b: 0 }
    ];
    const color = colors[index % colors.length];

    for (let x = area.x; x < area.x + area.w; x++) {
      for (let y = area.y; y < area.y + area.h; y++) {
        setPixelRGB(matrixInstance!, x, y, color.r, color.g, color.b);
      }
    }

    for (let x = area.x; x < area.x + area.w; x++) {
      setPixelRGB(matrixInstance!, x, area.y, 255, 255, 255);
      setPixelRGB(matrixInstance!, x, area.y + area.h - 1, 255, 255, 255);
    }

    for (let y = area.y; y < area.y + area.h; y++) {
      setPixelRGB(matrixInstance!, area.x, y, 255, 255, 255);
      setPixelRGB(matrixInstance!, area.x + area.w - 1, y, 255, 255, 255);
    }
  });

  matrixInstance.sync();
}

// ------------------ Setup Flow ------------------
export async function runSetup() {
  console.log("🛠 Initial Setup Started...");

  const optionsData = JSON.parse(fs.readFileSync(AVAILABLE_OPTIONS_PATH, "utf-8")) as AvailableOptions;

  const panelCountPrompt = new Select({
    name: "panels",
    message: "How many 128x64 LED panels do you have?",
    choices: optionsData.matrix_counts.map(count => ({
      name: `${count}`,
      message: `${count} panel${count > 1 ? "s" : ""}`,
      value: count
    }))
  });

  const panelCountRaw = await panelCountPrompt.run();
  const panelCount = Number(panelCountRaw);
  const virtualCols = 128 * panelCount;

  const matrixOpts: MatrixOptions = {
    ...LedMatrix.defaultMatrixOptions(),
    rows: 64,
    cols: 64, // always 64 per panel
    chainLength: panelCount as 1 | 2 | 3,
    pwmBits: 11
  };

  const runtimeOpts: RuntimeOptions = {
    ...LedMatrix.defaultRuntimeOptions(),
    gpioSlowdown: 2
  };

  matrixInstance = new LedMatrix(matrixOpts, runtimeOpts);

  const layouts = optionsData.area_layouts[String(panelCount)];
  if (!layouts || layouts.length === 0) {
    console.error(`❌ No layouts defined for ${panelCount} panel(s).`);
    process.exit(1);
  }

  const layoutPrompt = new Select({
    name: "layout",
    message: "Select your preferred layout",
    choices: layouts.map(layout => ({
      name: layout.id,
      message: layout.name,
      value: layout.id
    }))
  });

  layoutPrompt.on("cursor", (index: number) => {
    drawLayoutPreview(layouts[index]);
  });

  const selectedLayoutId: string = await layoutPrompt.run();
  const selectedLayout = layouts.find(l => l.id === selectedLayoutId);

  if (!selectedLayout || !selectedLayout.areas || selectedLayout.areas.length === 0) {
    throw new Error("❌ Selected layout is invalid or has no areas defined.");
  }

  const areasWithModules: Area[] = selectedLayout.areas.map((area): Area => ({
    ...area,
    module: "clock"
  }));

  const configToSave = {
    matrix: {
      rows: 64,
      cols: virtualCols,
      chainLength: panelCount,
      pwmBits: 11
    },
    areas: areasWithModules,
    modules: {}
  };

  try {
    fs.writeFileSync(USER_DEFAULTS_PATH, JSON.stringify(configToSave, null, 2));
    fs.writeFileSync(SYSTEM_STATE_PATH, JSON.stringify({ initialSetupComplete: true }, null, 2));
    console.log("✅ Setup complete! Your configuration has been saved.");
  } catch (err) {
    console.error("❌ Failed to save configuration:", err);
    process.exit(1);
  }
}
