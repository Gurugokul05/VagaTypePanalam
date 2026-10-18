'use client';

import React, { useState, useEffect } from 'react';

export type MascotMood = 'idle' | 'typing' | 'fire' | 'celebrate' | 'oops';

interface TypingMascotProps {
  mood?: MascotMood;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  showSpeech?: boolean;
  onMascotClick?: () => void;
  className?: string;
}

const DEFAULT_SPEECH_BY_MOOD: Record<MascotMood, string[]> = {
  idle: [
    'Ready when you are! Rest fingers on A S D F and J K L ; ✨',
    'Feel the bumps on F & J keys? That is home base!',
    'Keep your wrists relaxed and eyes on the screen!',
    'Consistency beats speed every single time! 🎯',
  ],
  typing: [
    'Smooth rhythm! Let muscle memory guide your fingers...',
    'Focus on accuracy first, speed will naturally follow!',
    'Great tempo, keep that cadence going!',
  ],
  fire: [
    'SPEED DEMON! You are flying through this! 🔥',
    'Unstoppable streak! Incredible muscle memory! ⚡',
    'Combo multiplier active! Keep that momentum! 🚀',
  ],
  celebrate: [
    'WOOHOO! Level Cleared! You nailed it! 🏆',
    'Magnificent typing! Muscle memory leveled up! ⭐',
    'Sensational accuracy! Ready for the next challenge? 🎉',
  ],
  oops: [
    'No worries at all! Reset to home row and breathe...',
    'Mistakes are just muscle memory calibrating! Keep going!',
    'Slow down by 5% and watch your accuracy soar! 💪',
  ],
};

