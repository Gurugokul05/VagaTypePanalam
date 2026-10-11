'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import TypingArea from '@/components/typing/TypingArea';
import { useUIStore } from '@/store/uiStore';
import { useTypingStore } from '@/store/typingStore';
import { Flag, Trophy, RotateCcw, ArrowRight, Timer, Gauge } from 'lucide-react';
import type { Session } from '@/db/schema';
import { getProfile } from '@/db/profile';

interface DifficultyConfig {
  label: string;
  botWpmRange: [number, number];
  speedLabel: string;
  color: string;
}

const DIFFICULTIES: DifficultyConfig[] = [
  { label: 'Beginner', botWpmRange: [15, 25], speedLabel: '15-25 WPM', color: '#34d399' },
  { label: 'Easy', botWpmRange: [25, 35], speedLabel: '25-35 WPM', color: '#22d3ee' },
  { label: 'Medium', botWpmRange: [35, 50], speedLabel: '35-50 WPM', color: '#818cf8' },
  { label: 'Hard', botWpmRange: [50, 65], speedLabel: '50-65 WPM', color: '#f59e0b' },
  { label: 'Pro', botWpmRange: [65, 85], speedLabel: '65-85 WPM', color: '#f97316' },
  { label: 'Expert', botWpmRange: [85, 105], speedLabel: '85-105 WPM', color: '#ef4444' },
  { label: 'Insane', botWpmRange: [105, 140], speedLabel: '105-140 WPM', color: '#dc2626' },
];

const RACE_TEXTS_BY_LEVEL: Record<string, string[]> = {
  beginner: [
    "The quick brown fox jumps over the lazy dog perfectly.",
    "A fast brown dog jumps over the lazy fox in the park.",
    "She sells sea shells by the sea shore every single day.",
    "Typing is fun when you practice every single day with joy.",
    "The cat sat on the mat and looked at the big red ball.",
  ],
  easy: [
    "Practice makes perfect and typing every day builds muscle memory fast.",
    "Race against the clock to improve your typing speed and accuracy.",
    "Keep your fingers on the home row and type without looking down.",
    "The best way to learn is to practice a little bit every single day.",
    "Speed comes naturally when you focus on accuracy first and foremost.",
  ],
  medium: [
    "Type racing is the most fun way to build your raw keyboard speed and accuracy under pressure.",
    "Never underestimate the power of daily practice and muscle memory when learning to type faster.",
    "A smooth steady rhythm beats frantic bursts every time in a long typing session or race.",
    "Focus on the text ahead and trust your fingers to find the right keys without looking down.",
    "Consistent daily practice for just fifteen minutes can transform your typing speed over time.",
  ],
  hard: [
    "Maintaining accuracy at high speed requires years of deliberate practice and proper finger placement on the home row without exception.",
    "The best typists read several words ahead while their fingers automatically execute the keystrokes with minimal conscious effort.",
    "Competitive typing demands both raw speed and unwavering accuracy because every single mistake costs valuable time and momentum.",
    "Building true typing fluency means training your brain to map thoughts directly to keystrokes without the intermediate step of letter recognition.",
    "Professional transcriptionists maintain speeds above eighty words per minute for extended periods through disciplined technique and ergonomic positioning.",
  ],
  pro: [
    "Achieving mastery in typing requires deliberate practice focusing on weak keys and problem finger combinations until they become second nature and automatic.",
    "The difference between a good typist and a great one is not raw speed but consistency maintaining high accuracy across diverse vocabulary and complex sentence structures.",
    "Elite competitive typists utilize advanced techniques like anticipation typing and error prevention to maintain peak performance during high-stakes races.",
    "Neuromuscular adaptation through spaced repetition and targeted drills gradually eliminates error patterns and builds reliable muscle memory for every key on the board.",
    "Professional typing assessments measure net speed after deducting errors because accuracy under time pressure is the true indicator of functional typing ability.",
  ],
  expert: [
    "Typing proficiency at the expert level approaches subconscious execution where keystroke sequences are processed as complete motor patterns rather than individual character selections requiring conscious deliberation and verification.",
    "The cognitive architecture of high-speed typing involves parallel processing of visual input, linguistic prediction, and fine motor coordination operating below the threshold of conscious awareness during peak performance states.",
    "Advanced typists develop personalized rhythmic signatures characterized by consistent inter-keystroke intervals that maximize throughput while minimizing error probability across diverse orthographic structures.",
    "Biomechanical efficiency in expert typists is achieved through optimized finger travel paths, minimal lateral hand movement, and precisely timed key actuation that reduces cumulative strain while maximizing sustained output.",
    "The plateau phenomenon in typing development occurs when suboptimal technique patterns become deeply encoded requiring systematic retraining of specific motor sequences to overcome barriers and access higher performance tiers.",
  ],
  insane: [
    "At the highest echelons of typing performance practitioners achieve sustained rates exceeding one hundred thirty words per minute through meticulously optimized biomechanics, predictive text processing, and error recovery strategies executed within sub-two-hundred-millisecond windows without disrupting flow state continuity.",
    "The psychophysiological demands of elite competitive typing necessitate exceptional hand-eye coordination, working memory capacity for lookahead text buffering, and autonomous execution of complex bigram and trigram sequences approaching two standard deviations above population mean performance baselines.",
    "Neurological efficiency in expert typists manifests as reduced prefrontal cortex activation during keystroke execution indicating that complex motor sequences are processed as unified action schemas rather than discrete character selections enabling substantially higher throughput with diminished cognitive load.",
    "Professional typing championships require sustained performance across multiple rounds with incremental difficulty progression testing both anaerobic speed capacity and aerobic endurance over extended competitive periods exceeding thirty minutes of continuous maximal output.",
    "Cutting-edge typing pedagogy incorporates real-time biometric feedback, machine learning error pattern analysis, and personalized adaptive difficulty progression to optimize neuroplastic adaptation and accelerate skill acquisition beyond traditional practice methodologies.",
  ],
};

