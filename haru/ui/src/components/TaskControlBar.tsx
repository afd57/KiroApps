import React from 'react';
import { HaruBlock, KiroAgentOption, KiroModelOption } from '../types/haru';

interface TaskControlBarProps {
  block: HaruBlock;
  agents: KiroAgentOption[];
  models: KiroModelOption[];
  onChangeAgent: (blockId: string, agent: string) => void;
  onChangeModel: (blockId: string, model: string) => void;
  onRunSession: (block: HaruBlock) => void;
  onGoToSession: (block: HaruBlock) => void;
}

export const TaskControlBar: React.FC<TaskControlBarProps> = ({
  block,
  agents,
  models,
  onChangeAgent,
  onChangeModel,
  onRunSession,
  onGoToSession,
}) => {
  const session = block.session || {
    status: 'idle',
    agent: agents[0]?.id || 'default',
    model: models[0]?.id || 'auto',
    logs: [],
    followUps: [],
  };

  const isRunning = session.status === 'running';
  const hasSession = Boolean(session.slotKey) || isRunning || session.status === 'completed' || session.status === 'review_ready';

  return (
    <div className="haru-task-controls" onClick={(e) => e.stopPropagation()}>
      {/* Agent Selector */}
      <select
        className="haru-select"
        value={session.agent || agents[0]?.id || 'default'}
        onChange={(e) => onChangeAgent(block.id, e.target.value)}
        title="Select KiroCrew Agent"
        aria-label="Select KiroCrew Agent"
      >
        {agents.map((a) => {
          const shortName = a.id === 'default' ? 'default' : a.name.replace(/\s*\(.*?\)/, '');
          return (
            <option key={a.id} value={a.id} title={`${a.name}: ${a.description || ''}`}>
              Agent: {shortName}
            </option>
          );
        })}
      </select>

      {/* Model Selector */}
      <select
        className="haru-select"
        value={session.model || models[0]?.id || 'auto'}
        onChange={(e) => onChangeModel(block.id, e.target.value)}
        title="Select KiroCrew Model"
        aria-label="Select KiroCrew Model"
      >
        {models.map((m) => {
          const shortLabel = m.id === 'auto' ? 'Auto' : m.label.replace(/\s*\(.*?\)/, '');
          return (
            <option key={m.id} value={m.id} title={`${m.label} (${m.provider || ''})`}>
              Model: {shortLabel}
            </option>
          );
        })}
      </select>

      {/* Running / Completed Status Badge */}
      {isRunning && (
        <span className="haru-status-pill running" title={`Running in KiroCrew (${session.slotKey || 'session'})`}>
          <span className="haru-status-dot" />
          Running
        </span>
      )}
      {!isRunning && (session.status === 'completed' || session.status === 'review_ready') && (
        <span className="haru-status-pill completed" title="Session finished">
          ✓ Done
        </span>
      )}

      {/* Go to Session Button */}
      {hasSession && (
        <button
          type="button"
          className="haru-btn haru-btn-session"
          onClick={() => onGoToSession(block)}
          title={session.slotKey ? `Go to KiroCrew session (${session.slotKey})` : 'Go to KiroCrew session'}
        >
          ↗ Go to Session
        </button>
      )}

      {/* Run Button */}
      <button
        type="button"
        className="haru-btn haru-btn-primary"
        onClick={() => onRunSession(block)}
        title="Submit task as a new session in KiroCrew and open it"
      >
        {hasSession ? '↻ Run' : '▶ Run'}
      </button>
    </div>
  );
};
