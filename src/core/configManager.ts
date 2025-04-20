// LEDIM/src/core/configManager.ts
//--------------------------------------------------------------
// Loads the user's JSON configuration and returns a typed
// object.  You can override the path at runtime via the
// CONFIG_PATH environment variable.
//--------------------------------------------------------------

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

export function loadConfig(): LEDIMConfig {
  const cfgPath = process.env.CONFIG_PATH ?? path.resolve(__dirname, "../../config/default.json");

  if (!fs.existsSync(cfgPath)) {
    throw new Error(`Config file not found: ${cfgPath}`);
  }

  const raw = fs.readFileSync(cfgPath, "utf-8");
  return JSON.parse(raw) as LEDIMConfig;
}