function getTextsForDifficulty(difficulty: DifficultyConfig): string[] {
  const index = DIFFICULTIES.indexOf(difficulty);
  const keys = Object.keys(RACE_TEXTS_BY_LEVEL);
  const texts: string[] = [];
  for (let i = 0; i <= Math.min(index, keys.length - 1); i++) {
    texts.push(...(RACE_TEXTS_BY_LEVEL[keys[i]] || []));
  }
  return texts;
}

// FIX: added `resetSignal` so bot progress reliably resets to 0 on every new race,
// instead of carrying over stale charsTyped from the previous race.
function useBotRacer(
  avgWpm: number,
  variance: number,
  totalChars: number,
  startRace: boolean,
  resetSignal: number
) {
  const [charsTyped, setCharsTyped] = useState(0);

  useEffect(() => {
    setCharsTyped(0);
  }, [resetSignal]);

  useEffect(() => {
    if (!startRace || charsTyped >= totalChars) return;

    const actualWpm = avgWpm + (Math.random() * variance * 2 - variance);
    const charsPerMinute = Math.max(actualWpm, 5) * 5;
    const charsPerSecond = charsPerMinute / 60;
    const msPerChar = 1000 / charsPerSecond;
    const jitterMs = msPerChar * 0.3;

    let active = true;
    const timeout = setTimeout(() => {
      if (active) setCharsTyped(c => Math.min(c + 1, totalChars));
    }, msPerChar + (Math.random() * jitterMs * 2 - jitterMs));

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [charsTyped, avgWpm, variance, totalChars, startRace]);

  return charsTyped;
}

export default function RacePage() {
  const { language } = useUIStore();
  const snapshot = useTypingStore(s => s.snapshot);

  const [difficultyIndex, setDifficultyIndex] = useState(1);
  const difficulty = DIFFICULTIES[difficultyIndex];

  const [raceText, setRaceText] = useState('');
  const [raceKey, setRaceKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hasStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [result, setResult] = useState<Session | null>(null);
  const [playerWpm, setPlayerWpm] = useState(0);
  const [profileLevel, setProfileLevel] = useState(1);
  const [showSetup, setShowSetup] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    getProfile().then(p => {
      setProfileLevel(p.currentLevel || 1);
    });
  }, []);

  const pickRandomText = useCallback(() => {
    const texts = getTextsForDifficulty(difficulty);
    const t = texts[Math.floor(Math.random() * texts.length)];
    setRaceText(t);
  }, [difficulty]);

  useEffect(() => {
    pickRandomText();
    setRaceKey(k => k + 1);
  }, [difficultyIndex, pickRandomText]);

  const totalChars = raceText.length;

  // FIX: recompute bot speeds every new race (was: useState lazy init, only ran once ever).
  const bot1Wpm = useMemo(() => {
    const [min, max] = difficulty.botWpmRange;
    return min + Math.random() * (max - min) * 0.4;
  }, [raceKey, difficulty]);
  const bot2Wpm = useMemo(() => {
    const [min, max] = difficulty.botWpmRange;
    return min + Math.random() * (max - min) * 0.6;
  }, [raceKey, difficulty]);
  const bot3Wpm = useMemo(() => {
    const [min, max] = difficulty.botWpmRange;
    return min + Math.random() * (max - min) * 0.8;
  }, [raceKey, difficulty]);

  useEffect(() => {
    if (snapshot.state === 'typing' && !hasStarted) {
      setIsStarted(true);
      setShowSetup(false);
    }
  }, [snapshot.state, hasStarted]);

  useEffect(() => {
    if (snapshot.state === 'typing') {
      setPlayerWpm(snapshot.wpm);
    }
  }, [snapshot.wpm, snapshot.state]);

  const bot1Chars = useBotRacer(bot1Wpm, 3, totalChars, hasStarted, raceKey);
  const bot2Chars = useBotRacer(bot2Wpm, 4, totalChars, hasStarted, raceKey);
  const bot3Chars = useBotRacer(bot3Wpm, 5, totalChars, hasStarted, raceKey);

  const playerPct = totalChars > 0 ? Math.min((snapshot.cursorPosition / totalChars) * 100, 100) : 0;
  const bot1Pct = totalChars > 0 ? Math.min((bot1Chars / totalChars) * 100, 100) : 0;
  const bot2Pct = totalChars > 0 ? Math.min((bot2Chars / totalChars) * 100, 100) : 0;
  const bot3Pct = totalChars > 0 ? Math.min((bot3Chars / totalChars) * 100, 100) : 0;

  const handleComplete = useCallback((session: Session) => {
    setResult(session);
    setIsFinished(true);
  }, []);

  const playerFinished = snapshot.isComplete;

  const placements = [
    { id: 'player', pct: playerPct, finished: playerFinished },
    { id: 'bot3', pct: bot3Pct, finished: bot3Chars >= totalChars },
    { id: 'bot2', pct: bot2Pct, finished: bot2Chars >= totalChars },
    { id: 'bot1', pct: bot1Pct, finished: bot1Chars >= totalChars },
  ].sort((a, b) => b.pct - a.pct);

  const playerPosition = placements.findIndex(p => p.id === 'player') + 1;

  const startNewRace = () => {
    setIsStarted(false);
    setIsFinished(false);
    setResult(null);
    setPlayerWpm(0);
    setShowSetup(true);
    pickRandomText();
    setRaceKey(k => k + 1);
  };

  // FIX: race no longer snaps straight into typing — runs a 3-2-1-GO countdown first.
  const handleStartRace = () => {
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setShowSetup(false);
      const t = setTimeout(() => {
        const el = containerRef.current?.querySelector('.text-display') as HTMLElement;
        el?.click();
      }, 50);
      const clear = setTimeout(() => setCountdown(null), 500);
      return () => { clearTimeout(t); clearTimeout(clear); };
    }
    const t = setTimeout(() => setCountdown(c => (c ?? 1) - 1), 700);
    return () => clearTimeout(t);
  }, [countdown]);

  // FIX: prevent changing difficulty mid-race, which used to silently swap
  // the underlying race parameters while typing was in progress.
  const raceLocked = hasStarted && !isFinished;
  const diffUp = () => !raceLocked && setDifficultyIndex(i => Math.min(i + 1, DIFFICULTIES.length - 1));
  const diffDown = () => !raceLocked && setDifficultyIndex(i => Math.max(i - 1, 0));

  const positionColor =
    playerPosition === 1
      ? 'var(--color-success, #34d399)'
      : playerPosition === 2
        ? 'var(--text-secondary, #94a3b8)'
        : playerPosition === 3
          ? 'var(--color-accent-light, #eec224)'
          : 'var(--text-muted, #6b6d70)';

  function ordinal(n: number) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
  }

  const bots = [
    { name: 'Rookie', wpm: bot1Wpm, pct: bot1Pct, chars: bot1Chars, color: '#22d3ee' },
    { name: 'Racer', wpm: bot2Wpm, pct: bot2Pct, chars: bot2Chars, color: '#f59e0b' },
    { name: 'Champion', wpm: bot3Wpm, pct: bot3Pct, chars: bot3Chars, color: '#ef4444' },
  ];

  return (
    <main className="race-page">
      <div className="race-wrap" key={raceKey}>
        {/* ── Top bar: title / difficulty / level ── */}
        <header className="race-topbar">
          <div className="topbar-title">
            <span className="topbar-eyebrow">Race Mode</span>
            <h1 className="topbar-h1">Type Racing</h1>
          </div>

          <div className="topbar-side">
            <div className="level-chip" title="Player level">
              <Trophy size={13} />
              <span>Lv. {profileLevel}</span>
            </div>
          </div>
        </header>

        <div className="diff-bar" role="group" aria-label="Difficulty">
          <span className="diff-caption">Difficulty</span>
          {DIFFICULTIES.map((d, idx) => {
            const active = difficultyIndex === idx;
            return (
              <button
                key={d.label}
                className={`diff-chip ${active ? 'active' : ''}`}
                onClick={() => {
                  if (!raceLocked) setDifficultyIndex(idx);
                }}
                disabled={raceLocked}
                aria-pressed={active}
                style={{ '--diff-color': d.color } as React.CSSProperties}
              >
                <span className="chip-dot" style={{ background: d.color }} />
                <span className="chip-name">{d.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Live standing ── */}
        {hasStarted && !isFinished && (
          <div className="standing" style={{ '--pos-color': positionColor } as React.CSSProperties}>
            <span className="standing-pos">{ordinal(playerPosition)}</span>
            <span className="standing-label">place</span>
            <span className="standing-sep" />
            <span className="standing-wpm">{playerWpm.toFixed(0)} wpm</span>
          </div>
        )}

        {/* ── Race track ── */}
        <div className="track-board">
          <div className="track-scale">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>

          {/* Player lane */}
          <div className="lane lane-player">
            <div className="lane-side">
              <span className="lane-name">You</span>
              <span className="lane-wpm">{hasStarted ? playerWpm.toFixed(0) : '—'}</span>
            </div>
            <div className="lane-track">
              <span className="lane-fill" style={{ width: `${playerPct}%` }} />
            </div>
          </div>

          {/* Bot lanes */}
          {bots.map((bot, i) => {
            const botPos = [
              { pct: playerPct, id: 'player' },
              { pct: bot1Pct, id: 'b1' },
              { pct: bot2Pct, id: 'b2' },
              { pct: bot3Pct, id: 'b3' },
            ]
              .sort((a, b) => b.pct - a.pct)
              .findIndex(item => item.id === (i === 0 ? 'b1' : i === 1 ? 'b2' : 'b3')) + 1;

            return (
              <div className="lane" key={i}>
                <div className="lane-side">
                  <span className="lane-name">{bot.name}</span>
                  <span className="lane-wpm">
                    {bot.wpm.toFixed(0)} <em>wpm</em> · {ordinal(botPos)}
                  </span>
                </div>
                <div className="lane-track">
                  <span className="lane-fill" style={{ width: `${bot.pct}%`, background: bot.color }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Race area: TypingArea + overlays ── */}
        <div className="race-typing-area" ref={containerRef}>
          {showSetup && !hasStarted && countdown === null && (
            <div className="race-overlay">
              <div className="setup-card">
                <span className="setup-eyebrow">{difficulty.label} Grand Prix</span>
                <h2>Ready to race?</h2>
                <p>Race three calibrated ghost typists over {totalChars} characters.</p>

                <div className="bot-roster">
                  {bots.map((b, i) => (
                    <div key={i} className="roster-item">
                      <span className="roster-dot" style={{ background: b.color }} />
                      <span className="roster-name">{b.name}</span>
                      <span className="roster-wpm">~{b.wpm.toFixed(0)}</span>
                    </div>
                  ))}
                </div>

                <button className="btn btn-primary race-start-btn" onClick={handleStartRace}>
                  Start race
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {countdown !== null && (
            <div className="race-overlay" aria-live="assertive">
              <div className="countdown-card">
                <span className="countdown-cap">Get set</span>
                <span className={`countdown-num ${countdown === 0 ? 'go' : ''}`} key={countdown}>
                  {countdown === 0 ? 'GO' : countdown}
                </span>
                <div className="countdown-lights">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className={`light ${countdown > 0 && 3 - countdown > i ? 'lit' : ''} ${countdown === 0 ? 'go' : ''}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {isFinished && (
            <div className="race-overlay">
              <div className="result-card">
                <span className="result-eyebrow" style={{ color: positionColor }}>
                  {playerPosition === 1 ? 'Race won' : 'Race finished'}
                </span>
                <span className="result-position" style={{ color: positionColor }}>
                  {ordinal(playerPosition)}
                  <small>place</small>
                </span>

                <div className="result-row">
                  <div className="result-metric">
                    <Gauge size={15} />
                    <span className="metric-value">{result?.wpm.toFixed(0)}</span>
                    <span className="metric-label">wpm</span>
                  </div>
                  <div className="result-metric">
                    <Timer size={15} />
                    <span className="metric-value">
                      {result?.accuracy ? `${(result.accuracy * 100).toFixed(0)}%` : '100%'}
                    </span>
                    <span className="metric-label">accuracy</span>
                  </div>
                  <div className="result-metric">
                    <Trophy size={15} />
                    <span className="metric-value accent">+{playerPosition === 1 ? '100' : '40'}</span>
                    <span className="metric-label">xp</span>
                  </div>
                </div>

                <div className="result-actions">
                  <button className="btn btn-primary" onClick={startNewRace}>
                    <RotateCcw size={15} />
                    Race again
                  </button>
                  {difficultyIndex < DIFFICULTIES.length - 1 && playerPosition === 1 && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        diffUp();
                        startNewRace();
                      }}
                    >
                      {DIFFICULTIES[difficultyIndex + 1].label}
                      <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <TypingArea
            key={raceKey}
            language={language}
            mode="lesson"
            customText={raceText}
            onComplete={handleComplete}
          />
        </div>
      </div>

      <style jsx>{`
        .race-page {
          min-height: calc(100dvh - var(--header-height, 64px) - 60px);
          padding: 1.25rem 0 3.5rem;
        }

        .race-wrap {
          max-width: 860px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 0 1rem;
        }

        /* ── Top bar ── */
        .race-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .topbar-title {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .topbar-eyebrow {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--color-primary-light, #818cf8);
        }

        .topbar-h1 {
          font-size: clamp(1.4rem, 2.6vw, 1.9rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0;
          color: var(--text-primary, #f1f5f9);
        }

        .level-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          color: var(--color-accent-light, #eec224);
          background: rgba(238, 194, 36, 0.1);
          border: 1px solid rgba(238, 194, 36, 0.22);
        }

        /* ── Difficulty chips ── */
        .diff-bar {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 4px;
          border-radius: 9999px;
          background: var(--bg-surface, #131313);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.08));
          overflow-x: auto;
          scrollbar-width: none;
        }

        .diff-bar::-webkit-scrollbar {
          display: none;
        }

        .diff-caption {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted, #6b6d70);
          padding: 0 8px 0 10px;
          white-space: nowrap;
        }

        .diff-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.35rem 0.75rem;
          border: none;
          border-radius: 9999px;
          background: transparent;
          color: var(--text-secondary, #9a9c9f);
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.18s ease, color 0.18s ease;
        }

        .diff-chip:hover:not(:disabled) {
          background: var(--bg-overlay, rgba(255, 255, 255, 0.05));
          color: var(--text-primary, #fff);
        }

        .diff-chip.active {
          background: var(--bg-overlay, rgba(255, 255, 255, 0.05));
          color: var(--text-primary, #fff);
        }

        .diff-chip:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .chip-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .diff-chip.active .chip-dot {
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--diff-color) 25%, transparent);
        }

        /* ── Standing pill ── */
        .standing {
          display: flex;
          align-items: center;
          gap: 8px;
          align-self: center;
          padding: 5px 14px;
          border-radius: 9999px;
          background: var(--bg-surface, #131313);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.08));
          font-size: 13px;
          color: var(--text-secondary, #9a9c9f);
        }

        .standing-pos {
          font-weight: 800;
          font-family: var(--font-mono, monospace);
          font-size: 15px;
          color: var(--pos-color);
        }

        .standing-label {
          font-weight: 600;
        }

        .standing-sep {
          width: 1px;
          height: 14px;
          background: var(--border-subtle, rgba(255, 255, 255, 0.08));
        }

        .standing-wpm {
          font-family: var(--font-mono, monospace);
          font-variant-numeric: tabular-nums;
          color: var(--text-primary, #fff);
        }

        /* ── Track board ── */
        .track-board {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 1rem 1.15rem;
          background: var(--bg-surface, #131313);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.08));
          border-radius: var(--radius-lg, 0.75rem);
        }

        .track-scale {
          display: flex;
          justify-content: space-between;
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--text-muted, #6b6d70);
          opacity: 0.7;
        }

        .lane {
          display: grid;
          grid-template-columns: 96px 1fr;
          align-items: center;
          gap: 0.75rem;
          padding: 3px 0;
        }

        .lane-player .lane-name {
          color: var(--color-primary-light, #818cf8);
        }

        .lane-side {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .lane-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary, #fff);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .lane-wpm {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: var(--text-muted, #6b6d70);
          font-variant-numeric: tabular-nums;
        }

        .lane-wpm em {
          font-style: normal;
          opacity: 0.6;
        }

        .lane-track {
          position: relative;
          height: 8px;
          border-radius: 9999px;
          background: var(--bg-overlay, rgba(255, 255, 255, 0.06));
          overflow: hidden;
        }

        .lane-fill {
          position: absolute;
          inset: 0 auto 0 0;
          border-radius: 9999px;
          background: var(--color-primary, #6366f1);
          transition: width 0.14s linear;
        }

        /* ── Race area / overlays ── */
        .race-typing-area {
          position: relative;
          min-height: 220px;
        }

        .race-typing-area :global(.inline-metrics) {
          display: none !important;
        }

        .race-overlay {
          position: absolute;
          inset: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          border-radius: var(--radius-xl, 1rem);
          background: rgba(10, 11, 14, 0.92);
          backdrop-filter: blur(6px);
        }

        /* Setup */
        .setup-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
          max-width: 360px;
        }

        .setup-eyebrow {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--color-primary-light, #818cf8);
        }

        .setup-card h2 {
          margin: 0;
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text-primary, #fff);
        }

        .setup-card p {
          margin: 0;
          font-size: var(--text-sm, 0.875rem);
          color: var(--text-secondary, #9a9c9f);
          line-height: 1.5;
        }

        .bot-roster {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
          margin: 6px 0 4px;
        }

        .roster-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 11px;
          border-radius: 9999px;
          background: var(--bg-surface, #131313);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.08));
          font-family: var(--font-mono, monospace);
          font-size: 11px;
        }

        .roster-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .roster-name {
          font-weight: 700;
          color: var(--text-primary, #fff);
        }

        .roster-wpm {
          color: var(--text-muted, #6b6d70);
        }

        .race-start-btn {
          margin-top: 4px;
          padding: 11px 26px;
          font-size: 0.95rem;
          font-weight: 700;
          border-radius: 9999px;
        }

        /* Countdown */
        .countdown-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .countdown-cap {
          font-size: 11px
          ;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--text-muted, #6b6d70);
        }

        .countdown-num {
          font-family: var(--font-mono, monospace);
          font-size: clamp(4rem, 14vw, 6rem);
          font-weight: 900;
          line-height: 1;
          color: var(--text-primary, #fff);
          animation: count-pop 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .countdown-num.go {
          color: var(--color-success, #34d399);
          text-shadow: 0 0 32px rgba(52, 211, 153, 0.45);
        }

        @keyframes count-pop {
          from { transform: scale(0.6); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .countdown-lights {
          display: flex;
          gap: 10px;
        }

        .light {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--bg-overlay, rgba(255, 255, 255, 0.08));
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
          transition: background 0.18s ease, box-shadow 0.18s ease;
        }

        .light.lit {
          background: var(--color-error, #f87171);
          border-color: transparent;
          box-shadow: 0 0 14px rgba(248, 113, 113, 0.55);
        }

        .light.go {
          background: var(--color-success, #34d399);
          border-color: transparent;
          box-shadow: 0 0 14px rgba(52, 211, 153, 0.55);
        }

        /* Result */
        .result-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          text-align: center;
          max-width: 400px;
        }

        .result-eyebrow {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .result-position {
          display: flex;
          align-items: baseline;
          gap: 6px;
          font-family: var(--font-mono, monospace);
          font-size: clamp(2.75rem, 8vw, 3.75rem);
          font-weight: 900;
          line-height: 1;
        }

        .result-position small {
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted, #6b6d70);
        }

        .result-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          padding: 12px 22px;
          border-radius: var(--radius-lg, 0.75rem);
          background: var(--bg-surface, #131313);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.08));
        }

        .result-metric {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--text-muted, #6b6d70);
        }

        .metric-value {
          font-family: var(--font-mono, monospace);
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--text-primary, #fff);
          font-variant-numeric: tabular-nums;
        }

        .metric-value.accent {
          color: var(--color-accent-light, #eec224);
        }

        .metric-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .result-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          font-family: inherit;
          font-size: 0.875rem;
          font-weight: 700;
          border-radius: 9999px;
          border: 1px solid transparent;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .btn-primary {
          background: var(--color-primary, #6366f1);
          color: #ffffff;
          box-shadow: 0 4px 16px var(--color-primary-glow, rgba(99, 102, 241, 0.3));
        }

        .btn-primary:hover {
          background: var(--color-primary-light, #818cf8);
        }

        .btn-secondary {
          background: var(--bg-surface, #131313);
          border-color: var(--border-default, rgba(255, 255, 255, 0.12));
          color: var(--text-secondary, #9a9c9f);
        }

        .btn-secondary:hover {
          color: var(--text-primary, #fff);
          border-color: var(--text-muted, #6b6d70);
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .lane {
            grid-template-columns: 72px 1fr;
            gap: 0.5rem;
          }

          .diff-caption {
            display: none;
          }

          .result-row {
            gap: 1rem;
            padding: 10px 14px;
          }
        }
      `}</style>
    </main>
  );
}
