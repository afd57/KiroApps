import React, { useState, useRef, useEffect } from 'react';
import {
  HaruDocument,
  HaruBlock,
  KiroAgentOption,
  KiroModelOption,
} from '../types/haru';
import { TaskControlBar } from './TaskControlBar';
import {
  cleanTaskBody,
  updateTaskLineText,
  renderInlineMarkdown,
  renderFullMarkdown,
  createTaskLine,
  indentTaskLine,
  outdentTaskLine,
} from '../utils/markdownHelpers';

interface RichWorkspaceEditorProps {
  doc: HaruDocument;
  agents: KiroAgentOption[];
  models: KiroModelOption[];
  onToggleTask: (blockId: string) => void;
  onUpdateBlockLine: (blockId: string, newLine: string) => void;
  onInsertLineAfter: (blockId: string, lineToInsert: string) => void;
  onDeleteBlockLine: (blockId: string) => void;
  onChangeAgent: (blockId: string, agent: string) => void;
  onChangeModel: (blockId: string, model: string) => void;
  onRunSession: (block: HaruBlock) => void;
  onGoToSession: (block: HaruBlock) => void;
  onAddSection?: (afterBlockId?: string, title?: string) => void;
  onAddTask?: (afterBlockId?: string, isSubtask?: boolean) => void;
}

