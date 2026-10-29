import React from 'react';
import { FocusSessionState } from './game/gameTypes';
import { getFocusRemainingMs } from './game/gameRules';
import { HaruBlock } from '../../types/haru';
import { cleanTaskBody } from '../../utils/markdownHelpers';

export interface FocusPillProps {
  focus: FocusSessionState;
  task: HaruBlock | null;
  now: number;
  onClick: () => void;
}

export const FocusPill: React.FC<FocusPillProps> = ({
  focus,
  task,
  now,
  onClick,
}) => {
  const remainingMs = getFocusRemainingMs(focus, now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const title = task ? cleanTaskBody(task.content) : 'Focus';

  return (
    <button
      type="button"
      className="haru-focus-floating-pill"
      onClick={onClick}
      title="Click to open Garden Focus view"
    >
      <span className="haru-focus-pill-icon">{focus.phase === 'break' ? '☕' : '🌱'}</span>
      <span className="haru-focus-pill-time">{timeFormatted}</span>
      <span className="haru-focus-pill-task">{title.slice(0, 22)}</span>
    </button>
  );
};
