import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncToKiro } from './sync-to-kiro.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWin = process.platform === 'win32';

console.log('Starting Haru Standalone + KiroCrew Live Sync...');

await syncToKiro({ restartBackend: true });

const ui = spawn(isWin ? 'npm.cmd' : 'npm', ['--prefix', 'ui', 'run', 'dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: isWin,
});

const shutdown = () => {
  ui.kill();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