export const RichWorkspaceEditor: React.FC<RichWorkspaceEditorProps> = ({
  doc,
  agents,
  models,
  onToggleTask,
  onUpdateBlockLine,
  onInsertLineAfter,
  onDeleteBlockLine,
  onChangeAgent,
  onChangeModel,
  onRunSession,
  onGoToSession,
  onAddSection,
  onAddTask,
}) => {
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (editingBlockId && inputRefs.current[editingBlockId]) {
      inputRefs.current[editingBlockId]?.focus();
    }
  }, [editingBlockId]);

  // Handler to add a new section
  const handleCreateSection = (afterBlockId?: string) => {
    if (onAddSection) {
      onAddSection(afterBlockId, 'New Section');
      return;
    }
    const sectionLine = '\n# New Section\n- [ ] ';
    if (afterBlockId) {
      onInsertLineAfter(afterBlockId, sectionLine);
    } else {
      const last = doc.blocks[doc.blocks.length - 1];
      if (last) {
        onInsertLineAfter(last.id, sectionLine);
      }
    }
  };

  // Handler to add a task in a section or after a block
  const handleCreateTask = (afterBlockId?: string, isSubtask = false) => {
    if (onAddTask) {
      onAddTask(afterBlockId, isSubtask);
      return;
    }
    const line = createTaskLine('', isSubtask);
    if (afterBlockId) {
      onInsertLineAfter(afterBlockId, line);
    } else {
      const last = doc.blocks[doc.blocks.length - 1];
      if (last) {
        onInsertLineAfter(last.id, line);
      }
    }
  };

  // Handler to add a subtask right under a parent task
  const handleAddSubtaskToParent = (parentBlock: HaruBlock) => {
    // Find the insertion target: after the last existing subtask of this parent, or after parent
    let targetBlockId = parentBlock.id;
    if (parentBlock.subtaskIds && parentBlock.subtaskIds.length > 0) {
      targetBlockId = parentBlock.subtaskIds[parentBlock.subtaskIds.length - 1];
    }
    const subtaskLine = createTaskLine('', true);
    onInsertLineAfter(targetBlockId, subtaskLine);
  };

  // Build a lookup map of subtasks by parent ID
  const subtasksByParent = new Map<string, HaruBlock[]>();
  for (const b of doc.blocks) {
    if (b.type === 'task' && b.isSubtask && b.parentId) {
      const list = subtasksByParent.get(b.parentId) || [];
      list.push(b);
      subtasksByParent.set(b.parentId, list);
    }
  }

  // Set of IDs that are subtasks so we don't render them twice in the top-level list
  const renderedSubtaskIds = new Set<string>();
  for (const b of doc.blocks) {
    if (b.type === 'task' && b.isSubtask && b.parentId) {
      renderedSubtaskIds.add(b.id);
    }
  }

  return (
    <div className="haru-doc-card haru-rich-doc">
      {/* Quick View Controls Bar */}
      <div className="haru-rich-toolbar">
        <div className="haru-rich-toolbar-left">
          <button
            type="button"
            className="haru-btn haru-btn-sm"
            onClick={() => handleCreateSection()}
            title="Add a new section heading"
          >
            + Add Section
          </button>
          <button
            type="button"
            className="haru-btn haru-btn-sm"
            onClick={() => handleCreateTask(undefined, false)}
            title="Add a top-level parent task"
          >
            + Add Task
          </button>
        </div>

        <div className="haru-rich-toolbar-right">
          <button
            type="button"
            className={`haru-btn haru-btn-sm ${previewMode ? 'haru-btn-active' : ''}`}
            onClick={() => setPreviewMode((v) => !v)}
            title="Toggle between live inline edit and clean markdown preview"
          >
            {previewMode ? '✏ Edit View' : '👁 Preview Markdown'}
          </button>
        </div>
      </div>

      {/* Main Blocks List */}
      <div className="haru-blocks-container">
        {doc.blocks.map((block, idx) => {
          // If this block is a subtask belonging to a parent, it is rendered inside its parent's card
          if (renderedSubtaskIds.has(block.id)) {
            return null;
          }

          // 1. HEADER BLOCK (# Section)
          if (block.type === 'header') {
            const hashes = '#'.repeat(block.headerLevel || 1);
            const cleanHeader = block.content.replace(/^#{1,3}\s*/, '');
            const isEditing = editingBlockId === block.id;

            return (
              <div key={block.id} className="haru-section-wrap">
                <div className="haru-block-header">
                  <span className="haru-header-hash">{hashes}</span>

                  {isEditing || !previewMode ? (
                    <input
                      ref={(el) => {
                        inputRefs.current[block.id] = el;
                      }}
                      className="haru-header-input"
                      value={cleanHeader}
                      onChange={(e) =>
                        onUpdateBlockLine(block.id, `${hashes} ${e.target.value}`)
                      }
                      onFocus={() => setEditingBlockId(block.id)}
                      onBlur={() => setEditingBlockId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          onInsertLineAfter(block.id, createTaskLine(''));
                        } else if (e.key === 'Backspace' && cleanHeader === '' && doc.blocks.length > 1) {
                          e.preventDefault();
                          onDeleteBlockLine(block.id);
                        }
                      }}
                      placeholder="Section title (e.g. Sprint Goals, Today)..."
                    />
                  ) : (
                    <h2
                      className="haru-header-rendered"
                      onClick={() => setEditingBlockId(block.id)}
                      title="Click to edit section title"
                      dangerouslySetInnerHTML={{
                        __html: renderInlineMarkdown(cleanHeader) || 'Untitled Section',
                      }}
                    />
                  )}

                  {/* Section action buttons */}
                  <div className="haru-section-actions">
                    <button
                      type="button"
                      className="haru-btn-ghost"
                      onClick={() => onInsertLineAfter(block.id, createTaskLine(''))}
                      title="Add task in this section"
                    >
                      + Task
                    </button>
                    <button
                      type="button"
                      className="haru-btn-ghost"
                      onClick={() => handleCreateSection(block.id)}
                      title="Insert new section below"
                    >
                      + Section
                    </button>
                    <button
                      type="button"
                      className="haru-btn-icon"
                      onClick={() => onDeleteBlockLine(block.id)}
                      title="Delete section header"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          // 2. TASK BLOCK (Parent Task + Nested Subtasks)
          if (block.type === 'task') {
            const taskBody = cleanTaskBody(block.content);
            const isRunning = block.session?.status === 'running';
            const isEditing = editingBlockId === block.id;
            const subtasks = subtasksByParent.get(block.id) || [];
            const completedSubtasksCount = subtasks.filter((s) => s.checked).length;
            const totalSubtasksCount = subtasks.length;

            return (
              <div
                key={block.id}
                className={`haru-parent-task-card ${isRunning ? 'is-running' : ''} ${
                  block.checked ? 'is-completed' : ''
                }`}
              >
                {/* Parent Task Row */}
                <div className="haru-task-row haru-parent-row">
                  <div className="haru-task-left">
                    <button
                      type="button"
                      className={`haru-checkbox ${block.checked ? 'checked' : ''}`}
                      onClick={() => onToggleTask(block.id)}
                      title={block.checked ? 'Mark incomplete' : 'Mark complete'}
                      aria-label="Toggle task completion"
                    >
                      {block.checked ? '✓' : ''}
                    </button>

                    {isEditing || !previewMode ? (
                      <input
                        ref={(el) => {
                          inputRefs.current[block.id] = el;
                        }}
                        className={`haru-task-input ${block.checked ? 'checked' : ''}`}
                        value={taskBody}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          onUpdateBlockLine(block.id, updateTaskLineText(block.content, nextVal));
                        }}
                        onFocus={() => setEditingBlockId(block.id)}
                        onBlur={() => setEditingBlockId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (subtasks.length > 0) {
                              // If it has subtasks, enter adds another subtask
                              handleAddSubtaskToParent(block);
                            } else {
                              // Otherwise adds next parent task
                              onInsertLineAfter(block.id, createTaskLine(''));
                            }
                          } else if (e.key === 'Tab') {
                            e.preventDefault();
                            // Indent to become subtask of preceding task
                            onUpdateBlockLine(block.id, indentTaskLine(block.content));
                          } else if (e.key === 'Backspace' && taskBody === '') {
                            e.preventDefault();
                            onDeleteBlockLine(block.id);
                          }
                        }}
                        placeholder="Write a task (e.g. Deploy staging build, Review PR)..."
                      />
                    ) : (
                      <div
                        className={`haru-task-rendered ${block.checked ? 'checked' : ''}`}
                        onClick={() => setEditingBlockId(block.id)}
                        title="Click to edit task"
                        dangerouslySetInnerHTML={{
                          __html: renderInlineMarkdown(taskBody) || 'Empty task',
                        }}
                      />
                    )}

                    {/* Subtask count badge */}
                    {totalSubtasksCount > 0 && (
                      <span
                        className="haru-subtask-badge"
                        title={`${completedSubtasksCount} of ${totalSubtasksCount} subtasks done`}
                      >
                        {completedSubtasksCount}/{totalSubtasksCount} subtasks
                      </span>
                    )}

                    {/* Quick + Subtask button */}
                    <button
                      type="button"
                      className="haru-btn-add-subtask"
                      onClick={() => handleAddSubtaskToParent(block)}
                      title="Add a subtask to this parent task"
                    >
                      + Subtask
                    </button>
                  </div>

                  {/* Task Control Bar with Run Button */}
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

                    <button
                      type="button"
                      className="haru-btn-icon"
                      onClick={() => onDeleteBlockLine(block.id)}
                      title="Delete task"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Nested Subtasks List */}
                {subtasks.length > 0 && (
                  <div className="haru-subtasks-tree">
                    {subtasks.map((subtask) => {
                      const subtaskBody = cleanTaskBody(subtask.content);
                      const isSubEditing = editingBlockId === subtask.id;

                      return (
                        <div
                          key={subtask.id}
                          className={`haru-subtask-row ${subtask.checked ? 'is-completed' : ''}`}
                        >
                          {/* Tree connector branch */}
                          <div className="haru-tree-line" aria-hidden="true">
                            <span className="haru-tree-corner">└─</span>
                          </div>

                          <div className="haru-subtask-main">
                            <button
                              type="button"
                              className={`haru-checkbox haru-checkbox-sm ${
                                subtask.checked ? 'checked' : ''
                              }`}
                              onClick={() => onToggleTask(subtask.id)}
                              title={subtask.checked ? 'Mark incomplete' : 'Mark complete'}
                            >
                              {subtask.checked ? '✓' : ''}
                            </button>

                            {isSubEditing || !previewMode ? (
                              <input
                                ref={(el) => {
                                  inputRefs.current[subtask.id] = el;
                                }}
                                className={`haru-subtask-input ${
                                  subtask.checked ? 'checked' : ''
                                }`}
                                value={subtaskBody}
                                onChange={(e) => {
                                  onUpdateBlockLine(
                                    subtask.id,
                                    updateTaskLineText(subtask.content, e.target.value)
                                  );
                                }}
                                onFocus={() => setEditingBlockId(subtask.id)}
                                onBlur={() => setEditingBlockId(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onInsertLineAfter(subtask.id, createTaskLine('', true));
                                  } else if (e.key === 'Tab' && e.shiftKey) {
                                    e.preventDefault();
                                    // Shift+Tab outdents to parent task
                                    onUpdateBlockLine(subtask.id, outdentTaskLine(subtask.content));
                                  } else if (e.key === 'Backspace' && subtaskBody === '') {
                                    e.preventDefault();
                                    onDeleteBlockLine(subtask.id);
                                  }
                                }}
                                placeholder="Write subtask..."
                              />
                            ) : (
                              <div
                                className={`haru-subtask-rendered ${
                                  subtask.checked ? 'checked' : ''
                                }`}
                                onClick={() => setEditingBlockId(subtask.id)}
                                title="Click to edit subtask"
                                dangerouslySetInnerHTML={{
                                  __html: renderInlineMarkdown(subtaskBody) || 'Empty subtask',
                                }}
                              />
                            )}

                            <button
                              type="button"
                              className="haru-btn-icon haru-btn-icon-sm"
                              onClick={() => onDeleteBlockLine(subtask.id)}
                              title="Delete subtask"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Subtle link to append another subtask */}
                    <div className="haru-add-subtask-row">
                      <span className="haru-tree-corner" aria-hidden="true">
                        └─
                      </span>
                      <button
                        type="button"
                        className="haru-btn-subtask-inline"
                        onClick={() => handleAddSubtaskToParent(block)}
                      >
                        + Add subtask
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // 3. NOTE BLOCK
          const isNoteEditing = editingBlockId === block.id;
          return (
            <div key={block.id} className="haru-block-note">
              {isNoteEditing || !previewMode ? (
                <input
                  ref={(el) => {
                    inputRefs.current[block.id] = el;
                  }}
                  className="haru-note-input"
                  value={block.content}
                  onChange={(e) => onUpdateBlockLine(block.id, e.target.value)}
                  onFocus={() => setEditingBlockId(block.id)}
                  onBlur={() => setEditingBlockId(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onInsertLineAfter(block.id, '');
                    } else if (
                      e.key === 'Backspace' &&
                      block.content === '' &&
                      doc.blocks.length > 1
                    ) {
                      e.preventDefault();
                      onDeleteBlockLine(block.id);
                    }
                  }}
                  placeholder="Write a note, or type - for bullet, [] for a task..."
                />
              ) : (
                <div
                  className="haru-note-rendered"
                  onClick={() => setEditingBlockId(block.id)}
                  title="Click to edit note"
                  dangerouslySetInnerHTML={{
                    __html:
                      renderFullMarkdown(block.content) ||
                      '<span class="haru-placeholder-note">Empty note...</span>',
                  }}
                />
              )}

              <button
                type="button"
                className="haru-btn-icon"
                onClick={() => onDeleteBlockLine(block.id)}
                title="Delete note"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom Quick-Action Inserters */}
      <div className="haru-bottom-actions">
        <button
          type="button"
          className="haru-btn"
          onClick={() => handleCreateTask(undefined, false)}
        >
          + Add Task
        </button>
        <button
          type="button"
          className="haru-btn"
          onClick={() => handleCreateSection()}
        >
          + Add Section
        </button>
      </div>
    </div>
  );
};
