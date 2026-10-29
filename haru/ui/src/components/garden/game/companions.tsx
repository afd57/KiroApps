import React from 'react';

export const COMPANION_REACT_SVGS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  chick: ({ size = 48, className = '' }) => (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="52" r="32" fill="#FFE266" stroke="#D9A826" strokeWidth="3" />
      <ellipse cx="38" cy="48" rx="3.5" ry="4.5" fill="#2E2416" />
      <ellipse cx="62" cy="48" rx="3.5" ry="4.5" fill="#2E2416" />
      <polygon points="46,54 54,54 50,60" fill="#FF8833" />
      <ellipse cx="30" cy="54" rx="4" ry="2.5" fill="#FFAA80" opacity="0.6" />
      <ellipse cx="70" cy="54" rx="4" ry="2.5" fill="#FFAA80" opacity="0.6" />
      <path d="M 50 20 Q 52 14 56 16" stroke="#D9A826" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="38" cy="84" rx="6" ry="3.5" fill="#FF8833" />
      <ellipse cx="62" cy="84" rx="6" ry="3.5" fill="#FF8833" />
    </svg>
  ),
  bee: ({ size = 48, className = '' }) => (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="55" rx="28" ry="24" fill="#FFD94D" stroke="#C7981A" strokeWidth="3" />
      <path d="M 40 33 L 40 77 M 54 31 L 54 79 M 66 36 L 66 74" stroke="#4A3B22" strokeWidth="4.5" strokeLinecap="round" />
      <ellipse cx="32" cy="50" rx="3" ry="4" fill="#2E2416" />
      <ellipse cx="26" cy="54" rx="3.5" ry="2" fill="#FFAA80" opacity="0.6" />
      <ellipse cx="44" cy="26" rx="10" ry="14" fill="#E6F5FF" stroke="#A8D6FA" strokeWidth="2" transform="rotate(-20 44 26)" />
      <ellipse cx="62" cy="24" rx="9" ry="13" fill="#E6F5FF" stroke="#A8D6FA" strokeWidth="2" transform="rotate(15 62 24)" />
    </svg>
  ),
  rabbit: ({ size = 48, className = '' }) => (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="36" cy="28" rx="8" ry="22" fill="#FFFFFF" stroke="#D1BFCF" strokeWidth="3" />
      <ellipse cx="36" cy="28" rx="4.5" ry="14" fill="#FFB3CB" />
      <ellipse cx="64" cy="28" rx="8" ry="22" fill="#FFFFFF" stroke="#D1BFCF" strokeWidth="3" />
      <ellipse cx="64" cy="28" rx="4.5" ry="14" fill="#FFB3CB" />
      <circle cx="50" cy="58" r="28" fill="#FFFFFF" stroke="#D1BFCF" strokeWidth="3" />
      <circle cx="40" cy="55" r="3.2" fill="#3D2D38" />
      <circle cx="60" cy="55" r="3.2" fill="#3D2D38" />
      <polygon points="48,61 52,61 50,64" fill="#FF88A8" />
      <path d="M 46 66 Q 50 69 54 66" fill="none" stroke="#3D2D38" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="32" cy="61" rx="4.5" ry="2.8" fill="#FFB3CB" opacity="0.7" />
      <ellipse cx="68" cy="61" rx="4.5" ry="2.8" fill="#FFB3CB" opacity="0.7" />
    </svg>
  ),
  cat: ({ size = 48, className = '' }) => (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} xmlns="http://www.w3.org/2000/svg">
      <polygon points="26,45 32,18 48,34" fill="#FFA875" stroke="#C96B36" strokeWidth="3" />
      <polygon points="74,45 68,18 52,34" fill="#FFA875" stroke="#C96B36" strokeWidth="3" />
      <circle cx="50" cy="56" r="28" fill="#FFA875" stroke="#C96B36" strokeWidth="3" />
      <ellipse cx="38" cy="53" rx="3.2" ry="4.2" fill="#2E2416" />
      <ellipse cx="62" cy="53" rx="3.2" ry="4.2" fill="#2E2416" />
      <polygon points="48,59 52,59 50,62" fill="#FF708F" />
      <path d="M 44 64 Q 47 67 50 64 Q 53 67 56 64" fill="none" stroke="#2E2416" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="24" y1="58" x2="33" y2="58" stroke="#7A3D19" strokeWidth="1.5" />
      <line x1="24" y1="63" x2="33" y2="61" stroke="#7A3D19" strokeWidth="1.5" />
      <line x1="76" y1="58" x2="67" y2="58" stroke="#7A3D19" strokeWidth="1.5" />
      <line x1="76" y1="63" x2="67" y2="61" stroke="#7A3D19" strokeWidth="1.5" />
    </svg>
  ),
  frog: ({ size = 48, className = '' }) => (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="34" cy="36" r="12" fill="#75D977" stroke="#439E45" strokeWidth="3" />
      <circle cx="34" cy="36" r="5" fill="#223B22" />
      <circle cx="66" cy="36" r="12" fill="#75D977" stroke="#439E45" strokeWidth="3" />
      <circle cx="66" cy="36" r="5" fill="#223B22" />
      <ellipse cx="50" cy="58" rx="32" ry="24" fill="#75D977" stroke="#439E45" strokeWidth="3" />
      <ellipse cx="50" cy="64" rx="20" ry="14" fill="#D3F7C8" />
      <ellipse cx="28" cy="58" rx="4.5" ry="2.8" fill="#FF94A8" opacity="0.6" />
      <ellipse cx="72" cy="58" rx="4.5" ry="2.8" fill="#FF94A8" opacity="0.6" />
      <path d="M 42 58 Q 50 64 58 58" fill="none" stroke="#223B22" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  penguin: ({ size = 48, className = '' }) => (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="54" rx="26" ry="32" fill="#363945" stroke="#1E2026" strokeWidth="3" />
      <ellipse cx="50" cy="58" rx="18" ry="24" fill="#FFFFFF" />
      <ellipse cx="40" cy="46" rx="3" ry="4" fill="#1E2026" />
      <ellipse cx="60" cy="46" rx="3" ry="4" fill="#1E2026" />
      <polygon points="46,52 54,52 50,58" fill="#FFA633" />
      <ellipse cx="34" cy="52" rx="3.5" ry="2" fill="#FFA6C2" opacity="0.6" />
      <ellipse cx="66" cy="52" rx="3.5" ry="2" fill="#FFA6C2" opacity="0.6" />
      <ellipse cx="38" cy="85" rx="7" ry="3.5" fill="#FFA633" />
      <ellipse cx="62" cy="85" rx="7" ry="3.5" fill="#FFA633" />
    </svg>
  ),
  bear: ({ size = 48, className = '' }) => (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="34" r="11" fill="#C28753" stroke="#875629" strokeWidth="3" />
      <circle cx="28" cy="34" r="5.5" fill="#E6BA91" />
      <circle cx="72" cy="34" r="11" fill="#C28753" stroke="#875629" strokeWidth="3" />
      <circle cx="72" cy="34" r="5.5" fill="#E6BA91" />
      <circle cx="50" cy="57" r="28" fill="#C28753" stroke="#875629" strokeWidth="3" />
      <ellipse cx="50" cy="62" rx="14" ry="11" fill="#F0D5BD" />
      <circle cx="39" cy="50" r="3.2" fill="#2E1C0E" />
      <circle cx="61" cy="50" r="3.2" fill="#2E1C0E" />
      <ellipse cx="50" cy="59" rx="4.5" ry="3" fill="#2E1C0E" />
      <path d="M 46 65 Q 50 68 54 65" fill="none" stroke="#2E1C0E" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  unicorn: ({ size = 48, className = '' }) => (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} xmlns="http://www.w3.org/2000/svg">
      <polygon points="50,10 44,36 56,36" fill="#FFE066" stroke="#E6BF2E" strokeWidth="2" />
      <circle cx="50" cy="58" r="28" fill="#FFF9FC" stroke="#D6BED1" strokeWidth="3" />
      <path d="M 32 38 Q 40 28 50 36 Q 60 28 68 38" fill="none" stroke="#FF99C2" strokeWidth="4.5" strokeLinecap="round" />
      <ellipse cx="40" cy="55" rx="3.5" ry="4.5" fill="#3B2637" />
      <ellipse cx="60" cy="55" rx="3.5" ry="4.5" fill="#3B2637" />
      <ellipse cx="50" cy="65" rx="12" ry="7" fill="#FFD1E6" />
      <circle cx="46" cy="65" r="1.5" fill="#804D6B" />
      <circle cx="54" cy="65" r="1.5" fill="#804D6B" />
      <ellipse cx="32" cy="60" rx="4" ry="2.5" fill="#FFA8CF" opacity="0.7" />
      <ellipse cx="68" cy="60" rx="4" ry="2.5" fill="#FFA8CF" opacity="0.7" />
    </svg>
  ),
};

export interface CompanionInfo {
  id: string;
  name: string;
  unlockAt: number;
}

export function getCompanionInfo(id: string): CompanionInfo {
  const def = {
    chick: { name: 'Pip the chick', unlockAt: 0 },
    bee: { name: 'Bumble', unlockAt: 30 },
    rabbit: { name: 'Mochi Bun', unlockAt: 80 },
    cat: { name: 'Biscuit', unlockAt: 150 },
    frog: { name: 'Lily', unlockAt: 250 },
    penguin: { name: 'Waddle', unlockAt: 400 },
    bear: { name: 'Honey', unlockAt: 600 },
    unicorn: { name: 'Sparkle', unlockAt: 1000 },
  }[id] || { name: 'Pip the chick', unlockAt: 0 };

  return {
    id,
    name: def.name,
    unlockAt: def.unlockAt,
  };
}
