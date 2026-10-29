import { HaruBlock } from '../../types/haru';

export interface MochiColor {
  name: 'sky' | 'peach' | 'mint' | 'lavender' | 'butter' | 'sakura';
  fill: string;
  stroke: string;
  tintCss: string;
}

export const MOCHI_PALETTE: MochiColor[] = [
  { name: 'sky', fill: '#60A5FA', stroke: '#2563EB', tintCss: '#60A5FA' }, // Signature cute blue blob
  { name: 'mint', fill: '#86EFAC', stroke: '#16A34A', tintCss: '#86EFAC' },
  { name: 'sakura', fill: '#FBCFE8', stroke: '#DB2777', tintCss: '#FBCFE8' },
  { name: 'peach', fill: '#FDBA74', stroke: '#C2410C', tintCss: '#FDBA74' },
  { name: 'lavender', fill: '#DDD6FE', stroke: '#7C3AED', tintCss: '#DDD6FE' },
  { name: 'butter', fill: '#FEF08A', stroke: '#CA8A04', tintCss: '#FEF08A' },
];

export function getMochiColor(colorIndex = 0): MochiColor {
  const idx = Math.abs(Math.floor(colorIndex)) % MOCHI_PALETTE.length;
  return MOCHI_PALETTE[idx];
}

export type BudVisualStatus = 'idle' | 'running' | 'done' | 'failed' | 'review' | 'sleepy';

export function getBudStatus(block: HaruBlock): BudVisualStatus {
  if (block.checked) return 'done';
  const st = block.session?.status;
  if (st === 'running') return 'running';
  if (st === 'failed') return 'failed';
  if (st === 'completed' || st === 'review_ready') return 'review';
  return 'idle';
}

export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';

export function getTaskPriority(block: HaruBlock): TaskPriority {
  const content = (block.content || '').toLowerCase();
  if (content.includes('#urgent') || content.includes('#p1')) return 'urgent';
  if (content.includes('#high') || content.includes('#p2')) return 'high';
  if (content.includes('#low') || content.includes('#p4')) return 'low';
  return 'normal';
}

export function cyclePriorityTagInLine(line: string): { nextLine: string; nextPriority: TaskPriority } {
  const current = (() => {
    const lower = line.toLowerCase();
    if (lower.includes('#urgent') || lower.includes('#p1')) return 'urgent';
    if (lower.includes('#high') || lower.includes('#p2')) return 'high';
    if (lower.includes('#low') || lower.includes('#p4')) return 'low';
    return 'normal';
  })();

  let cleaned = line
    .replace(/(^|\s)#(urgent|p1)\b/gi, '')
    .replace(/(^|\s)#(high|p2)\b/gi, '')
    .replace(/(^|\s)#(low|p4)\b/gi, '')
    .replace(/(^|\s)#normal\b/gi, '')
    .trimEnd();

  let nextPriority: TaskPriority = 'normal';
  if (current === 'normal') {
    nextPriority = 'high';
    cleaned = `${cleaned} #high`;
  } else if (current === 'high') {
    nextPriority = 'urgent';
    cleaned = `${cleaned} #urgent`;
  } else if (current === 'urgent') {
    nextPriority = 'low';
    cleaned = `${cleaned} #low`;
  } else {
    nextPriority = 'normal';
  }

  return { nextLine: cleaned, nextPriority };
}

export function getTopLevelTasksSorted(blocks: HaruBlock[], sortMode: 'added' | 'priority' = 'added'): HaruBlock[] {
  const topTasks = blocks.filter((b) => b.type === 'task' && !b.isSubtask);
  return [...topTasks].sort((a, b) => {
    if (sortMode === 'priority') {
      const pWeight: Record<TaskPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
      const diff = pWeight[getTaskPriority(a)] - pWeight[getTaskPriority(b)];
      if (diff !== 0) return diff;
    }
    const seqA = typeof a.createdSeq === 'number' ? a.createdSeq : Number.MAX_SAFE_INTEGER;
    const seqB = typeof b.createdSeq === 'number' ? b.createdSeq : Number.MAX_SAFE_INTEGER;
    return seqA - seqB;
  });
}

export function getAvailableSections(blocks: HaruBlock[]): string[] {
  const sections: string[] = [];
  const seen = new Set<string>();
  for (const b of blocks) {
    if (b.type === 'header' && b.sectionTitle) {
      const clean = b.sectionTitle.trim();
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        sections.push(clean);
      }
    }
  }
  return sections;
}

export function findDefaultTargetSection(blocks: HaruBlock[]): string {
  const sections = getAvailableSections(blocks);
  const todaySec = sections.find((s) => s.toLowerCase().includes('today'));
  if (todaySec) return todaySec;
  return sections[0] || 'Today';
}
