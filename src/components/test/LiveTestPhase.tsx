'use client';

import { useRef, useEffect } from 'react';
import TypingArea from '@/components/typing/TypingArea';
import { useTypingStore } from '@/store/typingStore';
import type { Session } from '@/db/schema';
import { ProgressBar } from './ProgressBar';

interface LiveTestPhaseProps {
  language: 'en' | 'ta' | 'tanglish';
  selectedDuration: number;
  secondsLeft: number;
  running: boolean;
  onFirstKey: () => void;
  onComplete: (session: Session) => void;
}

export function LiveTestPhase({
  language,
  selectedDuration,
  secondsLeft,
  running,
  onFirstKey,
  onComplete,
}: LiveTestPhaseProps) {
  const { snapshot } = useTypingStore();
  const pct = Math.round(((selectedDuration - secondsLeft) / selectedDuration) * 100);
  const timerColor =
    secondsLeft <= 10
      ? 'var(--color-error)'
      : secondsLeft <= 20
        ? 'var(--color-accent)'
        : 'var(--color-primary-light)';

  return (
    <>
      <ProgressBar pct={pct} />

      <div className="test-live-hud">
        <div className={`test-timer-badge ${secondsLeft <= 10 && running ? 'timer-urgent' : ''}`}>
          <div className="timer-ring-svg-wrap">
            <svg viewBox="0 0 40 40" className="timer-svg">
              <circle cx="20" cy="20" r="17" className="timer-svg-bg" />
              <circle
                cx="20"
                cy="20"
                r="17"
                className="timer-svg-fg"
                style={{
                  stroke: timerColor,
                  strokeDashoffset: `${2 * Math.PI * 17 * (1 - pct / 100)}`,
                }}
              />
            </svg>
            <span className="timer-value" style={{ color: timerColor }}>
              {secondsLeft}
            </span>
          </div>
          <span className="timer-unit">SEC</span>
        </div>

        <div className="test-hud-stats">
          <div className="hud-stat-pill">
            <span className="hud-label">LIVE WPM</span>
            <span className="hud-val hud-wpm">{Math.round(snapshot.wpm)}</span>
          </div>
          <div className="hud-stat-pill">
            <span className="hud-label">ACCURACY</span>
            <span className="hud-val hud-acc">{(snapshot.accuracy * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div className="typing-area-wrapper">
        {!running && snapshot.wpm === 0 && (
          <div className="typing-start-prompt">
            <span className="prompt-dot" />
            <span>Type any character below to initiate countdown</span>
          </div>
        )}
        <TimedTypingWrapper
          language={language}
          durationSeconds={secondsLeft === selectedDuration ? selectedDuration : 0}
          onFirstKey={onFirstKey}
          onComplete={onComplete}
          timeUp={running && secondsLeft === 0}
        />
      </div>
    </>
  );
}

function TimedTypingWrapper({
  language,
  onFirstKey,
  onComplete,
  timeUp,
}: {
  language: 'en' | 'ta' | 'tanglish';
  durationSeconds: number;
  onFirstKey: () => void;
  onComplete: (s: Session) => void;
  timeUp: boolean;
}) {
  const triggered = useRef(false);

  useEffect(() => {
    return () => {
      triggered.current = false;
    };
  }, []);

  return (
    <div
      onKeyDownCapture={() => {
        if (!triggered.current) {
          triggered.current = true;
          onFirstKey();
        }
      }}
    >
      <TypingArea
        language={language}
        mode="test"
        onComplete={onComplete}
        forceComplete={timeUp}
      />
    </div>
  );
}
