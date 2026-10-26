import { Marked } from 'marked';
import { KiroAgentOption, KiroModelOption } from '../types/haru';
import { cleanTaskBody } from './markdownHelpers';

export interface ParsedTaskItem {
  id: string;
  title: string;
  subtasks: string[];
  rawText: string;
  isTask: boolean;
  checked: boolean;
  isTopLevel: boolean;
  depth: number;
  lineIndex: number;
}

export interface RenderMarkdownOptions {
  rawMarkdown: string;
  agents: KiroAgentOption[];
  models: KiroModelOption[];
  selectedAgent?: string;
  selectedModel?: string;
  runningTaskIds?: Set<string>;
  completedTaskIds?: Set<string>;
  taskSessions?: Record<string, { status: string; slotKey?: string }>;
}

/**
 * Creates a customized Marked instance overriding all major markdown elements:
 * - heading: custom anchors, depth styling, section hashes, editable
 * - list: ordered & unordered lists with proper nesting
 * - listitem: interactive task items with embedded Run buttons & subtask grouping
 * - text: highlights @mentions and #tags everywhere in lists and text
 * - paragraph: formatted with mention & tag chips
 * - blockquote: styled quotes
 * - code & codespan: syntax-highlight-ready blocks and inline pills
 * - checkbox: interactive task checkboxes
 */
