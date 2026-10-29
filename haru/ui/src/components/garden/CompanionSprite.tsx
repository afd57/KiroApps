import React, { useState } from 'react';
import { getCompanionInfo, COMPANION_REACT_SVGS } from './game/companions';
import { playSound } from './gardenAudio';

export interface CompanionSpriteProps {
  companionId: string;
  mood?: 'idle' | 'working' | 'cheer' | 'nap';
  size?: number;
  className?: string;
  onClick?: () => void;
}

export const CompanionSprite: React.FC<CompanionSpriteProps> = ({
  companionId,
  mood = 'idle',
  size = 48,
  className = '',
  onClick,
}) => {
  const [isPetted, setIsPetted] = useState(false);
  const [petHearts, setPetHearts] = useState<number[]>([]);
  const info = getCompanionInfo(companionId);
  const SvgComp = COMPANION_REACT_SVGS[companionId] || COMPANION_REACT_SVGS.chick;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPetted(true);
    playSound.pet();

    const id = Date.now();
    setPetHearts((prev) => [...prev.slice(-3), id]);

    setTimeout(() => {
      setIsPetted(false);
    }, 450);

    setTimeout(() => {
      setPetHearts((prev) => prev.filter((item) => item !== id));
    }, 950);

    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={`haru-companion-sprite mood-${mood} ${isPetted ? 'is-petted' : ''} ${className}`}
      style={{ width: size, height: size }}
      onClick={handleClick}
      title={`${info.name} — Click to pet! 🐾`}
    >
      <SvgComp size={size} />

      {/* Floating love hearts when petted */}
      {petHearts.map((hId) => (
        <span key={hId} className="companion-love-heart">
          ✨
        </span>
      ))}

      {mood === 'nap' && (
        <span className="haru-companion-nap-z" aria-hidden="true">
          z Z
        </span>
      )}
    </div>
  );
};
