import React, { useState, useRef, useEffect, useMemo } from 'react';
import { HaruBlock, KiroAgentOption, KiroModelOption } from '../../types/haru';
import { MochiBud } from './MochiBud';
import { getBudStatus, getMochiColor, getTaskPriority, cyclePriorityTagInLine } from './gardenUtils';
import { resolveAgentGear, resolveModelStyle, AgentGearId, ModelStyleId, AGENT_GEAR_CATALOG, MODEL_STYLE_CATALOG } from './wardrobeUtils';
import { cleanTaskBody, renderInlineMarkdown } from '../../utils/markdownHelpers';
import { playSound } from './gardenAudio';
import { SearchableSelect, SearchOption } from '../SearchableSelect';

export interface BudCardProps {
  block: HaruBlock;
  paradeNumber: number;
  subtasks: HaruBlock[];
  agents: KiroAgentOption[];
  models: KiroModelOption[];
  isNew?: boolean;
  isLeader?: boolean;
  isPinnedLeader?: boolean;
  gameEnabled?: boolean;
  customWardrobe?: {
    agentGear: Record<string, AgentGearId>;
    modelStyle: Record<string, ModelStyleId>;
  };
  onToggleTask: (blockId: string) => void;
  onUpdateBlockContent: (blockId: string, newText: string) => void;
  onChangeAgent: (blockId: string, agent: string) => void;
  onChangeModel: (blockId: string, model: string) => void;
  onRunSession: (block: HaruBlock) => void;
  onGoToSession: (block: HaruBlock) => void;
  onStartFocus?: (taskId: string) => void;
  onPinLeader?: (taskId: string | null) => void;
}

