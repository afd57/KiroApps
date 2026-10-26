import { parseTagsAndPeople } from './markdownHelpers';

export interface ParsedConnectorTask {
  id: string;
  title: string;
  assignee?: string;
  tags: string[];
  subtasks: string[];
  selected: boolean;
  rawLine: string;
}

export interface ConnectorPreset {
  id: string;
  name: string;
  icon: string;
  color: string;
  defaultPrompt: string;
  sampleResponse: string;
}

export const CONNECTOR_PRESETS: ConnectorPreset[] = [
  {
    id: 'asana',
    name: 'Asana',
    icon: '🔴',
    color: '#f06a6a',
    defaultPrompt: 'Fetch my open assigned tasks from Asana and insert to workspace',
    sampleResponse: `\`\`\`tasks
- [ ] Review Q4 platform architecture deliverables @Aziz #asana #high-priority
  - [ ] Audit database connection pool settings
  - [ ] Benchmark query response latencies under load
- [ ] Fix OAuth token refresh race condition on mobile app @Sarah #asana #bug
- [ ] Update team onboarding guide with new API keys #asana #docs
\`\`\``,
  },
  {
    id: 'jira',
    name: 'Jira',
    icon: '🔷',
    color: '#0052cc',
    defaultPrompt: 'Fetch my active sprint tickets and blockers from Jira #backend',
    sampleResponse: `\`\`\`tasks
- [ ] [PROD-1402] Resolve Redis connection timeouts during traffic spikes @Aziz #jira #backend
  - [ ] Increase sentinel timeout threshold to 3s
  - [ ] Deploy retry backoff patch
- [ ] [PROD-1388] Add unit tests for workspace connector parser #jira #testing
- [ ] [PROD-1395] Review pending pull requests for billing service @Sarah #jira
\`\`\``,
  },
  {
    id: 'google-tasks',
    name: 'Google Tasks',
    icon: '🟢',
    color: '#4285f4',
    defaultPrompt: 'Fetch my pending tasks for today from Google Tasks',
    sampleResponse: `\`\`\`tasks
- [ ] Prepare demo slides for KiroCrew showcase meeting @Aziz #google-tasks #presentation
- [ ] Review customer feedback tickets from weekend release #google-tasks #ops
- [ ] Schedule 1:1 sync with platform engineering lead #google-tasks #1on1
\`\`\``,
  },
  {
    id: 'linear',
    name: 'Linear',
    icon: '🟣',
    color: '#5e6ad2',
    defaultPrompt: 'Fetch high priority issues assigned to me from Linear',
    sampleResponse: `\`\`\`tasks
- [ ] LIN-420: Refactor workspace markdown parser to support nested subtasks @Aziz #linear #core
  - [ ] Verify regex performance with 1000+ lines
- [ ] LIN-435: Optimize RadarView completed task filtering #linear #frontend
\`\`\``,
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: '⬛',
    color: '#6e7681',
    defaultPrompt: 'Fetch my assigned issues and pull request reviews from GitHub',
    sampleResponse: `\`\`\`tasks
- [ ] PR #42: Add connectors tab and AI prompt parsing @Aziz #github #pr-review
- [ ] Issue #28: Radar view counter badge sync with live slots #github #bug
\`\`\``,
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: '💬',
    color: '#4a154b',
    defaultPrompt: 'Fetch action items from my unread Slack mentions and DMs',
    sampleResponse: `\`\`\`tasks
- [ ] Check deployment logs for staging environment @Aziz #slack #devops
- [ ] Provide feedback on design system RFC from @Sarah #slack #design
\`\`\``,
  },
];

/**
 * Modifies the user's raw prompt with strict instructions for AI agents (and MCP tools)
 * to return formatted tasks inside a ```tasks code block.
 */
