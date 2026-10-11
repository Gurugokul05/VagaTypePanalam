'use client';

import { Zap, Timer, Target, Flame, Compass } from 'lucide-react';

const DURATIONS = [
  { sec: 15, label: 'Blitz', icon: Zap },
  { sec: 30, label: 'Sprint', icon: Timer },
  { sec: 60, label: 'Standard', icon: Target },
  { sec: 120, label: 'Endurance', icon: Flame },
  { sec: 300, label: 'Marathon', icon: Compass },
] as const;

export type Duration = (typeof DURATIONS)[number]['sec'];

interface TestHeaderProps {
  selectedDuration: Duration;
  running: boolean;
  onChangeDuration: (d: Duration) => void;
  hideTitle?: boolean;
}

export function TestHeader({ selectedDuration, running, onChangeDuration, hideTitle }: TestHeaderProps) {
  return (
    <div className="test-header">
      {!hideTitle && (
        <div className="test-title-group">
          <div className="test-badge-pill">
            <Timer size={14} className="text-indigo-400" />
            <span>Speed Benchmark</span>
          </div>
          <h1 className="test-title gradient-text">Timed Typing Test</h1>
          <p className="test-subtitle">
            Push your limits, track real-time keystrokes, and earn your speed rank.
          </p>
        </div>
      )}
      <div className="duration-segmented-container">
        <div className="duration-segmented">
          {DURATIONS.map(({ sec, label, icon: Icon }) => {
            const active = selectedDuration === sec;
            return (
              <button
                key={sec}
                className={`duration-seg-pill ${active ? 'active' : ''}`}
                onClick={() => onChangeDuration(sec)}
                disabled={running}
                id={`duration-${sec}s`}
                title={`${label} mode (${sec} seconds)`}
              >
                <Icon size={14} className="duration-icon" />
                <span className="duration-sec">{sec}s</span>
                <span className="duration-label">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
