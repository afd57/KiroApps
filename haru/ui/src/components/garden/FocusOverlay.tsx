import React, { useState, useEffect } from 'react';
import { FocusSessionState, GardenGameActions } from './game/gameTypes';
import { getFocusRemainingMs, getFocusGrowthStage } from './game/gameRules';
import { HaruBlock } from '../../types/haru';
import { MochiBud } from './MochiBud';
import { CompanionSprite } from './CompanionSprite';
import { cleanTaskBody } from '../../utils/markdownHelpers';

export interface FocusOverlayProps {
  focus: FocusSessionState;
  task: HaruBlock | null;
  activeCompanionId: string;
  now: number;
  gameActions: GardenGameActions;
  onToggleTask: (taskId: string) => void;
}

const KIND_MESSAGES = [
  'One leaf at a time 🌿',
  "You've got this! ✨",
  'Gentle focus brings steady growth 🌱',
  'Deep work is blooming beautifully 🌸',
  'Stay with the task, companion is cheering for you! 🐾',
];

export const FocusOverlay: React.FC<FocusOverlayProps> = ({
  focus,
  task,
  activeCompanionId,
  now,
  gameActions,
  onToggleTask,
}) => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % KIND_MESSAGES.length);
    }, 45000);
    return () => clearInterval(timer);
  }, []);

  const remainingMs = getFocusRemainingMs(focus, now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const isPaused = Boolean(focus.pausedAt);
  const isBreak = focus.phase === 'break';
  const isFinished = remainingMs <= 0;

  const totalSec = Math.max(1, Math.round(focus.durationMs / 1000));
  const progressRatio = Math.min(1, Math.max(0, 1 - remainingSec / totalSec));
  const progressPct = Math.round(progressRatio * 100);

  const growthStage = getFocusGrowthStage(focus, now);
  const budStatus = isFinished || growthStage === 'flower' ? 'done' : 'running';
  const taskTitle = task ? cleanTaskBody(task.content) : 'Focus Session';

  return (
    <div className="haru-focus-overlay">
      <div className="haru-focus-container">
        {/* Phase Header */}
        <div className="haru-focus-phase-title">
          {isBreak ? '☕ 5-Minute Break' : '🌱 Tending Focus Session'}
        </div>

        {/* Big Circular Timer Ring with Mochi Bud */}
        <div className="haru-focus-ring-wrap">
          <svg className="haru-focus-svg-ring" viewBox="0 0 200 200">
            <circle
              className="haru-focus-ring-bg"
              cx="100"
              cy="100"
              r="88"
              fill="none"
              strokeWidth="8"
            />
            <circle
              className="haru-focus-ring-fill"
              cx="100"
              cy="100"
              r="88"
              fill="none"
              strokeWidth="8"
              strokeDasharray={`${progressPct * 5.53}, 553`}
            />
          </svg>

          <div className="haru-focus-center-stage">
            <MochiBud
              status={budStatus}
              size={130}
              colorIndex={task?.createdSeq ?? 0}
              celebrate={isFinished}
            />
          </div>
        </div>

        {/* Time Remaining Display */}
        <div className="haru-focus-time-text">{timeFormatted}</div>

        {/* Task Title */}
        <div className="haru-focus-task-title">{taskTitle}</div>

        {/* Companion Encouragement */}
        <div className="haru-focus-companion-box">
          <CompanionSprite
            companionId={activeCompanionId}
            mood={isBreak ? 'nap' : 'working'}
            size={48}
          />
          <div className="haru-focus-speech-bubble">
            {isBreak ? 'Time to stretch and rest your eyes ☕' : KIND_MESSAGES[msgIndex]}
          </div>
        </div>

        {/* Controls */}
        <div className="haru-focus-controls">
          {!isFinished ? (
            <>
              {isPaused ? (
                <button
                  type="button"
                  className="haru-focus-btn primary"
                  onClick={gameActions.resumeFocus}
                >
                  ▶ Resume
                </button>
              ) : (
                <button
                  type="button"
                  className="haru-focus-btn"
                  onClick={gameActions.pauseFocus}
                >
                  ⏸ Pause
                </button>
              )}

              {!isBreak && task && (
                <button
                  type="button"
                  className="haru-focus-btn success"
                  onClick={() => {
                    onToggleTask(task.id);
                    gameActions.finishFocus(true);
                  }}
                >
                  ✅ I finished the task!
                </button>
              )}

              <button
                type="button"
                className="haru-focus-btn danger"
                onClick={gameActions.stopFocus}
              >
                🌙 Stop for now
              </button>
            </>
          ) : (
            // Session Complete State
            <div className="haru-focus-complete-actions">
              <div className="haru-focus-complete-prompt">
                {isBreak ? 'Break complete! Ready to grow more?' : 'Focus timer reached 0! 🌸'}
              </div>

              {!isBreak && task && !task.checked && (
                <button
                  type="button"
                  className="haru-focus-btn success"
                  onClick={() => {
                    onToggleTask(task.id);
                    gameActions.finishFocus(true);
                  }}
                >
                  🌸 Mark task bloomed!
                </button>
              )}

              {!isBreak && (
                <button
                  type="button"
                  className="haru-focus-btn primary"
                  onClick={gameActions.startBreak}
                >
                  ☕ Take a 5-min break
                </button>
              )}

              <button
                type="button"
                className="haru-focus-btn"
                onClick={gameActions.endBreak}
              >
                Back to Garden 🌱
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
