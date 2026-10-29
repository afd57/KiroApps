import { useState, useEffect, useRef, useCallback } from 'react';
import { HaruDocument } from '../../../types/haru';
import { GardenGameState, GardenGameActions, RewardEvent, createDefaultGameState } from './gameTypes';
import { applyTaskChecks, getUnlockedCompanionIds } from './gameRules';

const STORAGE_KEY = 'haru.garden.game.v1';

export function useGardenGame(
  doc: HaruDocument,
  options: {
    api?: any;
    notify?: (msg: string, type?: any) => void;
    isHosted?: boolean;
    initialBackendGarden?: any;
  }
) {
  const { api, notify, isHosted, initialBackendGarden } = options;

  const [game, setGame] = useState<GardenGameState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.sunshineLifetime === 'number') {
          return {
            ...createDefaultGameState(),
            ...parsed,
          };
        }
      }
    } catch {
      // ignore
    }
    return createDefaultGameState();
  });

  const [recentRewards, setRecentRewards] = useState<RewardEvent[]>([]);
  const [now, setNow] = useState<number>(() => Date.now());

  const gameRef = useRef<GardenGameState>(game);
  gameRef.current = game;

  // Persist game state helper (localStorage immediately, debounced backend PUT)
  const persistTimeoutRef = useRef<any>(null);
  const persistGame = useCallback(
    (nextState: GardenGameState) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      } catch {
        // ignore
      }

      if (api?.put) {
        if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = setTimeout(async () => {
          try {
            await api.put('/apps/haru/api/workspace', { garden: nextState });
          } catch {
            // ignore
          }
        }, 1200);
      }
    },
    [api]
  );

  // Sync with initial backend garden data if it has more progress
  useEffect(() => {
    if (initialBackendGarden && typeof initialBackendGarden.sunshineLifetime === 'number') {
      setGame((prev) => {
        if (initialBackendGarden.sunshineLifetime > prev.sunshineLifetime) {
          const merged: GardenGameState = {
            ...prev,
            ...initialBackendGarden,
            rewardedTaskIds: Array.from(
              new Set([...prev.rewardedTaskIds, ...(initialBackendGarden.rewardedTaskIds || [])])
            ),
          };
          persistGame(merged);
          return merged;
        }
        return prev;
      });
    }
  }, [initialBackendGarden, persistGame]);

  // Clock tick (1s when focus session active, 15s otherwise)
  useEffect(() => {
    const isFocusing = Boolean(game.focus && !game.focus.pausedAt);
    const intervalMs = isFocusing ? 1000 : 15000;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, intervalMs);

    return () => clearInterval(timer);
  }, [game.focus]);

  // Window title update for standalone mode
  useEffect(() => {
    if (isHosted || !game.focus || game.focus.pausedAt) return;
    const prevTitle = document.title;
    const remainingMs = Math.max(
      0,
      game.focus.durationMs -
        (Date.now() - game.focus.startedAt - (game.focus.pausedAccumMs || 0))
    );
    const mins = Math.floor(remainingMs / 60000);
    const secs = Math.floor((remainingMs % 60000) / 1000);
    document.title = `🌱 ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} · Haru Focus`;

    return () => {
      document.title = prevTitle;
    };
  }, [now, game.focus, isHosted]);

  // Diff task completions in doc.blocks to award Sunshine
  useEffect(() => {
    const { nextState, rewards } = applyTaskChecks(gameRef.current, doc.blocks, Date.now());
    if (nextState !== gameRef.current) {
      setGame(nextState);
      persistGame(nextState);

      if (rewards.length > 0) {
        setRecentRewards((prev) => [...prev, ...rewards]);
        setTimeout(() => {
          setRecentRewards((prev) => prev.filter((r) => !rewards.some((nr) => nr.id === r.id)));
        }, 2200);

        if (notify && nextState.enabled) {
          const totalEarned = rewards.reduce((acc, r) => acc + r.amount, 0);
          if (rewards.some((r) => r.reason === 'daily_goal')) {
            notify('Daily Goal Completed! 🌸 ☀ +15 bonus', 'success');
          } else {
            notify(`Task bloomed! ☀ +${totalEarned}`, 'success');
          }
        }
      }
    }
  }, [doc.blocks, notify, persistGame]);

  // Actions
  const startFocus = useCallback(
    (taskId: string, minutes: 10 | 25 | 45 = 25) => {
      setGame((prev) => {
        const next: GardenGameState = {
          ...prev,
          focusMinutes: minutes,
          focus: {
            taskId,
            phase: 'focus',
            durationMs: minutes * 60 * 1000,
            startedAt: Date.now(),
            pausedAccumMs: 0,
          },
        };
        persistGame(next);
        return next;
      });
      if (notify) notify(`Started tending session (${minutes}m) 🌱`, 'info');
    },
    [notify, persistGame]
  );

  const pauseFocus = useCallback(() => {
    setGame((prev) => {
      if (!prev.focus || prev.focus.pausedAt) return prev;
      const next: GardenGameState = {
        ...prev,
        focus: {
          ...prev.focus,
          pausedAt: Date.now(),
        },
      };
      persistGame(next);
      return next;
    });
  }, [persistGame]);

  const resumeFocus = useCallback(() => {
    setGame((prev) => {
      if (!prev.focus || !prev.focus.pausedAt) return prev;
      const pausedDuration = Date.now() - prev.focus.pausedAt;
      const next: GardenGameState = {
        ...prev,
        focus: {
          ...prev.focus,
          pausedAt: undefined,
          pausedAccumMs: (prev.focus.pausedAccumMs || 0) + pausedDuration,
        },
      };
      persistGame(next);
      return next;
    });
  }, [persistGame]);

  const stopFocus = useCallback(() => {
    setGame((prev) => {
      if (!prev.focus) return prev;
      const effectiveEnd = prev.focus.pausedAt ?? Date.now();
      const elapsedMs = Math.max(0, effectiveEnd - prev.focus.startedAt - prev.focus.pausedAccumMs);
      const minutes = Math.floor(elapsedMs / 60000);

      let sunshineGain = 0;
      if (minutes >= 5) {
        sunshineGain = minutes;
      }

      const nextSunshine = prev.sunshineLifetime + sunshineGain;
      const next: GardenGameState = {
        ...prev,
        sunshineLifetime: nextSunshine,
        unlockedCompanions: getUnlockedCompanionIds(nextSunshine),
        focus: undefined,
      };
      persistGame(next);
      return next;
    });
  }, [persistGame]);

  const finishFocus = useCallback(
    (_markTaskDone: boolean) => {
      setGame((prev) => {
        if (!prev.focus) return prev;
        const effectiveEnd = prev.focus.pausedAt ?? Date.now();
        const elapsedMs = Math.max(0, effectiveEnd - prev.focus.startedAt - prev.focus.pausedAccumMs);
        const minutes = Math.floor(elapsedMs / 60000);

        let sunshineGain = 5; // completion bonus
        if (minutes >= 5) {
          sunshineGain += minutes;
        }

        const nextSunshine = prev.sunshineLifetime + sunshineGain;
        const next: GardenGameState = {
          ...prev,
          sunshineLifetime: nextSunshine,
          unlockedCompanions: getUnlockedCompanionIds(nextSunshine),
          focus: undefined,
        };
        persistGame(next);
        return next;
      });
      if (notify) notify('Focus session complete! ☀ +5 bonus', 'success');
    },
    [notify, persistGame]
  );

  const startBreak = useCallback(() => {
    setGame((prev) => {
      const next: GardenGameState = {
        ...prev,
        focus: {
          taskId: prev.focus?.taskId || '',
          phase: 'break',
          durationMs: 5 * 60 * 1000,
          startedAt: Date.now(),
          pausedAccumMs: 0,
        },
      };
      persistGame(next);
      return next;
    });
  }, [persistGame]);

  const endBreak = useCallback(() => {
    setGame((prev) => {
      const next: GardenGameState = {
        ...prev,
        focus: undefined,
      };
      persistGame(next);
      return next;
    });
  }, [persistGame]);

  const setDailyGoal = useCallback(
    (goal: number) => {
      setGame((prev) => {
        const next: GardenGameState = {
          ...prev,
          dailyGoal: Math.max(1, Math.min(10, goal)),
        };
        persistGame(next);
        return next;
      });
    },
    [persistGame]
  );

  const setFocusMinutes = useCallback(
    (minutes: 10 | 25 | 45) => {
      setGame((prev) => {
        const next: GardenGameState = {
          ...prev,
          focusMinutes: minutes,
        };
        persistGame(next);
        return next;
      });
    },
    [persistGame]
  );

  const setActiveCompanion = useCallback(
    (companionId: string) => {
      setGame((prev) => {
        const next: GardenGameState = {
          ...prev,
          activeCompanion: companionId,
        };
        persistGame(next);
        return next;
      });
      if (notify) notify('Companion selected! 🐾', 'info');
    },
    [notify, persistGame]
  );

  const pinLeader = useCallback(
    (taskId: string | null) => {
      setGame((prev) => {
        const next: GardenGameState = {
          ...prev,
          pinnedLeaderId: taskId || undefined,
        };
        persistGame(next);
        return next;
      });
    },
    [persistGame]
  );

  const setEnabled = useCallback(
    (enabled: boolean) => {
      setGame((prev) => {
        const next: GardenGameState = {
          ...prev,
          enabled,
        };
        persistGame(next);
        return next;
      });
    },
    [persistGame]
  );

  const setSoundOn = useCallback(
    (soundOn: boolean) => {
      setGame((prev) => {
        const next: GardenGameState = {
          ...prev,
          soundOn,
        };
        persistGame(next);
        return next;
      });
    },
    [persistGame]
  );

  const dismissUnlock = useCallback(
    (companionId: string) => {
      setGame((prev) => {
        const next: GardenGameState = {
          ...prev,
          seenUnlocks: Array.from(new Set([...prev.seenUnlocks, companionId])),
        };
        persistGame(next);
        return next;
      });
    },
    [persistGame]
  );

  const setAgentGear = useCallback(
    (agentId: string, gearId: any) => {
      setGame((prev) => {
        const next: GardenGameState = {
          ...prev,
          wardrobe: {
            ...prev.wardrobe,
            agentGear: {
              ...(prev.wardrobe?.agentGear || {}),
              [agentId]: gearId,
            },
          },
        };
        persistGame(next);
        return next;
      });
      if (notify) notify(`Outfit updated for agent! 👗`, 'info');
    },
    [notify, persistGame]
  );

  const setModelStyle = useCallback(
    (modelId: string, styleId: any) => {
      setGame((prev) => {
        const next: GardenGameState = {
          ...prev,
          wardrobe: {
            ...prev.wardrobe,
            modelStyle: {
              ...(prev.wardrobe?.modelStyle || {}),
              [modelId]: styleId,
            },
          },
        };
        persistGame(next);
        return next;
      });
      if (notify) notify(`Aura tier updated for model! ✨`, 'info');
    },
    [notify, persistGame]
  );

  const setRosterWardrobe = useCallback(
    (newWardrobe: { agentGear: Record<string, any>; modelStyle: Record<string, any> }) => {
      setGame((prev) => {
        const next: GardenGameState = {
          ...prev,
          wardrobe: {
            agentGear: { ...(prev.wardrobe?.agentGear || {}), ...newWardrobe.agentGear },
            modelStyle: { ...(prev.wardrobe?.modelStyle || {}), ...newWardrobe.modelStyle },
          },
        };
        persistGame(next);
        return next;
      });
      if (notify) notify(`✨ Wardrobe Auto-Styled across all Agents & Models!`, 'success');
    },
    [notify, persistGame]
  );

  const setSortMode = useCallback(
    (mode: any) => {
      setGame((prev) => {
        const next: GardenGameState = {
          ...prev,
          sortMode: mode,
        };
        persistGame(next);
        return next;
      });
    },
    [persistGame]
  );

  const setAtmosphere = useCallback(
    (atmosphere: any) => {
      setGame((prev) => {
        const next: GardenGameState = {
          ...prev,
          atmosphere,
        };
        persistGame(next);
        return next;
      });
    },
    [persistGame]
  );

  const gameActions: GardenGameActions = {
    startFocus,
    pauseFocus,
    resumeFocus,
    finishFocus,
    stopFocus,
    startBreak,
    endBreak,
    setDailyGoal,
    setFocusMinutes,
    setActiveCompanion,
    pinLeader,
    setEnabled,
    setSoundOn,
    dismissUnlock,
    setAgentGear,
    setModelStyle,
    setRosterWardrobe,
    setSortMode,
    setAtmosphere,
  };

  return {
    game,
    gameActions,
    now,
    recentRewards,
  };
}
