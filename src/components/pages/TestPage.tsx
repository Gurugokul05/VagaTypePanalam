'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Zap,
  Timer,
  Target,
  Flame,
  Compass,
  RotateCcw,
  Share2,
  Sparkles,
  Check,
  Gauge,
  Type,
  Clock,
  TrendingUp,
  Activity,
  Fingerprint,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useTypingStore } from '@/store/typingStore';
import TypingArea from '@/components/typing/TypingArea';
import type { Session } from '@/db/schema';
import { calculateKogasa } from '@/engine/statsCalculator';
import { generateChartData, getKeyAnalytics, getGradeColor } from '@/components/test/chartUtils';
import { TestGrade } from '@/components/test/TestGrade';
import { SessionAreaChart } from '@/components/test/SessionAreaChart';

const DURATIONS = [
  { sec: 15, label: 'Blitz', icon: Zap },
  { sec: 30, label: 'Sprint', icon: Timer },
  { sec: 60, label: 'Standard', icon: Target },
  { sec: 120, label: 'Endurance', icon: Flame },
  { sec: 300, label: 'Marathon', icon: Compass },
] as const;

export type Duration = (typeof DURATIONS)[number]['sec'];

function AnimatedWpm({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    const duration = 600;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplay(target);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);

  return <>{display}</>;
}

