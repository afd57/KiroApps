import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { HaruDocument, HaruBlock, KiroAgentOption, KiroModelOption } from '../../types/haru';
import { GardenGameState, GardenGameActions, RewardEvent } from './game/gameTypes';
import { getTopLevelTasksSorted, findDefaultTargetSection, getAvailableSections } from './gardenUtils';
import { getLeaderTask, toLocalDateString } from './game/gameRules';
import { BudCard } from './BudCard';
import { SeedPot } from './SeedPot';
import { MochiBud } from './MochiBud';
import { GameHud } from './GameHud';
import { FocusOverlay } from './FocusOverlay';
import { RewardPop } from './RewardPop';
import { WardrobeModal } from './WardrobeModal';
import { playSound } from './gardenAudio';
import { insertTasksIntoMarkdown } from '../../utils/connectorHelpers';

export interface GardenViewProps {
  doc: HaruDocument;
  agents: KiroAgentOption[];
  models: KiroModelOption[];
  game: GardenGameState;
  gameActions: GardenGameActions;
  now: number;
  recentRewards: RewardEvent[];
  onChangeRawMarkdown: (nextMarkdown: string) => void;
  onToggleTask: (blockId: string) => void;
  onUpdateBlockContent: (blockId: string, newText: string) => void;
  onChangeAgent: (blockId: string, agent: string) => void;
  onChangeModel: (blockId: string, model: string) => void;
  onRunSession: (block: HaruBlock) => void;
  onGoToSession: (block: HaruBlock) => void;
}

