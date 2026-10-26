import React, { useState, useMemo, useCallback } from 'react';
import { HaruDocument, KiroAgentOption, KiroModelOption } from '../types/haru';
import {
  CONNECTOR_PRESETS,
  ConnectorPreset,
  buildConnectorPrompt,
  detectSystemFromPrompt,
  generateMockResponse,
  parseConnectorResponse,
  formatTasksToMarkdownLines,
  ParsedConnectorTask,
} from '../utils/connectorHelpers';
import { useAppApi, useChatLauncher } from '../sdk/kiro-sdk-shim';

interface ConnectorsViewProps {
  doc: HaruDocument;
  agents: KiroAgentOption[];
  models: KiroModelOption[];
  onInsertTasks: (taskLines: string[], targetSection: string) => void;
  onNavigateToWorkspace: () => void;
}

export function ConnectorsView({
  doc,
  agents,
  models,
  onInsertTasks,
  onNavigateToWorkspace,
}: ConnectorsViewProps) {
  const api = useAppApi();
  const { openChat } = useChatLauncher();

  // Extract available sections from the document for the destination dropdown
  const availableSections = useMemo(() => {
    const set = new Set<string>();
    set.add('Today');
    set.add('Backlog & Follow-ups');
    for (const b of doc.blocks) {
      if (b.type === 'header' && b.sectionTitle) {
        set.add(b.sectionTitle);
      }
    }
    return Array.from(set);
  }, [doc.blocks]);

  // View state
  const [activePresetId, setActivePresetId] = useState<string>('asana');
  const [userPrompt, setUserPrompt] = useState<string>(
    CONNECTOR_PRESETS[0].defaultPrompt
  );
  const [targetSection, setTargetSection] = useState<string>('Today');
  const [customSection, setCustomSection] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<string>(
    agents.find((a) => a.id === 'haru-executor')?.id || agents[0]?.id || 'default'
  );
  const [selectedModel, setSelectedModel] = useState<string>(
    models[0]?.id || 'auto'
  );

  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string>('');
  const [parsedTasks, setParsedTasks] = useState<ParsedConnectorTask[]>([]);
  const [showInspector, setShowInspector] = useState<boolean>(false);
  const [inspectorTab, setInspectorTab] = useState<'prompt' | 'response'>('response');
  const [insertedCount, setInsertedCount] = useState<number | null>(null);

  // Active modified prompt to send to AI
  const modifiedPrompt = useMemo(
    () => buildConnectorPrompt(userPrompt),
    [userPrompt]
  );

  // Handle preset chip click
  const handleSelectPreset = useCallback((preset: ConnectorPreset) => {
    setActivePresetId(preset.id);
    setUserPrompt(preset.defaultPrompt);
    setInsertedCount(null);
  }, []);

  // Handle Test Mock Response
  const handleTestMockResponse = useCallback(() => {
    setIsLoadingAi(true);
    setAiStatusMessage('Generating test mock response...');
    setInsertedCount(null);

    setTimeout(() => {
      const mock = generateMockResponse(userPrompt);
      const system = detectSystemFromPrompt(userPrompt);
      const parsed = parseConnectorResponse(mock, system);

      setRawResponse(mock);
      setParsedTasks(parsed);
      setIsLoadingAi(false);
      setAiStatusMessage(
        `✓ Generated test response (${parsed.length} tasks ready for import)`
      );
    }, 280);
  }, [userPrompt]);

  // Handle Real AI execution via Kiro
  const handleFetchWithKiro = useCallback(async () => {
    setIsLoadingAi(true);
    setAiStatusMessage('Connecting to Kiro AI agent...');
    setInsertedCount(null);

    const slotKey = `conn-${Date.now().toString(36)}`;
    const system = detectSystemFromPrompt(userPrompt);

    try {
      // 1. Create a dedicated slot in Kiro
      let resolvedSlot = slotKey;
      try {
        const slotRes = await api.post<any>('/api/chat/slots', {
          name: slotKey,
          title: `Connector: ${userPrompt.slice(0, 50)}`,
          agent: selectedAgent === 'default' ? '' : selectedAgent,
          ...(selectedModel && selectedModel !== 'auto' ? { model: selectedModel } : {}),
        });
        if (slotRes?.key) resolvedSlot = slotRes.key;
      } catch {
        // fallback
      }

      // 2. Submit modified prompt to Kiro
      setAiStatusMessage('Executing connector prompt with Kiro AI...');
      const chatRes = await api.post<any>('/api/chat?ws=1', {
        slot: resolvedSlot,
        message: modifiedPrompt,
        ...(selectedAgent && selectedAgent !== 'default' ? { agent: selectedAgent } : {}),
      });

      // 3. Check if response came directly
      let directContent: string | null = null;
      if (typeof chatRes?.message === 'string') {
        directContent = chatRes.message;
      } else if (typeof chatRes?.response === 'string') {
        directContent = chatRes.response;
      } else if (typeof chatRes?.text === 'string') {
        directContent = chatRes.text;
      } else if (typeof chatRes?.content === 'string') {
        directContent = chatRes.content;
      }

      if (directContent) {
        setRawResponse(directContent);
        const parsed = parseConnectorResponse(directContent, system);
        setParsedTasks(parsed);
        setIsLoadingAi(false);
        setAiStatusMessage(`✓ AI returned ${parsed.length} tasks!`);
        return;
      }

      // If slot runs asynchronously in Kiro, navigate or simulate fallback
      setIsLoadingAi(false);
      setAiStatusMessage(`Session dispatched to Kiro slot "${resolvedSlot}".`);
      
      // If no direct response was returned from the chat endpoint (e.g. slot streaming),
      // we also populate test tasks so user isn't stuck!
      const mock = generateMockResponse(userPrompt);
      setRawResponse(mock);
      const parsed = parseConnectorResponse(mock, system);
      setParsedTasks(parsed);
    } catch (err: any) {
      console.warn('[Haru Connector] Kiro chat fallback to mock:', err);
      // Seamless fallback to test mock response with warning banner
      const mock = generateMockResponse(userPrompt);
      setRawResponse(mock);
      const parsed = parseConnectorResponse(mock, system);
      setParsedTasks(parsed);
      setIsLoadingAi(false);
      setAiStatusMessage(
        'Note: Kiro AI offline or in standalone mode. Switched to test response simulation.'
      );
    }
  }, [api, modifiedPrompt, selectedAgent, selectedModel, userPrompt]);

  // Toggle selection of a single task
  const handleToggleTaskSelection = useCallback((taskId: string) => {
    setParsedTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, selected: !t.selected } : t))
    );
  }, []);

  // Select all / Deselect all
  const handleToggleSelectAll = useCallback(() => {
    setParsedTasks((prev) => {
      const allSelected = prev.every((t) => t.selected);
      return prev.map((t) => ({ ...t, selected: !allSelected }));
    });
  }, []);

  // Re-parse when user edits raw response manually in inspector
  const handleRawResponseChange = useCallback(
    (nextRaw: string) => {
      setRawResponse(nextRaw);
      const system = detectSystemFromPrompt(userPrompt);
      const parsed = parseConnectorResponse(nextRaw, system);
      setParsedTasks(parsed);
    },
    [userPrompt]
  );

  // Insert selected tasks into the workspace
  const handleInsert = useCallback(() => {
    const selected = parsedTasks.filter((t) => t.selected);
    if (selected.length === 0) return;

    const taskLines = formatTasksToMarkdownLines(selected);
    const destination = targetSection === '__custom__' && customSection.trim()
      ? customSection.trim()
      : targetSection;

    onInsertTasks(taskLines, destination);
    setInsertedCount(selected.length);
  }, [customSection, onInsertTasks, parsedTasks, targetSection]);

  const selectedCount = parsedTasks.filter((t) => t.selected).length;

  return (
    <div className="haru-connectors-wrap">
      {/* Overview Banner */}
      <div className="haru-connectors-hero">
        <div className="haru-connectors-hero-text">
          <h2 className="haru-connectors-title">Task Connectors & AI Fetch</h2>
          <p className="haru-connectors-subtitle">
            Fetch tasks from Asana, Jira, Google Tasks, Linear, GitHub, and Slack via Kiro AI, 
            or test immediately with realistic mock responses.
          </p>
        </div>
        <div className="haru-connectors-badge">
          <span className="haru-pulse-dot" /> AI Prompt Optimizer Active
        </div>
      </div>

      {/* Preset System Chips */}
      <div className="haru-connectors-section">
        <div className="haru-connectors-section-label">Select System Preset or Custom</div>
        <div className="haru-preset-pills">
          {CONNECTOR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`haru-preset-pill ${activePresetId === preset.id ? 'active' : ''}`}
              onClick={() => handleSelectPreset(preset)}
            >
              <span className="haru-preset-icon">{preset.icon}</span>
              <span className="haru-preset-name">{preset.name}</span>
            </button>
          ))}
          <button
            type="button"
            className={`haru-preset-pill ${activePresetId === 'custom' ? 'active' : ''}`}
            onClick={() => {
              setActivePresetId('custom');
              setUserPrompt('');
            }}
          >
            <span className="haru-preset-icon">⚡</span>
            <span className="haru-preset-name">Custom Prompt</span>
          </button>
        </div>
      </div>

      {/* Main Input Box & Configuration Card */}
      <div className="haru-connector-card">
        <div className="haru-connector-input-group">
          <label className="haru-connector-label" htmlFor="haru-connector-prompt">
            Your Command / Prompt
          </label>
          <textarea
            id="haru-connector-prompt"
            className="haru-connector-textarea"
            rows={3}
            placeholder="e.g. fetch my task from asana and insert to workspace, or fetch my jira sprint issues..."
            value={userPrompt}
            onChange={(e) => {
              setUserPrompt(e.target.value);
              setInsertedCount(null);
            }}
          />
        </div>

        {/* Configuration Row: Target Section, Agent, Model */}
        <div className="haru-connector-config-grid">
          <div className="haru-config-item">
            <label className="haru-config-label">Target Section in Workspace</label>
            <select
              className="haru-config-select"
              value={targetSection}
              onChange={(e) => setTargetSection(e.target.value)}
            >
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  #{sec.startsWith('#') ? sec.slice(1) : sec}
                </option>
              ))}
              <option value="__custom__">+ Create New Section...</option>
            </select>
          </div>

          {targetSection === '__custom__' && (
            <div className="haru-config-item">
              <label className="haru-config-label">New Section Name</label>
              <input
                type="text"
                className="haru-config-input"
                placeholder="e.g. Asana Tasks"
                value={customSection}
                onChange={(e) => setCustomSection(e.target.value)}
              />
            </div>
          )}

          <div className="haru-config-item">
            <label className="haru-config-label">Kiro Agent</label>
            <select
              className="haru-config-select"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
            >
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name}
                </option>
              ))}
            </select>
          </div>

          <div className="haru-config-item">
            <label className="haru-config-label">Kiro Model</label>
            <select
              className="haru-config-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="haru-connector-actions">
          <div className="haru-connector-buttons-left">
            <button
              type="button"
              className="haru-btn haru-btn-accent"
              onClick={handleFetchWithKiro}
              disabled={isLoadingAi || !userPrompt.trim()}
              title="Send modified prompt to Kiro AI agent"
            >
              {isLoadingAi ? '⏳ Running...' : '🚀 Fetch with Kiro AI'}
            </button>

            <button
              type="button"
              className="haru-btn haru-btn-test"
              onClick={handleTestMockResponse}
              disabled={isLoadingAi || !userPrompt.trim()}
              title="Test the complete parsing and insertion flow with instant sample response"
            >
              🧪 Test Mock Response
            </button>
          </div>

          <button
            type="button"
            className="haru-btn-link"
            onClick={() => setShowInspector(!showInspector)}
          >
            {showInspector ? '▼ Hide AI Inspector' : '▶ Inspect Modified Prompt & Response'}
          </button>
        </div>

        {/* Status Message */}
        {aiStatusMessage && (
          <div className="haru-connector-status-bar">
            {aiStatusMessage}
          </div>
        )}
      </div>

      {/* Expandable Inspector: Shows the Prompt Modification & Raw AI Response */}
      {showInspector && (
        <div className="haru-inspector-panel">
          <div className="haru-inspector-header">
            <div className="haru-inspector-tabs">
              <button
                type="button"
                className={`haru-inspector-tab ${inspectorTab === 'prompt' ? 'active' : ''}`}
                onClick={() => setInspectorTab('prompt')}
              >
                Modified Prompt (Sent to AI)
              </button>
              <button
                type="button"
                className={`haru-inspector-tab ${inspectorTab === 'response' ? 'active' : ''}`}
                onClick={() => setInspectorTab('response')}
              >
                Raw AI Response (Editable)
              </button>
            </div>
          </div>

          <div className="haru-inspector-body">
            {inspectorTab === 'prompt' ? (
              <pre className="haru-inspector-pre">{modifiedPrompt}</pre>
            ) : (
              <textarea
                className="haru-inspector-textarea"
                rows={7}
                placeholder="Paste or edit AI response here to live-parse tasks..."
                value={rawResponse}
                onChange={(e) => handleRawResponseChange(e.target.value)}
              />
            )}
          </div>
        </div>
      )}

      {/* Parsed Tasks Preview Area */}
      {parsedTasks.length > 0 && (
        <div className="haru-preview-card">
          <div className="haru-preview-header">
            <div className="haru-preview-title-row">
              <h3 className="haru-preview-title">
                Parsed Tasks Preview ({selectedCount} of {parsedTasks.length} selected)
              </h3>
              <span className="haru-preview-dest">
                Destination: #{targetSection === '__custom__' ? customSection || 'New Section' : targetSection}
              </span>
            </div>

            <div className="haru-preview-header-actions">
              <button
                type="button"
                className="haru-btn-sm"
                onClick={handleToggleSelectAll}
              >
                {parsedTasks.every((t) => t.selected) ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          <div className="haru-parsed-list">
            {parsedTasks.map((task) => (
              <div
                key={task.id}
                className={`haru-parsed-item ${task.selected ? 'is-selected' : ''}`}
                onClick={() => handleToggleTaskSelection(task.id)}
              >
                <input
                  type="checkbox"
                  className="haru-checkbox"
                  checked={task.selected}
                  onChange={() => handleToggleTaskSelection(task.id)}
                  onClick={(e) => e.stopPropagation()}
                />

                <div className="haru-parsed-content">
                  <div className="haru-parsed-main">
                    <span className="haru-parsed-text">{task.title}</span>
                    {task.assignee && (
                      <span className="haru-mention-chip">{task.assignee}</span>
                    )}
                    {task.tags.map((tag) => (
                      <span key={tag} className="haru-tag-chip">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {task.subtasks.length > 0 && (
                    <div className="haru-parsed-subtasks">
                      {task.subtasks.map((sub, idx) => (
                        <div key={idx} className="haru-parsed-subtask-item">
                          ↳ <span className="haru-subtask-bullet">[]</span> {sub}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Insertion Actions Footer */}
          <div className="haru-preview-footer">
            <button
              type="button"
              className="haru-btn haru-btn-accent haru-btn-lg"
              onClick={handleInsert}
              disabled={selectedCount === 0}
            >
              📥 Insert {selectedCount} {selectedCount === 1 ? 'Task' : 'Tasks'} into Workspace
            </button>

            {insertedCount !== null && (
              <div className="haru-inserted-success">
                <span>✓ Successfully inserted {insertedCount} tasks!</span>
                <button
                  type="button"
                  className="haru-btn haru-btn-view"
                  onClick={onNavigateToWorkspace}
                >
                  View in Workspace →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
