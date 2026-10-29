import React from 'react';
import { COMPANION_DEFS } from './game/gameRules';
import { getCompanionInfo, COMPANION_REACT_SVGS } from './game/companions';

export interface CompanionPickerProps {
  currentSunshine: number;
  activeCompanionId: string;
  unlockedIds: string[];
  onSelectCompanion: (id: string) => void;
  onClose: () => void;
}

export const CompanionPicker: React.FC<CompanionPickerProps> = ({
  currentSunshine,
  activeCompanionId,
  unlockedIds,
  onSelectCompanion,
  onClose,
}) => {
  return (
    <div className="haru-companion-picker-modal" onClick={onClose}>
      <div className="haru-companion-picker-card" onClick={(e) => e.stopPropagation()}>
        <div className="haru-picker-header">
          <span className="haru-picker-title">🐾 Choose Your Companion</span>
          <button type="button" className="haru-picker-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <p className="haru-picker-subtitle">
          Earn ☀ Sunshine by completing tasks and focus sessions to unlock more friends!
        </p>

        <div className="haru-companion-grid">
          {COMPANION_DEFS.map((c) => {
            const isUnlocked = unlockedIds.includes(c.id) || currentSunshine >= c.unlockAt;
            const isSelected = activeCompanionId === c.id;
            const info = getCompanionInfo(c.id);
            const SvgComp = COMPANION_REACT_SVGS[c.id] || COMPANION_REACT_SVGS.chick;

            return (
              <button
                key={c.id}
                type="button"
                className={`haru-companion-card ${isSelected ? 'is-selected' : ''} ${
                  !isUnlocked ? 'is-locked' : ''
                }`}
                disabled={!isUnlocked}
                onClick={() => {
                  if (isUnlocked) {
                    onSelectCompanion(c.id);
                    onClose();
                  }
                }}
              >
                <div className="haru-companion-avatar-wrap">
                  <div className={`haru-companion-avatar ${!isUnlocked ? 'silhouette' : ''}`}>
                    <SvgComp size={48} />
                  </div>
                  {isSelected && <span className="haru-active-badge">Active</span>}
                </div>

                <span className="haru-companion-name">{c.name}</span>
                <span className="haru-companion-requirement">
                  {isUnlocked ? 'Unlocked ✨' : `☀ ${c.unlockAt}`}
                </span>
              </button>
            );
          })}
        </div>

        <div className="haru-picker-footer">
          <span className="haru-art-credits">
            Characters & art inspired by open-source vector sets (MIT / CC0).
          </span>
        </div>
      </div>
    </div>
  );
};
