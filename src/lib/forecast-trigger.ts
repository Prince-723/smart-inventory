import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

let isTraining = false;
let pendingTrigger = false;

export function triggerBackgroundForecast() {
  if (isTraining) {
    console.log('[Forecast Automation] Prophet model is already training in background. Queueing next run...');
    pendingTrigger = true;
    return;
  }

  isTraining = true;
  pendingTrigger = false;

  const scriptPath = path.join(process.cwd(), 'ml', 'train_forecast.py');
  
  // Support both Windows and Unix virtual environments
  let pythonPath = path.join(process.cwd(), '.venv', 'Scripts', 'python.exe');
  if (!fs.existsSync(pythonPath)) {
    pythonPath = path.join(process.cwd(), '.venv', 'bin', 'python');
  }

  console.log(`[Forecast Automation] Spawning background Prophet engine: "${pythonPath}" "${scriptPath}"`);

  try {
    const child = spawn(pythonPath, [scriptPath]);

    child.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[Forecast Automation Output]:\n${output}`);
      }
    });

    child.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      // Skip cmdstanpy solver details or standard warnings to prevent log clutter
      if (msg.includes('INFO') || msg.includes('Chain') || msg.includes('Warning') || msg.includes('plotly')) {
        return;
      }
      console.warn(`[Forecast Automation Warning]: ${msg}`);
    });

    child.on('close', (code) => {
      console.log(`[Forecast Automation] Background Prophet process exited with code ${code}`);
      isTraining = false;

      // Execute queued trigger if a POS checkout occurred during training
      if (pendingTrigger) {
        console.log('[Forecast Automation] Executing queued pipeline execution...');
        triggerBackgroundForecast();
      }
    });

    child.on('error', (err) => {
      console.error('[Forecast Automation] Spawn Error:', err);
      isTraining = false;
    });

  } catch (err) {
    console.error('[Forecast Automation] Failed to start background training:', err);
    isTraining = false;
  }
}