export function buildConnectorPrompt(userPrompt: string): string {
  const trimmed = userPrompt.trim();
  return `${trimmed}

---
CRITICAL INSTRUCTIONS FOR AI AGENT / MCP TOOLS:
1. If you have tool access or MCP integrations configured for the requested service (e.g. Asana, Jira, Google Tasks, Linear, GitHub, Slack), execute them to retrieve the user's real tasks now.
2. If tool access is not yet configured or in mock test mode, generate realistic, high-quality tasks matching the user's request.
3. You MUST provide the final tasks strictly inside a \`\`\`tasks code block so our parser can insert them into the workspace.
4. Formatting rules:
   - Every parent task must begin with: '- [ ] ' or '[] '
   - Optional assignee must be formatted as: @username (e.g. @Aziz)
   - Optional tags must be formatted as: #tag (e.g. #asana, #backend)
   - Optional subtasks must be indented by exactly 2 spaces: '  - [ ] subtask description'
5. Do NOT include greetings, preamble, or conversational commentary inside the \`\`\`tasks code block.

Example output:
\`\`\`tasks
- [ ] Fix authentication timeout bug @Aziz #asana #bug
  - [ ] Verify JWT expiry in staging
- [ ] Review sprint backlog deliverables @Sarah #asana
\`\`\``;
}

/**
 * Detects system identifier from user prompt (e.g. asana, jira, google tasks)
 */
export function detectSystemFromPrompt(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('asana')) return 'asana';
  if (lower.includes('jira')) return 'jira';
  if (lower.includes('google task') || lower.includes('google-task')) return 'google-tasks';
  if (lower.includes('linear')) return 'linear';
  if (lower.includes('github') || lower.includes('pr ') || lower.includes('pull request')) return 'github';
  if (lower.includes('slack')) return 'slack';
  return 'general';
}

/**
 * Generates an instant realistic mock AI response based on the prompt or selected system.
 */
export function generateMockResponse(promptOrSystem: string): string {
  const system = detectSystemFromPrompt(promptOrSystem);
  const matched = CONNECTOR_PRESETS.find((p) => p.id === system);
  if (matched) {
    return matched.sampleResponse;
  }

  // Fallback generic response
  return `\`\`\`tasks
- [ ] Task imported from ${promptOrSystem.slice(0, 30)} @Aziz #connector
  - [ ] Review requirements and details
- [ ] Follow up on team deliverables #work
\`\`\``;
}

/**
 * Parses the raw AI response into structured task items.
 * Supports:
 * - ```tasks or ```markdown code blocks
 * - Direct markdown list / checklist lines
 * - JSON task arrays
 */
export function parseConnectorResponse(
  responseText: string,
  fallbackSystem?: string
): ParsedConnectorTask[] {
  if (!responseText || !responseText.trim()) return [];

  let contentToParse = responseText.trim();

  // 1. Try to extract content inside ```tasks ... ``` or ```markdown ... ``` or any ``` ... ```
  const codeBlockMatch = contentToParse.match(/```(?:tasks|markdown|text)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch && codeBlockMatch[1].trim()) {
    contentToParse = codeBlockMatch[1].trim();
  }

  // 2. Try JSON parsing if the content looks like JSON
  if (contentToParse.startsWith('[') && contentToParse.endsWith(']')) {
    try {
      const parsedJson = JSON.parse(contentToParse);
      if (Array.isArray(parsedJson)) {
        return parsedJson.map((item, idx) => {
          const title = String(item.title || item.name || item.text || 'Imported Task');
          const assignee = item.assignee || item.owner || (item.people && item.people[0]);
          const tags = Array.isArray(item.tags)
            ? item.tags.map((t: string) => (t.startsWith('#') ? t : `#${t}`))
            : [];
          const subtasks = Array.isArray(item.subtasks)
            ? item.subtasks.map((s: any) => (typeof s === 'string' ? s : s.title || String(s)))
            : [];
          return {
            id: `conn-task-${idx}-${Date.now().toString(36)}`,
            title,
            assignee: assignee ? (assignee.startsWith('@') ? assignee : `@${assignee}`) : undefined,
            tags,
            subtasks,
            selected: true,
            rawLine: `- [ ] ${title}${assignee ? ` @${assignee.replace(/^@/, '')}` : ''}${tags.length ? ` ${tags.join(' ')}` : ''}`,
          };
        });
      }
    } catch {
      // ignore and fall through to line parsing
    }
  }

  // 3. Line-by-line parsing
  const lines = contentToParse.split(/\r?\n/);
  const tasks: ParsedConnectorTask[] = [];
  let currentTask: ParsedConnectorTask | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) continue;

    // Check if line is indented (subtask)
    const indentMatch = rawLine.match(/^(\s{2,}|\t+)/);
    const isIndented = Boolean(indentMatch);

    // Check for checkbox / bullet pattern
    // e.g. "- [ ] ", "[] ", "* [ ] ", "1. [ ] ", "- ", "* "
    const taskMatch = trimmed.match(/^(?:(?:[-*]|\d+\.)\s+)?(?:\[[ xX]?\]\s*)?(.*)$/);
    const bodyText = (taskMatch ? taskMatch[1] : trimmed).trim();

    if (!bodyText) continue;

    if (isIndented && currentTask) {
      // It's a subtask under the current task
      const subtaskClean = bodyText.replace(/^(\s*(?:(?:[-*]|\d+\.)\s+)?(?:\[[ xX]?\]\s*)?)/, '').trim();
      if (subtaskClean) {
        currentTask.subtasks.push(subtaskClean);
      }
    } else {
      // New parent task
      const { people, tags } = parseTagsAndPeople(bodyText);
      // Remove tags and people from title for clean display
      const cleanTitle = bodyText
        .replace(/@([a-zA-Z0-9_-]+)/g, '')
        .replace(/#([a-zA-Z0-9_-]+)/g, '')
        .trim();

      // If no tag is present and fallbackSystem is provided, add system tag
      const finalTags = [...tags];
      if (fallbackSystem && !finalTags.some((t) => t.toLowerCase() === `#${fallbackSystem.toLowerCase()}`)) {
        finalTags.push(`#${fallbackSystem.toLowerCase()}`);
      }

      currentTask = {
        id: `conn-task-${i}-${Math.random().toString(36).slice(2, 7)}`,
        title: cleanTitle || bodyText,
        assignee: people[0] ? `@${people[0]}` : undefined,
        tags: finalTags,
        subtasks: [],
        selected: true,
        rawLine: trimmed,
      };
      tasks.push(currentTask);
    }
  }

  return tasks;
}

