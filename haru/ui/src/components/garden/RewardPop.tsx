import React from 'react';
import { RewardEvent } from './game/gameTypes';

export interface RewardPopProps {
  rewards: RewardEvent[];
}

export const RewardPop: React.FC<RewardPopProps> = ({ rewards }) => {
  if (rewards.length === 0) return null;

  return (
    <div className="haru-reward-pop-container" aria-hidden="true">
      {rewards.map((r) => (
        <div key={r.id} className="haru-reward-chip">
          <span className="haru-reward-sun">☀</span>
          <span className="haru-reward-amount">+{r.amount}</span>
        </div>
      ))}
    </div>
  );
};
