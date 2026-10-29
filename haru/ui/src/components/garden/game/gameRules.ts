import { HaruBlock } from '../../../types/haru';
import { GardenGameState, FocusSessionState, RewardEvent } from './gameTypes';

export const LEVEL_THRESHOLDS = [0, 30, 80, 150, 250, 400, 600, 850, 1150, 1500];

export const COMPANION_DEFS = [
  { id: 'chick', name: 'Pip the chick', unlockAt: 0 },
  { id: 'bee', name: 'Bumble', unlockAt: 30 },
  { id: 'rabbit', name: 'Mochi Bun', unlockAt: 80 },
  { id: 'cat', name: 'Biscuit', unlockAt: 150 },
  { id: 'frog', name: 'Lily', unlockAt: 250 },
  { id: 'penguin', name: 'Waddle', unlockAt: 400 },
  { id: 'bear', name: 'Honey', unlockAt: 600 },
  { id: 'unicorn', name: 'Sparkle', unlockAt: 1000 },
];

export function toLocalDateString(epochMs: number): string {
  const d = new Date(epochMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toIsoWeekString(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getLevelInfo(sunshine: number): {
  level: number;
  currentFloor: number;
  nextCeiling: number;
  progressPct: number;
} {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (sunshine >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const currentFloor = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextCeiling = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];

  let progressPct = 100;
  if (level < LEVEL_THRESHOLDS.length) {
    const range = nextCeiling - currentFloor;
    const currentProg = sunshine - currentFloor;
    progressPct = Math.min(100, Math.max(0, Math.round((currentProg / range) * 100)));
  }

  return { level, currentFloor, nextCeiling, progressPct };
}

export function getUnlockedCompanionIds(sunshine: number): string[] {
  return COMPANION_DEFS.filter((c) => c.unlockAt <= sunshine).map((c) => c.id);
}

export function getLeaderTask(sortedTopTasks: HaruBlock[], pinnedLeaderId?: string): HaruBlock | null {
  if (pinnedLeaderId) {
    const pinned = sortedTopTasks.find((t) => t.id === pinnedLeaderId && !t.checked);
    if (pinned) return pinned;
  }
  return sortedTopTasks.find((t) => !t.checked) || null;
}

export function computeStreak(
  goalDates: string[],
  localToday: string,
  existingRainWeeks: string[] = []
): { current: number; rainDayWeeks: string[] } {
  if (goalDates.length === 0) {
    return { current: 0, rainDayWeeks: [] };
  }

  const sorted = Array.from(new Set(goalDates)).sort();
  const dateSet = new Set(sorted);
  const rainDayWeeks = new Set(existingRainWeeks);

  let currentStreak = 0;
  let checkDate = new Date(`${localToday}T12:00:00`);

  // Check if today was accomplished; if not, check from yesterday
  const todayStr = toLocalDateString(checkDate.getTime());
  if (!dateSet.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dStr = toLocalDateString(checkDate.getTime());
    if (dateSet.has(dStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Check rain day forgiveness for missed day
      const weekStr = toIsoWeekString(dStr);
      if (!rainDayWeeks.has(weekStr)) {
        rainDayWeeks.add(weekStr);
        checkDate.setDate(checkDate.getDate() - 1);
        const dayBeforeStr = toLocalDateString(checkDate.getTime());
        if (dateSet.has(dayBeforeStr)) {
          // Allowed 1 missed day
          continue;
        }
      }
      break;
    }
  }

  return { current: currentStreak, rainDayWeeks: Array.from(rainDayWeeks) };
}

export function getFocusElapsedMs(focus: FocusSessionState, nowMs: number): number {
  const effectiveEnd = focus.pausedAt ?? nowMs;
  return Math.max(0, effectiveEnd - focus.startedAt - focus.pausedAccumMs);
}

export function getFocusRemainingMs(focus: FocusSessionState, nowMs: number): number {
  const elapsed = getFocusElapsedMs(focus, nowMs);
  return Math.max(0, focus.durationMs - elapsed);
}

export function getFocusGrowthStage(focus: FocusSessionState, nowMs: number): 'seed' | 'sprout' | 'leaf' | 'bud' | 'flower' {
  if (focus.durationMs <= 0) return 'flower';
  const ratio = getFocusElapsedMs(focus, nowMs) / focus.durationMs;
  if (ratio >= 1) return 'flower';
  if (ratio >= 0.75) return 'bud';
  if (ratio >= 0.5) return 'leaf';
  if (ratio >= 0.25) return 'sprout';
  return 'seed';
}

export function applyTaskChecks(
  prevGame: GardenGameState,
  blocks: HaruBlock[],
  nowMs: number
): { nextState: GardenGameState; rewards: RewardEvent[] } {
  const localToday = toLocalDateString(nowMs);
  const rewards: RewardEvent[] = [];

  // Initial load seeding: mark existing checked tasks as rewarded so they don't grant initial sunshine
  if (!prevGame.initialized) {
    const initialChecked = blocks
      .filter((b) => b.type === 'task' && b.checked)
      .map((b) => b.id);
    return {
      nextState: {
        ...prevGame,
        initialized: true,
        rewardedTaskIds: Array.from(new Set([...prevGame.rewardedTaskIds, ...initialChecked])),
      },
      rewards: [],
    };
  }

  const existingRewarded = new Set(prevGame.rewardedTaskIds);
  const newlyRewarded: HaruBlock[] = [];

  for (const b of blocks) {
    if (b.type === 'task' && b.checked && !existingRewarded.has(b.id)) {
      newlyRewarded.push(b);
      existingRewarded.add(b.id);
    }
  }

  if (newlyRewarded.length === 0) {
    return { nextState: prevGame, rewards: [] };
  }

  let sunshineGain = 0;
  const nextCompletionLog = [...prevGame.completionLog];

  for (const b of newlyRewarded) {
    const amount = b.isSubtask ? 3 : 10;
    sunshineGain += amount;
    rewards.push({
      id: `rew-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      taskId: b.id,
      amount,
      reason: b.isSubtask ? 'subtask' : 'task',
      createdAt: nowMs,
    });
    if (!b.isSubtask) {
      nextCompletionLog.push({
        taskId: b.id,
        date: localToday,
        at: new Date(nowMs).toISOString(),
      });
    }
  }

  // Check Daily Goal
  const todayBloomedCount = nextCompletionLog.filter((e) => e.date === localToday).length;
  let nextGoalRewardedDates = [...prevGame.goalRewardedDates];
  let nextStreak = { ...prevGame.streak };

  if (todayBloomedCount >= prevGame.dailyGoal && !nextGoalRewardedDates.includes(localToday)) {
    sunshineGain += 15;
    nextGoalRewardedDates.push(localToday);
    rewards.push({
      id: `rew-goal-${Date.now()}`,
      amount: 15,
      reason: 'daily_goal',
      createdAt: nowMs,
    });
    const streakResult = computeStreak(nextGoalRewardedDates, localToday, nextStreak.rainDayWeeks);
    nextStreak = {
      current: streakResult.current,
      best: Math.max(streakResult.current, nextStreak.best),
      lastGoalDate: localToday,
      rainDayWeeks: streakResult.rainDayWeeks,
    };
  }

  const nextSunshine = prevGame.sunshineLifetime + sunshineGain;
  const unlocked = getUnlockedCompanionIds(nextSunshine);

  const nextState: GardenGameState = {
    ...prevGame,
    sunshineLifetime: nextSunshine,
    rewardedTaskIds: Array.from(existingRewarded).slice(-2000),
    completionLog: nextCompletionLog.slice(-500),
    goalRewardedDates: nextGoalRewardedDates.slice(-60),
    streak: nextStreak,
    unlockedCompanions: unlocked,
  };

  return { nextState, rewards };
}
