import http from 'node:http';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadStore,
  saveStore,
  resetStoreToDefault,
  parseMarkdownIntoBlocks,
  getWorkspaceMdFilePath,
} from './store.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.KIROCREW_APP_PORT || process.env.PORT || 9100);

const MODEL_LABELS = {
  auto: { label: 'Auto (Recommended)', provider: 'KiroCrew' },
  'qwen3-coder-next': { label: 'Qwen3 Coder Next (256K)', provider: 'Qwen' },
  'qwen3-coder-480b': { label: 'Qwen3 Coder 480B (256K)', provider: 'Qwen' },
  'minimax-m2.5': { label: 'MiniMax M2.5 (196K)', provider: 'MiniMax' },
  'minimax-m2.1': { label: 'MiniMax M2.1 (196K)', provider: 'MiniMax' },
  'deepseek-3.2': { label: 'DeepSeek 3.2 (164K)', provider: 'DeepSeek' },
  'glm-5': { label: 'GLM-5 (200K)', provider: 'Zhipu' },
  'glm-4.7': { label: 'GLM-4.7 (200K)', provider: 'Zhipu' },
  'kimi-k2.5': { label: 'Kimi K2.5 (256K)', provider: 'Moonshot' },
  'claude-sonnet-4.6': { label: 'Claude Sonnet 4.6', provider: 'Anthropic' },
  'claude-sonnet-4.5': { label: 'Claude Sonnet 4.5 (200K)', provider: 'Anthropic' },
  'claude-sonnet-4': { label: 'Claude Sonnet 4 (200K)', provider: 'Anthropic' },
  'claude-haiku-4.5': { label: 'Claude Haiku 4.5 (200K)', provider: 'Anthropic' },
  'claude-opus-4.8': { label: 'Claude Opus 4.8 (1M)', provider: 'Anthropic' },
  'claude-opus-4.7': { label: 'Claude Opus 4.7 (1M)', provider: 'Anthropic' },
  'claude-opus-4.6': { label: 'Claude Opus 4.6 (1M)', provider: 'Anthropic' },
};

function formatModelEntry(id, windowTokens) {
  const known = MODEL_LABELS[id];
  if (known) return { id, label: known.label, provider: known.provider };
  const winSuffix =
    typeof windowTokens === 'number' && windowTokens > 0
      ? ` (${windowTokens >= 1000000 ? `${Math.round(windowTokens / 1000000)}M` : `${Math.round(windowTokens / 1000)}K`})`
      : '';
  return {
    id,
    label: `${id}${winSuffix}`,
    provider: id.includes('claude')
      ? 'Anthropic'
      : id.includes('qwen')
        ? 'Qwen'
        : id.includes('minimax')
          ? 'MiniMax'
          : id.includes('deepseek')
            ? 'DeepSeek'
            : id.includes('glm')
              ? 'Zhipu'
              : 'KiroCrew',
  };
}

