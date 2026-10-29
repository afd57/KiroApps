import React from 'react';
import { HaruBlock } from '../../types/haru';
import { MochiBud } from './MochiBud';
import { CompanionSprite } from './CompanionSprite';
import { cleanTaskBody } from '../../utils/markdownHelpers';

export interface SquadTrailProps {
  activeCompanionId: string;
  todayBloomedTasks: HaruBlock[];
  onOpenCompanionPicker: () => void;
}

export const SquadTrail: React.FC<SquadTrailProps> = ({
  activeCompanionId,
  todayBloomedTasks,
  onOpenCompanionPicker,
}) => {
  const displayTasks = todayBloomedTasks.slice(0, 8);
  const overflow = todayBloomedTasks.length - displayTasks.length;

  return (
    <div className="haru-squad-trail" title="Your garden squad trailing behind your companion">
      {/* Active Companion */}
      <div className="haru-squad-leader" onClick={onOpenCompanionPicker}>
        <CompanionSprite companionId={activeCompanionId} mood="idle" size={38} />
      </div>

      {/* Trailing Mochi Buds bloomed today */}
      <div className="haru-squad-followers">
        {displayTasks.map((task, i) => (
          <div
            key={task.id}
            className="haru-squad-bud"
            title={`Bloomed today: ${cleanTaskBody(task.content)}`}
          >
            <MochiBud
              status="done"
              colorIndex={(task.createdSeq ?? i) - 1}
              size={24}
              staggerIndex={i}
            />
          </div>
        ))}

        {overflow > 0 && (
          <span className="haru-squad-overflow" title={`${overflow} more bloomed tasks`}>
            +{overflow}
          </span>
        )}
      </div>
    </div>
  );
};