export function createCustomMarked(
  tasksRegistry: Map<string, ParsedTaskItem>,
  options: RenderMarkdownOptions
): Marked {
  const markedInstance = new Marked();

  const rawLines = (options.rawMarkdown || '').split('\n');
  let lastMatchedLine = -1;
  let listDepth = 0;
  let itemCounter = 0;

  markedInstance.use({
    renderer: {
      // 1. Text override: highlights @mentions and #tags in all list items and paragraphs
      text(token) {
        const raw = token.text || '';
        const withMentions = raw.replace(
          /@([a-zA-Z0-9_-]+)/g,
          '<span class="haru-mention-chip">@$1</span>'
        );
        const withTags = withMentions.replace(
          /(^|\s)#([a-zA-Z0-9_-]+)/g,
          '$1<span class="haru-tag-chip">#$2</span>'
        );
        return withTags;
      },

      // 2. Heading override with anchors & inline edit support
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        const cleanText = text.replace(/<[^>]+>/g, '').trim();
        const escapedText = cleanText.toLowerCase().replace(/[^\w]+/g, '-');
        const hashes = '#'.repeat(depth);
        const headingId = `heading-item-${++itemCounter}`;

        // Find line index in raw markdown
        let lineIndex = -1;
        for (let i = lastMatchedLine + 1; i < rawLines.length; i++) {
          if (rawLines[i].trim().startsWith('#') && rawLines[i].toLowerCase().includes(cleanText.toLowerCase())) {
            lineIndex = i;
            lastMatchedLine = i;
            break;
          }
        }

        tasksRegistry.set(headingId, {
          id: headingId,
          title: cleanText,
          subtasks: [],
          rawText: cleanText,
          isTask: false,
          checked: false,
          isTopLevel: true,
          depth,
          lineIndex,
        });

        return `
          <div class="haru-simple-heading-wrap depth-${depth}" data-heading-id="${headingId}">
            <h${depth} id="${escapedText}" class="haru-simple-heading">
              <a name="${escapedText}" class="haru-heading-anchor" href="#${escapedText}">
                <span class="haru-header-link">${hashes}</span>
              </a>
              <span class="haru-heading-text haru-editable-field" contenteditable="plaintext-only" data-item-id="${headingId}" data-line-index="${lineIndex}" data-type="heading" data-depth="${depth}" title="Click to edit section title" spellcheck="false">${text}</span>
            </h${depth}>
          </div>\n`;
      },

      // 3. List override
      list({ items, ordered, start }) {
        listDepth++;
        let body = '';
        for (const item of items) {
          body += this.listitem(item);
        }
        listDepth--;

        const tag = ordered ? 'ol' : 'ul';
        const startAttr = ordered && start && start !== 1 ? ` start="${start}"` : '';
        const listClass = ordered ? 'haru-list-ordered' : 'haru-list-unordered';
        const depthClass = `depth-level-${listDepth}`;

        return `<${tag}${startAttr} class="haru-simple-list ${listClass} ${depthClass}">\n${body}</${tag}>\n`;
      },

      // 4. List Item override (Run button on top-level tasks & nested subtasks support)
      listitem(token) {
        const itemId = `task-item-${++itemCounter}`;
        const isTopLevel = listDepth <= 1;

        // Separate own tokens from child list tokens so child lists don't end up inside contenteditable
        const ownTokens: any[] = [];
        const childListTokens: any[] = [];
        const subtasks: string[] = [];

        for (const subToken of token.tokens || []) {
          if (subToken.type === 'list') {
            childListTokens.push(subToken);
            if (Array.isArray((subToken as any).items)) {
              for (const childItem of (subToken as any).items) {
                const childClean = cleanTaskBody(childItem.text || '');
                if (childClean) subtasks.push(childClean);
              }
            }
          } else {
            ownTokens.push(subToken);
          }
        }

        const ownContent = this.parser.parse(ownTokens);
        const childContent = childListTokens.map((t) => this.list(t)).join('');

        // Extract clean title for task
        const firstToken = ownTokens[0];
        let titleText = token.text || '';
        if (firstToken && (firstToken.type === 'text' || firstToken.type === 'paragraph')) {
          titleText = firstToken.text || '';
        }
        const cleanTitle = cleanTaskBody(titleText);

        const isTask = Boolean(token.task) || isTopLevel;
        const checked = Boolean(token.checked);

        // Find line index for this item in rawLines
        let lineIndex = -1;
        for (let i = lastMatchedLine + 1; i < rawLines.length; i++) {
          const lClean = cleanTaskBody(rawLines[i]).toLowerCase();
          if (cleanTitle && lClean && (lClean.includes(cleanTitle.toLowerCase()) || cleanTitle.toLowerCase().includes(lClean))) {
            lineIndex = i;
            lastMatchedLine = i;
            break;
          }
        }

        // Store in registry for click-to-run event handling
        tasksRegistry.set(itemId, {
          id: itemId,
          title: cleanTitle,
          subtasks,
          rawText: token.raw || token.text || '',
          isTask,
          checked,
          isTopLevel,
          depth: listDepth,
          lineIndex,
        });

        const session = options.taskSessions?.[itemId];
        const isRunning = session?.status === 'running';
        const hasSession = Boolean(session?.slotKey);

        return `
          <li class="haru-simple-li ${isTopLevel ? 'is-top-level' : 'is-nested'} ${isTask ? 'is-task' : 'is-item'}" data-task-id="${itemId}">
            <div class="haru-li-main-row">
              <div class="haru-li-label">
                ${
                  token.task
                    ? `<button type="button" class="haru-simple-checkbox ${checked ? 'checked' : ''}" data-action="toggle-task" data-task-id="${itemId}" data-line-index="${lineIndex}" title="${checked ? 'Mark incomplete' : 'Mark complete'}">${checked ? '✓' : ''}</button>`
                    : `<span class="haru-simple-bullet" aria-hidden="true">•</span>`
                }
                <div class="haru-li-text ${checked ? 'is-checked-text' : ''}">
                  <span class="haru-editable-field" contenteditable="plaintext-only" data-item-id="${itemId}" data-line-index="${lineIndex}" data-type="task" title="Click to edit task directly" spellcheck="false">${ownContent}</span>
                </div>
              </div>

              ${
                isTopLevel && cleanTitle
                  ? `
                <div class="haru-li-actions" data-task-id="${itemId}">
                  ${
                    subtasks.length > 0
                      ? `<span class="haru-simple-subtask-count" title="${subtasks.length} subtasks">${subtasks.length} subtasks</span>`
                      : ''
                  }
                  ${
                    isRunning
                      ? `<span class="haru-status-pill running"><span class="haru-status-dot"></span> Running</span>`
                      : ''
                  }
                  ${
                    hasSession
                      ? `<button type="button" class="haru-btn-mini haru-btn-session" data-action="goto-session" data-task-id="${itemId}" title="Go to KiroCrew session">↗ Session</button>`
                      : ''
                  }
                  <button type="button" class="haru-btn-mini haru-btn-run" data-action="run-task" data-task-id="${itemId}" title="Run task in KiroCrew">
                    ▶ Run
                  </button>
                </div>`
                  : ''
              }
            </div>
            ${childContent}
          </li>\n`;
      },

      // 5. Paragraph override with chips for mentions & tags
      paragraph({ tokens }) {
        const raw = this.parser.parseInline(tokens);
        return `<p class="haru-simple-p">${raw}</p>\n`;
      },

      // 6. Blockquote override
      blockquote({ tokens }) {
        const body = this.parser.parse(tokens);
        return `<blockquote class="haru-simple-quote">${body}</blockquote>\n`;
      },

      // 7. Code block override
      code({ text, lang }) {
        const cleanLang = lang || 'text';
        return `
          <div class="haru-simple-code-container">
            <div class="haru-code-header">
              <span class="haru-code-lang">${cleanLang}</span>
            </div>
            <pre class="haru-simple-code-block"><code class="language-${cleanLang}">${text}</code></pre>
          </div>\n`;
      },

      // 8. Inline codespan override
      codespan({ text }) {
        return `<code class="haru-simple-inline-code">${text}</code>`;
      },

      // 9. Horizontal rule override
      hr() {
        return `<hr class="haru-simple-hr" />\n`;
      },

      // 10. Checkbox override (for inline rendering)
      checkbox({ checked }) {
        return `<span class="haru-simple-checkbox-span ${checked ? 'checked' : ''}">${checked ? '✓' : ''}</span>`;
      },
    },
  });

  return markedInstance;
}
