import React, { useMemo, useState } from 'react';
import {
  HaruDocument,
  HaruBlock,
  KiroAgentOption,
  KiroModelOption,
} from '../types/haru';
import { TaskControlBar } from './TaskControlBar';

interface RadarViewProps {
  doc: HaruDocument;
  agents: KiroAgentOption[];
  models: KiroModelOption[];
  onToggleTask: (blockId: string) => void;
  onChangeAgent: (blockId: string, agent: string) => void;
  onChangeModel: (blockId: string, model: string) => void;
  onRunSession: (block: HaruBlock) => void;
  onGoToSession: (block: HaruBlock) => void;
  onMoveAllUnfinishedToToday?: () => void;
}

type FilterMode = 'incomplete' | 'running' | 'completed' | 'all';

export const RadarView: React.FC<RadarViewProps> = ({
  doc,
  agents,
  models,
  onToggleTask,
  onChangeAgent,
  onChangeModel,
  onRunSession,
  onGoToSession,
  onMoveAllUnfinishedToToday,
}) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('incomplete');
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allTasks = useMemo(
    () => doc.blocks.filter((b) => b.type === 'task'),
    [doc.blocks]
  );

  const incompleteTasks = useMemo(
    () => allTasks.filter((t) => !t.checked),
    [allTasks]
  );

  const runningTasks = useMemo(
    () => allTasks.filter((t) => t.session?.status === 'running'),
    [allTasks]
  );

  const completedTasks = useMemo(
    () => allTasks.filter((t) => t.checked),
    [allTasks]
  );

  const relevantTasksForFilters = useMemo(() => {
    if (filterMode === 'completed') return completedTasks;
    if (filterMode === 'running') return runningTasks;
    if (filterMode === 'all') return allTasks;
    return incompleteTasks;
  }, [filterMode, completedTasks, runningTasks, allTasks, incompleteTasks]);

  const allPeople = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of relevantTasksForFilters) {
      for (const p of t.people) {
        map.set(p, (map.get(p) || 0) + 1);
      }
    }
    return Array.from(map.entries());
  }, [relevantTasksForFilters]);

  const allTags = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of relevantTasksForFilters) {
      for (const tag of t.tags) {
        map.set(tag, (map.get(tag) || 0) + 1);
      }
    }
    return Array.from(map.entries());
  }, [relevantTasksForFilters]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (filterMode === 'incomplete' && t.checked) return false;
      if (filterMode === 'running' && t.session?.status !== 'running') return false;
      if (filterMode === 'completed' && !t.checked) return false;
      if (selectedPerson && !t.people.includes(selectedPerson)) return false;
      if (selectedTag && !t.tags.includes(selectedTag)) return false;
      return true;
    });
  }, [allTasks, filterMode, selectedPerson, selectedTag]);

  const backlogIncompleteCount = useMemo(
    () =>
      incompleteTasks.filter(
        (t) => !(t.sectionTitle || '').toLowerCase().includes('today')
      ).length,
    [incompleteTasks]
  );

  return (
    <div className="haru-workspace-scroll">
      <div className="haru-workspace-container haru-radar-wrap">
        {/* Summary Cards */}
        <div className="haru-radar-summary">
          <div
            className={`haru-stat-card is-clickable ${filterMode === 'incomplete' ? 'is-active' : ''}`}
            onClick={() => setFilterMode('incomplete')}
            role="button"
            tabIndex={0}
            title="Filter main list by incomplete tasks"
            onKeyDown={(e) => e.key === 'Enter' && setFilterMode('incomplete')}
          >
            <div className="haru-stat-card-header">
              <span className="haru-stat-value">{incompleteTasks.length}</span>
              {filterMode === 'incomplete' && (
                <span className="haru-stat-badge">Active</span>
              )}
            </div>
            <span className="haru-stat-label">Incomplete & Unfinished Tasks</span>
          </div>

          <div
            className={`haru-stat-card is-clickable ${filterMode === 'running' ? 'is-active' : ''}`}
            onClick={() => setFilterMode('running')}
            role="button"
            tabIndex={0}
            title="Filter main list by running tasks"
            onKeyDown={(e) => e.key === 'Enter' && setFilterMode('running')}
          >
            <div className="haru-stat-card-header">
              <span className="haru-stat-value" style={{ color: 'var(--haru-ok)' }}>
                {runningTasks.length}
              </span>
              {filterMode === 'running' && (
                <span className="haru-stat-badge">Active</span>
              )}
            </div>
            <span className="haru-stat-label">Running in KiroCrew</span>
          </div>

          <div
            className={`haru-stat-card is-clickable haru-stat-card-completed ${filterMode === 'completed' ? 'is-active' : ''}`}
            onClick={() =>
              setFilterMode((prev) => (prev === 'completed' ? 'incomplete' : 'completed'))
            }
            role="button"
            tabIndex={0}
            title="Click to toggle completed filter in Radar list"
            onKeyDown={(e) =>
              e.key === 'Enter' &&
              setFilterMode((prev) => (prev === 'completed' ? 'incomplete' : 'completed'))
            }
          >
            <div className="haru-stat-card-header">
              <div>
                <span className="haru-stat-value">{completedTasks.length}</span>
                <span className="haru-stat-label" style={{ marginLeft: 6 }}>
                  Completed
                </span>
              </div>
              <span className="haru-stat-badge">
                {filterMode === 'completed' ? 'Active' : 'Click to filter'}
              </span>
            </div>

            {/* Completed Task List right here */}
            {completedTasks.length > 0 ? (
              <div
                className="haru-stat-completed-list"
                onClick={(e) => e.stopPropagation()}
              >
                {completedTasks.map((task) => {
                  const cleanTitle = task.content.replace(/^\[[ xX]?\]\s*/, '');
                  return (
                    <div key={task.id} className="haru-stat-completed-item">
                      <button
                        type="button"
                        className="haru-checkbox checked"
                        onClick={() => onToggleTask(task.id)}
                        title="Mark incomplete"
                      >
                        ✓
                      </button>
                      <span
                        className="haru-stat-completed-title"
                        title={cleanTitle}
                      >
                        {cleanTitle || '(Untitled task)'}
                      </span>
                      {task.sectionTitle && (
                        <span className="haru-meta-chip">#{task.sectionTitle}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="haru-stat-empty">No completed tasks yet</div>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <div className="haru-radar-filters">
            <button
              type="button"
              className={`haru-filter-pill ${filterMode === 'incomplete' ? 'active' : ''}`}
              onClick={() => setFilterMode('incomplete')}
            >
              Incomplete ({incompleteTasks.length})
            </button>
            <button
              type="button"
              className={`haru-filter-pill ${filterMode === 'running' ? 'active' : ''}`}
              onClick={() => setFilterMode('running')}
            >
              Running ({runningTasks.length})
            </button>
            <button
              type="button"
              className={`haru-filter-pill ${filterMode === 'completed' ? 'active' : ''}`}
              onClick={() => setFilterMode('completed')}
            >
              Completed ({completedTasks.length})
            </button>
            <button
              type="button"
              className={`haru-filter-pill ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              All ({allTasks.length})
            </button>

            {allPeople.map(([person, count]) => (
              <button
                key={person}
                type="button"
                className={`haru-filter-pill ${selectedPerson === person ? 'active' : ''}`}
                onClick={() =>
                  setSelectedPerson((prev) => (prev === person ? null : person))
                }
              >
                @{person} ({count})
              </button>
            ))}

            {allTags.map(([tag, count]) => (
              <button
                key={tag}
                type="button"
                className={`haru-filter-pill ${selectedTag === tag ? 'active' : ''}`}
                onClick={() => setSelectedTag((prev) => (prev === tag ? null : tag))}
              >
                #{tag} ({count})
              </button>
            ))}
          </div>

          {backlogIncompleteCount > 0 && onMoveAllUnfinishedToToday && (
            <button
              type="button"
              className="haru-btn"
              onClick={onMoveAllUnfinishedToToday}
              title="Move unfinished backlog tasks into # Today"
            >
              Move {backlogIncompleteCount} Backlog → # Today
            </button>
          )}
        </div>

        {/* Task List */}
        <div className="haru-radar-list">
          {filteredTasks.length === 0 ? (
            <div
              className="haru-doc-card"
              style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--haru-muted)' }}
            >
              No tasks match the current Radar filter.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const cleanTitle = task.content.replace(/^\[[ xX]?\]\s*/, '');
              const isRunning = task.session?.status === 'running';

              return (
                <div
                  key={task.id}
                  className={`haru-radar-item ${isRunning ? 'is-running' : ''}`}
                >
                  <div className="haru-radar-item-main">
                    <button
                      type="button"
                      className={`haru-checkbox ${task.checked ? 'checked' : ''}`}
                      style={{ marginTop: 2 }}
                      onClick={() => onToggleTask(task.id)}
                      title={task.checked ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {task.checked ? '✓' : ''}
                    </button>

                    <div className="haru-radar-item-body">
                      <div className={`haru-radar-item-title ${task.checked ? 'checked' : ''}`}>
                        {cleanTitle || '(Untitled task)'}
                      </div>
                      <div className="haru-radar-item-meta">
                        {task.sectionTitle && (
                          <span className="haru-meta-chip"># {task.sectionTitle}</span>
                        )}
                        {task.people.map((p) => (
                          <span key={p} className="haru-meta-chip">
                            @{p}
                          </span>
                        ))}
                        {task.tags.map((tag) => (
                          <span key={tag} className="haru-meta-chip">
                            #{tag}
                          </span>
                        ))}
                        {task.session?.slotKey && (
                          <span className="haru-meta-chip">
                            Session: {task.session.slotKey}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <TaskControlBar
                    block={task}
                    agents={agents}
                    models={models}
                    onChangeAgent={onChangeAgent}
                    onChangeModel={onChangeModel}
                    onRunSession={onRunSession}
                    onGoToSession={onGoToSession}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