/**
 * Converts selected parsed tasks into clean markdown lines ready for insertion into the workspace.
 */
export function formatTasksToMarkdownLines(tasks: ParsedConnectorTask[]): string[] {
  const lines: string[] = [];

  for (const t of tasks) {
    if (!t.selected) continue;

    const parts: string[] = [t.title];
    if (t.assignee) parts.push(t.assignee);
    if (t.tags && t.tags.length > 0) {
      for (const tag of t.tags) {
        parts.push(tag.startsWith('#') ? tag : `#${tag}`);
      }
    }

    lines.push(`- [ ] ${parts.join(' ')}`);

    if (t.subtasks && t.subtasks.length > 0) {
      for (const sub of t.subtasks) {
        lines.push(`  - [ ] ${sub}`);
      }
    }
  }

  return lines;
}

/**
 * Inserts new task lines into the workspace markdown at the chosen section.
 */
export function insertTasksIntoMarkdown(
  rawMarkdown: string,
  newLines: string[],
  targetSectionTitle = 'Today'
): string {
  if (newLines.length === 0) return rawMarkdown;

  const lines = rawMarkdown.split(/\r?\n/);
  if (lines.length === 0 || !rawMarkdown.trim()) {
    const header = targetSectionTitle.startsWith('#') ? targetSectionTitle : `# ${targetSectionTitle}`;
    return `${header}\n\n${newLines.join('\n')}\n`;
  }

  const cleanTarget = targetSectionTitle.replace(/^#+\s*/, '').toLowerCase().trim();

  let headerIndex = -1;
  let nextHeaderIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^#{1,3}\s+/.test(line)) {
      const headerTitle = line.replace(/^#{1,3}\s+/, '').toLowerCase();
      if (headerIndex === -1 && headerTitle.includes(cleanTarget)) {
        headerIndex = i;
      } else if (headerIndex !== -1) {
        nextHeaderIndex = i;
        break;
      }
    }
  }

  // If header found, insert before the next header or at end of file
  if (headerIndex !== -1) {
    const insertAt = nextHeaderIndex !== -1 ? nextHeaderIndex : lines.length;
    // Insert with clean spacing
    const toInsert = [...newLines];
    if (insertAt === lines.length && lines[lines.length - 1]?.trim() !== '') {
      toInsert.unshift('');
    }
    lines.splice(insertAt, 0, ...toInsert);
    return lines.join('\n');
  }

  // If section header doesn't exist yet, append new section at bottom
  const newHeader = targetSectionTitle.startsWith('#') ? targetSectionTitle : `# ${targetSectionTitle}`;
  return `${rawMarkdown.trimEnd()}\n\n${newHeader}\n${newLines.join('\n')}\n`;
}
