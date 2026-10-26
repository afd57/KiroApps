import { marked } from 'marked';

// Configure marked with GFM and breaks
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Extracts mentions (@name) and tags (#topic) from text
 */
export function parseTagsAndPeople(text: string): { people: string[]; tags: string[] } {
  const people = Array.from(new Set(Array.from(text.matchAll(/@([a-zA-Z0-9_-]+)/g)).map((m) => m[1])));
  const tags = Array.from(new Set(Array.from(text.matchAll(/#([a-zA-Z0-9_-]+)/g)).map((m) => m[1])));
  return { people, tags };
}

/**
 * Strips leading indentation, bullet points (- or *), and checkbox markers ([] or [x])
 */
export function cleanTaskBody(content: string): string {
  if (!content) return '';
  return content
    .replace(/^(\s*(?:(?:[-*]|\d+\.)\s+)?(?:\[[ xX]?\]\s*)?)/, '')
    .trim();
}

/**
 * Extracts the exact leading indentation and bullet/number/checkbox prefix from a task line
 */
export function getTaskPrefix(line: string): string {
  const match = line.match(/^(\s*(?:(?:[-*]|\d+\.)\s+)?(?:\[[ xX]?\]\s*)?)/);
  if (match && match[1]) {
    return match[1];
  }
  return '- [ ] ';
}

/**
 * Updates the text content of a task line while strictly preserving its original
 * indentation, bullet/number prefix, and checkbox status
 */
export function updateTaskLineText(line: string, newText: string): string {
  const prefix = getTaskPrefix(line);
  return `${prefix}${newText}`;
}

/**
 * Toggles a task line between checked and unchecked while preserving indentation and bullet/number style
 */
export function toggleTaskLine(line: string, nextChecked: boolean): string {
  const mark = nextChecked ? 'x' : ' ';

  // 1. Line already has checkbox [ ] or [x] or [] (e.g. - [ ], 1. [ ], [])
  if (/^(\s*(?:(?:[-*]|\d+\.)\s+)?)\[[ xX]?\](.*)$/.test(line)) {
    return line.replace(/^(\s*(?:(?:[-*]|\d+\.)\s+)?)\[[ xX]?\](.*)$/, `$1[${mark}]$2`);
  }

  // 2. Line is a markdown bullet item: "- task" or " - task" or "* task"
  if (/^(\s*[-*]\s+)(.*)$/.test(line)) {
    return line.replace(/^(\s*[-*]\s+)(.*)$/, `$1[${mark}] $2`);
  }

  // 3. Line is a numbered list item: "1. task" or " 2. task"
  if (/^(\s*\d+\.\s+)(.*)$/.test(line)) {
    return line.replace(/^(\s*\d+\.\s+)(.*)$/, `$1[${mark}] $2`);
  }

  // 4. Fallback
  return nextChecked ? `[x] ${line.trim()}` : `[] ${line.trim()}`;
}

/**
 * Creates a new task line with standard markdown formatting
 */
export function createTaskLine(text: string, isSubtask = false): string {
  const indent = isSubtask ? '  ' : '';
  const body = text.trim();
  return `${indent}- [ ] ${body}`;
}

/**
 * Indents a task line by 2 spaces (turning it into a subtask)
 */
export function indentTaskLine(line: string): string {
  if (line.startsWith('  ')) return line;
  return `  ${line}`;
}

/**
 * Outdents a task line (turning a subtask back into a parent task)
 */
export function outdentTaskLine(line: string): string {
  return line.replace(/^ {1,4}/, '');
}

/**
 * Renders inline markdown safely (bold, italic, code, links, tags, mentions)
 */
export function renderInlineMarkdown(markdown: string): string {
  if (!markdown) return '';
  try {
    const raw = marked.parseInline(markdown) as string;
    // Highlight @mentions
    const withMentions = raw.replace(
      /@([a-zA-Z0-9_-]+)/g,
      '<span class="haru-mention-chip">@$1</span>'
    );
    // Highlight #tags (avoiding HTML entities like &#39;)
    const withTags = withMentions.replace(
      /(^|\s)#([a-zA-Z0-9_-]+)/g,
      '$1<span class="haru-tag-chip">#$2</span>'
    );
    return withTags;
  } catch {
    return markdown;
  }
}

/**
 * Renders full markdown (paragraphs, code blocks, blockquotes, lists, links)
 */
export function renderFullMarkdown(markdown: string): string {
  if (!markdown) return '';
  try {
    const raw = marked.parse(markdown) as string;
    const withMentions = raw.replace(
      /@([a-zA-Z0-9_-]+)/g,
      '<span class="haru-mention-chip">@$1</span>'
    );
    const withTags = withMentions.replace(
      /(^|\s)#([a-zA-Z0-9_-]+)/g,
      '$1<span class="haru-tag-chip">#$2</span>'
    );
    return withTags;
  } catch {
    return markdown;
  }
}
