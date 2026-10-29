import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  useAppApi,
  useAppEvents,
  useChatLauncher,
  useNotify,
  useTheme,
} from './sdk/kiro-sdk-shim';
import {
  HaruDocument,
  HaruBlock,
  KiroAgentOption,
  KiroModelOption,
} from './types/haru';
import {
  loadLocalFallbackState,
  saveLocalFallbackState,
  parseMarkdownToBlocksClient,
  createDefaultState,
} from './utils/localFallbackStore';
import { toggleTaskLine, cleanTaskBody } from './utils/markdownHelpers';
import { insertTasksIntoMarkdown } from './utils/connectorHelpers';
import { InlineWorkspaceEditor } from './components/InlineWorkspaceEditor';
import { SimpleInlineEditor } from './components/SimpleInlineEditor';
import { RadarView } from './components/RadarView';
import { ConnectorsView } from './components/ConnectorsView';
import { FocusPill } from './components/garden/FocusPill';
import { useGardenGame } from './components/garden/game/useGardenGame';
import haruBaseCss from './styles/haru-base.css?inline';
import haruViewsCss from './styles/haru-views.css?inline';
import haruGardenCss from './styles/haru-garden.css?inline';

const haruCss = `${haruBaseCss}\n${haruViewsCss}\n${haruGardenCss}`;
const API_BASE = '/apps/haru/api';

const DEFAULT_AGENTS: KiroAgentOption[] = [
  { id: 'default', name: 'default (KiroCrew)', description: 'Default KiroCrew agent' },
  { id: 'kirocrew', name: 'kirocrew', description: 'Main KiroCrew agent' },
  { id: 'kirocrew-worker', name: 'kirocrew-worker', description: 'Worker execution agent' },
  { id: 'kirocrew-research', name: 'kirocrew-research', description: 'Research & analysis agent' },
  { id: 'kirocrew-conductor', name: 'kirocrew-conductor', description: 'Conductor agent' },
  { id: 'haru-executor', name: 'haru-executor', description: 'Haru task runner agent' },
];

const DEFAULT_MODELS: KiroModelOption[] = [
  { id: 'auto', label: 'Auto (Recommended)', provider: 'KiroCrew' },
  { id: 'qwen3-coder-next', label: 'Qwen3 Coder Next (256K)', provider: 'Qwen' },
  { id: 'minimax-m2.5', label: 'MiniMax M2.5 (196K)', provider: 'MiniMax' },
  { id: 'minimax-m2.1', label: 'MiniMax M2.1 (196K)', provider: 'MiniMax' },
  { id: 'deepseek-3.2', label: 'DeepSeek 3.2 (164K)', provider: 'DeepSeek' },
  { id: 'glm-5', label: 'GLM-5 (200K)', provider: 'Zhipu' },
  { id: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5 (200K)', provider: 'Anthropic' },
  { id: 'claude-haiku-4.5', label: 'Claude Haiku 4.5 (200K)', provider: 'Anthropic' },
];

function mergeModels(...lists: Array<any[] | undefined>): KiroModelOption[] {
  const map = new Map<string, KiroModelOption>();
  map.set('auto', { id: 'auto', label: 'Auto (Recommended)', provider: 'KiroCrew' });

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item) continue;
      if (typeof item === 'string') {
        const id = item.trim();
        if (id && !map.has(id)) {
          map.set(id, { id, label: id, provider: 'KiroCrew' });
        }
        continue;
      }
      const id = String(
        item.id || item.model_name || item.model || item.name || ''
      ).trim();
      if (!id) continue;
      const rawLabel = String(
        item.label || item.display_name || item.display || item.name || id
      ).trim();
      const win = item.context_window;
      const winSuffix =
        typeof win === 'number' && win > 0 && !rawLabel.includes('K)') && !rawLabel.includes('M)')
          ? ` (${win >= 1000000 ? `${Math.round(win / 1000000)}M` : `${Math.round(win / 1000)}K`})`
          : '';
      const label = id === 'auto' ? 'Auto (Recommended)' : `${rawLabel}${winSuffix}`;
      map.set(id, {
        id,
        label,
        provider: item.provider || 'KiroCrew',
      });
    }
  }

  return Array.from(map.values());
}

