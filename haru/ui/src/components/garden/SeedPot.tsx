import React, { useState, useEffect } from 'react';
import { playSound } from './gardenAudio';

export interface SeedPotProps {
  sections: string[];
  defaultSection: string;
  autoFocus?: boolean;
  onPlantTask: (taskText: string, targetSection: string) => void;
}

export const SeedPot: React.FC<SeedPotProps> = ({
  sections,
  defaultSection,
  autoFocus = false,
  onPlantTask,
}) => {
  const [text, setText] = useState('');
  const [targetSection, setTargetSection] = useState(defaultSection || 'Today');

  useEffect(() => {
    if (defaultSection) {
      setTargetSection(defaultSection);
    }
  }, [defaultSection]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    playSound.plant();
    onPlantTask(trimmed, targetSection);
    setText('');
  };

  return (
    <div className="haru-garden-seed-pot-card">
      <div className="haru-seed-pot-header">
        <span className="haru-seed-pot-icon" aria-hidden="true">🌱</span>
        <span className="haru-seed-pot-title">Plant a New Bud</span>
      </div>

      <form onSubmit={handleSubmit} className="haru-seed-pot-form">
        <input
          type="text"
          className="haru-seed-pot-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Plant a new bud… 🌱 (@person, #tag)"
          autoFocus={autoFocus}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setText('');
            }
          }}
        />

        <div className="haru-seed-pot-actions">
          {sections.length > 1 && (
            <select
              className="haru-seed-pot-section-select"
              value={targetSection}
              onChange={(e) => setTargetSection(e.target.value)}
              title="Target Section"
            >
              {sections.map((sec) => (
                <option key={sec} value={sec}>
                  #{sec}
                </option>
              ))}
            </select>
          )}

          <button
            type="submit"
            className="haru-seed-pot-plant-btn"
            disabled={!text.trim()}
          >
            Plant 🌱
          </button>
        </div>
      </form>
    </div>
  );
};
