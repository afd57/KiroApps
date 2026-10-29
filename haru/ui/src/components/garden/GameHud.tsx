import React, { useState } from 'react';
import { GardenGameState, GardenGameActions } from './game/gameTypes';
import { getLevelInfo } from './game/gameRules';
import { HaruBlock } from '../../types/haru';
import { SquadTrail } from './SquadTrail';
import { CompanionPicker } from './CompanionPicker';

export interface GameHudProps {
  game: GardenGameState;
  gameActions: GardenGameActions;
  todayBloomedTasks: HaruBlock[];
  leaderTask: HaruBlock | null;
  onOpenWardrobe: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  game,
  gameActions,
  todayBloomedTasks,
  leaderTask,
  onOpenWardrobe,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const levelInfo = getLevelInfo(game.sunshineLifetime);
  const todayCount = todayBloomedTasks.length;
  const goal = Math.max(1, game.dailyGoal);
  const goalPct = Math.min(100, Math.round((todayCount / goal) * 100));

  return (
    <div className="haru-game-hud">
      {/* If Garden Quest is disabled, show clean minimal pill so user never loses control */}
      {!game.enabled ? (
        <div className="haru-hud-pill haru-quest-off-pill">
          <span>🎮 Garden Quest: Off</span>
          <button
            type="button"
            className="haru-toggle-pill"
            onClick={() => gameActions.setEnabled(true)}
          >
            Enable ✨
          </button>
        </div>
      ) : (
        <>
          {/* Sunshine & Level Pill */}
          <div className="haru-hud-pill haru-hud-sunshine">
            <span className="haru-sun-icon" aria-hidden="true">☀</span>
            <span className="haru-sun-count">{game.sunshineLifetime}</span>
            <span className="haru-level-tag">Lv {levelInfo.level}</span>
            <div className="haru-level-bar" title={`Progress to Lv ${levelInfo.level + 1}: ${levelInfo.progressPct}%`}>
              <div className="haru-level-bar-fill" style={{ width: `${levelInfo.progressPct}%` }} />
            </div>
          </div>

          {/* Daily Goal & Streak */}
          <div
            className="haru-hud-pill haru-hud-goal"
            title={`Daily Goal: ${todayCount}/${goal} tasks bloomed today • Streak: ${game.streak.current} day(s)`}
          >
            <svg className="haru-goal-ring" width="24" height="24" viewBox="0 0 36 36">
              <path
                className="haru-goal-ring-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="haru-goal-ring-fill"
                strokeDasharray={`${goalPct}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="haru-goal-label">
              {todayCount}/{goal}
            </span>
            {game.streak.current > 0 && (
              <span className="haru-streak-badge" title={`Best streak: ${game.streak.best}d`}>
                🌤 {game.streak.current}d
              </span>
            )}
          </div>

          {/* Squad Trail (Companion + Today's bloomed buds) */}
          <SquadTrail
            activeCompanionId={game.activeCompanion}
            todayBloomedTasks={todayBloomedTasks}
            onOpenCompanionPicker={() => setShowPicker(true)}
          />

          {/* Tend the Leader Button */}
          {leaderTask && !game.focus && (
            <button
              type="button"
              className="haru-hud-tend-btn"
              onClick={() => gameActions.startFocus(leaderTask.id, game.focusMinutes)}
              title={`Focus on: "${leaderTask.content.replace(/^#+\s*|^\[[ xX]?\]\s*|- /, '').trim()}"`}
            >
              🌱 Tend Leader ({game.focusMinutes}m)
            </button>
          )}
        </>
      )}

      {/* Wardrobe Studio Button */}
      <button
        type="button"
        className="haru-hud-wardrobe-btn"
        onClick={onOpenWardrobe}
        title="Open Character Wardrobe Studio to style Agents & Models"
      >
        👗 Wardrobe
      </button>

      {/* Atmosphere Switcher (Terrarium Weather) */}
      <div className="haru-atmosphere-switcher" title="Terrarium Weather / Mood">
        <button
          type="button"
          className={`haru-atmo-btn ${game.atmosphere === 'sunny' ? 'active' : ''}`}
          onClick={() => gameActions.setAtmosphere('sunny')}
          title="Sunny Breeze ☀️"
        >
          ☀️
        </button>
        <button
          type="button"
          className={`haru-atmo-btn ${game.atmosphere === 'sakura' ? 'active' : ''}`}
          onClick={() => gameActions.setAtmosphere('sakura')}
          title="Cherry Blossom Rain 🌸"
        >
          🌸
        </button>
        <button
          type="button"
          className={`haru-atmo-btn ${game.atmosphere === 'night' ? 'active' : ''}`}
          onClick={() => gameActions.setAtmosphere('night')}
          title="Starlight Fireflies 🌙"
        >
          🌙
        </button>
      </div>

      {/* Settings Gear Popover - Always mounted and persistent */}
      <div className="haru-hud-settings-wrap">
        <button
          type="button"
          className="haru-hud-icon-btn"
          onClick={() => setShowSettings(!showSettings)}
          title="Garden Quest & Audio Settings"
        >
          ⚙
        </button>

        {showSettings && (
          <>
            {/* Transparent backdrop to catch clicks outside popover */}
            <div className="haru-popover-backdrop" onClick={() => setShowSettings(false)} />

            <div className="haru-hud-settings-popover">
              <div className="haru-settings-header">
                <span className="haru-settings-title">⚙ Garden Settings</span>
                <button type="button" className="haru-picker-close-btn" onClick={() => setShowSettings(false)}>
                  ✕
                </button>
              </div>

              <div className="haru-settings-row">
                <span>Garden Quest</span>
                <button
                  type="button"
                  className={`haru-toggle-pill ${game.enabled ? 'active' : ''}`}
                  onClick={() => gameActions.setEnabled(!game.enabled)}
                >
                  {game.enabled ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="haru-settings-row">
                <span>Daily Bloom Goal</span>
                <select
                  value={game.dailyGoal}
                  onChange={(e) => gameActions.setDailyGoal(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} tasks
                    </option>
                  ))}
                </select>
              </div>

              <div className="haru-settings-row">
                <span>Focus Duration</span>
                <select
                  value={game.focusMinutes}
                  onChange={(e) => gameActions.setFocusMinutes(Number(e.target.value) as any)}
                >
                  <option value={10}>10 min</option>
                  <option value={25}>25 min</option>
                  <option value={45}>45 min</option>
                </select>
              </div>

              <div className="haru-settings-row">
                <span>Cute SFX Audio</span>
                <button
                  type="button"
                  className={`haru-toggle-pill ${game.soundOn ? 'active' : ''}`}
                  onClick={() => gameActions.setSoundOn(!game.soundOn)}
                >
                  {game.soundOn ? 'SOUND ON' : 'MUTED'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Companion Picker Modal */}
      {showPicker && (
        <CompanionPicker
          currentSunshine={game.sunshineLifetime}
          activeCompanionId={game.activeCompanion}
          unlockedIds={game.unlockedCompanions}
          onSelectCompanion={gameActions.setActiveCompanion}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
};
