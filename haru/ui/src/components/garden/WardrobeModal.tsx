import React, { useState } from 'react';
import { KiroAgentOption, KiroModelOption } from '../../types/haru';
import {
  AgentGearId,
  ModelStyleId,
  AGENT_GEAR_CATALOG,
  MODEL_STYLE_CATALOG,
  resolveAgentGear,
  resolveModelStyle,
  generateSmartRosterWardrobe,
} from './wardrobeUtils';
import { MochiBud, MochiAnimationState } from './MochiBud';
import { MOCHI_PALETTE } from './gardenUtils';
import { playSound } from './gardenAudio';

export interface WardrobeModalProps {
  agents: KiroAgentOption[];
  models: KiroModelOption[];
  customWardrobe: {
    agentGear: Record<string, AgentGearId>;
    modelStyle: Record<string, ModelStyleId>;
  };
  onSaveAgentGear: (agentId: string, gearId: AgentGearId) => void;
  onSaveModelStyle: (modelId: string, styleId: ModelStyleId) => void;
  onSaveRosterWardrobe: (wardrobe: { agentGear: Record<string, AgentGearId>; modelStyle: Record<string, ModelStyleId> }) => void;
  onClose: () => void;
}

export const WardrobeModal: React.FC<WardrobeModalProps> = ({
  agents,
  models,
  customWardrobe,
  onSaveAgentGear,
  onSaveModelStyle,
  onSaveRosterWardrobe,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'agents' | 'models'>('agents');
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || 'default');
  const [selectedModelId, setSelectedModelId] = useState<string>(models[0]?.id || 'auto');
  const [previewAnim, setPreviewAnim] = useState<MochiAnimationState>('idle');
  const [previewColorIdx, setPreviewColorIdx] = useState<number>(0);

  const currentGear = resolveAgentGear(selectedAgentId, agents, customWardrobe.agentGear);
  const currentStyle = resolveModelStyle(selectedModelId, models, customWardrobe.modelStyle);

  const handleAutoStyle = () => {
    playSound.bloom();
    const smart = generateSmartRosterWardrobe(agents, models);
    onSaveRosterWardrobe(smart);
  };

  const handleTriggerAnim = (anim: MochiAnimationState) => {
    playSound.boop();
    setPreviewAnim(anim);
  };

  return (
    <div className="haru-companion-picker-modal" onClick={onClose}>
      <div className="haru-companion-picker-card haru-wardrobe-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="haru-picker-header">
          <div className="haru-wardrobe-title-row">
            <span className="haru-picker-title">👗 Character Wardrobe Studio</span>
            <button
              type="button"
              className="haru-wardrobe-autostyle-btn"
              onClick={handleAutoStyle}
              title="Let AI intelligently style your entire agent and model roster with fitting hats & auras"
            >
              ✨ Ask AI to Style Roster
            </button>
          </div>
          <button type="button" className="haru-picker-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <p className="haru-picker-subtitle">
          Customize what outfits, hats, tools, and visual aura tiers your Mochi Buds wear when assigned to specific Agents & Models!
        </p>

        {/* Studio Viewport: Preview in center */}
        <div className="haru-wardrobe-preview-stage">
          <div className="haru-wardrobe-bud-wrap">
            <MochiBud
              status="idle"
              state={previewAnim}
              size={120}
              colorIndex={previewColorIdx}
              agentGear={currentGear}
              modelStyle={currentStyle}
              idlePose="waddle"
            />
          </div>

          {/* Interactive Animation Control Bar */}
          <div className="haru-wardrobe-anim-controls" title="Test Character Animations in Real-Time">
            <button
              type="button"
              className={`haru-wardrobe-anim-pill ${previewAnim === 'idle' ? 'is-active' : ''}`}
              onClick={() => handleTriggerAnim('idle')}
            >
              🌱 Idle
            </button>
            <button
              type="button"
              className={`haru-wardrobe-anim-pill ${previewAnim === 'wave' ? 'is-active' : ''}`}
              onClick={() => handleTriggerAnim('wave')}
            >
              👋 Wave
            </button>
            <button
              type="button"
              className={`haru-wardrobe-anim-pill ${previewAnim === 'eat' ? 'is-active' : ''}`}
              onClick={() => handleTriggerAnim('eat')}
            >
              🍓 Eat
            </button>
            <button
              type="button"
              className={`haru-wardrobe-anim-pill ${previewAnim === 'yawn' ? 'is-active' : ''}`}
              onClick={() => handleTriggerAnim('yawn')}
            >
              🥱 Yawn
            </button>
            <button
              type="button"
              className={`haru-wardrobe-anim-pill ${previewAnim === 'sleep' ? 'is-active' : ''}`}
              onClick={() => handleTriggerAnim('sleep')}
            >
              💤 Sleep
            </button>
          </div>

          {/* Color preview palette strip */}
          <div className="haru-wardrobe-color-strip" title="Preview Color Palette">
            {MOCHI_PALETTE.map((pal, idx) => (
              <button
                key={pal.name}
                type="button"
                className={`haru-wardrobe-color-dot ${previewColorIdx === idx ? 'is-active' : ''}`}
                style={{ background: pal.fill, borderColor: pal.stroke }}
                onClick={() => {
                  playSound.boop();
                  setPreviewColorIdx(idx);
                }}
                title={`Color: ${pal.name}`}
              />
            ))}
          </div>

          <div className="haru-wardrobe-preview-meta">
            <span className="haru-wardrobe-preview-title">
              {activeTab === 'agents'
                ? `Agent: ${agents.find((a) => a.id === selectedAgentId)?.name || selectedAgentId}`
                : `Model: ${models.find((m) => m.id === selectedModelId)?.label || selectedModelId}`}
            </span>
            <span className="haru-wardrobe-preview-desc">
              {activeTab === 'agents'
                ? `Equipped: ${AGENT_GEAR_CATALOG.find((g) => g.id === currentGear)?.emoji} ${AGENT_GEAR_CATALOG.find((g) => g.id === currentGear)?.label} (${AGENT_GEAR_CATALOG.find((g) => g.id === currentGear)?.description})`
                : `Aura Tier: ${MODEL_STYLE_CATALOG.find((s) => s.id === currentStyle)?.emoji} ${MODEL_STYLE_CATALOG.find((s) => s.id === currentStyle)?.label} (${MODEL_STYLE_CATALOG.find((s) => s.id === currentStyle)?.description})`}
            </span>
          </div>
        </div>

        {/* Tab switch */}
        <div className="haru-wardrobe-tabs">
          <button
            type="button"
            className={`haru-wardrobe-tab ${activeTab === 'agents' ? 'active' : ''}`}
            onClick={() => setActiveTab('agents')}
          >
            🤖 Agents ({agents.length})
          </button>
          <button
            type="button"
            className={`haru-wardrobe-tab ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => setActiveTab('models')}
          >
            ⚡ Models ({models.length})
          </button>
        </div>

        {/* Target item selector + gear options */}
        {activeTab === 'agents' ? (
          <div className="haru-wardrobe-selector-section">
            <div className="haru-wardrobe-item-select-row">
              <label>Select Agent to Style:</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="haru-wardrobe-dropdown"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="haru-wardrobe-options-grid">
              {AGENT_GEAR_CATALOG.map((gear) => {
                const isEquipped = currentGear === gear.id;
                return (
                  <button
                    key={gear.id}
                    type="button"
                    className={`haru-wardrobe-option-btn ${isEquipped ? 'is-selected' : ''}`}
                    onClick={() => {
                      playSound.boop();
                      onSaveAgentGear(selectedAgentId, gear.id);
                    }}
                  >
                    <span className="haru-option-emoji">{gear.emoji}</span>
                    <span className="haru-option-label">{gear.label}</span>
                    <span className="haru-option-hint">{gear.tool}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="haru-wardrobe-selector-section">
            <div className="haru-wardrobe-item-select-row">
              <label>Select Model to Style:</label>
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="haru-wardrobe-dropdown"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="haru-wardrobe-options-grid">
              {MODEL_STYLE_CATALOG.map((style) => {
                const isEquipped = currentStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    className={`haru-wardrobe-option-btn ${isEquipped ? 'is-selected' : ''}`}
                    onClick={() => {
                      playSound.boop();
                      onSaveModelStyle(selectedModelId, style.id);
                    }}
                  >
                    <span className="haru-option-emoji">{style.emoji}</span>
                    <span className="haru-option-label">{style.label}</span>
                    <span className="haru-option-hint">{style.headpiece}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="haru-picker-footer">
          <span className="haru-art-credits">
            Selected outfits automatically equip in real-time onto all task cards using this agent or model!
          </span>
        </div>
      </div>
    </div>
  );
};
