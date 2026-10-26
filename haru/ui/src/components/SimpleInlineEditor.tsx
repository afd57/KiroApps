import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  HaruDocument,
  HaruBlock,
  KiroAgentOption,
  KiroModelOption,
} from '../types/haru';
import { TaskControlBar } from './TaskControlBar';
import {
  renderInlineMarkdown,
  cleanTaskBody,
  updateTaskLineText,
} from '../utils/markdownHelpers';

interface SimpleInlineEditorProps {
  doc: HaruDocument;
  agents: KiroAgentOption[];
  models: KiroModelOption[];
  onChangeRawMarkdown: (nextMarkdown: string) => void;
  onToggleTask: (blockId: string) => void;
  onChangeAgent: (blockId: string, agent: string) => void;
  onChangeModel: (blockId: string, model: string) => void;
  onRunSession: (block: HaruBlock) => void;
  onGoToSession: (block: HaruBlock) => void;
}

type ViewMode = 'split' | 'interactive' | 'editor';

export const SimpleInlineEditor: React.FC<SimpleInlineEditorProps> = ({
  doc,
  agents,
  models,
  onChangeRawMarkdown,
  onToggleTask,
  onChangeAgent,
  onChangeModel,
  onRunSession,
  onGoToSession,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Group subtasks by parent block ID
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

  // Set of child subtask IDs to avoid rendering them twice in the top-level list
  const childSubtaskIds = useMemo(() => {
    const set = new Set<string>();
    for (const b of doc.blocks) {
      if (b.type === 'task' && b.isSubtask && b.parentId) {
        set.add(b.id);
      }
    }
    return set;
  }, [doc.blocks]);

  // Insert markdown snippet into the editor textarea
  const handleInsertSnippet = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      const next = (doc.rawMarkdown || '').trimEnd() + '\n' + snippet;
      onChangeRawMarkdown(next);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = doc.rawMarkdown || '';
    const before = current.substring(0, start);
    const after = current.substring(end);
    const next = `${before}${snippet}${after}`;
    onChangeRawMarkdown(next);

    setTimeout(() => {
      textarea.focus();
      const nextPos = start + snippet.length;
      textarea.setSelectionRange(nextPos, nextPos);
    }, 0);
  };

  // Update text of a block line in raw markdown
  const handleUpdateBlockContent = useCallback(
    (blockId: string, newText: string) => {
      const targetBlock = doc.blocks.find((b) => b.id === blockId);
      if (!targetBlock) return;

      const lines = (doc.rawMarkdown || '').split('\n');
      const cleanTarget = cleanTaskBody(targetBlock.content).toLowerCase();

      const nextLines = lines.map((line) => {
        if (cleanTaskBody(line).toLowerCase() === cleanTarget) {
          if (targetBlock.type === 'header') {
            const hashes = '#'.repeat(targetBlock.headerLevel || 1);
            return `${hashes} ${newText}`;
          }
          return updateTaskLineText(line, newText);
        }
        return line;
      });

      onChangeRawMarkdown(nextLines.join('\n'));
      setEditingBlockId(null);
    },
    [doc.blocks, doc.rawMarkdown, onChangeRawMarkdown]
  );

  return (
    <div className="haru-simple-editor-container">
      {/* Top Toolbar */}
      <div className="haru-simple-toolbar">
        {/* Quick Inserters */}
        <div className="haru-toolbar-left">
          <button
            type="button"
            className="haru-btn"
            onClick={() => handleInsertSnippet('\n[ ] ')}
            title="Add task checklist item"
          >
            + Task
          </button>
          <button
            type="button"
            className="haru-btn"
            onClick={() => handleInsertSnippet('\n1. ')}
            title="Add numbered task list item"
          >
            + 1. Numbered Task
          </button>
          <button
            type="button"
            className="haru-btn"
            onClick={() => handleInsertSnippet('\n\n# New Section\n')}
            title="Add section heading"
          >
            + Section
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="haru-toolbar-right">
          <div className="haru-view-segment">
            <button
              type="button"
              className={`haru-segment-btn ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
              title="Side-by-side: Markdown Editor + Live Task Runner"
            >
              Split View
            </button>
            <button
              type="button"
              className={`haru-segment-btn ${viewMode === 'interactive' ? 'active' : ''}`}
              onClick={() => setViewMode('interactive')}
              title="Full width Task Runner with Run buttons & Agent selector"
            >
              Task Runner
            </button>
            <button
              type="button"
              className={`haru-segment-btn ${viewMode === 'editor' ? 'active' : ''}`}
              onClick={() => setViewMode('editor')}
              title="Full width Markdown Editor"
            >
              Markdown
            </button>
          </div>
        </div>
      </div>

      {/* Editor Body */}
      <div className={`haru-simple-workspace-body mode-${viewMode}`}>
        {/* Left Pane: Pure Markdown Source */}
        {(viewMode === 'split' || viewMode === 'editor') && (
          <div className="haru-simple-editor-pane">
            <div className="haru-pane-header">
              <span className="haru-pane-title">Markdown Editor</span>
              <span className="haru-pane-hint">
                Write # Sections, 1. tasks, [] tasks, or - [ ] tasks
              </span>
            </div>
            <textarea
              ref={textareaRef}
              className="haru-simple-textarea"
              value={doc.rawMarkdown}
              onChange={(e) => onChangeRawMarkdown(e.target.value)}
              placeholder="# Today&#10;1. Onboarding @aziz&#10;2. Bug fix @aziz&#10;[ ] tasks 2"
              spellCheck={false}
            />
          </div>
        )}

        {/* Right Pane: Live Task Runner with Run Buttons, Checkboxes, and Full TaskControlBar */}
        {(viewMode === 'split' || viewMode === 'interactive') && (
          <div className="haru-simple-preview-pane">
            <div className="haru-pane-header">
              <span className="haru-pane-title">Task Runner & Live View</span>
              <span className="haru-pane-hint">
                Pick Agent & Model • Click ▶ Run to execute with subtasks
              </span>
            </div>

            <div className="haru-interactive-stream-surface">
              {doc.blocks.map((block) => {
                // If it's a child subtask, it's rendered inside its parent's group
                if (childSubtaskIds.has(block.id)) {
                  return null;
                }

                // 1. HEADER BLOCK (# Section)
                if (block.type === 'header') {
                  const hashes = '#'.repeat(block.headerLevel || 1);
                  const cleanHeader = block.content.replace(/^#{1,3}\s*/, '');
                  const isEditing = editingBlockId === block.id;

                  return (
                    <div key={block.id} className="haru-simple-heading-wrap">
                      <div className="haru-simple-heading">
                        <span className="haru-heading-anchor">{hashes}</span>
                        {isEditing ? (
                          <input
                            autoFocus
                            className="haru-inline-edit-input"
                            defaultValue={cleanHeader}
                            onBlur={(e) => handleUpdateBlockContent(block.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateBlockContent(block.id, e.currentTarget.value);
                              } else if (e.key === 'Escape') {
                                setEditingBlockId(null);
                              }
                            }}
                          />
                        ) : (
                          <span
                            className="haru-heading-text"
                            onClick={() => setEditingBlockId(block.id)}
                            title="Click to edit section title"
                          >
                            {cleanHeader}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                // 2. TASK BLOCK (Parent Task + Subtasks + TaskControlBar)
                if (block.type === 'task') {
                  const cleanBody = cleanTaskBody(block.content);
                  const isRunning = block.session?.status === 'running';
                  const isEditing = editingBlockId === block.id;
                  const subtasks = subtasksByParent.get(block.id) || [];

                  // Detect if line had number prefix like "1. ", "2. "
                  const numMatch = block.content.match(/^\s*(\d+\.)\s*/);
                  const numberPrefix = numMatch ? numMatch[1] : null;

                  return (
                    <div
                      key={block.id}
                      className={`haru-simple-task-card ${isRunning ? 'is-running' : ''} ${block.checked ? 'is-completed' : ''
                        }`}
                    >
                      <div className="haru-task-row">
                        <div className="haru-task-left">
                          {/* Interactive Checkbox */}
                          <button
                            type="button"
                            className={`haru-simple-checkbox ${block.checked ? 'checked' : ''}`}
                            onClick={() => onToggleTask(block.id)}
                            title={block.checked ? 'Mark incomplete' : 'Mark complete'}
                          >
                            {block.checked ? '✓' : ''}
                          </button>

                          {/* Optional Number prefix: 1., 2. */}
                          {numberPrefix && (
                            <span className="haru-number-prefix">{numberPrefix}</span>
                          )}

                          {/* Task Text with @mentions and #tags highlighted */}
                          {isEditing ? (
                            <input
                              autoFocus
                              className="haru-inline-edit-input"
                              defaultValue={cleanBody}
                              onBlur={(e) => handleUpdateBlockContent(block.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateBlockContent(block.id, e.currentTarget.value);
                                } else if (e.key === 'Escape') {
                                  setEditingBlockId(null);
                                }
                              }}
                            />
                          ) : (
                            <div
                              className={`haru-task-title-text ${block.checked ? 'is-checked-text' : ''}`}
                              onClick={() => setEditingBlockId(block.id)}
                              title="Click to edit task title"
                              dangerouslySetInnerHTML={{
                                __html: renderInlineMarkdown(cleanBody) || 'Empty task',
                              }}
                            />
                          )}

                          {/* Subtasks Count Badge */}
                          {subtasks.length > 0 && (
                            <span
                              className="haru-simple-subtask-count"
                              title={`${subtasks.length} subtasks`}
                            >
                              {subtasks.length} subtasks
                            </span>
                          )}
                        </div>

                        {/* TaskControlBar: Agent Selector, Model Selector, Status Pill, Go to Session, Run Button */}
                        <div className="haru-task-right">
                          <TaskControlBar
                            block={block}
                            agents={agents}
                            models={models}
                            onChangeAgent={onChangeAgent}
                            onChangeModel={onChangeModel}
                            onRunSession={onRunSession}
                            onGoToSession={onGoToSession}
                          />
                        </div>
                      </div>

                      {/* Nested Subtasks List */}
                      {subtasks.length > 0 && (
                        <div className="haru-subtasks-tree">
                          {subtasks.map((subtask) => {
                            const subClean = cleanTaskBody(subtask.content);
                            const isSubEditing = editingBlockId === subtask.id;

                            return (
                              <div
                                key={subtask.id}
                                className={`haru-subtask-row ${subtask.checked ? 'is-completed' : ''}`}
                              >
                                <span className="haru-tree-corner" aria-hidden="true">
                                  └─
                                </span>

                                <button
                                  type="button"
                                  className={`haru-simple-checkbox haru-checkbox-sm ${subtask.checked ? 'checked' : ''
                                    }`}
                                  onClick={() => onToggleTask(subtask.id)}
                                  title={subtask.checked ? 'Mark incomplete' : 'Mark complete'}
                                >
                                  {subtask.checked ? '✓' : ''}
                                </button>

                                {isSubEditing ? (
                                  <input
                                    autoFocus
                                    className="haru-inline-edit-input"
                                    defaultValue={subClean}
                                    onBlur={(e) =>
                                      handleUpdateBlockContent(subtask.id, e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleUpdateBlockContent(subtask.id, e.currentTarget.value);
                                      } else if (e.key === 'Escape') {
                                        setEditingBlockId(null);
                                      }
                                    }}
                                  />
                                ) : (
                                  <div
                                    className={`haru-subtask-title-text ${subtask.checked ? 'is-checked-text' : ''
                                      }`}
                                    onClick={() => setEditingBlockId(subtask.id)}
                                    title="Click to edit subtask"
                                    dangerouslySetInnerHTML={{
                                      __html: renderInlineMarkdown(subClean) || 'Empty subtask',
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // 3. NOTE BLOCK
                if (block.content.trim()) {
                  const isEditing = editingBlockId === block.id;
                  return (
                    <div key={block.id} className="haru-simple-note-row">
                      {isEditing ? (
                        <input
                          autoFocus
                          className="haru-inline-edit-input"
                          defaultValue={block.content}
                          onBlur={(e) => handleUpdateBlockContent(block.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateBlockContent(block.id, e.currentTarget.value);
                            } else if (e.key === 'Escape') {
                              setEditingBlockId(null);
                            }
                          }}
                        />
                      ) : (
                        <div
                          className="haru-note-content"
                          onClick={() => setEditingBlockId(block.id)}
                          title="Click to edit note"
                          dangerouslySetInnerHTML={{
                            __html: renderInlineMarkdown(block.content),
                          }}
                        />
                      )}
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