export default function TestPage({ showTitle = true }: { showTitle?: boolean }) {
  const { language } = useUIStore();
  const { snapshot } = useTypingStore();
  const [selectedDuration, setSelectedDuration] = useState<Duration>(60);
  const [secondsLeft, setSecondsLeft] = useState<number>(selectedDuration);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Session | null>(null);
  const [key, setKey] = useState(0);
  const [phaseVisible, setPhaseVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const triggeredRef = useRef(false);

  const startCountdown = useCallback(() => {
    if (running) return;
    setRunning(true);
    setSecondsLeft(selectedDuration);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [running, selectedDuration]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const swapPhase = (mutate: () => void) => {
    setPhaseVisible(false);
    setTimeout(() => {
      mutate();
      setPhaseVisible(true);
    }, 140);
  };

  const handleRestart = () => {
    swapPhase(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      triggeredRef.current = false;
      setRunning(false);
      setResult(null);
      setSecondsLeft(selectedDuration);
      setKey((k) => k + 1);
    });
  };

  const changeDuration = (d: Duration) => {
    if (running) return;
    swapPhase(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      triggeredRef.current = false;
      setSelectedDuration(d);
      setSecondsLeft(d);
      setRunning(false);
      setResult(null);
      setKey((k) => k + 1);
    });
  };

  const handleFirstKey = () => {
    if (!triggeredRef.current) {
      triggeredRef.current = true;
      startCountdown();
    }
  };

  const handleComplete = (session: Session) => {
    swapPhase(() => {
      setResult(session);
      setRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    });
  };

  const handleCopyScorecard = () => {
    if (!result) return;
    const text = `VangaTypePanalam | ${result.wpm.toFixed(0)} WPM · ${(result.accuracy * 100).toFixed(1)}% accuracy · ${selectedDuration}s test`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Live countdown metrics
  const pct = Math.round(((selectedDuration - secondsLeft) / selectedDuration) * 100);
  const timerColor =
    secondsLeft <= 10
      ? 'var(--color-error, #f87171)'
      : secondsLeft <= 20
        ? 'var(--color-accent, #eec224)'
        : 'var(--color-primary-light, #818cf8)';

  // Result analytics
  const keyAnalytics = result ? getKeyAnalytics(result.keystrokeLog || []) : { weakKeys: [], slowKeys: [] };
  const chartData = result ? generateChartData(result.keystrokeLog || [], selectedDuration) : [];
  const peakWpm = chartData.length > 0 ? Math.max(...chartData.map((d) => d.wpm)) : 0;
  const avgLatency =
    result?.keystrokeLog && result.keystrokeLog.length > 0
      ? Math.round(result.keystrokeLog.reduce((sum, k) => sum + k.latencyMs, 0) / result.keystrokeLog.length)
      : 0;

  const consistency = result
    ? Math.round(calculateKogasa((result.keystrokeLog || []).map((k) => k.latencyMs)) * 100)
    : 0;

  const stats = result
    ? [
        { label: 'Raw Speed', value: `${result.rawWpm.toFixed(0)}`, unit: 'wpm', Icon: Gauge, color: 'var(--color-accent-light, #eec224)' },
        { label: 'Consistency', value: `${consistency}`, unit: '%', Icon: Activity, color: 'var(--color-primary-light, #818cf8)' },
        { label: 'Peak Speed', value: `${peakWpm}`, unit: 'wpm', Icon: TrendingUp, color: 'var(--color-success, #34d399)' },
        { label: 'Avg Latency', value: `${avgLatency}`, unit: 'ms', Icon: Clock, color: '#f59e0b' },
        { label: 'Characters', value: `${result.correctChars}`, unit: `/ ${result.errorChars} err`, Icon: Type, color: 'var(--text-primary, #f1f5f9)' },
        { label: 'Time', value: `${selectedDuration}`, unit: 'sec', Icon: Timer, color: 'var(--text-secondary, #94a3b8)' },
      ]
    : [];

  return (
    <main className="test-page">
      <div className="test-wrap">
        {/* ── Top bar: title + duration selector ── */}
        <header className="test-topbar">
          {showTitle && (
            <div className="topbar-title">
              <span className="topbar-eyebrow">
                <Timer size={13} />
                Speed Test
              </span>
              <h1 className="topbar-h1">Typing Speed Test</h1>
            </div>
          )}

          <div className="duration-bar" role="group" aria-label="Test duration">
            <span className="duration-bar-caption">Duration</span>
            {DURATIONS.map(({ sec, label, icon: Icon }) => {
              const active = selectedDuration === sec;
              return (
                <button
                  key={sec}
                  className={`duration-pill ${active ? 'active' : ''}`}
                  onClick={() => changeDuration(sec)}
                  disabled={running}
                  title={`${label} mode (${sec} seconds)`}
                  aria-pressed={active}
                >
                  <Icon size={14} className="duration-icon" />
                  <span className="duration-sec">{sec}s</span>
                  <span className="duration-label">{label}</span>
                </button>
              );
            })}
          </div>
        </header>

        {/* ── Animated Phase Transition ── */}
        <div className={`phase-wrapper ${phaseVisible ? 'visible' : ''}`}>
          {!result ? (
            /* ── Live Test Phase ── */
            <div className="test-stage" key={key}>
              {/* Progress rail */}
              <div className="progress-rail">
                <div
                  className="progress-rail-fill"
                  style={{ width: `${pct}%`, background: timerColor }}
                />
              </div>

              {/* Scoreboard: one row, three numbers, easy to read at a glance */}
              <div className="scoreboard">
                <div className={`sb-cell sb-time ${secondsLeft <= 10 && running ? 'is-urgent' : ''}`}>
                  <div className="sb-ring-box">
                    <svg viewBox="0 0 40 40" className="sb-ring">
                      <circle cx="20" cy="20" r="17" className="sb-ring-bg" />
                      <circle
                        cx="20"
                        cy="20"
                        r="17"
                        className="sb-ring-fg"
                        style={{
                          stroke: timerColor,
                          strokeDashoffset: `${2 * Math.PI * 17 * (1 - pct / 100)}`,
                        }}
                      />
                    </svg>
                    <span className="sb-ring-num" style={{ color: timerColor }}>
                      {secondsLeft}
                    </span>
                  </div>
                  <div className="sb-meta">
                    <span className="sb-label">Time Left</span>
                    <span className="sb-sub">seconds</span>
                  </div>
                </div>

                <div className="sb-divider" />

                <div className="sb-cell">
                  <div className="sb-meta">
                    <span className="sb-label">Live Speed</span>
                    <span className="sb-sub">words / min</span>
                  </div>
                  <span className="sb-figure sb-figure-wpm">{Math.round(snapshot.wpm)}</span>
                </div>

                <div className="sb-divider" />

                <div className="sb-cell">
                  <div className="sb-meta">
                    <span className="sb-label">Accuracy</span>
                    <span className="sb-sub">correct keys</span>
                  </div>
                  <span className="sb-figure sb-figure-acc">
                    {(snapshot.accuracy * 100).toFixed(0)}
                    <i>%</i>
                  </span>
                </div>
              </div>

              {/* Typing box — the hero of the page */}
              <div className="typing-frame" onKeyDownCapture={handleFirstKey}>
                {!running && snapshot.wpm === 0 && (
                  <div className="start-prompt">
                    <span className="pulsing-dot" />
                    <span>Start typing below to begin the {selectedDuration}s test</span>
                  </div>
                )}
                <TypingArea
                  language={language}
                  mode="test"
                  forceComplete={running && secondsLeft === 0}
                  onComplete={handleComplete}
                />
              </div>

              <p className="stage-foot">
                {running ? (
                  <>
                    Timer is running — keep typing until time runs out.
                  </>
                ) : (
                  <>
                    The timer starts on your first keystroke.
                  </>
                )}
              </p>
            </div>
          ) : (
            /* ── Test Results Scorecard ── */
            <div className="scorecard">
              {/* Hero: grade + headline number + accuracy ring */}
              <div className="scorecard-hero">
                <div className="hero-main">
                  <div className="hero-chips">
                    <span className="hero-chip">{selectedDuration}s test</span>
                    <span className="hero-chip">{language.toUpperCase()}</span>
                    <TestGrade wpm={result.wpm} />
                  </div>
                  <div className="hero-figure" style={{ color: getGradeColor(result.wpm) }}>
                    <span className="hero-number"><AnimatedWpm target={Math.round(result.wpm)} /></span>
                    <span className="hero-unit">WPM</span>
                  </div>
                  <p className="hero-caption">words per minute</p>
                </div>

                <div className="hero-side">
                  <div className="side-ring-box">
                    <svg viewBox="0 0 36 36" className="side-ring">
                      <circle cx="18" cy="18" r="15.9" className="side-ring-bg" />
                      <circle
                        cx="18"
                        cy="18"
                        r="15.9"
                        className="side-ring-fg"
                        style={{ strokeDashoffset: `${2 * Math.PI * 15.9 * (1 - result.accuracy)}` }}
                      />
                    </svg>
                    <span className="side-ring-text">{(result.accuracy * 100).toFixed(1)}%</span>
                  </div>
                  <span className="side-caption">Accuracy</span>
                </div>
              </div>

              {/* Secondary stats */}
              <div className="stat-strip">
                {stats.map(({ label, value, unit, Icon, color }) => (
                  <div className="stat-tile" key={label}>
                    <span className="stat-icon" style={{ color }}>
                      <Icon size={15} />
                    </span>
                    <div className="stat-body">
                      <span className="stat-label">{label}</span>
                      <span className="stat-value" style={{ color }}>
                        {value}
                        <small>{unit}</small>
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {chartData.length > 1 && (
                <div className="chart-container">
                  <SessionAreaChart data={chartData} />
                </div>
              )}

              {/* Weak / Slow Keys */}
              {(keyAnalytics.weakKeys.length > 0 || keyAnalytics.slowKeys.length > 0) && (
                <div className="keys-analysis">
                  <div className="keys-group">
                    <span className="keys-title">
                      <Fingerprint size={13} /> Weakest Keys
                    </span>
                    <div className="keycaps">
                      {keyAnalytics.weakKeys.slice(0, 5).map((k) => (
                        <div key={k.char} className="keycap keycap-weak">
                          <span className="keycap-char">{k.char}</span>
                          <span className="keycap-info">{(k.accuracy * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                      {keyAnalytics.weakKeys.length === 0 && <span className="keys-empty">None — clean run!</span>}
                    </div>
                  </div>

                  <div className="keys-group">
                    <span className="keys-title">
                      <Clock size={13} /> Slowest Keys
                    </span>
                    <div className="keycaps">
                      {keyAnalytics.slowKeys.slice(0, 5).map((k) => (
                        <div key={k.char} className="keycap keycap-slow">
                          <span className="keycap-char">{k.char}</span>
                          <span className="keycap-info">{Math.round(k.avgLatency)}ms</span>
                        </div>
                      ))}
                      {keyAnalytics.slowKeys.length === 0 && <span className="keys-empty">None — sharp reactions!</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="scorecard-actions">
                <button className="action-btn retake-btn" onClick={handleRestart} id="test-restart-btn">
                  <RotateCcw size={16} />
                  <span>Retake Test</span>
                </button>

                <button
                  className={`action-btn share-btn ${copied ? 'copied' : ''}`}
                  onClick={handleCopyScorecard}
                  id="copy-score-btn"
                >
                  {copied ? <Check size={16} /> : <Share2 size={16} />}
                  <span>{copied ? 'Copied!' : 'Share Scorecard'}</span>
                </button>

                {keyAnalytics.weakKeys.length > 0 && (
                  <Link href="/" className="action-btn weak-practice-btn">
                    <Sparkles size={16} />
                    <span>Practice {keyAnalytics.weakKeys.slice(0, 3).map((k) => k.char).join(' ')}</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .test-page {
          min-height: calc(100dvh - var(--header-height, 64px) - 60px);
          padding: 1.25rem 0 3.5rem;
          display: flex;
          flex-direction: column;
        }

        .test-wrap {
          max-width: 980px;
          margin: 0 auto;
          width: 100%;
          padding: 0 1rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        /* ── Top bar ── */
        .test-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .topbar-title {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .topbar-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
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

        /* ── Duration segmented bar ── */
        .duration-bar {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          background: var(--bg-surface, #131313);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.08));
          border-radius: 9999px;
          padding: 4px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
        }

        .duration-bar-caption {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted, #6b6d70);
          padding: 0 8px 0 10px;
        }

        .duration-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.4rem 0.85rem;
          border: none;
          border-radius: 9999px;
          background: transparent;
          color: var(--text-secondary, #9a9c9f);
          font-weight: 600;
          font-size: var(--text-sm, 0.875rem);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .duration-icon {
          opacity: 0.7;
        }

        .duration-sec {
          font-family: var(--font-mono, monospace);
          font-weight: 700;
        }

        .duration-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          opacity: 0.65;
        }

        .duration-pill:hover:not(:disabled) {
          color: var(--text-primary, #ffffff);
          background: var(--bg-overlay, rgba(255, 255, 255, 0.06));
        }

        .duration-pill.active {
          background: var(--color-primary, #6366f1);
          color: #ffffff;
          box-shadow: 0 2px 12px var(--color-primary-glow, rgba(99, 102, 241, 0.4));
        }

        .duration-pill.active .duration-icon,
        .duration-pill.active .duration-label {
          opacity: 1;
        }

        .duration-pill:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* ── Phase transition wrapper ── */
        .phase-wrapper {
          opacity: 0;
          transform: translateY(6px);
          transition: opacity 0.16s ease, transform 0.16s ease;
        }

        .phase-wrapper.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* ── Live Test Stage ── */
        .test-stage {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .progress-rail {
          width: 100%;
          height: 4px;
          background: var(--border-subtle, rgba(255, 255, 255, 0.07));
          border-radius: 9999px;
          overflow: hidden;
        }

        .progress-rail-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.8s linear, background 0.4s;
        }

        /* Scoreboard row */
        .scoreboard {
          display: flex;
          align-items: stretch;
          gap: 1.25rem;
          padding: 0.9rem 1.25rem;
          background: var(--bg-surface, #131313);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.08));
          border-radius: var(--radius-lg, 0.75rem);
        }

        .sb-cell {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .sb-cell:last-child {
          justify-content: flex-end;
        }

        .sb-divider {
          width: 1px;
          align-self: stretch;
          background: var(--border-subtle, rgba(255, 255, 255, 0.07));
        }

        .sb-meta {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }

        .sb-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: var(--text-muted, #6b6d70);
          white-space: nowrap;
        }

        .sb-sub {
          font-size: 11px;
          color: var(--text-muted, #6b6d70);
          opacity: 0.75;
          white-space: nowrap;
        }

        .sb-figure {
          font-family: var(--font-mono, monospace);
          font-weight: 800;
          line-height: 1;
          margin-left: auto;
          display: inline-flex;
          align-items: baseline;
          gap: 2px;
        }

        .sb-figure-wpm {
          font-size: 2.1rem;
          color: var(--color-primary-light, #818cf8);
          font-variant-numeric: tabular-nums;
        }

        .sb-figure-acc {
          font-size: 2.1rem;
          color: var(--color-success, #34d399);
          font-variant-numeric: tabular-nums;
        }

        .sb-figure-acc i {
          font-size: 0.9rem;
          font-style: normal;
          font-weight: 700;
          opacity: 0.75;
        }

        .sb-ring-box {
          position: relative;
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sb-ring {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .sb-ring-bg {
          fill: none;
          stroke: var(--border-subtle, rgba(255, 255, 255, 0.08));
          stroke-width: 3.5;
        }

        .sb-ring-fg {
          fill: none;
          stroke-width: 3.5;
          stroke-linecap: round;
          stroke-dasharray: 106.8;
          transition: stroke-dashoffset 0.8s linear, stroke 0.3s;
        }

        .sb-ring-num {
          position: absolute;
          font-size: 1.05rem;
          font-weight: 800;
          font-family: var(--font-mono, monospace);
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }

        .sb-time.is-urgent {
          animation: sb-urgent 1s infinite alternate ease-in-out;
        }

        @keyframes sb-urgent {
          from { filter: drop-shadow(0 0 3px rgba(248, 113, 113, 0.35)); }
          to { filter: drop-shadow(0 0 12px rgba(248, 113, 113, 0.75)); }
        }

        /* ── Typing frame ── */
        .typing-frame {
          position: relative;
          background: var(--bg-surface, #131313);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.08));
          border-radius: var(--radius-xl, 1rem);
          padding: 1.25rem;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.22);
          transition: border-color 0.3s, box-shadow 0.3s;
        }

        .typing-frame:focus-within {
          border-color: var(--color-primary, #6366f1);
          box-shadow: 0 0 28px var(--color-primary-glow, rgba(99, 102, 241, 0.25));
        }

        .typing-frame :global(.inline-metrics) {
          display: none !important;
        }

        .start-prompt {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--color-primary-light, #818cf8);
          font-size: 12px;
          font-family: var(--font-mono, monospace);
          margin-bottom: 0.75rem;
          padding: 5px 12px;
          border-radius: 9999px;
          background: rgba(129, 140, 248, 0.08);
          border: 1px dashed rgba(129, 140, 248, 0.25);
        }

        .pulsing-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--color-primary, #6366f1);
          box-shadow: 0 0 8px var(--color-primary, #6366f1);
          animation: dot-pulse 1.2s infinite ease-in-out;
        }

        @keyframes dot-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        .stage-foot {
          margin: 0;
          text-align: center;
          font-size: 12px;
          color: var(--text-muted, #6b6d70);
        }

        /* ── Results scorecard ── */
        .scorecard {
          background: var(--bg-surface, #131313);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.08));
          border-radius: var(--radius-xl, 1rem);
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
        }

        .scorecard-hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.07));
        }

        .hero-main {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .hero-chips {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .hero-chip {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          background: var(--bg-overlay, rgba(255, 255, 255, 0.04));
          border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.07));
          color: var(--text-muted, #6b6d70);
          padding: 3px 10px;
          border-radius: 6px;
          font-family: var(--font-mono, monospace);
        }

        .hero-figure {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .hero-number {
          font-size: clamp(3.25rem, 7vw, 4.5rem);
          font-weight: 900;
          line-height: 1;
          font-family: var(--font-mono, monospace);
          font-variant-numeric: tabular-nums;
        }

        .hero-unit {
          font-size: 1.1rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          opacity: 0.75;
        }

        .hero-caption {
          margin: 0;
          font-size: 12px;
          color: var(--text-muted, #6b6d70);
        }

        .hero-side {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .side-ring-box {
          position: relative;
          width: 78px;
          height: 78px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .side-ring {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .side-ring-bg {
          fill: none;
          stroke: var(--border-subtle, rgba(255, 255, 255, 0.08));
          stroke-width: 3.2;
        }

        .side-ring-fg {
          fill: none;
          stroke: var(--color-success, #34d399);
          stroke-width: 3.2;
          stroke-linecap: round;
          stroke-dasharray: 99.9;
          transition: stroke-dashoffset 0.8s ease;
        }

        .side-ring-text {
          position: absolute;
          font-size: 14px;
          font-weight: 800;
          font-family: var(--font-mono, monospace);
          color: var(--color-success, #34d399);
          font-variant-numeric: tabular-nums;
        }

        .side-caption {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted, #6b6d70);
        }

        /* ── Stat strip ── */
        .stat-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
        }

        .stat-tile {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: var(--bg-overlay, rgba(255, 255, 255, 0.03));
          border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
          border-radius: var(--radius-lg, 0.75rem);
          transition: border-color 0.2s, background 0.2s;
        }

        .stat-tile:hover {
          border-color: var(--border-default, rgba(255, 255, 255, 0.14));
        }

        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          flex-shrink: 0;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
        }

        .stat-body {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }

        .stat-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--text-muted, #6b6d70);
          white-space: nowrap;
        }

        .stat-value {
          font-size: 1.05rem;
          font-weight: 800;
          font-family: var(--font-mono, monospace);
          font-variant-numeric: tabular-nums;
        }

        .stat-value small {
          font-size: 10px;
          font-weight: 600;
          opacity: 0.7;
          margin-left: 2px;
        }

        .chart-container {
          width: 100%;
          border-radius: var(--radius-lg, 0.75rem);
          overflow: hidden;
        }

        /* ── Key analysis ── */
        .keys-analysis {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 12px;
        }

        .keys-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px 14px;
          background: var(--bg-overlay, rgba(255, 255, 255, 0.03));
          border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
          border-radius: var(--radius-lg, 0.75rem);
        }

        .keys-title {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted, #6b6d70);
        }

        .keycaps {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .keys-empty {
          font-size: 12px;
          color: var(--color-success, #34d399);
          font-weight: 600;
        }

        .keycap {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 4px 9px;
          border-radius: 6px;
          font-family: var(--font-mono, monospace);
          font-size: 13px;
          font-weight: 700;
          border-bottom: 2px solid var(--border-default, rgba(255, 255, 255, 0.12));
        }

        .keycap-char {
          text-transform: uppercase;
          min-width: 12px;
          text-align: center;
        }

        .keycap-weak {
          background: rgba(248, 113, 113, 0.12);
          border-color: rgba(248, 113, 113, 0.3);
          color: var(--color-error-light, #fca5a5);
        }

        .keycap-slow {
          background: rgba(238, 194, 36, 0.12);
          border-color: rgba(238, 194, 36, 0.3);
          color: var(--color-accent-light, #fdd034);
        }

        .keycap-info {
          font-size: 10px;
          opacity: 0.8;
          font-weight: 600;
        }

        /* ── Actions ── */
        .scorecard-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
          padding-top: 0.5rem;
        }

        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          font-size: var(--text-sm, 0.875rem);
          font-weight: 700;
          border-radius: var(--radius-lg, 0.75rem);
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          text-decoration: none;
        }

        .retake-btn {
          background: linear-gradient(135deg, var(--color-primary, #6366f1) 0%, var(--color-primary-dark, #4f46e5) 100%);
          color: #ffffff;
          box-shadow: 0 4px 16px var(--color-primary-glow, rgba(99, 102, 241, 0.35));
        }

        .retake-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 22px var(--color-primary-glow, rgba(99, 102, 241, 0.5));
        }

        .share-btn {
          background: var(--bg-surface, #131313);
          color: var(--text-secondary, #9a9c9f);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
        }

        .share-btn:hover {
          background: var(--bg-overlay, rgba(255, 255, 255, 0.06));
          color: var(--text-primary, #ffffff);
          transform: translateY(-2px);
        }

        .share-btn.copied {
          background: rgba(52, 211, 153, 0.15);
          border-color: var(--color-success, #34d399);
          color: var(--color-success, #34d399);
        }

        .weak-practice-btn {
          background: rgba(238, 194, 36, 0.12);
          color: var(--color-accent-light, #eec224);
          border: 1px solid rgba(238, 194, 36, 0.3);
        }

        .weak-practice-btn:hover {
          background: rgba(238, 194, 36, 0.22);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px var(--color-accent-glow, rgba(238, 194, 36, 0.2));
        }

        /* ── Responsive ── */
        @media (max-width: 720px) {
          .test-topbar {
            flex-direction: column;
            align-items: stretch;
          }

          .duration-bar {
            overflow-x: auto;
            scrollbar-width: none;
          }

          .duration-bar::-webkit-scrollbar {
            display: none;
          }

          .scoreboard {
            flex-direction: column;
            gap: 0.75rem;
          }

          .sb-divider {
            width: 100%;
            height: 1px;
          }

          .sb-cell:last-child {
            justify-content: flex-start;
          }

          .sb-figure {
            margin-left: auto;
          }

          .scorecard-hero {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .hero-side {
            flex-direction: row;
            align-items: center;
            gap: 12px;
            align-self: stretch;
          }
        }

        @media (max-width: 480px) {
          .duration-bar-caption {
            display: none;
          }

          .stat-strip {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </main>
  );
}
