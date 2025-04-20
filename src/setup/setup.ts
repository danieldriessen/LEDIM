// @ts-ignore
const { Select } = require('enquirer');
import fs from 'fs';
import path from 'path';

// Type definitions for layout
interface Area {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
interface LayoutOption {
  id: string;
  name: string;
  description: string;
  areas: Area[];
}
interface AvailableOptions {
  area_layouts: LayoutOption[];
}

const CONFIG_DIR = path.resolve(__dirname, '../../config');
const AVAILABLE_OPTIONS_PATH = path.join(CONFIG_DIR, 'available_options.json');
const USER_DEFAULTS_PATH = path.join(CONFIG_DIR, 'user_defaults.json');
const SYSTEM_STATE_PATH = path.join(CONFIG_DIR, 'system_state.json');

// Function to draw layout preview
function drawLayoutPreview(layout: LayoutOption) {
  console.log(`\n🖼 Drawing layout on matrix: "${layout.name}"`);
  // TODO: Add matrix rendering logic here (using rpi-rgb-led-matrix)
  // You could for example color each area differently and draw dividing lines.
}

// Setup flow
export async function runSetup() {
  console.log("🛠 Initial Setup Started...");

  const optionsData = JSON.parse(fs.readFileSync(AVAILABLE_OPTIONS_PATH, 'utf-8')) as AvailableOptions;
  const layouts = optionsData.area_layouts;

  const selectPrompt = new Select({
    name: 'layout',
    message: 'Select your preferred layout',
    choices: layouts.map(layout => ({
      name: layout.id,
      message: layout.name,
      value: layout
    }))
  });

  selectPrompt.on('cursor', (index: number) => {
    drawLayoutPreview(layouts[index]);
  });

  const selectedLayout = await selectPrompt.run();

  // Save layout to user_defaults.json
  const configToSave = {
    matrix: {
      rows: 64,
      cols: 128,
      chainLength: 1,
      pwmBits: 11
    },
    areas: selectedLayout.areas,
    modules: {} // you can extend this later
  };

  fs.writeFileSync(USER_DEFAULTS_PATH, JSON.stringify(configToSave, null, 2));
  fs.writeFileSync(SYSTEM_STATE_PATH, JSON.stringify({ initialSetupComplete: true }, null, 2));

  console.log("✅ Setup complete! Your configuration has been saved.");
}
