export type HaruBlockType = 'header' | 'task' | 'note';

export type HaruSessionStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'review_ready'
  | 'failed';

export interface HaruTaskSession {
  status: HaruSessionStatus;
  slotKey?: string;
  agent: string;
  model: string;
  startedAt?: string;
  logs?: string[];
  followUps?: Array<{ id: string; text: string; createdAt: string }>;
}

export interface HaruBlock {
  id: string;
  type: HaruBlockType;
  content: string;
  checked?: boolean;
  headerLevel?: 1 | 2 | 3;
  sectionTitle?: string;
  people: string[];
  tags: string[];
  owner?: string;
  session?: HaruTaskSession;
  carryoverDays?: number;
  intakeSource?: string;
  indentLevel?: number;
  parentId?: string;
  subtaskIds?: string[];
  isSubtask?: boolean;
  createdSeq?: number;
  createdAt?: string;
}

export interface HaruDocument {
  id: string;
  updatedAt: string;
  rawMarkdown: string;
  blocks: HaruBlock[];
}

export interface KiroAgentOption {
  id: string;
  name: string;
  description?: string;
  model?: string;
}

export interface KiroModelOption {
  id: string;
  label: string;
  provider?: string;
}

export interface IntakeConnector {
  id: string;
  name: string;
  icon?: string;
  enabled: boolean;
  source: string;
  channelOrFilter?: string;
  lastSyncedAt?: string;
  pendingCount?: number;
}

export interface IntakeMessage {
  id: string;
  source: string;
  sender: string;
  channel: string;
  previewText: string;
  suggestedTask: string;
  receivedAt: string;
  accepted: boolean;
}