export default function TypingMascot({
  mood = 'idle',
  message,
  size = 'md',
  showSpeech = true,
  onMascotClick,
  className = '',
}: TypingMascotProps) {
  const [internalSpeech, setInternalSpeech] = useState<string>('');
  const [isBlinking, setIsBlinking] = useState(false);
  const [clickBoing, setClickBoing] = useState(false);

  // Random speech rotation when message is not provided
  useEffect(() => {
    if (message) {
      setInternalSpeech(message);
      return;
    }
    const options = DEFAULT_SPEECH_BY_MOOD[mood] || DEFAULT_SPEECH_BY_MOOD.idle;
    const randomPick = options[Math.floor(Math.random() * options.length)];
    setInternalSpeech(randomPick);
  }, [mood, message]);

  // Periodic blinking effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 180);
    }, 3800 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  const handleClick = () => {
    setClickBoing(true);
    setTimeout(() => setClickBoing(false), 450);
    const compliments = [
      'Beep boop! You got this! 🤖',
      'Purr-fect posture! Keep fingers curved! 🐾',
      '100% focused mode activated! 🚀',
      'I believe in your keyboard journey! ⭐',
    ];
    setInternalSpeech(compliments[Math.floor(Math.random() * compliments.length)]);
    if (onMascotClick) onMascotClick();
  };

  const dimensions = {
    sm: { width: 90, height: 95 },
    md: { width: 130, height: 135 },
    lg: { width: 170, height: 175 },
  }[size];

  return (
    <div className={`mascot-companion-wrap size-${size} ${className}`}>
      {/* ── Dynamic Speech Bubble ── */}
      {showSpeech && internalSpeech && (
        <div className={`mascot-speech-bubble mood-${mood}`}>
          <div className="bubble-tail" />
          <p className="bubble-text">{internalSpeech}</p>
        </div>
      )}

      {/* ── The Mascot Avatar ── */}
      <div
        className={`mascot-figure mood-${mood} ${clickBoing ? 'boing' : ''}`}
        style={{ width: dimensions.width, height: dimensions.height }}
        onClick={handleClick}
        title="I am Vanga, your typing sidekick! Click me for encouragement!"
        role="button"
        tabIndex={0}
      >
        <svg
          viewBox="0 0 160 165"
          className="mascot-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Body Gradients */}
            <linearGradient id="mascot-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>

            <linearGradient id="mascot-face-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e1f29" />
              <stop offset="100%" stopColor="#14151e" />
            </linearGradient>

            <linearGradient id="mascot-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#eec224" />
            </linearGradient>

            {/* Glowing Aura filter */}
            <filter id="mascot-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ── Hover Shadow / Antigravity Ring ── */}
          <ellipse
            cx="80"
            cy="154"
            rx="42"
            ry="7"
            className="mascot-hover-shadow"
            fill="rgba(129, 140, 248, 0.25)"
          />
          <ellipse
            cx="80"
            cy="154"
            rx="28"
            ry="4"
            className="mascot-core-ring"
            fill="rgba(238, 194, 36, 0.4)"
          />

          {/* ── Mascot Ears (Cyber Cat) ── */}
          <g className="mascot-ears">
            {/* Left Ear */}
            <path
              d="M 38 60 L 22 24 C 22 24, 48 30, 58 46 Z"
              fill="url(#mascot-body-grad)"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2"
            />
            <path
              d="M 36 50 L 28 32 C 28 32, 42 35, 48 44 Z"
              fill={mood === 'fire' ? '#fbbf24' : '#a5b4fc'}
            />

            {/* Right Ear */}
            <path
              d="M 122 60 L 138 24 C 138 24, 112 30, 102 46 Z"
              fill="url(#mascot-body-grad)"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2"
            />
            <path
              d="M 124 50 L 132 32 C 132 32, 118 35, 112 44 Z"
              fill={mood === 'fire' ? '#fbbf24' : '#a5b4fc'}
            />
          </g>

          {/* ── Headphone Headband ── */}
          <path
            d="M 28 80 C 24 35, 136 35, 132 80"
            fill="none"
            stroke="var(--bg-overlay, #22232e)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M 32 76 C 30 42, 130 42, 128 76"
            fill="none"
            stroke="url(#mascot-gold-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* ── Main Head / Helmet ── */}
          <rect
            x="28"
            y="44"
            width="104"
            height="86"
            rx="42"
            fill="url(#mascot-body-grad)"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="2.5"
          />

          {/* ── Face Visor Screen ── */}
          <rect
            x="38"
            y="54"
            width="84"
            height="66"
            rx="30"
            fill="url(#mascot-face-grad)"
            stroke="rgba(129, 140, 248, 0.4)"
            strokeWidth="2"
          />

          {/* ── Headphone Ear Cups ── */}
          <g className="headphone-cups">
            {/* Left Cup */}
            <rect x="20" y="68" width="13" height="30" rx="6" fill="#1e1f2b" stroke="#818cf8" strokeWidth="2" />
            <circle cx="26.5" cy="83" r="3.5" fill="#eec224" />
            {/* Right Cup with Mic */}
            <rect x="127" y="68" width="13" height="30" rx="6" fill="#1e1f2b" stroke="#818cf8" strokeWidth="2" />
            <circle cx="133.5" cy="83" r="3.5" fill="#eec224" />
            {/* Microphone Arm */}
            <path
              d="M 132 86 C 138 108, 114 116, 102 114"
              fill="none"
              stroke="#818cf8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="100" cy="114" r="3" fill="#34d399" />
          </g>

          {/* ── Visor Screen Highlights (Glass Glare) ── */}
          <path
            d="M 46 64 Q 68 58 92 64"
            fill="none"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* ── Cheeks Glow ── */}
          <circle cx="50" cy="98" r="6" fill="rgba(244, 114, 182, 0.35)" />
          <circle cx="110" cy="98" r="6" fill="rgba(244, 114, 182, 0.35)" />

          {/* ── Animated Eyes ── */}
          <g className="mascot-eyes">
            {isBlinking ? (
              // Blink State: closed happy lines
              <>
                <path d="M 54 85 Q 64 89 72 85" fill="none" stroke="#60a5fa" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M 88 85 Q 96 89 106 85" fill="none" stroke="#60a5fa" strokeWidth="3.5" strokeLinecap="round" />
              </>
            ) : mood === 'fire' ? (
              // Fire / Super Streak: Star Eyes!
              <>
                <polygon points="63,73 66,80 73,81 68,86 69,93 63,89 57,93 58,86 53,81 60,80" fill="#fef08a" filter="url(#mascot-glow)" />
                <polygon points="97,73 100,80 107,81 102,86 103,93 97,89 91,93 92,86 87,81 94,80" fill="#fef08a" filter="url(#mascot-glow)" />
              </>
            ) : mood === 'celebrate' ? (
              // Celebrate: Happy ^ ^ Eyes!
              <>
                <path d="M 52 87 Q 63 75 74 87" fill="none" stroke="#34d399" strokeWidth="4" strokeLinecap="round" />
                <path d="M 86 87 Q 97 75 108 87" fill="none" stroke="#34d399" strokeWidth="4" strokeLinecap="round" />
              </>
            ) : mood === 'oops' ? (
              // Encouraging / Soft Eyes
              <>
                <ellipse cx="63" cy="85" rx="8" ry="10" fill="#a5b4fc" />
                <circle cx="65" cy="82" r="3" fill="#ffffff" />
                <ellipse cx="97" cy="85" rx="8" ry="10" fill="#a5b4fc" />
                <circle cx="99" cy="82" r="3" fill="#ffffff" />
              </>
            ) : mood === 'typing' ? (
              // Focused / Determined Eyes
              <>
                <ellipse cx="63" cy="85" rx="8.5" ry="9" fill="#818cf8" />
                <circle cx="65" cy="82" r="3.5" fill="#ffffff" />
                <circle cx="61" cy="88" r="1.5" fill="#c7d2fe" />
                <ellipse cx="97" cy="85" rx="8.5" ry="9" fill="#818cf8" />
                <circle cx="99" cy="82" r="3.5" fill="#ffffff" />
                <circle cx="95" cy="88" r="1.5" fill="#c7d2fe" />
              </>
            ) : (
              // Standard Idle: Big Friendly Eyes with Highlights
              <>
                <ellipse cx="63" cy="84" rx="9" ry="11" fill="#60a5fa" />
                <circle cx="66" cy="80" r="3.5" fill="#ffffff" />
                <circle cx="61" cy="87" r="1.8" fill="#dbeafe" />

                <ellipse cx="97" cy="84" rx="9" ry="11" fill="#60a5fa" />
                <circle cx="100" cy="80" r="3.5" fill="#ffffff" />
                <circle cx="95" cy="87" r="1.8" fill="#dbeafe" />
              </>
            )}
          </g>

          {/* ── Cute Cat Mouth ── */}
          <path
            d="M 74 98 Q 80 102 86 98"
            fill="none"
            stroke="#a5b4fc"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* ── Mini Hologram Keyboard Paws ── */}
          <g className="mascot-paws">
            {/* Hologram keyboard wireframe */}
            <path
              d="M 52 136 L 108 136 L 116 146 L 44 146 Z"
              fill="rgba(129, 140, 248, 0.15)"
              stroke="rgba(129, 140, 248, 0.4)"
              strokeWidth="1.5"
            />
            {/* Key lines */}
            <line x1="60" y1="138" x2="100" y2="138" stroke="rgba(238,194,36,0.6)" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="56" y1="142" x2="104" y2="142" stroke="rgba(52,211,153,0.6)" strokeWidth="1" strokeDasharray="4 3" />

            {/* Left Paw */}
            <ellipse
              cx="58"
              cy={mood === 'typing' ? '133' : '136'}
              rx="9"
              ry="7"
              fill="#c7d2fe"
              stroke="#6366f1"
              strokeWidth="1.5"
              className={mood === 'typing' ? 'paw-tap-left' : ''}
            />
            {/* Right Paw */}
            <ellipse
              cx="102"
              cy={mood === 'typing' ? '137' : '136'}
              rx="9"
              ry="7"
              fill="#c7d2fe"
              stroke="#6366f1"
              strokeWidth="1.5"
              className={mood === 'typing' ? 'paw-tap-right' : ''}
            />
          </g>
        </svg>
      </div>

      <style jsx>{`
        .mascot-companion-wrap {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          user-select: none;
        }

        .mascot-figure {
          cursor: pointer;
          position: relative;
          animation: mascotFloat 3.5s ease-in-out infinite;
          transform-origin: center bottom;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .mascot-figure:hover {
          transform: scale(1.06) translateY(-4px);
        }

        .mascot-figure.boing {
          animation: mascotBoing 0.45s ease forwards;
        }

        .mascot-svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        /* Float Animation */
        @keyframes mascotFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        /* Click Boing Bounce */
        @keyframes mascotBoing {
          0% { transform: scale(1); }
          30% { transform: scale(1.18, 0.82) translateY(6px); }
          60% { transform: scale(0.9, 1.15) translateY(-12px); }
          80% { transform: scale(1.05, 0.96) translateY(2px); }
          100% { transform: scale(1) translateY(0); }
        }

        /* Mood Adjustments */
        .mascot-figure.mood-fire {
          animation: mascotFire 1.8s ease-in-out infinite alternate;
          filter: drop-shadow(0 0 16px rgba(251, 191, 36, 0.45));
        }

        @keyframes mascotFire {
          0% { transform: translateY(-2px) scale(1.02); }
          100% { transform: translateY(-10px) scale(1.06) rotate(1.5deg); }
        }

        .mascot-figure.mood-celebrate {
          animation: mascotCelebrate 0.8s ease-in-out infinite alternate;
          filter: drop-shadow(0 0 16px rgba(52, 211, 153, 0.45));
        }

        @keyframes mascotCelebrate {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-14px) scale(1.08); }
        }

        /* Paw typing taps */
        :global(.paw-tap-left) {
          animation: pawTapLeft 0.22s ease infinite alternate;
        }
        :global(.paw-tap-right) {
          animation: pawTapRight 0.22s ease infinite alternate 0.11s;
        }

        @keyframes pawTapLeft {
          0% { transform: translateY(0); }
          100% { transform: translateY(3px); }
        }
        @keyframes pawTapRight {
          0% { transform: translateY(0); }
          100% { transform: translateY(3px); }
        }

        /* Speech Bubble */
        .mascot-speech-bubble {
          position: relative;
          background: var(--bg-surface, #181920);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
          border-radius: var(--radius-lg, 14px);
          padding: 8px 14px;
          margin-bottom: 10px;
          max-width: 260px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
          animation: bubblePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .bubble-text {
          font-size: 11.5px;
          line-height: 1.45;
          font-weight: 600;
          color: var(--text-primary, #e2e8f0);
          margin: 0;
          text-align: center;
        }

        .bubble-tail {
          position: absolute;
          bottom: -7px;
          left: 50%;
          transform: translateX(-50%) rotate(45deg);
          width: 12px;
          height: 12px;
          background: var(--bg-surface, #181920);
          border-right: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
          border-bottom: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
        }

        /* Mood themes for bubble */
        .mascot-speech-bubble.mood-fire {
          border-color: rgba(251, 191, 36, 0.4);
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(20, 21, 30, 0.95));
        }
        .mascot-speech-bubble.mood-celebrate {
          border-color: rgba(52, 211, 153, 0.5);
          background: linear-gradient(135deg, rgba(52, 211, 153, 0.1), rgba(20, 21, 30, 0.95));
        }

        @keyframes bubblePop {
          0% { opacity: 0; transform: scale(0.85) translateY(6px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        @media (max-width: 640px) {
          .mascot-speech-bubble {
            max-width: 200px;
            padding: 6px 10px;
          }
          .bubble-text {
            font-size: 10.5px;
          }
        }
      `}</style>
    </div>
  );
}
