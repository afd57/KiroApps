import React, { useState } from 'react';
import {
  HaruDocument,
  HaruBlock,
  KiroAgentOption,
  KiroModelOption,
} from '../types/haru';
import { RichWorkspaceEditor } from './RichWorkspaceEditor';

interface InlineWorkspaceEditorProps {
  doc: HaruDocument;
  agents: KiroAgentOption[];
  models: KiroModelOption[];
  onChangeRawMarkdown: (nextMarkdown: string) => void;
  onToggleTask: (blockId: string) => void;
  onUpdateBlockLine: (blockId: string, newLine: string) => void;
  onInsertLineAfter: (blockId: string, lineToInsert: string) => void;
  onDeleteBlockLine: (blockId: string) => void;
  onChangeAgent: (blockId: string, agent: string) => void;
  onChangeModel: (blockId: string, model: string) => void;
  onRunSession: (block: HaruBlock) => void;
  onGoToSession: (block: HaruBlock) => void;
}

export const InlineWorkspaceEditor: React.FC<InlineWorkspaceEditorProps> = ({
  doc,
  agents,
  models,
  onChangeRawMarkdown,
  onToggleTask,
  onUpdateBlockLine,
  onInsertLineAfter,
  onDeleteBlockLine,
  onChangeAgent,
  onChangeModel,
  onRunSession,
  onGoToSession,
}) => {
  const [showRaw, setShowRaw] = useState(false);

  const appendBlock = (lineText: string) => {
    const next = doc.rawMarkdown.trimEnd() + '\n' + lineText;
    onChangeRawMarkdown(next);
  };

  return (
    <div className="haru-workspace-scroll">
      <div className="haru-workspace-container">
        {/* Clean Quick-Action Bar */}
        <div className="haru-editor-toolbar">
          <div className="haru-toolbar-group">
            <button
              type="button"
              className="haru-btn"
              onClick={() => appendBlock('- [ ] ')}
              title="Add a new task"
            >
              + New Task
            </button>
            <button
              type="button"
              className="haru-btn"
              onClick={() => appendBlock('\n# New Section\n- [ ] ')}
              title="Add a new section header"
            >
              + Section
            </button>
          </div>

          <div className="haru-toolbar-group">
            <button
              type="button"
              className={`haru-btn ${showRaw ? 'haru-btn-active' : ''}`}
              onClick={() => setShowRaw((v) => !v)}
            >
              {showRaw ? 'Rich View' : 'Edit Raw Markdown'}
            </button>
          </div>
        </div>

        {showRaw ? (
          <div className="haru-doc-card">
            <textarea
              className="haru-raw-textarea"
              value={doc.rawMarkdown}
              onChange={(e) => onChangeRawMarkdown(e.target.value)}
              placeholder="# Today&#10;- [ ] say hello Aziz&#10;  - [ ] subtask"
              spellCheck={false}
            />
          </div>
        ) : (
          <RichWorkspaceEditor
            doc={doc}
            agents={agents}
            models={models}
            onToggleTask={onToggleTask}
            onUpdateBlockLine={onUpdateBlockLine}
            onInsertLineAfter={onInsertLineAfter}
            onDeleteBlockLine={onDeleteBlockLine}
            onChangeAgent={onChangeAgent}
            onChangeModel={onChangeModel}
            onRunSession={onRunSession}
            onGoToSession={onGoToSession}
          />
        )}
      </div>
    </div>
  );
};
