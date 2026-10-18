'use client';

import React from 'react';

export type FingerType = 'pinky' | 'ring' | 'middle' | 'index' | 'thumb';
export type HandType = 'left' | 'right';

interface HandVisualizerProps {
  targetHand?: HandType | null;
  targetFinger?: FingerType | null;
  targetRow?: number | null;
  targetKeyLabel?: string | null;
  isPressed?: boolean;
  language?: string;
}

const FINGER_NAMES: Record<FingerType, { en: string; ta: string }> = {
  pinky: { en: 'Pinky', ta: 'சுண்டு விரல்' },
  ring: { en: 'Ring', ta: 'மோதிர விரல்' },
  middle: { en: 'Middle', ta: 'நடு விரல்' },
  index: { en: 'Index', ta: 'ஆட்காட்டி விரல்' },
  thumb: { en: 'Thumb', ta: 'பெருவிரல்' },
};

const FINGER_COLORS: Record<FingerType, string> = {
  pinky: 'var(--key-finger-pinky, #df7070)',
  ring: 'var(--key-finger-ring, #dfb070)',
  middle: 'var(--key-finger-middle, #b0df70)',
  index: 'var(--key-finger-index, #70df70)',
  thumb: 'var(--key-finger-thumb, #818cf8)',
};

export default function HandVisualizer({
  targetHand,
  targetFinger,
  targetRow = 2,
  targetKeyLabel,
  isPressed = false,
  language = 'en',
}: HandVisualizerProps) {
  // Guidance description
  const getActionHint = () => {
    if (!targetFinger) return 'Rest fingers on the home row (A S D F — J K L ;)';
    if (targetFinger === 'thumb') return 'Tap the space bar with your thumb';
    if (targetRow === 0) return `Reach up to the number row for '${targetKeyLabel}'`;
    if (targetRow === 1) return `Reach up to the top row for '${targetKeyLabel}'`;
    if (targetRow === 2) return `Tap the home row key '${targetKeyLabel}'`;
    if (targetRow === 3) return `Reach down to the bottom row for '${targetKeyLabel}'`;
    return `Press '${targetKeyLabel}'`;
  };

  const getFingerOffset = (hand: HandType, finger: FingerType): string => {
    const isActive = targetHand === hand && targetFinger === finger;
    if (!isActive) return 'translate(0px, 0px)';

    if (isPressed) {
      return 'translate(0px, 4px) scale(0.96)';
    }

    if (finger === 'thumb') {
      return hand === 'left'
        ? 'translate(4px, -3px) rotate(4deg)'
        : 'translate(-4px, -3px) rotate(-4deg)';
    }

    // Reach calculations according to row
    if (targetRow === 0) return 'translate(0px, -14px) scale(1.05)';
    if (targetRow === 1) return 'translate(0px, -10px) scale(1.04)';
    if (targetRow === 2) return 'translate(0px, 1px) scale(0.96)';
    if (targetRow === 3) return 'translate(0px, 9px) scale(0.96)';

    return 'translate(0px, -4px)';
  };

  return (
    <div className="hand-visualizer-container" role="region" aria-label="Interactive Hand Guide">
      {/* ── Guidance Banner ── */}
      <div className="hand-guide-banner">
        <div className="banner-left">
          {targetHand && targetFinger ? (
            <div className="active-finger-pill" style={{ borderColor: FINGER_COLORS[targetFinger] }}>
              <span
                className="finger-color-dot"
                style={{ backgroundColor: FINGER_COLORS[targetFinger] }}
              />
              <span className="pill-hand">
                {targetHand === 'left' ? 'Left' : 'Right'} Hand
              </span>
              <span className="pill-separator">•</span>
              <span className="pill-finger">
                {language === 'ta'
                  ? `${FINGER_NAMES[targetFinger].ta} (${FINGER_NAMES[targetFinger].en})`
                  : `${FINGER_NAMES[targetFinger].en} Finger`}
              </span>
            </div>
          ) : (
            <div className="active-finger-pill neutral">
              <span className="finger-color-dot neutral" />
              <span>Home Row Ready</span>
            </div>
          )}

          {targetKeyLabel && (
            <div className="target-key-bubble" title="Next target key">
              <span className="bubble-label">KEY</span>
              <span className="bubble-key">{targetKeyLabel}</span>
            </div>
          )}
        </div>

        <div className="banner-hint">
          <span>{getActionHint()}</span>
        </div>
      </div>

      {/* ── Hands SVG Canvas ── */}
      <div className="hands-row">
        {/* LEFT HAND */}
        <div className={`hand-wrapper left-hand ${targetHand === 'left' ? 'hand-active' : ''}`}>
          <div className="hand-caption">Left Hand</div>
          <svg
            viewBox="0 0 240 220"
            className="hand-svg"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Left Hand Touch Typing Guide"
          >
            <defs>
              <linearGradient id="lh-palm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--bg-elevated, #1c1d22)" />
                <stop offset="100%" stopColor="var(--bg-overlay, #15161a)" />
              </linearGradient>
              <filter id="lh-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Palm & Wrist Base */}
            <path
              d="M 52 215 C 45 180, 40 148, 42 120 C 44 98, 62 90, 84 88 C 114 86, 142 88, 168 96 C 188 106, 196 128, 185 160 C 172 195, 155 215, 142 215 Z"
              fill="url(#lh-palm-grad)"
              stroke="var(--border-default, rgba(255,255,255,0.08))"
              strokeWidth="2"
            />
            {/* Palm Crease lines for realism */}
            <path
              d="M 68 135 Q 110 145 152 125"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M 85 160 Q 120 170 145 152"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* PINKY (Left) */}
            <g
              className={`finger-group ${targetHand === 'left' && targetFinger === 'pinky' ? 'active' : ''}`}
              style={{
                transform: getFingerOffset('left', 'pinky'),
                transformOrigin: '40px 115px',
              }}
            >
              <rect
                x="28"
                y="38"
                width="24"
                height="75"
                rx="12"
                fill="var(--bg-overlay, #252626)"
                stroke={targetHand === 'left' && targetFinger === 'pinky' ? FINGER_COLORS.pinky : 'rgba(255,255,255,0.08)'}
                strokeWidth={targetHand === 'left' && targetFinger === 'pinky' ? 2.5 : 1.5}
              />
              {/* Knuckle lines */}
              <line x1="33" y1="62" x2="47" y2="62" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
              <line x1="33" y1="84" x2="47" y2="84" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
              {/* Fingertip accent & key label */}
              <circle
                cx="40"
                cy="50"
                r="10"
                fill={targetHand === 'left' && targetFinger === 'pinky' ? FINGER_COLORS.pinky : 'rgba(223, 112, 112, 0.18)'}
                filter={targetHand === 'left' && targetFinger === 'pinky' ? 'url(#lh-glow)' : undefined}
              />
              <text
                x="40"
                y="53"
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill={targetHand === 'left' && targetFinger === 'pinky' ? '#ffffff' : 'var(--text-secondary, #9c9ea1)'}
              >
                {targetHand === 'left' && targetFinger === 'pinky' && targetKeyLabel ? targetKeyLabel : 'A'}
              </text>
            </g>

            {/* RING (Left) */}
            <g
              className={`finger-group ${targetHand === 'left' && targetFinger === 'ring' ? 'active' : ''}`}
              style={{
                transform: getFingerOffset('left', 'ring'),
                transformOrigin: '76px 105px',
              }}
            >
              <rect
                x="64"
                y="20"
                width="24"
                height="92"
                rx="12"
                fill="var(--bg-overlay, #252626)"
                stroke={targetHand === 'left' && targetFinger === 'ring' ? FINGER_COLORS.ring : 'rgba(255,255,255,0.08)'}
                strokeWidth={targetHand === 'left' && targetFinger === 'ring' ? 2.5 : 1.5}
              />
              <line x1="69" y1="48" x2="83" y2="48" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
              <line x1="69" y1="74" x2="83" y2="74" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
              <circle
                cx="76"
                cy="32"
                r="10"
                fill={targetHand === 'left' && targetFinger === 'ring' ? FINGER_COLORS.ring : 'rgba(223, 176, 112, 0.18)'}
                filter={targetHand === 'left' && targetFinger === 'ring' ? 'url(#lh-glow)' : undefined}
              />
              <text
                x="76"
                y="35"
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill={targetHand === 'left' && targetFinger === 'ring' ? '#ffffff' : 'var(--text-secondary, #9c9ea1)'}
              >
                {targetHand === 'left' && targetFinger === 'ring' && targetKeyLabel ? targetKeyLabel : 'S'}
              </text>
            </g>

            {/* MIDDLE (Left) */}
            <g
              className={`finger-group ${targetHand === 'left' && targetFinger === 'middle' ? 'active' : ''}`}
              style={{
                transform: getFingerOffset('left', 'middle'),
                transformOrigin: '112px 100px',
              }}
            >
              <rect
                x="100"
                y="12"
                width="25"
                height="100"
                rx="12.5"
                fill="var(--bg-overlay, #252626)"
                stroke={targetHand === 'left' && targetFinger === 'middle' ? FINGER_COLORS.middle : 'rgba(255,255,255,0.08)'}
                strokeWidth={targetHand === 'left' && targetFinger === 'middle' ? 2.5 : 1.5}
              />
              <line x1="105" y1="42" x2="120" y2="42" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
              <line x1="105" y1="70" x2="120" y2="70" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
              <circle
                cx="112.5"
                cy="24.5"
                r="10"
                fill={targetHand === 'left' && targetFinger === 'middle' ? FINGER_COLORS.middle : 'rgba(176, 223, 112, 0.18)'}
                filter={targetHand === 'left' && targetFinger === 'middle' ? 'url(#lh-glow)' : undefined}
              />
              <text
                x="112.5"
                y="27.5"
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill={targetHand === 'left' && targetFinger === 'middle' ? '#ffffff' : 'var(--text-secondary, #9c9ea1)'}
              >
                {targetHand === 'left' && targetFinger === 'middle' && targetKeyLabel ? targetKeyLabel : 'D'}
              </text>
            </g>

            {/* INDEX (Left - Home Key F with bump marker) */}
            <g
              className={`finger-group ${targetHand === 'left' && targetFinger === 'index' ? 'active' : ''}`}
              style={{
                transform: getFingerOffset('left', 'index'),
                transformOrigin: '148px 105px',
              }}
            >
              <rect
                x="136"
                y="22"
                width="25"
                height="90"
                rx="12.5"
                fill="var(--bg-overlay, #252626)"
                stroke={targetHand === 'left' && targetFinger === 'index' ? FINGER_COLORS.index : 'rgba(255,255,255,0.08)'}
                strokeWidth={targetHand === 'left' && targetFinger === 'index' ? 2.5 : 1.5}
              />
              <line x1="141" y1="50" x2="156" y2="50" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
              <line x1="141" y1="76" x2="156" y2="76" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
              <circle
                cx="148.5"
                cy="34.5"
                r="10"
                fill={targetHand === 'left' && targetFinger === 'index' ? FINGER_COLORS.index : 'rgba(112, 223, 112, 0.18)'}
                filter={targetHand === 'left' && targetFinger === 'index' ? 'url(#lh-glow)' : undefined}
              />
              {/* Home tactile bump under F */}
              <rect x="144" y="47" width="9" height="2" rx="1" fill="rgba(255,255,255,0.35)" />
              <text
                x="148.5"
                y="37.5"
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill={targetHand === 'left' && targetFinger === 'index' ? '#ffffff' : 'var(--text-secondary, #9c9ea1)'}
              >
                {targetHand === 'left' && targetFinger === 'index' && targetKeyLabel ? targetKeyLabel : 'F'}
              </text>
            </g>

            {/* THUMB (Left - Space Bar) */}
            <g
              className={`finger-group ${targetHand === 'left' && targetFinger === 'thumb' ? 'active' : ''}`}
              style={{
                transform: getFingerOffset('left', 'thumb'),
                transformOrigin: '168px 145px',
              }}
            >
              <path
                d="M 166 142 C 178 126, 198 106, 218 94 C 226 89, 235 98, 230 108 C 220 126, 202 148, 185 168 Z"
                fill="var(--bg-overlay, #252626)"
                stroke={targetHand === 'left' && targetFinger === 'thumb' ? FINGER_COLORS.thumb : 'rgba(255,255,255,0.08)'}
                strokeWidth={targetHand === 'left' && targetFinger === 'thumb' ? 2.5 : 1.5}
              />
              <circle
                cx="218"
                cy="102"
                r="9"
                fill={targetHand === 'left' && targetFinger === 'thumb' ? FINGER_COLORS.thumb : 'rgba(129, 140, 248, 0.18)'}
                filter={targetHand === 'left' && targetFinger === 'thumb' ? 'url(#lh-glow)' : undefined}
              />
              <text
                x="218"
                y="105"
                textAnchor="middle"
                fontSize="8"
                fontWeight="700"
                fill={targetHand === 'left' && targetFinger === 'thumb' ? '#ffffff' : 'var(--text-secondary, #9c9ea1)'}
              >
                ␣
              </text>
            </g>
          </svg>
        </div>

        {/* RIGHT HAND */}
        <div className={`hand-wrapper right-hand ${targetHand === 'right' ? 'hand-active' : ''}`}>
          <div className="hand-caption">Right Hand</div>
          <svg
            viewBox="0 0 240 220"
            className="hand-svg"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Right Hand Touch Typing Guide"
          >
            <defs>
              <linearGradient id="rh-palm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--bg-elevated, #1c1d22)" />
                <stop offset="100%" stopColor="var(--bg-overlay, #15161a)" />
              </linearGradient>
              <filter id="rh-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Palm & Wrist Base (Mirrored) */}
            <path
              d="M 98 215 C 85 215, 68 195, 55 160 C 44 128, 52 106, 72 96 C 98 88, 126 86, 156 88 C 178 90, 196 98, 198 120 C 200 148, 195 180, 188 215 Z"
              fill="url(#rh-palm-grad)"
              stroke="var(--border-default, rgba(255,255,255,0.08))"
              strokeWidth="2"
            />
            {/* Palm Creases */}
            <path
              d="M 88 125 Q 130 145 172 135"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M 95 152 Q 120 170 155 160"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* THUMB (Right - Space Bar) */}
            <g
              className={`finger-group ${targetHand === 'right' && targetFinger === 'thumb' ? 'active' : ''}`}
              style={{
                transform: getFingerOffset('right', 'thumb'),
                transformOrigin: '72px 145px',
              }}
            >
              <path
                d="M 74 142 C 62 126, 42 106, 22 94 C 14 89, 5 98, 10 108 C 20 126, 38 148, 55 168 Z"
                fill="var(--bg-overlay, #252626)"
                stroke={targetHand === 'right' && targetFinger === 'thumb' ? FINGER_COLORS.thumb : 'rgba(255,255,255,0.08)'}
                strokeWidth={targetHand === 'right' && targetFinger === 'thumb' ? 2.5 : 1.5}
              />
              <circle
                cx="22"
                cy="102"
                r="9"
                fill={targetHand === 'right' && targetFinger === 'thumb' ? FINGER_COLORS.thumb : 'rgba(129, 140, 248, 0.18)'}
                filter={targetHand === 'right' && targetFinger === 'thumb' ? 'url(#rh-glow)' : undefined}
              />
              <text
                x="22"
                y="105"
                textAnchor="middle"
                fontSize="8"
                fontWeight="700"
                fill={targetHand === 'right' && targetFinger === 'thumb' ? '#ffffff' : 'var(--text-secondary, #9c9ea1)'}
              >
                ␣
              </text>
            </g>

            {/* INDEX (Right - Home Key J with bump marker) */}
            <g
              className={`finger-group ${targetHand === 'right' && targetFinger === 'index' ? 'active' : ''}`}
              style={{
                transform: getFingerOffset('right', 'index'),
                transformOrigin: '91px 105px',
              }}
            >
              <rect
                x="79"
                y="22"
                width="25"
                height="90"
                rx="12.5"
                fill="var(--bg-overlay, #252626)"
                stroke={targetHand === 'right' && targetFinger === 'index' ? FINGER_COLORS.index : 'rgba(255,255,255,0.08)'}
                strokeWidth={targetHand === 'right' && targetFinger === 'index' ? 2.5 : 1.5}
              />
              <line x1="84" y1="50" x2="99" y2="50" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
              <line x1="84" y1="76" x2="99" y2="76" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
              <circle
                cx="91.5"
                cy="34.5"
                r="10"
                fill={targetHand === 'right' && targetFinger === 'index' ? FINGER_COLORS.index : 'rgba(112, 223, 112, 0.18)'}
                filter={targetHand === 'right' && targetFinger === 'index' ? 'url(#rh-glow)' : undefined}
              />
              {/* Home tactile bump under J */}
              <rect x="87" y="47" width="9" height="2" rx="1" fill="rgba(255,255,255,0.35)" />
              <text
                x="91.5"
                y="37.5"
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill={targetHand === 'right' && targetFinger === 'index' ? '#ffffff' : 'var(--text-secondary, #9c9ea1)'}
              >
                {targetHand === 'right' && targetFinger === 'index' && targetKeyLabel ? targetKeyLabel : 'J'}
              </text>
            </g>

            {/* MIDDLE (Right) */}
            <g
              className={`finger-group ${targetHand === 'right' && targetFinger === 'middle' ? 'active' : ''}`}
              style={{
                transform: getFingerOffset('right', 'middle'),
                transformOrigin: '127px 100px',
              }}
            >
              <rect
                x="115"
                y="12"
                width="25"
                height="100"
                rx="12.5"
                fill="var(--bg-overlay, #252626)"
                stroke={targetHand === 'right' && targetFinger === 'middle' ? FINGER_COLORS.middle : 'rgba(255,255,255,0.08)'}
                strokeWidth={targetHand === 'right' && targetFinger === 'middle' ? 2.5 : 1.5}
              />
              <line x1="120" y1="42" x2="135" y2="42" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
              <line x1="120" y1="70" x2="135" y2="70" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
              <circle
                cx="127.5"
                cy="24.5"
                r="10"
                fill={targetHand === 'right' && targetFinger === 'middle' ? FINGER_COLORS.middle : 'rgba(176, 223, 112, 0.18)'}
                filter={targetHand === 'right' && targetFinger === 'middle' ? 'url(#rh-glow)' : undefined}
              />
              <text
                x="127.5"
                y="27.5"
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill={targetHand === 'right' && targetFinger === 'middle' ? '#ffffff' : 'var(--text-secondary, #9c9ea1)'}
              >
                {targetHand === 'right' && targetFinger === 'middle' && targetKeyLabel ? targetKeyLabel : 'K'}
              </text>
            </g>

            {/* RING (Right) */}
            <g
              className={`finger-group ${targetHand === 'right' && targetFinger === 'ring' ? 'active' : ''}`}
              style={{
                transform: getFingerOffset('right', 'ring'),
                transformOrigin: '164px 105px',
              }}
            >
              <rect
                x="152"
                y="20"
                width="24"
                height="92"
                rx="12"
                fill="var(--bg-overlay, #252626)"
                stroke={targetHand === 'right' && targetFinger === 'ring' ? FINGER_COLORS.ring : 'rgba(255,255,255,0.08)'}
                strokeWidth={targetHand === 'right' && targetFinger === 'ring' ? 2.5 : 1.5}
              />
              <line x1="157" y1="48" x2="171" y2="48" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
              <line x1="157" y1="74" x2="171" y2="74" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
              <circle
                cx="164"
                cy="32"
                r="10"
                fill={targetHand === 'right' && targetFinger === 'ring' ? FINGER_COLORS.ring : 'rgba(223, 176, 112, 0.18)'}
                filter={targetHand === 'right' && targetFinger === 'ring' ? 'url(#rh-glow)' : undefined}
              />
              <text
                x="164"
                y="35"
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill={targetHand === 'right' && targetFinger === 'ring' ? '#ffffff' : 'var(--text-secondary, #9c9ea1)'}
              >
                {targetHand === 'right' && targetFinger === 'ring' && targetKeyLabel ? targetKeyLabel : 'L'}
              </text>
            </g>

            {/* PINKY (Right) */}
            <g
              className={`finger-group ${targetHand === 'right' && targetFinger === 'pinky' ? 'active' : ''}`}
              style={{
                transform: getFingerOffset('right', 'pinky'),
                transformOrigin: '200px 115px',
              }}
            >
              <rect
                x="188"
                y="38"
                width="24"
                height="75"
                rx="12"
                fill="var(--bg-overlay, #252626)"
                stroke={targetHand === 'right' && targetFinger === 'pinky' ? FINGER_COLORS.pinky : 'rgba(255,255,255,0.08)'}
                strokeWidth={targetHand === 'right' && targetFinger === 'pinky' ? 2.5 : 1.5}
              />
              <line x1="193" y1="62" x2="207" y2="62" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
              <line x1="193" y1="84" x2="207" y2="84" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
              <circle
                cx="200"
                cy="50"
                r="10"
                fill={targetHand === 'right' && targetFinger === 'pinky' ? FINGER_COLORS.pinky : 'rgba(223, 112, 112, 0.18)'}
                filter={targetHand === 'right' && targetFinger === 'pinky' ? 'url(#rh-glow)' : undefined}
              />
              <text
                x="200"
                y="53"
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill={targetHand === 'right' && targetFinger === 'pinky' ? '#ffffff' : 'var(--text-secondary, #9c9ea1)'}
              >
                {targetHand === 'right' && targetFinger === 'pinky' && targetKeyLabel ? targetKeyLabel : ';'}
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
