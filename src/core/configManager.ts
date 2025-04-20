import fs from "fs";
import path from "path";

export interface LEDIMConfig {
  matrix: {
    rows: 16 | 32 | 64;
    cols: 16 | 32 | 40 | 64;
    chainLength?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
    pwmBits?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
  };
  areas: Array<{
    name: string;
    x: number;
    y: number;
    w: number;
    h: number;
    module: string;
  }>;
  modules: Record<string, unknown>;
}

function loadJSON(filePath: string): any {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

export function loadConfig(): LEDIMConfig {
  const configDir = path.resolve(__dirname, "../../config");

  const userConfigPath = process.env.CONFIG_PATH ?? path.join(configDir, "user_defaults.json");
  const projectDefaultsPath = path.join(configDir, "project_defaults.json");

  const userConfig = loadJSON(userConfigPath);
  const projectDefaults = loadJSON(projectDefaultsPath);

  if (!userConfig && !projectDefaults) {
    throw new Error(`No usable config found. Checked: ${userConfigPath} and ${projectDefaultsPath}`);
  }

  // Merge userConfig over projectDefaults
  const mergedConfig = {
    ...(projectDefaults || {}),
    ...(userConfig || {}),
  };

  return mergedConfig as LEDIMConfig;
}