export const GardenView: React.FC<GardenViewProps> = ({
  doc,
  agents,
  models,
  game,
  gameActions,
  now,
  recentRewards,
  onChangeRawMarkdown,
  onToggleTask,
  onUpdateBlockContent,
  onChangeAgent,
  onChangeModel,
  onRunSession,
  onGoToSession,
}) => {
  const [hideDone, setHideDone] = useState<boolean>(() => {
    try {
      return localStorage.getItem('haru.garden.hideDone.v1') === '1';
    } catch {
      return false;
    }
  });

  const [showWardrobe, setShowWardrobe] = useState<boolean>(false);
  const [wildflowerClicks, setWildflowerClicks] = useState<number>(0);

  const toggleHideDone = useCallback(() => {
    setHideDone((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('haru.garden.hideDone.v1', next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Top-level tasks sorted according to sortMode (priority or creation order)
  const sortedTopTasks = useMemo(
    () => getTopLevelTasksSorted(doc.blocks, game.sortMode || 'added'),
    [doc.blocks, game.sortMode]
  );

  // Subtasks map by parent ID
  const subtasksByParent = useMemo(() => {
    const map = new Map<string, HaruBlock[]>();
    for (const b of doc.blocks) {
      if (b.type === 'task' && b.isSubtask && b.parentId) {
        const list = map.get(b.parentId) || [];
        list.push(b);
        map.set(b.parentId, list);
      }
    }
    return map;
  }, [doc.blocks]);

  // Filter tasks if hideDone is enabled
  const visibleTasks = useMemo(() => {
    if (!hideDone) return sortedTopTasks;
    return sortedTopTasks.filter((t) => !t.checked);
  }, [sortedTopTasks, hideDone]);

  // Today's bloomed tasks
  const localToday = useMemo(() => toLocalDateString(now), [now]);
  const todayBloomedTasks = useMemo(() => {
    return sortedTopTasks.filter((t) => {
      if (!t.checked) return false;
      return game.completionLog.some((e) => e.taskId === t.id && e.date === localToday);
    });
  }, [sortedTopTasks, game.completionLog, localToday]);

  // Leader task (first unfinished in parade or user pinned)
  const leaderTask = useMemo(
    () => getLeaderTask(sortedTopTasks, game.pinnedLeaderId),
    [sortedTopTasks, game.pinnedLeaderId]
  );

  // New task pop entrance animation tracking
  const seenIdsRef = useRef<Set<string> | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentTopIds = sortedTopTasks.map((t) => t.id);
    if (seenIdsRef.current === null) {
      seenIdsRef.current = new Set(currentTopIds);
      return;
    }

    const freshlyAdded: string[] = [];
    for (const id of currentTopIds) {
      if (!seenIdsRef.current.has(id)) {
        seenIdsRef.current.add(id);
        freshlyAdded.push(id);
      }
    }

    if (freshlyAdded.length > 0) {
      setNewIds((prev) => {
        const next = new Set(prev);
        freshlyAdded.forEach((id) => next.add(id));
        return next;
      });
      const timer = setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev);
          freshlyAdded.forEach((id) => next.delete(id));
          return next;
        });
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [sortedTopTasks]);

  // Planting task helper
  const availableSections = useMemo(() => getAvailableSections(doc.blocks), [doc.blocks]);
  const defaultSection = useMemo(() => findDefaultTargetSection(doc.blocks), [doc.blocks]);

  const handlePlantTask = useCallback(
    (text: string, section: string) => {
      const nextRaw = insertTasksIntoMarkdown(doc.rawMarkdown || '', [`[] ${text}`], section);
      onChangeRawMarkdown(nextRaw);
    },
    [doc.rawMarkdown, onChangeRawMarkdown]
  );

  // Header counts
  const totalCount = sortedTopTasks.length;
  const doneCount = sortedTopTasks.filter((t) => t.checked).length;
  const runningCount = sortedTopTasks.filter(
    (t) => !t.checked && t.session?.status === 'running'
  ).length;
  const sproutingCount = totalCount - doneCount - runningCount;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Active focus task if any
  const focusTask = useMemo(() => {
    if (!game.focus?.taskId) return null;
    return doc.blocks.find((b) => b.id === game.focus?.taskId) || null;
  }, [doc.blocks, game.focus]);

  const atmosphere = game.atmosphere || 'sunny';

  return (
    <div className={`haru-garden atmosphere-${atmosphere}`}>
      {/* Terrarium Atmospheric Ambient Overlay */}
      <div className="haru-garden-atmosphere-overlay" aria-hidden="true">
        {atmosphere === 'sakura' && (
          <div className="haru-atmosphere-particles sakura">
            <span className="petal p1">🌸</span>
            <span className="petal p2">🌸</span>
            <span className="petal p3">🌸</span>
            <span className="petal p4">🌸</span>
            <span className="petal p5">🌸</span>
            <span className="petal p6">🌸</span>
          </div>
        )}
        {atmosphere === 'night' && (
          <div className="haru-atmosphere-particles night">
            <span className="firefly f1" />
            <span className="firefly f2" />
            <span className="firefly f3" />
            <span className="firefly f4" />
            <span className="firefly f5" />
            <span className="firefly f6" />
          </div>
        )}
        {atmosphere === 'sunny' && (
          <div className="haru-atmosphere-particles sunny">
            <span className="sunmote s1" />
            <span className="sunmote s2" />
            <span className="sunmote s3" />
            <span className="sunmote s4" />
          </div>
        )}
      </div>

      {/* Reward pops */}
      <RewardPop rewards={recentRewards} />

      {/* Character Wardrobe Studio Modal */}
      {showWardrobe && (
        <WardrobeModal
          agents={agents}
          models={models}
          customWardrobe={game.wardrobe}
          onSaveAgentGear={gameActions.setAgentGear}
          onSaveModelStyle={gameActions.setModelStyle}
          onSaveRosterWardrobe={gameActions.setRosterWardrobe}
          onClose={() => setShowWardrobe(false)}
        />
      )}

      {/* Focus Session Overlay */}
      {game.focus && (
        <FocusOverlay
          focus={game.focus}
          task={focusTask}
          activeCompanionId={game.activeCompanion}
          now={now}
          gameActions={gameActions}
          onToggleTask={onToggleTask}
        />
      )}

      {/* Garden Header */}
      <div className="haru-garden-header">
        <div className="haru-garden-brand">
          <span className="haru-garden-title-text">Haru Garden</span>
          <span className="haru-garden-subtitle">
            {game.sortMode === 'priority'
              ? 'Urgent & High priority tasks marched to the front 🔥'
              : 'Little Mochi Buds in the order you planted them 🌱'}
          </span>
        </div>

        {/* Focus Game HUD - Persistent (never disappears!) */}
        <GameHud
          game={game}
          gameActions={gameActions}
          todayBloomedTasks={todayBloomedTasks}
          leaderTask={leaderTask}
          onOpenWardrobe={() => setShowWardrobe(true)}
        />

        <div className="haru-garden-header-right">
          <div className="haru-garden-counts-strip">
            <span className="haru-count-badge sprouting">🌱 {sproutingCount} sprouting</span>
            {runningCount > 0 && (
              <button
                type="button"
                className="haru-count-badge running clickable"
                onClick={() => {
                  const runningBlock = doc.blocks.find(
                    (b) => !b.checked && b.session?.status === 'running'
                  );
                  if (runningBlock) {
                    onGoToSession(runningBlock);
                  }
                }}
                title="Click to jump directly to the active KiroCrew session ↗"
              >
                🏃 {runningCount} working ↗
              </button>
            )}
            <span className="haru-count-badge bloomed">🌸 {doneCount} bloomed</span>
          </div>

          {/* Sort Mode Switcher */}
          <button
            type="button"
            className={`haru-garden-pill-btn sort-toggle ${game.sortMode === 'priority' ? 'active' : ''}`}
            onClick={() =>
              gameActions.setSortMode(game.sortMode === 'priority' ? 'added' : 'priority')
            }
            title={
              game.sortMode === 'priority'
                ? 'Sorted by Priority. Click to sort by Added order.'
                : 'Sorted by Added order. Click to sort by Priority.'
            }
          >
            {game.sortMode === 'priority' ? '🔥 Priority First' : '🌱 Added Order'}
          </button>

          <button
            type="button"
            className={`haru-garden-pill-btn ${hideDone ? 'active' : ''}`}
            onClick={toggleHideDone}
            title="Toggle hiding completed bloomed buds"
          >
            {hideDone ? '🌸 Show bloomed' : '🌸 Hide bloomed'}
          </button>
        </div>
      </div>

      {/* Progress Vine Bar */}
      <div className="haru-garden-vine-bar" title={`Garden progress: ${progressPct}% bloomed`}>
        <div className="haru-garden-vine-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {/* All Done Celebration Banner */}
      {totalCount > 0 && doneCount === totalCount && (
        <div className="haru-garden-all-done-banner">
          <span className="haru-all-done-sparkle">🌸</span>
          <span className="haru-all-done-text">
            Everything bloomed! Your garden is completely full of flowers today. Great job! ✨
          </span>
        </div>
      )}

      {/* Empty State */}
      {totalCount === 0 ? (
        <div className="haru-garden-empty-state">
          <MochiBud status="sleepy" size={110} colorIndex={5} />
          <div className="haru-empty-title">Your garden is quiet.</div>
          <div className="haru-empty-subtitle">
            Plant your first task to see your little sprout appear!
          </div>

          <div className="haru-empty-seed-pot-wrap">
            <SeedPot
              sections={availableSections}
              defaultSection={defaultSection}
              autoFocus
              onPlantTask={handlePlantTask}
            />
          </div>
        </div>
      ) : (
        /* Main Garden Parade Grid */
        <div className="haru-garden-parade">
          {visibleTasks.map((block) => {
            // Find 1-based index in the original creation list
            const paradeNumber = sortedTopTasks.findIndex((t) => t.id === block.id) + 1;
            const subtasks = subtasksByParent.get(block.id) || [];
            const isLeader = leaderTask?.id === block.id;
            const isPinnedLeader = game.pinnedLeaderId === block.id;

            return (
              <BudCard
                key={block.id}
                block={block}
                paradeNumber={paradeNumber}
                subtasks={subtasks}
                agents={agents}
                models={models}
                customWardrobe={game.wardrobe}
                isNew={newIds.has(block.id)}
                isLeader={isLeader}
                isPinnedLeader={isPinnedLeader}
                gameEnabled={game.enabled}
                onToggleTask={onToggleTask}
                onUpdateBlockContent={onUpdateBlockContent}
                onChangeAgent={onChangeAgent}
                onChangeModel={onChangeModel}
                onRunSession={onRunSession}
                onGoToSession={onGoToSession}
                onStartFocus={(taskId) => gameActions.startFocus(taskId, game.focusMinutes)}
                onPinLeader={gameActions.pinLeader}
              />
            );
          })}

          {/* Plant Seed Pot at the end of the parade */}
          <SeedPot
            sections={availableSections}
            defaultSection={defaultSection}
            onPlantTask={handlePlantTask}
          />
        </div>
      )}

      {/* Interactive Soil Lawn Terrarium Footer */}
      <div className="haru-garden-lawn-terrace">
        <div className="haru-lawn-soil-line" />
        <div className="haru-lawn-flowers-strip" title="Click wildflowers to spread cheer!">
          {['🌼', '🌷', '🍄', '🌸', '🌻', '🍀', '🌼', '🌷'].map((flower, idx) => (
            <button
              key={idx}
              type="button"
              className="haru-lawn-flower-btn"
              onClick={() => {
                playSound.bloom();
                setWildflowerClicks((c) => c + 1);
              }}
            >
              {flower}
            </button>
          ))}
          {wildflowerClicks > 0 && (
            <span className="haru-lawn-cheer-badge">
              💖 {wildflowerClicks} garden smiles
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
