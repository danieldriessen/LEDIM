import fs from "fs";
import path from "path";

export interface LEDIMConfig {
  matrix: {
    rows: 64;
    cols: 128 | 256 | 384 | 512;
    chainLength: 1 | 2 | 3;
    pwmBits?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
  };
  areas: Array<{
    name: string;
    x: number;
    y: number;
    w: number;
    h: number;
    module?: string;
  }>;
  modules: Record<string, unknown>;
}

// ------------------ Config Search Logic ------------------
const ETC_DIR = "/etc/ledim";
const LOCAL_DIR = path.resolve(__dirname, "../../config");

function getConfigPath(filename: string): string {
  const envDir = process.env.LEDIM_CONFIG_DIR;
  if (envDir && fs.existsSync(path.join(envDir, filename))) {
    return path.join(envDir, filename);
  }

  if (fs.existsSync(path.join(ETC_DIR, filename))) {
    return path.join(ETC_DIR, filename);
  }

  return path.join(LOCAL_DIR, filename); // fallback
}

function loadJSON(filePath: string): any {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Config file not found: ${filePath}`);
    return null;
  }

  const raw = fs.readFileSync(filePath, "utf-8").trim();

  if (!raw) {
    console.warn(`⚠️ Config file is empty: ${filePath}`);
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Failed to parse JSON in ${filePath}:\n`, err);
    return null;
  }
}

// ------------------ Exported Loader ------------------
export function loadConfig(): LEDIMConfig {
  const userConfigPath = getConfigPath("user_defaults.json");
  const projectDefaultsPath = getConfigPath("project_defaults.json");

  const userConfig = loadJSON(userConfigPath);
  const projectDefaults = loadJSON(projectDefaultsPath);

  if (!userConfig && !projectDefaults) {
    throw new Error(
      `No usable config found.\nChecked:\n - ${userConfigPath}\n - ${projectDefaultsPath}`
    );
  }

  return {
    ...(projectDefaults || {}),
    ...(userConfig || {}),
  } as LEDIMConfig;
}