export const BudCard: React.FC<BudCardProps> = ({
  block,
  paradeNumber,
  subtasks,
  agents,
  models,
  isNew = false,
  isLeader = false,
  isPinnedLeader = false,
  gameEnabled = false,
  customWardrobe,
  onToggleTask,
  onUpdateBlockContent,
  onChangeAgent,
  onChangeModel,
  onRunSession,
  onGoToSession,
  onStartFocus,
  onPinLeader,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const prevCheckedRef = useRef(block.checked);

  const cleanBody = cleanTaskBody(block.content);
  const status = getBudStatus(block);
  const color = getMochiColor((block.createdSeq ?? paradeNumber) - 1);
  const priority = getTaskPriority(block);

  const selectedAgent = block.session?.agent || agents[0]?.id || 'default';
  const selectedModel = block.session?.model || models[0]?.id || 'auto';

  // Dynamic wardrobe styling based on chosen agent & model
  const agentGear = resolveAgentGear(selectedAgent, agents, customWardrobe?.agentGear);
  const modelStyle = resolveModelStyle(selectedModel, models, customWardrobe?.modelStyle);

  // Autonomous living idle pose rotation based on task index & time
  const idlePose = useMemo(() => {
    const poses: Array<'waddle' | 'sit' | 'look' | 'daydream'> = ['waddle', 'sit', 'look', 'daydream'];
    return poses[paradeNumber % poses.length];
  }, [paradeNumber]);

  useEffect(() => {
    if (!prevCheckedRef.current && block.checked) {
      setCelebrate(true);
      playSound.bloom();
      const timer = setTimeout(() => setCelebrate(false), 850);
      return () => clearTimeout(timer);
    }
    prevCheckedRef.current = block.checked;
  }, [block.checked]);

  const handleCyclePriority = () => {
    playSound.boop();
    const { nextLine } = cyclePriorityTagInLine(block.content);
    onUpdateBlockContent(block.id, cleanTaskBody(nextLine));
  };

  const isRunning = status === 'running';
  const hasSession = Boolean(block.session?.slotKey) || isRunning || block.session?.status === 'completed' || block.session?.status === 'review_ready';

  const agentOptions: SearchOption[] = useMemo(() => {
    return agents.map((a) => {
      const gear = resolveAgentGear(a.id, agents, customWardrobe?.agentGear);
      const gearDef = AGENT_GEAR_CATALOG.find((g) => g.id === gear);
      return {
        id: a.id,
        label: a.id === 'default' ? 'default' : a.name.replace(/\s*\(.*?\)/, ''),
        subLabel: a.description || a.id,
        icon: gearDef?.emoji || '🤖',
      };
    });
  }, [agents, customWardrobe]);

  const modelOptions: SearchOption[] = useMemo(() => {
    return models.map((m) => {
      const style = resolveModelStyle(m.id, models, customWardrobe?.modelStyle);
      const styleDef = MODEL_STYLE_CATALOG.find((s) => s.id === style);
      return {
        id: m.id,
        label: m.id === 'auto' ? 'Auto' : m.label.replace(/\s*\(.*?\)/, ''),
        subLabel: m.provider || m.id,
        icon: styleDef?.emoji || '⚡',
      };
    });
  }, [models, customWardrobe]);

  const cardStyle = {
    '--bud-tint': color.tintCss,
    '--bud-stroke': color.stroke,
  } as React.CSSProperties;

  return (
    <div
      className={`haru-garden-card ${isNew ? 'is-new' : ''} ${isLeader ? 'is-leader' : ''} ${
        !isLeader && !block.checked && gameEnabled ? 'is-calm' : ''
      } ${block.checked ? 'is-bloomed' : ''} priority-${priority}`}
      style={cardStyle}
    >
      {/* Top row: badge + priority + leader/pin/focus */}
      <div className="haru-garden-card-topbar">
        <div className="haru-topbar-left-badges">
          <span className="haru-garden-order-badge">#{paradeNumber}</span>

          {/* Interactive Priority Pill */}
          <button
            type="button"
            className={`haru-priority-pill priority-${priority}`}
            onClick={handleCyclePriority}
            title={`Priority: ${priority.toUpperCase()} (Click to cycle 🔥 Urgent / ⭐ High / 🌿 Normal / 💤 Low)`}
          >
            {priority === 'urgent' && '🔥 Urgent'}
            {priority === 'high' && '⭐ High'}
            {priority === 'normal' && '🌿'}
            {priority === 'low' && '💤 Low'}
          </button>
        </div>

        <div className="haru-garden-topbar-actions">
          {gameEnabled && isLeader && (
            <span className="haru-garden-leader-pill" title="Next recommended task to focus on">
              🚩 Next up
            </span>
          )}

          {/* Quick focus trigger button */}
          {gameEnabled && !block.checked && onStartFocus && (
            <button
              type="button"
              className="haru-garden-icon-btn"
              onClick={() => onStartFocus(block.id)}
              title="Tend this task (Start focus timer)"
            >
              ⏱
            </button>
          )}

          {/* Pin/Unpin as leader button */}
          {gameEnabled && !block.checked && onPinLeader && (
            <button
              type="button"
              className={`haru-garden-icon-btn ${isPinnedLeader ? 'active' : ''}`}
              onClick={() => onPinLeader(isPinnedLeader ? null : block.id)}
              title={isPinnedLeader ? 'Unpin Leader' : 'Pin as Leader'}
            >
              📌
            </button>
          )}
        </div>
      </div>

      {/* Living Mochi Bud Trigger Button */}
      <div className="haru-garden-bud-container">
        <button
          type="button"
          className="haru-garden-bud-trigger"
          onClick={() => onToggleTask(block.id)}
          aria-label={`Task ${paradeNumber}: ${cleanBody}. ${
            block.checked ? 'Completed, click to uncheck.' : 'Incomplete, click to complete.'
          }`}
        >
          <MochiBud
            status={status}
            colorIndex={(block.createdSeq ?? paradeNumber) - 1}
            size={84}
            celebrate={celebrate}
            staggerIndex={paradeNumber}
            isLeader={isLeader}
            agentGear={agentGear}
            modelStyle={modelStyle}
            idlePose={idlePose}
            priority={priority}
            onBoop={() => {
              if (!block.checked) playSound.boop();
            }}
          />
          <span className="haru-garden-soil" aria-hidden="true" />
          <span className={`haru-garden-check-pill ${block.checked ? 'checked' : ''}`}>
            {block.checked ? '✓' : ''}
          </span>
        </button>
      </div>

      {/* Title with Inline Editing */}
      <div className="haru-garden-card-body">
        {isEditing ? (
          <input
            autoFocus
            className="haru-garden-title-input"
            defaultValue={cleanBody}
            onBlur={(e) => {
              onUpdateBlockContent(block.id, e.target.value);
              setIsEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onUpdateBlockContent(block.id, e.currentTarget.value);
                setIsEditing(false);
              } else if (e.key === 'Escape') {
                setIsEditing(false);
              }
            }}
          />
        ) : (
          <div
            className={`haru-garden-title ${block.checked ? 'is-checked-text' : ''}`}
            onClick={() => setIsEditing(true)}
            title="Click to edit task title"
            dangerouslySetInnerHTML={{
              __html: renderInlineMarkdown(cleanBody) || 'Untitled task',
            }}
          />
        )}

        {/* Section chip */}
        <div className="haru-garden-chips">
          <span className="haru-garden-section-chip">
            #{block.sectionTitle || 'General'}
          </span>
        </div>
      </div>

      {/* Subtasks (Baby Buds) */}
      {subtasks.length > 0 && (
        <div className="haru-garden-baby-row">
          {subtasks.slice(0, 3).map((sub, idx) => {
            const subClean = cleanTaskBody(sub.content);
            const subStatus = getBudStatus(sub);
            return (
              <button
                key={sub.id}
                type="button"
                className="haru-garden-baby-btn"
                onClick={() => onToggleTask(sub.id)}
                title={`Subtask: ${subClean} (${sub.checked ? 'Done' : 'Click to complete'})`}
              >
                <MochiBud
                  status={subStatus}
                  colorIndex={(sub.createdSeq ?? idx + 10) - 1}
                  size={30}
                  staggerIndex={idx + 4}
                />
              </button>
            );
          })}
          {subtasks.length > 3 && (
            <span
              className="haru-garden-baby-more"
              title={subtasks
                .slice(3)
                .map((s) => cleanTaskBody(s.content))
                .join(', ')}
            >
              +{subtasks.length - 3}
            </span>
          )}
        </div>
      )}

      {/* --- ALWAYS VISIBLE COMPACT CARD ACTION FOOTER --- */}
      <div className="haru-garden-card-footer">
        <div className="haru-card-footer-controls">
          {/* Searchable Agent Pill */}
          <SearchableSelect
            value={selectedAgent}
            options={agentOptions}
            onChange={(agentId) => onChangeAgent(block.id, agentId)}
            icon={AGENT_GEAR_CATALOG.find((g) => g.id === agentGear)?.emoji || '🤖'}
            searchPlaceholder="Search agents..."
            title={`Agent: ${selectedAgent}`}
            variant="compact"
          />

          {/* Searchable Model Pill */}
          <SearchableSelect
            value={selectedModel}
            options={modelOptions}
            onChange={(modelId) => onChangeModel(block.id, modelId)}
            icon={MODEL_STYLE_CATALOG.find((s) => s.id === modelStyle)?.emoji || '⚡'}
            searchPlaceholder="Search models..."
            title={`Model: ${selectedModel}`}
            variant="compact"
          />
        </div>

        {/* Action Buttons: Run / Working / Session */}
        <div className="haru-card-run-wrap">
          {hasSession && !isRunning && (
            <button
              type="button"
              className="haru-card-session-btn"
              onClick={() => onGoToSession(block)}
              title={block.session?.slotKey ? `Open KiroCrew chat session (${block.session.slotKey}) ↗` : 'Open chat session in KiroCrew ↗'}
            >
              ↗ Session
            </button>
          )}

          {isRunning ? (
            <button
              type="button"
              className="haru-card-run-btn running"
              onClick={() => onGoToSession(block)}
              title="Task is running! Click to open live session in KiroCrew ↗"
            >
              <span className="haru-running-dot" />
              <span>Working ↗</span>
            </button>
          ) : (
            <button
              type="button"
              className="haru-card-run-btn"
              onClick={() => onRunSession(block)}
              title={hasSession ? 'Re-run task in a new KiroCrew session' : 'Run task in a new KiroCrew session'}
            >
              {hasSession ? '↻ Run' : '▶ Run'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
