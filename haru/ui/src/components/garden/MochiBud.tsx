import React, { useState, useEffect, useCallback } from 'react';
import { BudVisualStatus, getMochiColor, TaskPriority } from './gardenUtils';
import { AgentGearId, ModelStyleId } from './wardrobeUtils';

export type MochiAnimationState = 'idle' | 'blink' | 'yawn' | 'eat' | 'sleep' | 'wave';

export interface MochiBudProps {
  status?: BudVisualStatus;
  state?: MochiAnimationState; // optional controlled state
  autoAnimate?: boolean; // defaults to true: triggers random animation every 10-20s while idle
  colorIndex?: number;
  size?: number;
  celebrate?: boolean;
  staggerIndex?: number;
  isLeader?: boolean;
  className?: string;
  agentGear?: AgentGearId;
  modelStyle?: ModelStyleId;
  idlePose?: 'waddle' | 'sit' | 'look' | 'daydream';
  priority?: TaskPriority;
  isCheering?: boolean;
  onBoop?: () => void;
  onStateChange?: (state: MochiAnimationState) => void;
}

export const MochiBud: React.FC<MochiBudProps> = ({
  status = 'idle',
  state,
  autoAnimate = true,
  colorIndex = 0,
  size = 72,
  celebrate = false,
  staggerIndex = 0,
  isLeader = false,
  className = '',
  agentGear = 'explorer',
  modelStyle = 'classic',
  idlePose = 'waddle',
  priority = 'normal',
  isCheering = false,
  onBoop,
  onStateChange,
}) => {
  // Internal animation state (defaults to sleep if status is sleepy, else idle)
  const [internalState, setInternalState] = useState<MochiAnimationState>(() =>
    status === 'sleepy' ? 'sleep' : 'idle'
  );
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [isSquishing, setIsSquishing] = useState<boolean>(false);
  const [hearts, setHearts] = useState<Array<{ id: number; x: number; y: number }>>([]);

  // Controlled vs internal state
  const effectiveState = state !== undefined ? state : internalState;

  const setState = useCallback(
    (nextState: MochiAnimationState) => {
      setInternalState(nextState);
      if (onStateChange) {
        onStateChange(nextState);
      }
    },
    [onStateChange]
  );

  // Sync when status becomes sleepy
  useEffect(() => {
    if (status === 'sleepy' && effectiveState !== 'sleep') {
      setState('sleep');
    }
  }, [status, effectiveState, setState]);

  // 1. Blinking: eyes blink every 3-5 seconds at random intervals (when not sleeping)
  useEffect(() => {
    if (effectiveState === 'sleep') return;

    let timeoutId: any;
    let blinkEndId: any;

    const scheduleNextBlink = () => {
      // 3 to 5 seconds random interval
      const delay = 3000 + Math.random() * 2000;
      timeoutId = setTimeout(() => {
        setIsBlinking(true);
        blinkEndId = setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 170); // 170ms blink duration
      }, delay);
    };

    scheduleNextBlink();

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(blinkEndId);
    };
  }, [effectiveState]);

  // 2. Random idle animations: triggers yawn, eat, wave, or sleep every 10-20 seconds while idle
  useEffect(() => {
    // Only auto-trigger when idle, not in a special task status, and uncontrolled
    if (!autoAnimate || state !== undefined || status !== 'idle' || effectiveState !== 'idle') {
      return;
    }

    let actionTimer: any;
    let returnTimer: any;

    // Random interval between 10,000ms and 20,000ms (10-20 seconds)
    const delay = 10000 + Math.random() * 10000;

    actionTimer = setTimeout(() => {
      const choices: Array<'yawn' | 'eat' | 'wave' | 'sleep'> = ['yawn', 'eat', 'wave', 'sleep'];
      const chosen = choices[Math.floor(Math.random() * choices.length)];

      setState(chosen);

      // Duration for temporary animations before returning to idle
      const durations = {
        yawn: 2600,
        eat: 3200,
        wave: 2400,
        sleep: 6000,
      };

      returnTimer = setTimeout(() => {
        setState('idle');
      }, durations[chosen]);
    }, delay);

    return () => {
      clearTimeout(actionTimer);
      clearTimeout(returnTimer);
    };
  }, [autoAnimate, state, status, effectiveState, setState]);

  const color = getMochiColor(colorIndex);

  const animStyle = {
    '--i': staggerIndex,
  } as React.CSSProperties;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsSquishing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newHeart = { id: Date.now() + Math.random(), x, y };
    setHearts((prev) => [...prev.slice(-4), newHeart]);

    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 900);

    // If sleeping, wake up on click!
    if (effectiveState === 'sleep') {
      setState('idle');
    }

    if (onBoop) {
      onBoop();
    }
  };

  const handlePointerUp = () => {
    setIsSquishing(false);
  };

  const isRunning = status === 'running';
  const isDone = status === 'done';

  return (
    <div
      className={`mochi-bud-wrapper status-${status} anim-state-${effectiveState} pose-${idlePose} gear-${agentGear} style-${modelStyle} ${
        priority === 'urgent' ? 'is-urgent' : ''
      } ${isCheering ? 'is-cheering' : ''} ${celebrate ? 'celebrating' : ''} ${
        isSquishing ? 'is-squished' : ''
      } ${className}`}
      style={{ width: size, height: size, ...animStyle }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="mochi-bud-svg"
        aria-hidden="true"
      >
        <defs>
          <filter id="cyber-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <radialGradient id="strawberry-grad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FF6B8B" />
            <stop offset="100%" stopColor="#E0244D" />
          </radialGradient>
        </defs>

        {/* =================================================================
            1. BACKGROUND LAYER: MODEL AURAS & WINGS
           ================================================================= */}
        {modelStyle === 'celestial' && (
          <g className="mochi-aura aura-celestial">
            <circle cx="50" cy="55" r="42" fill="none" stroke="#D18CFF" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.65" />
            <circle cx="20" cy="30" r="2.5" fill="#FFE066" className="star-orbit-1" />
            <circle cx="80" cy="35" r="2" fill="#E4AAFF" className="star-orbit-2" />
            <circle cx="75" cy="75" r="2.2" fill="#FFE066" className="star-orbit-3" />
          </g>
        )}

        {modelStyle === 'cyber' && (
          <g className="mochi-aura aura-cyber">
            <circle cx="50" cy="55" r="40" fill="none" stroke="#00F0FF" strokeWidth="2" strokeDasharray="3 6" opacity="0.55" filter="url(#cyber-glow)" />
            <polygon points="18,50 22,46 26,50 22,54" fill="#00F0FF" opacity="0.75" />
            <polygon points="78,48 82,44 86,48 82,52" fill="#00F0FF" opacity="0.75" />
          </g>
        )}

        {modelStyle === 'shinobi' && (
          <g className="mochi-aura aura-shinobi">
            <path d="M 12 55 Q 30 75 50 82 Q 70 75 88 55" fill="none" stroke="#FF4D4D" strokeWidth="2.5" strokeDasharray="5 5" opacity="0.65" />
          </g>
        )}

        {modelStyle === 'dragon' && (
          <g className="mochi-aura aura-dragon">
            <circle cx="24" cy="40" r="3" fill="#FFAA33" opacity="0.65" />
            <circle cx="76" cy="40" r="3" fill="#FFAA33" opacity="0.65" />
          </g>
        )}

        {modelStyle === 'angel' && (
          <g className="mochi-aura aura-angel">
            <path d="M 16 52 C 4 45, 6 30, 22 40" fill="#FFF8E7" stroke="#F6D365" strokeWidth="1.5" opacity="0.85" />
            <path d="M 84 52 C 96 45, 94 30, 78 40" fill="#FFF8E7" stroke="#F6D365" strokeWidth="1.5" opacity="0.85" />
          </g>
        )}

        {modelStyle === 'galaxy' && (
          <g className="mochi-aura aura-galaxy">
            <circle cx="50" cy="55" r="41" fill="none" stroke="#818CF8" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.7" />
            <circle cx="22" cy="32" r="3" fill="#C084FC" />
            <circle cx="82" cy="70" r="2.2" fill="#38BDF8" />
          </g>
        )}

        {modelStyle === 'phoenix' && (
          <g className="mochi-aura aura-phoenix">
            <path d="M 18 60 Q 10 40 22 34" fill="none" stroke="#F97316" strokeWidth="2" strokeDasharray="4 4" opacity="0.75" />
            <path d="M 82 60 Q 90 40 78 34" fill="none" stroke="#F97316" strokeWidth="2" strokeDasharray="4 4" opacity="0.75" />
          </g>
        )}

        {modelStyle === 'frost' && (
          <g className="mochi-aura aura-frost">
            <circle cx="50" cy="55" r="41" fill="none" stroke="#7DD3FC" strokeWidth="1.5" strokeDasharray="2 6" opacity="0.7" />
            <text x="18" y="38" fontSize="8" fill="#BAE6FD" opacity="0.8">❄</text>
            <text x="76" y="38" fontSize="8" fill="#BAE6FD" opacity="0.8">❄</text>
          </g>
        )}

        {modelStyle === 'prism' && (
          <g className="mochi-aura aura-prism">
            <circle cx="50" cy="55" r="41" fill="none" stroke="#EC4899" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.6" />
          </g>
        )}

        {priority === 'urgent' && (
          <g className="mochi-aura aura-urgent">
            <circle cx="50" cy="55" r="42" fill="none" stroke="#EF4444" strokeWidth="2" strokeDasharray="4 4" opacity="0.8" />
          </g>
        )}

        {/* =================================================================
            2. GROUND SHADOW LAYER (Reacts to breathing)
           ================================================================= */}
        <ellipse
          className="mochi-ground-shadow"
          cx="50"
          cy="89"
          rx={effectiveState === 'sleep' ? 27 : 25}
          ry={effectiveState === 'sleep' ? 4.5 : 5}
          fill="rgba(0,0,0,0.12)"
        />

        {/* =================================================================
            3. FEET LAYER (Articulated Left & Right)
           ================================================================= */}
        <g className={`mochi-feet ${isRunning ? 'feet-running' : idlePose === 'sit' ? 'feet-sitting' : 'feet-idle'}`}>
          <ellipse
            className="mochi-foot-left"
            cx={idlePose === 'sit' ? 32 : 36}
            cy={idlePose === 'sit' ? 82 : 84}
            rx={idlePose === 'sit' ? 7.5 : 7}
            ry={idlePose === 'sit' ? 5 : 4.5}
            fill={color.fill}
            stroke={color.stroke}
            strokeWidth="2.5"
          />
          <ellipse
            className="mochi-foot-right"
            cx={idlePose === 'sit' ? 68 : 64}
            cy={idlePose === 'sit' ? 82 : 84}
            rx={idlePose === 'sit' ? 7.5 : 7}
            ry={idlePose === 'sit' ? 5 : 4.5}
            fill={color.fill}
            stroke={color.stroke}
            strokeWidth="2.5"
          />
        </g>

        {/* =================================================================
            4. MAIN BODY CONTAINER (Breathing, Swaying & Scaling)
           ================================================================= */}
        <g className={`mochi-body-container anim-${effectiveState}`}>
          {/* Main bean/mochi body shape (cute blue blob) */}
          <path
            className="mochi-blob-shape"
            d={
              idlePose === 'sit'
                ? "M 50 36 C 74 36, 86 52, 86 68 C 86 82, 72 87, 50 87 C 28 87, 14 82, 14 68 C 14 52, 26 36, 50 36 Z"
                : "M 50 32 C 74 32, 84 48, 84 65 C 84 79, 72 85, 50 85 C 28 85, 16 79, 16 65 C 16 48, 26 32, 50 32 Z"
            }
            fill={color.fill}
            stroke={color.stroke}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Depth 3D curved highlight */}
          <path
            d="M 30 42 C 40 35, 60 35, 70 42"
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* =================================================================
              5. CHEEKS LAYER (Pink Cheeks)
             ================================================================= */}
          <ellipse
            className="mochi-cheek mochi-cheek-left"
            cx="28"
            cy="63"
            rx="5.5"
            ry="3.2"
            fill="#FF8DA8"
            opacity={status === 'done' || effectiveState === 'eat' || isSquishing ? 0.95 : 0.7}
          />
          <ellipse
            className="mochi-cheek mochi-cheek-right"
            cx="72"
            cy="63"
            rx="5.5"
            ry="3.2"
            fill="#FF8DA8"
            opacity={status === 'done' || effectiveState === 'eat' || isSquishing ? 0.95 : 0.7}
          />

          {/* =================================================================
              6. ARMS & HANDS LAYER (Waving / Holding Tools / Resting)
             ================================================================= */}
          {/* Left Arm (Resting against side or gentle bob) */}
          <g className="mochi-arm mochi-arm-left">
            <path
              d="M 18 56 Q 13 62 16 68 Q 21 70 23 64 Z"
              fill={color.fill}
              stroke={color.stroke}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          </g>

          {/* Right Arm: Waving or Tool Holding */}
          {effectiveState === 'wave' ? (
            /* Special Waving Arm pops out and waves! */
            <g className="mochi-arm mochi-arm-waving" transform="translate(74, 52)">
              <path
                d="M 0 8 Q 8 2 12 -6 Q 16 -12 20 -8 Q 22 -4 16 2 Q 10 10 4 12 Z"
                fill={color.fill}
                stroke={color.stroke}
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              {/* Cute little waving sparkles */}
              <text x="18" y="-12" fontSize="9" fill="#FFD700" className="wave-sparkle">✨</text>
            </g>
          ) : (
            <g className="mochi-arm mochi-arm-right">
              {/* Right base nub arm */}
              <path
                d="M 82 56 Q 87 62 84 68 Q 79 70 77 64 Z"
                fill={color.fill}
                stroke={color.stroke}
                strokeWidth="2.2"
                strokeLinejoin="round"
              />

              {/* Held Tools / Wearable items */}
              <g className={`mochi-held-tool ${isRunning ? 'tool-swinging' : ''}`}>
                {agentGear === 'worker' && (
                  <g transform="translate(73, 56) rotate(25)">
                    <path d="M 0 0 L 0 14" stroke="#C49B00" strokeWidth="3.2" strokeLinecap="round" />
                    <path d="M -3 0 Q 0 -6 3 0 Z" fill="#FFD700" stroke="#C49B00" strokeWidth="1.2" />
                  </g>
                )}
                {agentGear === 'research' && (
                  <g transform="translate(74, 58) rotate(15)">
                    <rect x="0" y="0" width="8" height="15" rx="3" fill="#FBF0D9" stroke="#B89450" strokeWidth="1.5" />
                    <line x1="2" y1="4" x2="6" y2="4" stroke="#B89450" strokeWidth="1" />
                    <line x1="2" y1="8" x2="6" y2="8" stroke="#B89450" strokeWidth="1" />
                  </g>
                )}
                {agentGear === 'conductor' && (
                  <g transform="translate(74, 50) rotate(-20)">
                    <line x1="0" y1="20" x2="0" y2="0" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="0" cy="0" r="3.5" fill="#FFD700" />
                  </g>
                )}
                {agentGear === 'executor' && (
                  <g transform="translate(72, 60)">
                    <rect x="0" y="0" width="10" height="13" rx="1.5" fill="#E2E8F0" stroke="#64748B" strokeWidth="1.2" />
                    <rect x="2" y="-2" width="6" height="3" rx="1" fill="#475569" />
                  </g>
                )}
                {agentGear === 'coder' && (
                  <g transform="translate(75, 58) rotate(15)">
                    <polygon points="0,0 8,2 6,8 0,6" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.2" />
                  </g>
                )}
                {agentGear === 'creative' && (
                  <g transform="translate(75, 52) rotate(35)">
                    <line x1="0" y1="18" x2="0" y2="5" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
                    <polygon points="-2.5,5 2.5,5 0,0" fill="#3B82F6" />
                  </g>
                )}
                {agentGear === 'wizard' && (
                  <g transform="translate(74, 48) rotate(-15)">
                    <line x1="0" y1="22" x2="0" y2="0" stroke="#9333EA" strokeWidth="2" strokeLinecap="round" />
                    <polygon points="0,-4 3,0 0,4 -3,0" fill="#FDE047" stroke="#EAB308" strokeWidth="1" />
                  </g>
                )}
                {agentGear === 'chef' && (
                  <g transform="translate(74, 52) rotate(20)">
                    <line x1="0" y1="18" x2="0" y2="0" stroke="#B45309" strokeWidth="2.2" strokeLinecap="round" />
                    <ellipse cx="0" cy="0" rx="3.5" ry="5" fill="#FDE68A" stroke="#B45309" strokeWidth="1.2" />
                  </g>
                )}
                {agentGear === 'botanist' && (
                  <g transform="translate(72, 58)">
                    <rect x="0" y="2" width="10" height="9" rx="2" fill="#94A3B8" stroke="#475569" strokeWidth="1.2" />
                    <path d="M 0 4 Q -4 4 -4 8" fill="none" stroke="#475569" strokeWidth="1.5" />
                  </g>
                )}
                {agentGear === 'gamer' && (
                  <g transform="translate(73, 58)">
                    <rect x="0" y="0" width="11" height="7" rx="3" fill="#F472B6" stroke="#DB2777" strokeWidth="1.2" />
                    <circle cx="3" cy="3.5" r="1.2" fill="#FFFFFF" />
                    <circle cx="8" cy="3.5" r="1.2" fill="#FFFFFF" />
                  </g>
                )}
                {agentGear === 'royal' && (
                  <g transform="translate(74, 48) rotate(-15)">
                    <line x1="0" y1="24" x2="0" y2="0" stroke="#EAB308" strokeWidth="2.4" strokeLinecap="round" />
                    <circle cx="0" cy="0" r="4" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.2" />
                  </g>
                )}
              </g>
            </g>
          )}

          {/* =================================================================
              7. EYES LAYER (Blinking, Squinting, Sleep, Sparkles)
             ================================================================= */}
          <g className="mochi-eyes-layer">
            {effectiveState === 'sleep' ? (
              /* Peaceful Sleeping Eyes (- - or curved) */
              <g className="mochi-eyes-sleep">
                <path d="M 33 58 Q 38 62 43 58" fill="none" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
                <path d="M 57 58 Q 62 62 67 58" fill="none" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
              </g>
            ) : effectiveState === 'yawn' || effectiveState === 'eat' || isDone ? (
              /* Happy Squinting Eyes (^ ^) */
              <g className="mochi-eyes-squint">
                <path d="M 33 58 Q 38 52 43 58" fill="none" stroke="#1E293B" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M 57 58 Q 62 52 67 58" fill="none" stroke="#1E293B" strokeWidth="2.6" strokeLinecap="round" />
              </g>
            ) : isBlinking ? (
              /* 170ms Quick Eyelid Blink */
              <g className="mochi-eyes-blink-closed">
                <line x1="34" y1="57" x2="42" y2="57" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
                <line x1="58" y1="57" x2="66" y2="57" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
              </g>
            ) : status === 'running' ? (
              /* Focused Work Sprint Eyes */
              <g className="mochi-eyes-running">
                <path d="M 33 54 L 40 57 L 33 60" fill="none" stroke="#1E293B" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 67 54 L 60 57 L 67 60" fill="none" stroke="#1E293B" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 76 45 C 76 43, 73 39, 73 39 C 73 39, 70 43, 70 45 C 70 47, 71.3 48.5, 73 48.5 C 74.7 48.5, 76 47, 76 45 Z" fill="#80D0FF" />
              </g>
            ) : (
              /* Sparkling Open Round Eyes */
              <g className="mochi-eyes-open">
                <ellipse cx="38" cy="57" rx="3.5" ry="4.5" fill="#1E293B" />
                <circle cx="39.2" cy="55.2" r="1.4" fill="#ffffff" />
                <ellipse cx="62" cy="57" rx="3.5" ry="4.5" fill="#1E293B" />
                <circle cx="63.2" cy="55.2" r="1.4" fill="#ffffff" />
              </g>
            )}
          </g>

          {/* =================================================================
              8. MOUTH LAYER (Idle smile, Yawning oval, Eating chew, Wave grin)
             ================================================================= */}
          <g className="mochi-mouth-layer">
            {effectiveState === 'yawn' ? (
              /* Big Open Yawn Mouth with cute tongue */
              <g className="mochi-mouth-yawn">
                <ellipse cx="50" cy="66" rx="5" ry="6.5" fill="#991B1B" stroke="#7F1D1D" strokeWidth="1.2" />
                <ellipse cx="50" cy="69" rx="3.2" ry="2.2" fill="#F87171" />
              </g>
            ) : effectiveState === 'eat' ? (
              /* Chewing mouth animated via CSS */
              <g className="mochi-mouth-chewing">
                <ellipse cx="50" cy="65" rx="4" ry="3" fill="#1E293B" />
                <ellipse cx="50" cy="66" rx="2.5" ry="1.4" fill="#F87171" />
              </g>
            ) : effectiveState === 'sleep' ? (
              /* Gentle flat smile */
              <path d="M 47 64 Q 50 65 53 64" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
            ) : effectiveState === 'wave' || isDone ? (
              /* Cheerful open grin (D) */
              <g className="mochi-mouth-wave">
                <path d="M 44 62 Q 50 69 56 62 Z" fill="#E11D48" stroke="#9F1239" strokeWidth="1.2" />
                <path d="M 46 65 Q 50 64 54 65" fill="#FDA4AF" />
              </g>
            ) : (
              /* Normal Idle Cat Smile */
              <path d="M 45 63 Q 50 66.5 55 63" fill="none" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" />
            )}
          </g>

          {/* =================================================================
              9. FOOD ITEM LAYER (Appears during Eating animation)
             ================================================================= */}
          {effectiveState === 'eat' && (
            <g className="mochi-food-item" transform="translate(50, 68)">
              {/* Cute little strawberry treat */}
              <path d="M -4 -3 Q 0 -8 4 -3 Q 6 3 0 7 Q -6 3 -4 -3 Z" fill="url(#strawberry-grad)" stroke="#9F1239" strokeWidth="1" />
              {/* Tiny green leaves on top */}
              <polygon points="0,-7 -2,-5 0,-4 2,-5" fill="#22C55E" />
              {/* Little seeds */}
              <circle cx="-1" cy="0" r="0.6" fill="#FDE047" />
              <circle cx="2" cy="1" r="0.6" fill="#FDE047" />
              <circle cx="0" cy="3" r="0.6" fill="#FDE047" />
              {/* Biting crumbs sparkles */}
              <circle cx="-6" cy="-2" r="1" fill="#FDE047" className="crumb-1" />
              <circle cx="7" cy="0" r="0.8" fill="#FDE047" className="crumb-2" />
            </g>
          )}

          {/* =================================================================
              10. SLEEP FLOATING ZZZ LAYER
             ================================================================= */}
          {effectiveState === 'sleep' && (
            <g className="mochi-zzz-group">
              <text x="64" y="44" fontSize="10" fontWeight="bold" fill="#818CF8" className="mochi-zzz zzz-1">Z</text>
              <text x="72" y="34" fontSize="8" fontWeight="bold" fill="#A78BFA" className="mochi-zzz zzz-2">z</text>
              <text x="78" y="24" fontSize="6.5" fontWeight="bold" fill="#C084FC" className="mochi-zzz zzz-3">z</text>
            </g>
          )}

          {/* =================================================================
              11. TWO ORANGE ANTENNAE LAYER
             ================================================================= */}
          <g className="mochi-antennae-group">
            {/* Left Orange Antenna */}
            <g className="mochi-antenna antenna-left">
              <path
                d="M 38 33 Q 28 18 24 20"
                fill="none"
                stroke="#F97316"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <circle cx="23" cy="20" r="3.2" fill="#FB923C" stroke="#EA580C" strokeWidth="1" />
              <circle cx="22" cy="19" r="1" fill="#FFEDD5" />
            </g>

            {/* Right Orange Antenna */}
            <g className="mochi-antenna antenna-right">
              <path
                d="M 62 33 Q 72 18 76 20"
                fill="none"
                stroke="#F97316"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <circle cx="77" cy="20" r="3.2" fill="#FB923C" stroke="#EA580C" strokeWidth="1" />
              <circle cx="76" cy="19" r="1" fill="#FFEDD5" />
            </g>
          </g>

          {/* =================================================================
              12. GREEN SPROUT ON TOP LAYER
             ================================================================= */}
          <g className="mochi-sprout-group">
            {status === 'failed' ? (
              <g>
                <path d="M 50 33 Q 55 24 63 29" stroke="#7A8050" strokeWidth="3" fill="none" strokeLinecap="round" />
                <ellipse cx="64" cy="30" rx="6" ry="3.5" fill="#8C885B" stroke="#5E5C38" strokeWidth="1.5" transform="rotate(25 64 30)" />
              </g>
            ) : isDone ? (
              /* Bloomed flower on top */
              <g transform="translate(50, 16)">
                <path d="M 0 16 Q 0 8 0 0" stroke="#4D9E56" strokeWidth="3" fill="none" strokeLinecap="round" />
                <circle cx="0" cy="-6" r="4.2" fill="#FF9EBB" stroke="#E0698B" strokeWidth="1" />
                <circle cx="5.7" cy="-1.8" r="4.2" fill="#FF9EBB" stroke="#E0698B" strokeWidth="1" />
                <circle cx="3.5" cy="5" r="4.2" fill="#FF9EBB" stroke="#E0698B" strokeWidth="1" />
                <circle cx="-3.5" cy="5" r="4.2" fill="#FF9EBB" stroke="#E0698B" strokeWidth="1" />
                <circle cx="-5.7" cy="-1.8" r="4.2" fill="#FF9EBB" stroke="#E0698B" strokeWidth="1" />
                <circle cx="0" cy="0" r="3.2" fill="#FFE066" stroke="#DDA82C" strokeWidth="0.8" />
              </g>
            ) : (
              /* Cute Green Sprout with Swaying Leaves */
              <g className="mochi-sprout-sway">
                {/* Sprout Stem */}
                <path d="M 50 33 Q 50 20 51 14" stroke="#16A34A" strokeWidth="2.8" fill="none" strokeLinecap="round" />
                {/* Right Leaf */}
                <path
                  d="M 51 14 C 54 6, 65 7, 65 12 C 65 17, 57 17, 51 14 Z"
                  fill="#4ADE80"
                  stroke="#15803D"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                {/* Left Leaf */}
                <path
                  d="M 51 15 C 48 9, 39 10, 39 14 C 39 18, 46 17, 51 15 Z"
                  fill="#22C55E"
                  stroke="#15803D"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </g>
            )}
          </g>

          {/* =================================================================
              13. WEARABLE HEADWEAR & MODEL ACCESSORIES
             ================================================================= */}
          {/* --- MODEL HEADPIECES --- */}
          {modelStyle === 'celestial' && (
            <g className="mochi-headpiece headpiece-crown" transform="translate(36, 17)">
              <polygon points="0,15 3,5 7,12 14,0 21,12 25,5 28,15" fill="#FFD700" stroke="#C49B00" strokeWidth="1.2" />
              <circle cx="14" cy="3" r="2" fill="#FF4477" />
            </g>
          )}

          {modelStyle === 'cyber' && (
            <g className="mochi-headpiece headpiece-cyber" transform="translate(31, 52)">
              <rect x="0" y="0" width="38" height="9" rx="3" fill="#00F0FF" stroke="#007799" strokeWidth="1.5" opacity="0.88" />
              <line x1="4" y1="4.5" x2="34" y2="4.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          )}

          {modelStyle === 'dragon' && (
            <g className="mochi-headpiece headpiece-horns">
              <path d="M 28 35 Q 22 22 18 20 Q 24 25 31 32" fill="#FFAA33" stroke="#C4603B" strokeWidth="1.2" />
              <path d="M 72 35 Q 78 22 82 20 Q 76 25 69 32" fill="#FFAA33" stroke="#C4603B" strokeWidth="1.2" />
            </g>
          )}

          {modelStyle === 'angel' && (
            <g className="mochi-headpiece headpiece-halo" transform="translate(36, 12)">
              <ellipse cx="14" cy="4" rx="14" ry="4.5" fill="none" stroke="#FDE047" strokeWidth="2.5" />
            </g>
          )}

          {modelStyle === 'galaxy' && (
            <g className="mochi-headpiece headpiece-moon" transform="translate(42, 10)">
              <path d="M 8 0 A 7 7 0 1 0 16 11 A 9 9 0 0 1 8 0 Z" fill="#FDE047" stroke="#CA8A04" strokeWidth="1" />
            </g>
          )}

          {modelStyle === 'phoenix' && (
            <g className="mochi-headpiece headpiece-phoenix" transform="translate(45, 12)">
              <path d="M 5 15 Q 12 0 5 -6 Q -2 0 5 15" fill="#F97316" stroke="#C2410C" strokeWidth="1.2" />
            </g>
          )}

          {modelStyle === 'frost' && (
            <g className="mochi-headpiece headpiece-frost">
              <path d="M 30 35 L 26 22 L 20 26 M 26 22 L 32 18" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
              <path d="M 70 35 L 74 22 L 80 26 M 74 22 L 68 18" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
            </g>
          )}

          {/* --- AGENT HATS --- */}
          {agentGear === 'worker' && (
            <g className="mochi-hat hat-worker" transform="translate(28, 18)">
              <path d="M 4 14 Q 22 0 40 14" fill="#FFCC00" stroke="#B88A00" strokeWidth="2" />
              <rect x="0" y="13" width="44" height="4.5" rx="2" fill="#FFAA00" stroke="#B87700" strokeWidth="1.2" />
            </g>
          )}

          {agentGear === 'research' && (
            <g className="mochi-hat hat-research" transform="translate(32, 53)">
              <circle cx="8" cy="5" r="7" fill="rgba(255,255,255,0.4)" stroke="#A07820" strokeWidth="1.8" />
              <circle cx="28" cy="5" r="7" fill="rgba(255,255,255,0.4)" stroke="#A07820" strokeWidth="1.8" />
              <line x1="15" y1="5" x2="21" y2="5" stroke="#A07820" strokeWidth="1.8" />
            </g>
          )}

          {agentGear === 'conductor' && (
            <g className="mochi-hat hat-conductor" transform="translate(29, 14)">
              <path d="M 4 16 L 8 4 L 34 4 L 38 16 Z" fill="#2D3748" stroke="#1A202C" strokeWidth="1.8" />
              <path d="M 0 16 Q 21 11 42 16" fill="#1A202C" stroke="#10151C" strokeWidth="2" />
              <polygon points="21,7 23,11 27,11 24,13 25,16 21,14 17,16 18,13 15,11 19,11" fill="#FFD700" />
            </g>
          )}

          {agentGear === 'executor' && (
            <g className="mochi-hat hat-executor" transform="translate(24, 38)">
              <rect x="0" y="0" width="52" height="6" rx="3" fill="#FF4444" stroke="#B31B1B" strokeWidth="1.5" />
              <path d="M 0 3 Q -10 6 -12 14" fill="none" stroke="#FF4444" strokeWidth="3" strokeLinecap="round" />
            </g>
          )}

          {agentGear === 'coder' && (
            <g className="mochi-hat hat-coder">
              <path d="M 22 55 Q 22 28 50 28 Q 78 28 78 55" fill="none" stroke="#4A5568" strokeWidth="4" />
              <ellipse cx="20" cy="56" rx="5" ry="8" fill="#E2E8F0" stroke="#4A5568" strokeWidth="2" />
              <ellipse cx="80" cy="56" rx="5" ry="8" fill="#E2E8F0" stroke="#4A5568" strokeWidth="2" />
            </g>
          )}

          {agentGear === 'reviewer' && (
            <g className="mochi-hat hat-reviewer" transform="translate(26, 17)">
              <path d="M 8 16 Q 24 6 40 16 Z" fill="#8B6F4E" stroke="#5D4730" strokeWidth="1.8" />
              <path d="M 0 16 Q 24 10 48 16" fill="#6E553B" stroke="#483623" strokeWidth="1.8" />
            </g>
          )}

          {agentGear === 'creative' && (
            <g className="mochi-hat hat-creative" transform="translate(28, 18)">
              <ellipse cx="22" cy="10" rx="19" ry="8" fill="#FF85A2" stroke="#CC4E6E" strokeWidth="1.8" transform="rotate(-12 22 10)" />
              <circle cx="20" cy="2" r="2.5" fill="#CC4E6E" />
            </g>
          )}

          {agentGear === 'wizard' && (
            <g className="mochi-hat hat-wizard" transform="translate(30, 8)">
              <path d="M 5 22 L 20 0 L 35 22 Z" fill="#6B21A8" stroke="#4C1D95" strokeWidth="1.8" />
              <ellipse cx="20" cy="22" rx="22" ry="4" fill="#581C87" stroke="#3B0764" strokeWidth="1.5" />
              <circle cx="20" cy="11" r="2" fill="#FDE047" />
            </g>
          )}

          {agentGear === 'chef' && (
            <g className="mochi-hat hat-chef" transform="translate(32, 12)">
              <path d="M 6 18 C 0 14 0 6 8 4 C 12 -2 24 -2 28 4 C 36 6 36 14 30 18 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
              <rect x="6" y="16" width="24" height="4" rx="1" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
            </g>
          )}

          {agentGear === 'botanist' && (
            <g className="mochi-hat hat-botanist" transform="translate(26, 26)">
              <path d="M 0 6 Q 24 0 48 6" fill="none" stroke="#16A34A" strokeWidth="2.5" />
              <circle cx="12" cy="3" r="3" fill="#F472B6" />
              <circle cx="24" cy="2" r="3.5" fill="#FBBF24" />
              <circle cx="36" cy="3" r="3" fill="#60A5FA" />
            </g>
          )}

          {agentGear === 'gamer' && (
            <g className="mochi-hat hat-gamer" transform="translate(24, 28)">
              <path d="M 4 25 Q 4 4 26 4 Q 48 4 48 25" fill="none" stroke="#F472B6" strokeWidth="3" />
              <polygon points="8,8 2,-2 14,3" fill="#F472B6" stroke="#DB2777" strokeWidth="1.2" />
              <polygon points="44,8 50,-2 38,3" fill="#F472B6" stroke="#DB2777" strokeWidth="1.2" />
            </g>
          )}

          {agentGear === 'royal' && (
            <g className="mochi-hat hat-royal" transform="translate(36, 17)">
              <polygon points="0,15 3,5 7,12 14,0 21,12 25,5 28,15" fill="#FFD700" stroke="#C49B00" strokeWidth="1.2" />
              <circle cx="14" cy="3" r="2" fill="#3B82F6" />
            </g>
          )}

          {/* Leader Flag */}
          {isLeader && (
            <g className="mochi-leader-flag" transform="translate(56, 12)">
              <line x1="0" y1="0" x2="0" y2="24" stroke="#8A4A1C" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M 0 0 L 14 5 L 0 10 Z" fill="#FF5252" stroke="#B82E2E" strokeWidth="1" />
            </g>
          )}
        </g>
      </svg>

      {/* Floating Hearts when Poked */}
      {hearts.map((h) => (
        <span
          key={h.id}
          className="mochi-floating-heart"
          style={{ left: h.x, top: h.y }}
        >
          💖
        </span>
      ))}

      {/* Petal Burst on completion */}
      {celebrate && (
        <div className="haru-garden-petal-burst" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((p) => (
            <span key={p} className="haru-garden-petal" style={{ '--p': p } as React.CSSProperties} />
          ))}
        </div>
      )}
    </div>
  );
};
