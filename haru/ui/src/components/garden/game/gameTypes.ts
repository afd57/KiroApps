import { AgentGearId, ModelStyleId } from '../wardrobeUtils';

export interface FocusSessionState {
  taskId: string;
  phase: 'focus' | 'break';
  durationMs: number;
  startedAt: number; // epoch ms
  pausedAt?: number; // epoch ms
  pausedAccumMs: number; // ms spent paused
}

export type GardenSortMode = 'added' | 'priority';
export type GardenAtmosphere = 'sunny' | 'sakura' | 'night';

export interface GardenGameState {
  version: 1;
  enabled: boolean;
  sunshineLifetime: number;
  rewardedTaskIds: string[];
  completionLog: Array<{ taskId: string; date: string; at: string }>;
  focusLog: Array<{ taskId: string; date: string; minutes: number; full: boolean }>;
  dailyGoal: number;
  goalRewardedDates: string[];
  streak: {
    current: number;
    best: number;
    lastGoalDate?: string;
    rainDayWeeks: string[];
  };
  focusMinutes: 10 | 25 | 45;
  focus?: FocusSessionState;
  activeCompanion: string;
  unlockedCompanions: string[];
  seenUnlocks: string[];
  pinnedLeaderId?: string;
  soundOn: boolean;
  initialized: boolean;
  // v2: Custom Wardrobe, Sort Mode & Terrarium Atmosphere
  wardrobe: {
    agentGear: Record<string, AgentGearId>;
    modelStyle: Record<string, ModelStyleId>;
  };
  sortMode: GardenSortMode;
  atmosphere: GardenAtmosphere;
}

export interface RewardEvent {
  id: string;
  taskId?: string;
  amount: number;
  reason: 'task' | 'subtask' | 'focus' | 'daily_goal';
  createdAt: number;
}

export interface GardenGameActions {
  startFocus: (taskId: string, minutes?: 10 | 25 | 45) => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  finishFocus: (markTaskDone: boolean) => void;
  stopFocus: () => void;
  startBreak: () => void;
  endBreak: () => void;
  setDailyGoal: (goal: number) => void;
  setFocusMinutes: (minutes: 10 | 25 | 45) => void;
  setActiveCompanion: (companionId: string) => void;
  pinLeader: (taskId: string | null) => void;
  setEnabled: (enabled: boolean) => void;
  setSoundOn: (soundOn: boolean) => void;
  dismissUnlock: (companionId: string) => void;
  // v2 Actions
  setAgentGear: (agentId: string, gearId: AgentGearId) => void;
  setModelStyle: (modelId: string, styleId: ModelStyleId) => void;
  setRosterWardrobe: (wardrobe: { agentGear: Record<string, AgentGearId>; modelStyle: Record<string, ModelStyleId> }) => void;
  setSortMode: (mode: GardenSortMode) => void;
  setAtmosphere: (atmosphere: GardenAtmosphere) => void;
}

export function createDefaultGameState(): GardenGameState {
  return {
    version: 1,
    enabled: true,
    sunshineLifetime: 0,
    rewardedTaskIds: [],
    completionLog: [],
    focusLog: [],
    dailyGoal: 3,
    goalRewardedDates: [],
    streak: {
      current: 0,
      best: 0,
      rainDayWeeks: [],
    },
    focusMinutes: 25,
    activeCompanion: 'chick',
    unlockedCompanions: ['chick'],
    seenUnlocks: ['chick'],
    soundOn: true,
    initialized: false,
    wardrobe: {
      agentGear: {},
      modelStyle: {},
    },
    sortMode: 'added',
    atmosphere: 'sunny',
  };
}
