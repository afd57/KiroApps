import React, { useMemo } from 'react';
import { HaruBlock, KiroAgentOption, KiroModelOption } from '../types/haru';
import { SearchableSelect, SearchOption } from './SearchableSelect';

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

  const agentOptions: SearchOption[] = useMemo(() => {
    return agents.map((a) => ({
      id: a.id,
      label: a.id === 'default' ? 'default' : a.name.replace(/\s*\(.*?\)/, ''),
      subLabel: a.description || a.id,
      icon: '🤖',
    }));
  }, [agents]);

  const modelOptions: SearchOption[] = useMemo(() => {
    return models.map((m) => ({
      id: m.id,
      label: m.id === 'auto' ? 'Auto' : m.label.replace(/\s*\(.*?\)/, ''),
      subLabel: m.provider || m.id,
      icon: '⚡',
    }));
  }, [models]);

  return (
    <div className="haru-task-controls" onClick={(e) => e.stopPropagation()}>
      {/* Searchable Agent Selector */}
      <SearchableSelect
        value={session.agent || agents[0]?.id || 'default'}
        options={agentOptions}
        onChange={(agentId) => onChangeAgent(block.id, agentId)}
        searchPlaceholder="Search agents..."
        title="Select KiroCrew Agent"
        ariaLabel="Select KiroCrew Agent"
        variant="default"
      />

      {/* Searchable Model Selector */}
      <SearchableSelect
        value={session.model || models[0]?.id || 'auto'}
        options={modelOptions}
        onChange={(modelId) => onChangeModel(block.id, modelId)}
        searchPlaceholder="Search models..."
        title="Select AI Model"
        ariaLabel="Select KiroCrew Model"
        variant="default"
      />

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
