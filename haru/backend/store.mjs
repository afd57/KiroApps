import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.KIROCREW_DATA_DIR
  ? path.resolve(process.env.KIROCREW_DATA_DIR)
  : path.resolve(__dirname, '../data');

const WORKSPACE_FILE = path.join(DATA_DIR, 'workspace.json');
const WORKSPACE_MD_FILE = path.join(DATA_DIR, 'workspace.md');

function todayHeading() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

const DEFAULT_MARKDOWN = `# Today (${todayHeading()})
Quick daily notes and tasks. Pick an agent and model on any task, then click Run to start a KiroCrew session.

[] say hello Aziz
[] Review open pull requests and summarize blockers @Aziz #code-review
[x] Set up daily workspace notes #setup

# Backlog & Follow-ups
Unfinished tasks here also appear in the Radar tab.

[] Check API performance metrics on staging @Sarah #backend
[] Draft release notes for next sprint #docs`;

function parseTagsAndPeople(text) {
  const people = Array.from(new Set(Array.from(text.matchAll(/@([a-zA-Z0-9_-]+)/g)).map((m) => m[1])));
  const tags = Array.from(new Set(Array.from(text.matchAll(/#([a-zA-Z0-9_-]+)/g)).map((m) => m[1])));
  return { people, tags };
}

function cleanTaskBody(content) {
  if (!content) return '';
  return content.replace(/^(\s*(?:(?:[-*]|\d+\.)\s+)?(?:\[[ xX]?\]\s*)?)/, '').trim();
}

export function parseMarkdownIntoBlocks(rawMarkdown, existingBlocks = []) {
  const lines = rawMarkdown.split(/\r?\n/);
  const existingTaskMap = new Map();
  const usedIds = new Set();

  for (const b of existingBlocks) {
    if (b.type === 'task') {
      const cleanKey = cleanTaskBody(b.content).toLowerCase();
      if (!existingTaskMap.has(cleanKey)) {
        existingTaskMap.set(cleanKey, []);
      }
      existingTaskMap.get(cleanKey).push(b);
    }
  }

  let currentSection = 'General';
  let lastParentTaskId = null;

  const blocks = lines.map((line, index) => {
    const trimmed = line.trim();

    // 1. Header (# Section)
    const headerMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      currentSection = headerMatch[2].trim();
      lastParentTaskId = null;
      const { people, tags } = parseTagsAndPeople(trimmed);
      return {
        id: `hdr-${index}`,
        type: 'header',
        content: line,
        headerLevel: headerMatch[1].length,
        sectionTitle: currentSection,
        people,
        tags,
      };
    }

    // 2. Indentation check
    const indentMatch = line.match(/^(\s*)/);
    const indentSpaces = indentMatch ? indentMatch[1].length : 0;

    // 3. Task with checkbox: e.g. "[] foo", "[x] bar", "- [ ] foo", " - [x] bar", "* [ ] baz", "1. [ ] foo"
    const checkboxMatch = line.match(/^(\s*)(?:(?:[-*]|\d+\.)\s+)?\[([ xX]?)\]\s*(.*)$/);

    // 4. Bullet task: e.g. "- Parent task", " - sub task", "* sub task"
    const bulletMatch = !checkboxMatch ? line.match(/^(\s*)[-*]\s+(.+)$/) : null;

    // 5. Numbered task item: e.g. "1. Onboarding @aziz2", "2. Bug fix @aziz"
    const numberedMatch = !checkboxMatch && !bulletMatch ? line.match(/^(\s*)\d+\.\s+(.+)$/) : null;

    if (checkboxMatch || bulletMatch || numberedMatch) {
      const checked = checkboxMatch ? checkboxMatch[2].toLowerCase() === 'x' : false;
      const bodyText = checkboxMatch
        ? checkboxMatch[3]
        : bulletMatch
        ? bulletMatch[2]
        : numberedMatch
        ? numberedMatch[2]
        : '';
      const cleanKey = bodyText.trim().toLowerCase();
      const candidates = existingTaskMap.get(cleanKey) || [];
      const matched = candidates.find((c) => !usedIds.has(c.id)) || existingBlocks[index];

      const id =
        matched && matched.type === 'task' && !usedIds.has(matched.id)
          ? matched.id
          : `task-${index}-${Math.random().toString(36).slice(2, 6)}`;
      usedIds.add(id);

      const { people, tags } = parseTagsAndPeople(bodyText);

      // Determine parent/subtask relationship
      const isSubtask = indentSpaces > 0 && Boolean(lastParentTaskId);
      const parentId = isSubtask ? (lastParentTaskId || undefined) : undefined;
      if (!isSubtask) {
        lastParentTaskId = id;
      }

      return {
        id,
        type: 'task',
        content: line,
        checked,
        sectionTitle: currentSection,
        people,
        tags,
        owner: people[0] || matched?.owner,
        session: matched?.session || {
          status: 'idle',
          agent: 'default',
          model: 'auto',
          logs: [],
          followUps: [],
        },
        carryoverDays: matched?.carryoverDays || 0,
        intakeSource: matched?.intakeSource,
        isSubtask,
        parentId,
        indentLevel: indentSpaces > 0 ? Math.max(1, Math.floor(indentSpaces / 2)) : 0,
      };
    }

    // 5. Note line
    const { people, tags } = parseTagsAndPeople(trimmed);
    return {
      id: `note-${index}`,
      type: 'note',
      content: line,
      sectionTitle: currentSection,
      people,
      tags,
    };
  });

  // Link subtaskIds to parent tasks
  const blockMap = new Map();
  for (const b of blocks) {
    blockMap.set(b.id, b);
  }
  for (const b of blocks) {
    if (b.parentId) {
      const parent = blockMap.get(b.parentId);
      if (parent) {
        if (!parent.subtaskIds) parent.subtaskIds = [];
        parent.subtaskIds.push(b.id);
      }
    }
  }

  return blocks;
}

function createInitialStore() {
  const blocks = parseMarkdownIntoBlocks(DEFAULT_MARKDOWN, []);

  return {
    doc: {
      id: 'haru-main-workspace',
      updatedAt: new Date().toISOString(),
      rawMarkdown: DEFAULT_MARKDOWN,
      blocks,
    },
    connectors: [
      {
        id: 'conn-slack',
        name: 'Slack Mentions & DMs',
        icon: 'Slack',
        enabled: true,
        source: 'slack',
        channelOrFilter: '#eng-platform, @mentions',
        lastSyncedAt: 'Just now',
        pendingCount: 1,
      },
      {
        id: 'conn-email',
        name: 'Email Action Items',
        icon: 'Mail',
        enabled: true,
        source: 'email',
        channelOrFilter: 'label:action-required',
        lastSyncedAt: '10m ago',
        pendingCount: 1,
      },
    ],
    intakeQueue: [
      {
        id: 'intake-1',
        source: 'slack',
        sender: '@Aziz',
        channel: '#general',
        previewText: 'Can we test running tasks directly in a KiroCrew session?',
        suggestedTask: '[] Test running tasks directly in a KiroCrew session @Aziz #kirocrew',
        receivedAt: 'Just now',
        accepted: false,
      },
    ],
  };
}

export async function loadStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(WORKSPACE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    const initial = createInitialStore();
    await saveStore(initial);
    return initial;
  }
}

export async function saveStore(store) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  store.doc.updatedAt = new Date().toISOString();
  await fs.writeFile(WORKSPACE_FILE, JSON.stringify(store, null, 2), 'utf8');
  await fs.writeFile(WORKSPACE_MD_FILE, store.doc.rawMarkdown || '', 'utf8');
  return store;
}

export async function resetStoreToDefault() {
  const initial = createInitialStore();
  await saveStore(initial);
  return initial;
}

export function getWorkspaceMdFilePath() {
  return WORKSPACE_MD_FILE;
}
