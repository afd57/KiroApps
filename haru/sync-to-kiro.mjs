import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KIRO_CREW_DIR = path.join(os.homedir(), '.kiro', 'crew');
const KIRO_APP_DIR = path.join(KIRO_CREW_DIR, 'apps', 'haru');

async function copyDir(src, dest) {
  if (!fsSync.existsSync(src)) return;
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

export async function syncToKiro({ restartBackend = false } = {}) {
  // 1. Ensure root dist/haru-0.1.2.mjs matches ui/dist/haru-0.1.2.mjs
  const uiBundle = path.join(__dirname, 'ui', 'dist', 'haru-0.1.2.mjs');
  const rootDistDir = path.join(__dirname, 'dist');
  const rootBundle = path.join(rootDistDir, 'haru-0.1.2.mjs');

  if (fsSync.existsSync(uiBundle)) {
    await fs.mkdir(rootDistDir, { recursive: true });
    await fs.copyFile(uiBundle, rootBundle);
  }

  // 2. Sync into ~/.kiro/crew/apps/haru if KiroCrew is installed
  if (!fsSync.existsSync(KIRO_CREW_DIR)) {
    console.log('[Haru Sync] ~/.kiro/crew not found, skipping KiroCrew sync.');
    return;
  }

  await fs.mkdir(KIRO_APP_DIR, { recursive: true });
  await fs.mkdir(path.join(KIRO_APP_DIR, 'ui', 'dist'), { recursive: true });
  await fs.mkdir(path.join(KIRO_APP_DIR, 'dist'), { recursive: true });

  // Copy manifest & bundle
  await fs.copyFile(path.join(__dirname, 'app.json'), path.join(KIRO_APP_DIR, 'app.json'));
  if (fsSync.existsSync(uiBundle)) {
    await fs.copyFile(uiBundle, path.join(KIRO_APP_DIR, 'ui', 'dist', 'haru-0.1.2.mjs'));
    await fs.copyFile(uiBundle, path.join(KIRO_APP_DIR, 'dist', 'haru-0.1.2.mjs'));
  }

  // Copy backend, agents, skills, assets
  await copyDir(path.join(__dirname, 'backend'), path.join(KIRO_APP_DIR, 'backend'));
  await copyDir(path.join(__dirname, 'agents'), path.join(KIRO_APP_DIR, 'agents'));
  await copyDir(path.join(__dirname, 'skills'), path.join(KIRO_APP_DIR, 'skills'));
  await copyDir(path.join(__dirname, 'assets'), path.join(KIRO_APP_DIR, 'assets'));

  // Update installed.json to enable dev mode (no-store caching) and fresh timestamp
  const installedPath = path.join(KIRO_APP_DIR, 'installed.json');
  let installed = {
    name: 'haru',
    version: '0.1.3',
    displayName: 'Haru',
    enabled: true,
    installedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: __dirname,
    origin: 'registry',
    resources: 'gateway',
    lifecycle: 'gateway',
    schemaVersion: 2,
    dev: true,
    defaultOnBackfilled: false,
    sessionApprovalConsentPending: false,
  };
  try {
    const existing = JSON.parse(await fs.readFile(installedPath, 'utf8'));
    installed = {
      ...existing,
      version: '0.1.3',
      displayName: 'Haru',
      enabled: true,
      dev: true,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    // use default
  }
  await fs.writeFile(installedPath, JSON.stringify(installed, null, 2), 'utf8');

  // Reset old cached workspace.json in KiroCrew if it was from an older version without capacidades
  if (restartBackend) {
    await restartKiroHaruBackend();
  }

  console.log(`[Haru Sync] Synced build & backend -> ${KIRO_APP_DIR}`);
}

async function restartKiroHaruBackend() {
  const pidsPath = path.join(KIRO_CREW_DIR, 'app_backends.pids.json');
  try {
    if (fsSync.existsSync(pidsPath)) {
      const pids = JSON.parse(await fs.readFile(pidsPath, 'utf8'));
      const oldPid = pids?.haru?.pid;
      if (oldPid) {
        try {
          process.kill(oldPid);
          console.log(`[Haru Sync] Stopped old backend process (PID ${oldPid})`);
        } catch {
          // already stopped
        }
      }
    }
  } catch {
    // ignore
  }

  // Wait briefly for port 9100 to release, then check if KiroCrew respawned it or spawn it ourselves
  await new Promise((r) => setTimeout(r, 600));

  try {
    const res = await fetch('http://127.0.0.1:9100/health');
    if (res.ok) {
      console.log('[Haru Sync] Backend already running on port 9100.');
      return;
    }
  } catch {
    // Not running yet, spawn detached backend in KIRO_APP_DIR
  }

  const serverScript = path.join(KIRO_APP_DIR, 'backend', 'server.mjs');
  const dataDir = path.join(KIRO_APP_DIR, 'data');
  const child = spawn(process.execPath, [serverScript], {
    cwd: KIRO_APP_DIR,
    env: {
      ...process.env,
      KIROCREW_APP_PORT: '9100',
      KIROCREW_DATA_DIR: dataDir,
    },
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  try {
    const pids = fsSync.existsSync(pidsPath)
      ? JSON.parse(await fs.readFile(pidsPath, 'utf8'))
      : {};
    pids.haru = {
      pid: child.pid,
      port: 9100,
      started_at: Date.now() / 1000,
    };
    await fs.writeFile(pidsPath, JSON.stringify(pids), 'utf8');
  } catch {
    // ignore
  }
  console.log(`[Haru Sync] Started updated backend on port 9100 (PID ${child.pid})`);
}

async function runBuildAndSync(restartBackend = false) {
  console.log('[Haru] Building UI bundle...');
  execSync('npm --prefix ui run build', { cwd: __dirname, stdio: 'inherit' });
  await syncToKiro({ restartBackend });
}

const args = process.argv.slice(2);
const isWatch = args.includes('--watch');
const isSyncOnly = args.includes('--sync-only');
const shouldRestart = args.includes('--restart-backend');

if (isSyncOnly) {
  syncToKiro({ restartBackend: shouldRestart });
} else if (isWatch) {
  await runBuildAndSync(true);
  console.log('[Haru Watch] Watching ui/src, backend, and app.json for live KiroCrew updates...');
  let timer = null;
  const trigger = (restartBack) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      runBuildAndSync(restartBack).catch((e) => console.error('[Haru Watch Error]', e));
    }, 250);
  };
  fsSync.watch(path.join(__dirname, 'ui', 'src'), { recursive: true }, () => trigger(false));
  fsSync.watch(path.join(__dirname, 'backend'), { recursive: true }, () => trigger(true));
} else {
  await runBuildAndSync(shouldRestart);
}