function mergeAgents(...lists: Array<any[] | undefined>): KiroAgentOption[] {
  const map = new Map<string, KiroAgentOption>();

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item) continue;
      if (typeof item === 'string') {
        const id = item.trim();
        if (id && !map.has(id)) {
          map.set(id, { id, name: id, description: 'KiroCrew Agent' });
        }
        continue;
      }
      const id = String(item.id || item.name || item.agent || '').trim();
      if (!id || id.includes('••')) continue;
      const displayName = String(
        item.display_name || item.displayName || item.name || id
      ).trim();
      const cleanName = displayName && !displayName.includes('••') ? displayName : id;
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: cleanName === 'default' ? 'default (KiroCrew)' : cleanName,
          description: item.description || 'KiroCrew Agent',
          model: item.model || undefined,
        });
      }
    }
  }

  if (map.size === 0) {
    return DEFAULT_AGENTS;
  }
  return Array.from(map.values());
}

export function HaruApp() {
  const api = useAppApi();
  const { openChat } = useChatLauncher();
  const notify = useNotify();
  const { isHosted, theme, toggleTheme } = useTheme();

  // Inject scoped CSS into document.head (strictly scoped to .haru-shell)
  useEffect(() => {
    const styleId = 'haru-scoped-styles-v2';
    // Remove legacy style tag if present from earlier builds
    const legacy = document.getElementById('haru-bundled-styles');
    if (legacy) legacy.remove();

    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = haruCss;
  }, []);

  const initialFallback = useMemo(() => loadLocalFallbackState(), []);
  const [doc, setDoc] = useState<HaruDocument>(initialFallback.doc);
  const [activeTab, setActiveTab] = useState<'workspace' | 'radar' | 'connectors'>('workspace');
  const [editorMode, setEditorMode] = useState<'simple' | 'block'>('simple');
  const [agents, setAgents] = useState<KiroAgentOption[]>(DEFAULT_AGENTS);
  const [models, setModels] = useState<KiroModelOption[]>(DEFAULT_MODELS);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string }>>([]);
  const [initialBackendGarden, setInitialBackendGarden] = useState<any>(null);

  const { game, gameActions, now, recentRewards } = useGardenGame(doc, {
    api,
    notify,
    isHosted,
    initialBackendGarden,
  });

  const docRef = useRef<HaruDocument>(doc);
  docRef.current = doc;

  // Toast listener for standalone mode
  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.message) return;
      setToasts((prev) => [...prev.slice(-3), { id: detail.id, message: detail.message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== detail.id));
      }, 3200);
    };
    window.addEventListener('haru:toast', onToast);
    return () => window.removeEventListener('haru:toast', onToast);
  }, []);

  // Persist workspace document to both localStorage and backend
  const persistDoc = useCallback(
    async (nextDoc: HaruDocument) => {
      const currentFallback = loadLocalFallbackState();
      saveLocalFallbackState({
        ...currentFallback,
        doc: nextDoc,
      });
      try {
        await api.put(`${API_BASE}/workspace`, { doc: nextDoc });
      } catch {
        // Fallback saved in localStorage
      }
    },
    [api]
  );

  // Sync live KiroCrew chat slots status onto our task blocks
  const syncLiveSlotsStatus = useCallback(async () => {
    try {
      const slotsRes = await api.get<any[]>('/api/chat/slots');
      if (!Array.isArray(slotsRes)) return;
      const slotMap = new Map<string, any>();
      for (const s of slotsRes) {
        if (s?.key) slotMap.set(s.key, s);
      }
      if (slotMap.size === 0) return;

      let changed = false;
      const updatedBlocks = docRef.current.blocks.map((b) => {
        if (b.type !== 'task' || !b.session?.slotKey) return b;
        const liveSlot = slotMap.get(b.session.slotKey);
        if (!liveSlot) return b;

        const nextStatus = liveSlot.running
          ? 'running'
          : (liveSlot.messages ?? 0) > 0
            ? 'completed'
            : b.session.status;

        if (nextStatus !== b.session.status) {
          changed = true;
          return {
            ...b,
            session: {
              ...b.session,
              status: nextStatus as any,
            },
          };
        }
        return b;
      });

      if (changed) {
        const nextDoc: HaruDocument = {
          ...docRef.current,
          updatedAt: new Date().toISOString(),
          blocks: updatedBlocks,
        };
        setDoc(nextDoc);
        persistDoc(nextDoc);
      }
    } catch {
      // ignore when offline/standalone
    }
  }, [api, persistDoc]);

  // Initial load: Workspace + KiroCrew Agents & Models
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [wsRes, modelsRes, catalogRes, agentsRes] = await Promise.allSettled([
        api.get<any>(`${API_BASE}/workspace`),
        api.get<any>('/api/models'),
        api.get<any>('/api/agents/catalog'),
        api.get<any>('/api/agents'),
      ]);

      if (!mounted) return;

      let backendCapsAgents: any[] | undefined;
      let backendCapsModels: any[] | undefined;

      if (wsRes.status === 'fulfilled' && wsRes.value?.doc) {
        setDoc(wsRes.value.doc);
        if (wsRes.value.garden) {
          setInitialBackendGarden(wsRes.value.garden);
        }
        saveLocalFallbackState({
          doc: wsRes.value.doc,
          connectors: wsRes.value.connectors || [],
          intakeQueue: wsRes.value.intakeQueue || [],
        });
        backendCapsAgents = wsRes.value.capabilities?.agents;
        backendCapsModels = wsRes.value.capabilities?.models;
      }

      const kiroModels =
        modelsRes.status === 'fulfilled'
          ? Array.isArray(modelsRes.value)
            ? modelsRes.value
            : modelsRes.value?.models
          : undefined;

      const catalogAgents =
        catalogRes.status === 'fulfilled' && Array.isArray(catalogRes.value?.agents)
          ? catalogRes.value.agents
          : undefined;

      const rosterAgents =
        agentsRes.status === 'fulfilled'
          ? Array.isArray(agentsRes.value)
            ? agentsRes.value
            : agentsRes.value?.agents
          : undefined;

      setModels(mergeModels(kiroModels, backendCapsModels, DEFAULT_MODELS));
      setAgents(mergeAgents(catalogAgents, rosterAgents, backendCapsAgents, DEFAULT_AGENTS));

      syncLiveSlotsStatus();
    })();

    return () => {
      mounted = false;
    };
  }, [api, syncLiveSlotsStatus]);

  // Poll slot status while any task has an active/linked KiroCrew session
  useEffect(() => {
    const hasLinkedSessions = doc.blocks.some(
      (b) => b.type === 'task' && (b.session?.status === 'running' || b.session?.slotKey)
    );
    if (!hasLinkedSessions) return;

    const timer = setInterval(() => {
      syncLiveSlotsStatus();
    }, 3500);
    return () => clearInterval(timer);
  }, [doc.blocks, syncLiveSlotsStatus]);

  // Subscribe to KiroCrew live slot & chat completion events
  useAppEvents('slots', () => {
    syncLiveSlotsStatus();
  });
  useAppEvents('chat_done', () => {
    syncLiveSlotsStatus();
  });
  useAppEvents('chat_status', () => {
    syncLiveSlotsStatus();
  });

  // Document editing handlers
  const handleChangeRawMarkdown = useCallback(
    (nextMarkdown: string) => {
      setDoc((prev) => {
        const nextBlocks = parseMarkdownToBlocksClient(nextMarkdown, prev.blocks);
        const nextDoc: HaruDocument = {
          ...prev,
          updatedAt: new Date().toISOString(),
          rawMarkdown: nextMarkdown,
          blocks: nextBlocks,
        };
        persistDoc(nextDoc);
        return nextDoc;
      });
    },
    [persistDoc]
  );

  const handleToggleTask = useCallback(
    (blockId: string) => {
      setDoc((prev) => {
        const nextBlocks = prev.blocks.map((b) => {
          if (b.id !== blockId || b.type !== 'task') return b;
          const nextChecked = !b.checked;
          const nextLine = toggleTaskLine(b.content, nextChecked);
          return { ...b, checked: nextChecked, content: nextLine };
        });
        const nextRaw = nextBlocks.map((b) => b.content).join('\n');
        const nextDoc: HaruDocument = {
          ...prev,
          updatedAt: new Date().toISOString(),
          rawMarkdown: nextRaw,
          blocks: parseMarkdownToBlocksClient(nextRaw, nextBlocks),
        };
        persistDoc(nextDoc);
        return nextDoc;
      });
    },
    [persistDoc]
  );

  const handleUpdateBlockLine = useCallback(
    (blockId: string, newLine: string) => {
      setDoc((prev) => {
        const nextLines = prev.blocks.map((b) => (b.id === blockId ? newLine : b.content));
        const nextRaw = nextLines.join('\n');
        const nextBlocks = parseMarkdownToBlocksClient(nextRaw, prev.blocks);
        const nextDoc: HaruDocument = {
          ...prev,
          updatedAt: new Date().toISOString(),
          rawMarkdown: nextRaw,
          blocks: nextBlocks,
        };
        persistDoc(nextDoc);
        return nextDoc;
      });
    },
    [persistDoc]
  );

  const handleInsertLineAfter = useCallback(
    (blockId: string, lineToInsert: string) => {
      setDoc((prev) => {
        const idx = prev.blocks.findIndex((b) => b.id === blockId);
        const lines = prev.blocks.map((b) => b.content);
        if (idx === -1) {
          lines.push(lineToInsert);
        } else {
          lines.splice(idx + 1, 0, lineToInsert);
        }
        const nextRaw = lines.join('\n');
        const nextBlocks = parseMarkdownToBlocksClient(nextRaw, prev.blocks);
        const nextDoc: HaruDocument = {
          ...prev,
          updatedAt: new Date().toISOString(),
          rawMarkdown: nextRaw,
          blocks: nextBlocks,
        };
        persistDoc(nextDoc);
        return nextDoc;
      });
    },
    [persistDoc]
  );

  const handleDeleteBlockLine = useCallback(
    (blockId: string) => {
      setDoc((prev) => {
        if (prev.blocks.length <= 1) return prev;
        const lines = prev.blocks.filter((b) => b.id !== blockId).map((b) => b.content);
        const nextRaw = lines.join('\n');
        const nextBlocks = parseMarkdownToBlocksClient(nextRaw, prev.blocks);
        const nextDoc: HaruDocument = {
          ...prev,
          updatedAt: new Date().toISOString(),
          rawMarkdown: nextRaw,
          blocks: nextBlocks,
        };
        persistDoc(nextDoc);
        return nextDoc;
      });
    },
    [persistDoc]
  );

  const updateTaskSession = useCallback(
    (taskId: string, patch: Partial<NonNullable<HaruBlock['session']>>): HaruDocument => {
      const prev = docRef.current;
      const nextBlocks = prev.blocks.map((b) => {
        if (b.id !== taskId || b.type !== 'task') return b;
        const existing = b.session || {
          status: 'idle',
          agent: agents[0]?.id || 'default',
          model: models[0]?.id || 'auto',
          logs: [],
          followUps: [],
        };
        return {
          ...b,
          session: {
            ...existing,
            ...patch,
          },
        };
      });
      const nextDoc: HaruDocument = {
        ...prev,
        updatedAt: new Date().toISOString(),
        blocks: nextBlocks,
      };
      docRef.current = nextDoc;
      setDoc(nextDoc);
      persistDoc(nextDoc);
      return nextDoc;
    },
    [agents, models, persistDoc]
  );

  const handleChangeAgent = useCallback(
    (blockId: string, agent: string) => {
      updateTaskSession(blockId, { agent });
    },
    [updateTaskSession]
  );

  const handleChangeModel = useCallback(
    (blockId: string, model: string) => {
      updateTaskSession(blockId, { model });
    },
    [updateTaskSession]
  );

  // Navigate to an existing KiroCrew session
  const handleGoToSession = useCallback(
    (block: HaruBlock) => {
      const slotKey = block.session?.slotKey;
      if (slotKey) {
        openChat({ slotKey });
      } else {
        openChat({});
      }
    },
    [openChat]
  );

  // Run task as a new session in KiroCrew, submit message, mark running, and navigate to session
  const handleRunSession = useCallback(
    async (block: HaruBlock) => {
      const cleanParentTitle = cleanTaskBody(block.content) || 'Hello';
      let fullPromptText = cleanParentTitle;

      // If this parent task has subtasks, gather them into the prompt for the AI agent
      if (block.subtaskIds && block.subtaskIds.length > 0) {
        const currentDoc = docRef.current;
        const subtasks = currentDoc.blocks.filter((b) => block.subtaskIds?.includes(b.id));
        if (subtasks.length > 0) {
          const subtaskList = subtasks
            .map((s) => `  - [${s.checked ? 'x' : ' '}] ${cleanTaskBody(s.content)}`)
            .join('\n');
          fullPromptText = `${cleanParentTitle}\n\nSubtasks to accomplish:\n${subtaskList}`;
        }
      }

      const agentId = block.session?.agent || agents[0]?.id || 'default';
      const modelId = block.session?.model || models[0]?.id || 'auto';
      const requestedSlotKey = `haru-${Date.now().toString(36)}`;

      // 1. Immediately mark task as running with its slotKey
      updateTaskSession(block.id, {
        status: 'running',
        slotKey: requestedSlotKey,
        agent: agentId,
        model: modelId,
        startedAt: new Date().toISOString(),
      });

      let resolvedSlotKey = requestedSlotKey;
      let submittedDirectly = false;

      try {
        // 2. Create the chat slot in KiroCrew with selected agent, model, and task title
        const slotRes = await api.post<any>('/api/chat/slots', {
          name: requestedSlotKey,
          title: cleanParentTitle.slice(0, 80),
          agent: agentId === 'default' ? '' : agentId,
          ...(modelId && modelId !== 'auto' ? { model: modelId } : {}),
        });
        if (slotRes?.key) {
          resolvedSlotKey = slotRes.key;
        }

        // 3. Ensure model is set on the slot if specified
        if (modelId && modelId !== 'auto') {
          await api
            .post(`/api/chat/slots/${encodeURIComponent(resolvedSlotKey)}/model`, {
              model: modelId,
            })
            .catch(() => { });
        }

        // 4. Submit the task prompt directly into the KiroCrew session via POST /api/chat?ws=1
        const chatRes = await api.post<any>('/api/chat?ws=1', {
          slot: resolvedSlotKey,
          message: fullPromptText,
          ...(agentId && agentId !== 'default' ? { agent: agentId } : {}),
        });
        submittedDirectly = Boolean(chatRes?.ok || chatRes?.slot);
      } catch (err) {
        console.warn('[Haru] Direct session submission fallback:', err);
      }

      // 5. Persist resolved slotKey & running status before navigating
      const updatedDoc = updateTaskSession(block.id, {
        status: 'running',
        slotKey: resolvedSlotKey,
        agent: agentId,
        model: modelId,
      });
      await persistDoc(updatedDoc);

      notify(`Submitted "${cleanParentTitle}" to KiroCrew session (${resolvedSlotKey})`, 'success');

      // 6. Navigate to the KiroCrew session
      if (submittedDirectly) {
        openChat({ slotKey: resolvedSlotKey });
      } else {
        openChat({
          slotKey: resolvedSlotKey,
          agent: agentId === 'default' ? undefined : agentId,
          message: fullPromptText,
          autoSend: true,
        });
      }
    },
    [api, agents, models, notify, openChat, persistDoc, updateTaskSession]
  );

  // Move unfinished backlog tasks into # Today from Radar
  const handleMoveAllUnfinishedToToday = useCallback(() => {
    setDoc((prev) => {
      const backlogIds = new Set(
        prev.blocks
          .filter(
            (b) =>
              b.type === 'task' &&
              !b.checked &&
              !(b.sectionTitle || '').toLowerCase().includes('today')
          )
          .map((b) => b.id)
      );
      if (backlogIds.size === 0) return prev;

      const movedLines: string[] = [];
      const remainingLines: string[] = [];
      for (const b of prev.blocks) {
        if (backlogIds.has(b.id)) {
          movedLines.push(b.content);
        } else {
          remainingLines.push(b.content);
        }
      }

      const todayIdx = remainingLines.findIndex((l) => /^#\s+Today/i.test(l.trim()));
      if (todayIdx !== -1) {
        remainingLines.splice(todayIdx + 1, 0, ...movedLines);
      } else {
        remainingLines.unshift('# Today', ...movedLines, '');
      }

      const nextRaw = remainingLines.join('\n');
      const nextDoc: HaruDocument = {
        ...prev,
        updatedAt: new Date().toISOString(),
        rawMarkdown: nextRaw,
        blocks: parseMarkdownToBlocksClient(nextRaw, prev.blocks),
      };
      persistDoc(nextDoc);
      notify(`Moved ${movedLines.length} unfinished tasks to # Today`, 'success');
      return nextDoc;
    });
  }, [notify, persistDoc]);

  // Insert tasks parsed from AI / connectors into the designated section
  const handleInsertConnectorTasks = useCallback(
    (taskLines: string[], targetSection: string) => {
      setDoc((prev) => {
        const nextRaw = insertTasksIntoMarkdown(prev.rawMarkdown, taskLines, targetSection);
        const nextBlocks = parseMarkdownToBlocksClient(nextRaw, prev.blocks);
        const nextDoc: HaruDocument = {
          ...prev,
          updatedAt: new Date().toISOString(),
          rawMarkdown: nextRaw,
          blocks: nextBlocks,
        };
        persistDoc(nextDoc);
        return nextDoc;
      });
      const topCount = taskLines.filter((l) => !l.startsWith('  ')).length;
      notify(`Inserted ${topCount} task${topCount === 1 ? '' : 's'} into #${targetSection.replace(/^#+\s*/, '')}`, 'success');
    },
    [notify, persistDoc]
  );

  const handleResetDemo = useCallback(async () => {
    try {
      const res = await api.post<any>(`${API_BASE}/workspace/reset`, {});
      if (res?.doc) {
        setDoc(res.doc);
        saveLocalFallbackState({
          doc: res.doc,
          connectors: res.connectors || [],
          intakeQueue: res.intakeQueue || [],
        });
        notify('Workspace reset to default tasks', 'info');
        return;
      }
    } catch {
      // fallback
    }
    const def = createDefaultState();
    setDoc(def.doc);
    saveLocalFallbackState(def);
    notify('Workspace reset to default tasks', 'info');
  }, [api, notify]);

  const incompleteCount = useMemo(
    () => doc.blocks.filter((b) => b.type === 'task' && !b.checked).length,
    [doc.blocks]
  );

  const runningCount = useMemo(
    () => doc.blocks.filter((b) => b.type === 'task' && b.session?.status === 'running').length,
    [doc.blocks]
  );

  return (
    <div className="haru-shell">
      {/* Minimal Header */}
      <header className="haru-topbar">
        <div className="haru-brand">
          <span className="haru-brand-title">Haru</span>
          <span className="haru-brand-subtitle">Tasks & Notes</span>
        </div>

        <nav className="haru-nav-tabs" aria-label="Haru Views">
          <button
            type="button"
            className={`haru-nav-tab ${activeTab === 'workspace' ? 'active' : ''}`}
            onClick={() => setActiveTab('workspace')}
          >
            Workspace
            {runningCount > 0 && (
              <span
                className="haru-tab-badge"
                style={{ background: 'color-mix(in srgb, var(--haru-ok) 18%, transparent)', color: 'var(--haru-ok)' }}
              >
                {runningCount} running
              </span>
            )}
          </button>

          <button
            type="button"
            className={`haru-nav-tab ${activeTab === 'radar' ? 'active' : ''}`}
            onClick={() => setActiveTab('radar')}
          >
            Radar
            {incompleteCount > 0 && (
              <span className="haru-tab-badge">{incompleteCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`haru-nav-tab ${activeTab === 'connectors' ? 'active' : ''}`}
            onClick={() => setActiveTab('connectors')}
          >
            🔌 Connectors
          </button>
        </nav>

        <div className="haru-topbar-actions">
          {game.focus && (
            <FocusPill
              focus={game.focus}
              task={doc.blocks.find((b) => b.id === game.focus?.taskId) || null}
              now={now}
              onClick={() => {
                setActiveTab('workspace');
                try {
                  localStorage.setItem('haru.viewMode.v1', 'garden');
                  window.dispatchEvent(new Event('storage'));
                } catch {
                  // ignore
                }
              }}
            />
          )}

          {activeTab === 'workspace' && (
            <div className="haru-editor-mode-toggle" title="Switch editor view">
              <button
                type="button"
                className={`haru-mode-btn ${editorMode === 'simple' ? 'active' : ''}`}
                onClick={() => setEditorMode('simple')}
              >
                ⚡ Simple Editor
              </button>
              <button
                type="button"
                className={`haru-mode-btn ${editorMode === 'block' ? 'active' : ''}`}
                onClick={() => setEditorMode('block')}
              >
                ☰ Block Editor
              </button>
            </div>
          )}

          <button
            type="button"
            className="haru-btn"
            onClick={handleResetDemo}
            title="Reset sample tasks"
          >
            Reset Tasks
          </button>
          {!isHosted && (
            <button
              type="button"
              className="haru-btn"
              onClick={toggleTheme}
              title="Toggle standalone preview theme"
            >
              {theme === 'dark' ? '☀ Light' : '🌙 Dark'}
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="haru-main-area">
        {activeTab === 'workspace' ? (
          editorMode === 'simple' ? (
            <SimpleInlineEditor
              doc={doc}
              agents={agents}
              models={models}
              game={game}
              gameActions={gameActions}
              now={now}
              recentRewards={recentRewards}
              onChangeRawMarkdown={handleChangeRawMarkdown}
              onToggleTask={handleToggleTask}
              onChangeAgent={handleChangeAgent}
              onChangeModel={handleChangeModel}
              onRunSession={handleRunSession}
              onGoToSession={handleGoToSession}
            />
          ) : (
            <InlineWorkspaceEditor
              doc={doc}
              agents={agents}
              models={models}
              onChangeRawMarkdown={handleChangeRawMarkdown}
              onToggleTask={handleToggleTask}
              onUpdateBlockLine={handleUpdateBlockLine}
              onInsertLineAfter={handleInsertLineAfter}
              onDeleteBlockLine={handleDeleteBlockLine}
              onChangeAgent={handleChangeAgent}
              onChangeModel={handleChangeModel}
              onRunSession={handleRunSession}
              onGoToSession={handleGoToSession}
            />
          )
        ) : activeTab === 'radar' ? (
          <RadarView
            doc={doc}
            agents={agents}
            models={models}
            onToggleTask={handleToggleTask}
            onChangeAgent={handleChangeAgent}
            onChangeModel={handleChangeModel}
            onRunSession={handleRunSession}
            onGoToSession={handleGoToSession}
            onMoveAllUnfinishedToToday={handleMoveAllUnfinishedToToday}
          />
        ) : (
          <ConnectorsView
            doc={doc}
            agents={agents}
            models={models}
            onInsertTasks={handleInsertConnectorTasks}
            onNavigateToWorkspace={() => setActiveTab('workspace')}
          />
        )}
      </main>

      {/* Standalone Toast Notifications */}
      {toasts.length > 0 && (
        <div className="haru-toast-stack">
          {toasts.map((t) => (
            <div key={t.id} className="haru-toast">
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HaruHotHost() {
  const api = useAppApi();
  const [HotComp, setHotComp] = useState<React.ComponentType | null>(null);
  const lastMtimeRef = useRef<number>(0);

  useEffect(() => {
    let active = true;
    const checkBuildUpdate = async () => {
      try {
        const health = await api.get<any>(`${API_BASE}/health`);
        const mtime = Number(health?.uiBuildMtime || 0);
        if (!active || !mtime) return;
        if (lastMtimeRef.current === 0) {
          lastMtimeRef.current = mtime;
          return;
        }
        if (mtime > lastMtimeRef.current) {
          lastMtimeRef.current = mtime;
          const modUrl = `/apps/haru/ui/dist/haru-0.1.2.mjs?t=${mtime}`;
          const mod = await import(/* @vite-ignore */ modUrl);
          if (active && (mod?.HaruApp || mod?.default)) {
            setHotComp(() => mod.HaruApp || mod.default);
          }
        }
      } catch {
        // ignore
      }
    };

    checkBuildUpdate();
    const timer = setInterval(checkBuildUpdate, 2500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [api]);

  const ActiveComponent = HotComp || HaruApp;
  return <ActiveComponent />;
}

export default HaruHotHost;