async function discoverKiroCapabilities() {
  const home = os.homedir();
  const kiroDir = path.join(home, '.kiro');
  const crewDir = path.join(kiroDir, 'crew');
  const agentsDir = path.join(kiroDir, 'agents');

  const modelsMap = new Map();
  const agentsMap = new Map();
  let defaultAgent = 'default';

  const addModel = (id, win) => {
    const clean = String(id || '').trim();
    if (!clean || modelsMap.has(clean)) return;
    modelsMap.set(clean, formatModelEntry(clean, win));
  };

  addModel('auto');

  let modelWindows = {};
  try {
    const rawWin = await fs.readFile(path.join(crewDir, 'model_windows.json'), 'utf8');
    modelWindows = JSON.parse(rawWin) || {};
  } catch {
    // ignore
  }

  try {
    const rawProv = await fs.readFile(path.join(crewDir, 'provider_models.json'), 'utf8');
    const prov = JSON.parse(rawProv) || {};
    for (const list of Object.values(prov)) {
      if (Array.isArray(list)) {
        for (const m of list) {
          addModel(m, modelWindows[m]);
        }
      }
    }
  } catch {
    // ignore
  }

  for (const [m, win] of Object.entries(modelWindows)) {
    addModel(m, win);
  }

  // Ensure standard KiroCrew models are always present
  for (const fallbackId of [
    'qwen3-coder-next',
    'minimax-m2.5',
    'minimax-m2.1',
    'deepseek-3.2',
    'glm-5',
    'claude-sonnet-4.5',
    'claude-haiku-4.5',
  ]) {
    addModel(fallbackId, modelWindows[fallbackId]);
  }

  try {
    const rawCfg = await fs.readFile(path.join(crewDir, 'config.json'), 'utf8');
    const cfg = JSON.parse(rawCfg) || {};
    if (cfg.default_agent) defaultAgent = cfg.default_agent;
    if (cfg.agents && typeof cfg.agents === 'object') {
      for (const [name, agentCfg] of Object.entries(cfg.agents)) {
        if (!name) continue;
        agentsMap.set(name, {
          id: name,
          name: agentCfg?.display_name || (name === 'default' ? 'default (KiroCrew)' : name),
          description: agentCfg?.description || `KiroCrew ${agentCfg?.kiro_agent || name} agent`,
          model: agentCfg?.model || undefined,
        });
      }
    }
  } catch {
    // ignore
  }

  try {
    const files = await fs.readdir(agentsDir);
    for (const file of files) {
      if (!file.endsWith('.json') || file.startsWith('.') || file.includes('skill-view-')) continue;
      try {
        const rawSpec = await fs.readFile(path.join(agentsDir, file), 'utf8');
        const spec = JSON.parse(rawSpec) || {};
        const name = String(spec.name || file.replace(/\.json$/, '')).trim();
        if (!name || name === 'kirocrew-lite' || agentsMap.has(name)) continue;
        agentsMap.set(name, {
          id: name,
          name: spec.displayName || spec.display_name || name,
          description: spec.description || 'Installed Kiro agent',
          model: spec.model || undefined,
        });
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  if (agentsMap.size === 0) {
    agentsMap.set('default', {
      id: 'default',
      name: 'default (KiroCrew)',
      description: 'Default KiroCrew agent',
    });
  }

  return {
    defaultAgent,
    agents: Array.from(agentsMap.values()),
    models: Array.from(modelsMap.values()),
  };
}

function getUiBuildMtime() {
  const candidates = [
    path.resolve(__dirname, '../ui/dist/haru-0.1.2.mjs'),
    path.resolve(__dirname, '../dist/haru-0.1.2.mjs'),
  ];
  let maxMtime = 0;
  for (const p of candidates) {
    try {
      const st = fsSync.statSync(p);
      if (st.mtimeMs > maxMtime) maxMtime = Math.floor(st.mtimeMs);
    } catch {
      // ignore
    }
  }
  return maxMtime;
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-App-Secret, X-Session-Key',
  });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function normalizeRoute(urlStr) {
  const url = new URL(urlStr || '/', 'http://localhost');
  let pathname = url.pathname;
  pathname = pathname.replace(/^\/apps\/haru\/api/, '');
  pathname = pathname.replace(/^\/api\/apps\/haru/, '');
  if (!pathname.startsWith('/')) pathname = '/' + pathname;
  return { pathname, searchParams: url.searchParams };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  const { pathname } = normalizeRoute(req.url);

  try {
    if (req.method === 'GET' && pathname === '/health') {
      return sendJson(res, 200, {
        status: 'ok',
        app: 'haru',
        version: '0.1.3',
        uiBuildMtime: getUiBuildMtime(),
        workspaceMdPath: getWorkspaceMdFilePath(),
      });
    }

    if (req.method === 'GET' && pathname === '/capabilities') {
      const capabilities = await discoverKiroCapabilities();
      return sendJson(res, 200, {
        ...capabilities,
        uiBuildMtime: getUiBuildMtime(),
      });
    }

    if (req.method === 'GET' && pathname === '/workspace') {
      const store = await loadStore();
      const capabilities = await discoverKiroCapabilities();
      return sendJson(res, 200, {
        ...store,
        capabilities,
        uiBuildMtime: getUiBuildMtime(),
        workspaceMdPath: getWorkspaceMdFilePath(),
      });
    }

    if (req.method === 'PUT' && pathname === '/workspace') {
      const body = await readBody(req);
      const store = await loadStore();

      if (body.doc) {
        store.doc = body.doc;
      } else if (typeof body.rawMarkdown === 'string') {
        store.doc.rawMarkdown = body.rawMarkdown;
        store.doc.blocks = parseMarkdownIntoBlocks(body.rawMarkdown, store.doc.blocks);
      }

      if (Array.isArray(body.connectors)) {
        store.connectors = body.connectors;
      }
      if (Array.isArray(body.intakeQueue)) {
        store.intakeQueue = body.intakeQueue;
      }
      if (body.garden && typeof body.garden === 'object') {
        store.garden = body.garden;
      }

      const saved = await saveStore(store);
      return sendJson(res, 200, saved);
    }

    if (req.method === 'POST' && pathname === '/workspace/reset') {
      const reset = await resetStoreToDefault();
      return sendJson(res, 200, reset);
    }

    if (req.method === 'POST' && pathname === '/tasks/session') {
      const body = await readBody(req);
      const { taskId, sessionPatch } = body;
      const store = await loadStore();

      store.doc.blocks = store.doc.blocks.map((block) => {
        if (block.id !== taskId || block.type !== 'task') return block;
        return {
          ...block,
          session: {
            ...(block.session || { status: 'idle', logs: [], followUps: [] }),
            ...sessionPatch,
          },
        };
      });

      const saved = await saveStore(store);
      return sendJson(res, 200, saved);
    }

    if (req.method === 'POST' && pathname === '/connectors/simulate') {
      const body = await readBody(req);
      const prompt = String(body.prompt || 'fetch my task from asana and insert to workspace');
      const isJira = prompt.toLowerCase().includes('jira');
      const isGoogle = prompt.toLowerCase().includes('google');
      const sample = isJira
        ? '```tasks\n- [ ] [PROD-1402] Resolve Redis connection timeouts @Aziz #jira #backend\n- [ ] [PROD-1388] Add unit tests for connector parser #jira\n```'
        : isGoogle
        ? '```tasks\n- [ ] Prepare demo slides for KiroCrew showcase @Aziz #google-tasks\n- [ ] Review customer feedback tickets #google-tasks\n```'
        : '```tasks\n- [ ] Review Q4 platform architecture deliverables @Aziz #asana #high-priority\n  - [ ] Audit database connection pool settings\n- [ ] Fix OAuth token refresh race condition on mobile app @Sarah #asana #bug\n```';
      return sendJson(res, 200, {
        ok: true,
        prompt,
        sampleResponse: sample,
      });
    }

    return sendJson(res, 404, { error: `Not found: ${req.method} ${pathname}` });
  } catch (err) {
    console.error('[Haru Backend Error]', err);
    return sendJson(res, 500, { error: String(err?.message || err) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Haru Backend] Listening on http://127.0.0.1:${PORT} (Markdown synced to ${getWorkspaceMdFilePath()})`);
});
