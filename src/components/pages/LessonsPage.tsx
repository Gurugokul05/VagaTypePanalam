'use client';

/**
 * VangaTypePanalam — Lessons Page
 *
 * Progressive lesson list with level progression.
 */

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  GraduationCap,
  CheckCircle2,
  Lock,
  Star,
  Sparkles,
  ArrowRight,
  Zap,
  Target,
  BookOpen,
  Globe,
  Trophy,
  Flame,
  Award,
} from 'lucide-react';
import TypingMascot, { type MascotMood } from '@/components/character/TypingMascot';
import { KEY_TO_FINGER, getFingerColor } from '@/data/keyboards/qwerty';
import { useUIStore } from '@/store/uiStore';
import { ENGLISH_LESSONS, type LessonDefinition } from '@/data/lessons/english';
import { TAMIL_LESSONS } from '@/data/lessons/tamil';
import { TANGLISH_LESSONS } from '@/data/lessons/tanglish';
import { getLessonProgressByLanguage } from '@/db/lessonProgress';
import type { LessonProgress, Language } from '@/db/schema';

const TA_TO_EN_MAP: Record<string, string> = {
  'அ': 'a', 'இ': 's', 'உ': 'd', 'எ': 'f', 'ஒ': 'g', 'க': 'h', 'ப': 'j', 'ம': 'k', 'த': 'l', 'ந': ';', 'ய': "'",
  'ஆ': 'q', 'ஈ': 'w', 'ஊ': 'e', 'ஐ': 'r', 'ஏ': 't', 'ள': 'y', 'ற': 'u', 'ன': 'i', 'ட': 'o', 'ண': 'p', 'ச': '[',
  'ஔ': 'z', 'ஃ': 'x', 'ழ': 'c', 'வ': 'v', 'ங': 'b', 'ல': 'n', 'ர': 'm', 'ஞ': '/'
};

const TA_TO_EN_OW_MAP: Record<string, string> = {
  'அ': 'a', 'ஆ': 'A',
  'இ': 'e', 'ஈ': 'E',
  'எ': 'f', 'ஏ': 'F',
  'உ': 'u', 'ஊ': 'U',
  'ஒ': 'o', 'ஓ': 'O',
  'ஔ': 'q',
  'ஐ': 'i',
  'க': 'k', 'ஃ': 'K',
  'ப': 'p',
  'ம': 'm',
  'ந': 'n',
  'த': 'd',
  'ட': 't',
  'ல': 'l', 'ள': 'L',
  'ர': 'r', 'ற': 'R',
  'வ': 'v',
  'ய': 'y',
  'ழ': 'z',
  'ச': 'c',
  'ங': 'g',
  'ஞ': 'j',
  'ஹ': 'h',
  'ன': 'b', 'ண': 'B',
  'ஸ': 's', 'ஷ': 'S',
};

export default function LessonsPage() {
  const { language, setLanguage, keyboardLayout } = useUIStore();
  const pathname = usePathname();
  const router = useRouter();
  const [progress, setProgress] = useState<Map<string, LessonProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const lessons = getLessonsForLanguage(language);

  useEffect(() => {
    loadProgress();
  }, [language, refreshKey]);

  useEffect(() => {
    const handleRouteChange = () => {
      setRefreshKey(k => k + 1);
    };
    window.addEventListener('lesson-progress-updated', handleRouteChange);
    return () => window.removeEventListener('lesson-progress-updated', handleRouteChange);
  }, []);

  useEffect(() => {
    if (pathname === '/lessons') {
      setRefreshKey(k => k + 1);
    }
  }, [pathname]);

  async function loadProgress() {
    try {
      setLoading(true);
      const allProgress = await getLessonProgressByLanguage(language);
      const map = new Map<string, LessonProgress>();
      for (const p of allProgress) {
        map.set(p.lessonId, p);
      }
      setProgress(map);
    } catch (err) {
      console.error('Failed to load lesson progress:', err);
    } finally {
      setLoading(false);
    }
  }

  function isLevelUnlocked(level: number): boolean {
    if (level <= 1) return true;
    const prevLevelLessons = lessons.filter((l) => l.level === level - 1);
    if (prevLevelLessons.length === 0) return true;
    return prevLevelLessons.every((l) => {
      const prog = progress.get(l.id);
      return prog?.completed ?? false;
    });
  }

  function getStarRating(prog: LessonProgress | undefined, lesson: LessonDefinition): number {
    if (!prog || prog.attempts === 0) return 0;
    if (prog.bestWpm >= lesson.targetWpm * 1.2 && prog.bestAccuracy >= 0.95) return 3;
    if (prog.bestWpm >= lesson.targetWpm) return 2;
    return 1;
  }

  const completedCount = lessons.filter((l) => progress.get(l.id)?.completed).length;
  const totalStars = lessons.reduce((acc, l) => acc + getStarRating(progress.get(l.id), l), 0);
  const maxStars = lessons.length * 3;
  const bestSpeed = Math.max(0, ...lessons.map((l) => progress.get(l.id)?.bestWpm || 0));
  const progressPct = Math.round((completedCount / (lessons.length || 1)) * 100);
  const nextLesson = lessons.find((l) => isLevelUnlocked(l.level) && !progress.get(l.id)?.completed) || lessons[0];

  const userRank = useMemo(() => {
    if (progressPct >= 100) return { title: 'Grandmaster', icon: '👑', color: '#eec224' };
    if (progressPct >= 75) return { title: 'Keyboard Artisan', icon: '💎', color: '#818cf8' };
    if (progressPct >= 50) return { title: 'Speed Warrior', icon: '⚡', color: '#34d399' };
    if (progressPct >= 25) return { title: 'Speed Cadet', icon: '🥈', color: '#60a5fa' };
    return { title: 'Home Row Initiate', icon: '🥉', color: '#a5b4fc' };
  }, [progressPct]);

  const heroMascotMood: MascotMood = useMemo(() => {
    if (progressPct >= 100) return 'celebrate';
    if (progressPct >= 50) return 'fire';
    if (completedCount > 0) return 'typing';
    return 'idle';
  }, [progressPct, completedCount]);

  const heroMascotMsg = useMemo(() => {
    if (progressPct >= 100) return "Curriculum fully mastered! Absolute keyboard legend! 🏆";
    if (progressPct >= 50) return `${completedCount} levels down! You are on fire, keep going! 🔥`;
    if (completedCount > 0) return `Ready to crush Level ${nextLesson?.level ?? 1}? Let's do it! 🚀`;
    return "Welcome! Rest fingers on home row (A S D F — J K L ;) to begin! ✨";
  }, [progressPct, completedCount, nextLesson]);

  const chapters = [
    {
      id: 1,
      title: 'Chapter 1: Home Row Citadel',
      subtitle: 'Resting finger positions & foundational muscle memory',
      badge: 'FOUNDATIONS',
      icon: '🏰',
      minLevel: 1,
      maxLevel: 8,
    },
    {
      id: 2,
      title: 'Chapter 2: The Upper Row Skyway',
      subtitle: 'Upward finger reach & fluid vowel transitions',
      badge: 'AGILITY',
      icon: '⚡',
      minLevel: 9,
      maxLevel: 16,
    },
    {
      id: 3,
      title: 'Chapter 3: The Deep Lower Row',
      subtitle: 'Downward finger curl, punctuation & compound keys',
      badge: 'PRECISION',
      icon: '🌊',
      minLevel: 17,
      maxLevel: 24,
    },
    {
      id: 4,
      title: 'Chapter 4: The Apex Realm',
      subtitle: 'Full keyboard stamina, numbers, symbols & 80+ WPM fluency',
      badge: 'MASTERY',
      icon: '👑',
      minLevel: 25,
      maxLevel: 99,
    },
  ];

  return (
    <main className="lessons-page">
      <div className="container">
        {/* Hero Header with Animated Mascot & Curriculum Overview */}
        <div className="lessons-hero-card">
          <div className="hero-content-left">
            <div className="lessons-badge">
              <GraduationCap size={15} />
              <span>Interactive Touch Typing Curriculum</span>
            </div>
            <h1 className="lessons-title">Master Touch Typing</h1>
            <p className="lessons-subtitle">
              Progressive 30-level course designed to build muscle memory from basic home row to 80+ WPM fluency.
            </p>

            {/* Language Curriculum Switcher */}
            <div className="lang-switcher-strip">
              {[
                { id: 'en', label: 'English QWERTY', badge: 'Standard' },
                { id: 'ta', label: 'தமிழ் (Tamil99)', badge: 'Unicode' },
                { id: 'tanglish', label: 'Tanglish', badge: 'Phonetic' },
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`lang-tab-btn ${language === tab.id ? 'active' : ''}`}
                  onClick={() => setLanguage(tab.id as Language)}
                >
                  <Globe size={14} />
                  <span className="lang-tab-name">{tab.label}</span>
                  <span className="lang-tab-badge">{tab.badge}</span>
                </button>
              ))}
            </div>

            {/* Quick Resume CTA */}
            {nextLesson && (
              <div className="hero-resume-strip">
                <Link href={`/lessons/${nextLesson.id}`} className="hero-resume-btn">
                  <Zap size={15} className="resume-icon" />
                  <span>Resume Mission: <strong>Level {nextLesson.level} — {nextLesson.title}</strong></span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </div>

          {/* Hero Mascot & Progress Radial Station */}
          <div className="hero-mascot-station">
            <TypingMascot
              mood={heroMascotMood}
              message={heroMascotMsg}
              size="lg"
            />

            {/* Radial Mastery Gauge & Rank */}
            <div className="hero-rank-card">
              <div className="radial-progress-box">
                <svg viewBox="0 0 80 80" className="radial-svg">
                  <circle cx="40" cy="40" r="32" className="radial-track" />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    className="radial-fill"
                    style={{
                      strokeDasharray: 201,
                      strokeDashoffset: 201 - (201 * progressPct) / 100,
                    }}
                  />
                </svg>
                <div className="radial-center-text">
                  <span className="radial-pct">{progressPct}%</span>
                </div>
              </div>

              <div className="rank-details">
                <span className="rank-badge" style={{ borderColor: userRank.color, color: userRank.color }}>
                  <span>{userRank.icon}</span>
                  <span>{userRank.title}</span>
                </span>
                <span className="rank-sub">{completedCount} of {lessons.length} Completed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Curriculum Stats Metric Strip */}
        <div className="curriculum-metrics-bar">
          <div className="c-stat-box">
            <span className="c-stat-label">COMPLETED LEVELS</span>
            <span className="c-stat-val">{completedCount} <small>/ {lessons.length}</small></span>
          </div>
          <div className="c-stat-divider" />
          <div className="c-stat-box">
            <span className="c-stat-label">STARS EARNED</span>
            <span className="c-stat-val star-val">★ {totalStars} <small>/ {maxStars}</small></span>
          </div>
          <div className="c-stat-divider" />
          <div className="c-stat-box">
            <span className="c-stat-label">TOP LESSON SPEED</span>
            <span className="c-stat-val speed-val">{bestSpeed > 0 ? `${bestSpeed} WPM` : '—'}</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <span>Loading your curriculum progress...</span>
          </div>
        ) : (
          <div className="chapters-container">
            {chapters.map(chapter => {
              const chapterLessons = lessons.filter(
                l => l.level >= chapter.minLevel && l.level <= chapter.maxLevel
              );
              if (chapterLessons.length === 0) return null;

              const chapterCompleted = chapterLessons.filter(l => progress.get(l.id)?.completed).length;

              return (
                <div key={chapter.id} className="chapter-section">
                  <div className="chapter-header">
                    <div className="chapter-title-group">
                      <span className="chapter-theme-badge">{chapter.icon} {chapter.badge}</span>
                      <h2 className="chapter-title">{chapter.title}</h2>
                      <p className="chapter-subtitle">{chapter.subtitle}</p>
                    </div>
                    <div className="chapter-progress-pill">
                      {chapterCompleted} / {chapterLessons.length} Mastered
                    </div>
                  </div>

                  <div className="lessons-grid">
                    {chapterLessons.map((lesson, idx) => {
                      const prog = progress.get(lesson.id);
                      const unlocked = isLevelUnlocked(lesson.level);
                      const completed = prog?.completed ?? false;
                      const stars = getStarRating(prog, lesson);
                      const isNext = nextLesson?.id === lesson.id;

                      return (
                        <div
                          key={lesson.id}
                          className={`lesson-card ${!unlocked ? 'locked' : ''} ${completed ? 'completed' : ''} ${isNext ? 'is-next' : ''}`}
                          style={{ '--i': idx } as React.CSSProperties}
                        >
                          {/* Recommended Next Beacon */}
                          {isNext && (
                            <div className="next-mission-beacon">
                              <Sparkles size={11} />
                              <span>UP NEXT</span>
                            </div>
                          )}

                          <div className="card-top-bar">
                            <span className="level-badge">LEVEL {lesson.level}</span>
                            {!unlocked ? (
                              <span className="lock-icon-badge" title="Complete previous level to unlock">
                                <Lock size={12} />
                              </span>
                            ) : (
                              <div className="star-row">
                                {[1, 2, 3].map(i => (
                                  <span key={i} className={`star-item ${i <= stars ? 'active' : ''}`}>★</span>
                                ))}
                              </div>
                            )}
                          </div>

                          <h3 className="lesson-name">{lesson.title}</h3>
                          <p className="lesson-desc">{lesson.description}</p>

                          {/* Key preview badges with finger color coding */}
                          <div className="lesson-keys-box">
                            <div className="keys-label">Target Keys</div>
                            <div className="lesson-keys">
                              {lesson.keys.slice(0, 8).map(k => {
                                const fingerInfo = KEY_TO_FINGER.get(k.toLowerCase());
                                const fingerColor = fingerInfo ? getFingerColor(fingerInfo.finger) : undefined;
                                const taToEn = keyboardLayout === 'phonetic' ? TA_TO_EN_OW_MAP : TA_TO_EN_MAP;
                                const enHint = language === 'ta' && taToEn[k] ? taToEn[k] : null;
                                return (
                                  <span
                                    key={k}
                                    className={`key-badge ${enHint ? 'has-hint' : ''}`}
                                    style={{ borderColor: fingerColor ? `${fingerColor}` : undefined }}
                                  >
                                    {fingerColor && (
                                      <span className="card-key-dot" style={{ backgroundColor: fingerColor }} />
                                    )}
                                    <span className="key-char">{k === ' ' ? '␣' : k.toUpperCase()}</span>
                                    {enHint && <span className="key-hint">{enHint}</span>}
                                  </span>
                                );
                              })}
                              {lesson.keys.length > 8 && (
                                <span className="key-badge more">+{lesson.keys.length - 8}</span>
                              )}
                            </div>
                          </div>

                          {/* Benchmarks & Stats */}
                          <div className="card-metrics-row">
                            <div className="metric-chip">
                              <Target size={12} />
                              <span>Goal: {lesson.targetWpm} WPM</span>
                            </div>
                            <div className="metric-chip">
                              <CheckCircle2 size={12} />
                              <span>{(lesson.targetAccuracy * 100).toFixed(0)}% Acc</span>
                            </div>
                          </div>

                          {prog && (
                            <div className="card-user-record">
                              <span>Personal Best: <strong>{prog.bestWpm} WPM</strong></span>
                              <span>Tries: {prog.attempts}</span>
                            </div>
                          )}

                          {/* Card Action */}
                          <div className="card-btn-slot">
                            {unlocked ? (
                              <Link
                                href={`/lessons/${lesson.id}`}
                                className={`lesson-action-btn ${completed ? 'btn-again' : 'btn-start'}`}
                                id={`lesson-${lesson.id}`}
                              >
                                <span>{completed ? 'Practice Again' : prog ? 'Continue Lesson' : 'Start Lesson'}</span>
                                <ArrowRight size={14} />
                              </Link>
                            ) : (
                              <button className="lesson-action-btn btn-locked" disabled>
                                <Lock size={12} />
                                <span>Locked</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .lessons-page {
          min-height: 100dvh;
          padding: var(--space-2xl) 0;
        }
        .container {
          max-width: 1040px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: var(--space-2xl);
          padding: 0 var(--space-md);
        }

        /* --- Hero Card with Mascot --- */
        .lessons-hero-card {
          background: linear-gradient(135deg, rgba(129, 140, 248, 0.06), rgba(20, 21, 30, 0.9));
          border: 1px solid var(--border-default);
          border-radius: var(--radius-2xl, 24px);
          padding: var(--space-xl) var(--space-2xl);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2xl);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
          position: relative;
          overflow: hidden;
        }

        .hero-content-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: var(--space-md);
          flex: 1;
          min-width: 0;
        }

        .lessons-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(129, 140, 248, 0.12);
          border: 1px solid rgba(129, 140, 248, 0.25);
          padding: 4px 14px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-primary-light);
        }

        .lessons-title {
          font-size: clamp(2rem, 4vw, 2.75rem);
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #ffffff 0%, var(--color-primary-light) 50%, var(--color-primary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .lessons-subtitle {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          margin: 0;
          max-width: 540px;
          line-height: 1.6;
        }

        .hero-resume-strip {
          margin-top: var(--space-xs);
        }

        .hero-resume-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: #ffffff;
          padding: 8px 20px;
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 4px 20px rgba(129, 140, 248, 0.4);
          transition: all 0.2s ease;
          animation: resumeGlowPulse 2.4s ease-in-out infinite;
        }

        .hero-resume-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 26px rgba(129, 140, 248, 0.6);
        }

        @keyframes resumeGlowPulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(129, 140, 248, 0.35); }
          50% { box-shadow: 0 4px 28px rgba(129, 140, 248, 0.65); }
        }

        /* --- Hero Mascot Station --- */
        .hero-mascot-station {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-md);
          flex-shrink: 0;
        }

        .hero-rank-card {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-xl);
          padding: 8px 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
        }

        .radial-progress-box {
          position: relative;
          width: 58px;
          height: 58px;
        }

        .radial-svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .radial-track {
          fill: none;
          stroke: rgba(255, 255, 255, 0.08);
          stroke-width: 6;
        }

        .radial-fill {
          fill: none;
          stroke: var(--color-primary);
          stroke-width: 6;
          stroke-linecap: round;
          transition: stroke-dashoffset 1s ease;
        }

        .radial-center-text {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .radial-pct {
          font-size: 12px;
          font-weight: 800;
          font-family: var(--font-mono);
          color: var(--text-primary);
        }

        .rank-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .rank-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 800;
        }

        .rank-sub {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        /* --- Curriculum Metrics Bar --- */
        .curriculum-metrics-bar {
          display: flex;
          align-items: center;
          justify-content: space-around;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-xl);
          padding: var(--space-md) var(--space-xl);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .c-stat-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .c-stat-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }

        .c-stat-val {
          font-size: 1.4rem;
          font-weight: 800;
          font-family: var(--font-mono);
          color: var(--text-primary);
        }

        .c-stat-val small {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 600;
        }

        .c-stat-divider {
          width: 1px;
          height: 32px;
          background: var(--border-subtle);
        }

        .star-val { color: var(--color-accent); }
        .speed-val { color: var(--color-success); }

        /* --- Language Switcher Strip --- */
        .lang-switcher-strip {
          display: flex;
          gap: 6px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 9999px;
          padding: 4px;
        }
        .lang-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 9999px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .lang-tab-btn:hover {
          color: var(--text-primary);
        }
        .lang-tab-btn.active {
          background: var(--color-primary);
          color: #ffffff;
          box-shadow: 0 0 12px var(--color-primary-glow);
        }
        .lang-tab-badge {
          font-size: 9px;
          background: rgba(255, 255, 255, 0.15);
          padding: 2px 6px;
          border-radius: 9999px;
        }

        /* --- Chapters --- */
        .chapters-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-2xl);
        }
        .chapter-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }
        .chapter-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: var(--space-sm);
          gap: var(--space-md);
        }
        .chapter-title-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .chapter-theme-badge {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: var(--color-primary-light);
          text-transform: uppercase;
        }
        .chapter-title {
          font-size: 1.25rem;
          font-weight: 800;
          margin: 0;
          color: var(--text-primary);
        }
        .chapter-subtitle {
          font-size: 12px;
          color: var(--text-muted);
          margin: 0;
        }
        .chapter-progress-pill {
          font-size: 11px;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--color-primary-light);
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 9999px;
          padding: 4px 12px;
          white-space: nowrap;
        }

        /* --- Next Mission Beacon --- */
        .next-mission-beacon {
          position: absolute;
          top: -10px;
          right: 16px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: #ffffff;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          padding: 3px 10px;
          border-radius: 9999px;
          box-shadow: 0 0 16px var(--color-primary-glow);
          animation: beaconPulse 1.8s ease-in-out infinite;
        }

        @keyframes beaconPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }

        .card-key-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          box-shadow: 0 0 6px currentColor;
        }

        @media (max-width: 860px) {
          .lessons-hero-card {
            flex-direction: column;
            align-items: stretch;
          }
          .hero-mascot-station {
            flex-direction: row;
            justify-content: space-between;
          }
        }

        @media (max-width: 600px) {
          .hero-mascot-station {
            flex-direction: column;
          }
          .curriculum-metrics-bar {
            flex-direction: column;
            gap: var(--space-md);
          }
          .c-stat-divider {
            width: 80%;
            height: 1px;
          }
        }

        /* --- Grid & Cards --- */
        .lessons-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: var(--space-lg);
        }
        .lesson-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-xl);
          padding: var(--space-lg);
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          position: relative;
          animation: card-rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: calc(min(var(--i, 0), 10) * 35ms);
        }
        @keyframes card-rise {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .lesson-card:hover:not(.locked) {
          transform: translateY(-3px);
          border-color: var(--color-primary);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        }
        .lesson-card.completed {
          border-color: rgba(52, 211, 153, 0.3);
        }
        .lesson-card.is-next {
          border-color: var(--color-primary);
          box-shadow: 0 0 20px var(--color-primary-glow);
        }
        .lesson-card.locked {
          opacity: 0.55;
          filter: grayscale(0.4);
          background: rgba(18, 19, 23, 0.6);
        }

        .card-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .level-badge {
          font-size: 10px;
          font-weight: 800;
          font-family: var(--font-mono);
          letter-spacing: 0.08em;
          color: var(--color-primary-light);
          background: rgba(129, 140, 248, 0.1);
          padding: 3px 8px;
          border-radius: 6px;
        }
        .star-row {
          display: flex;
          gap: 2px;
          color: var(--border-default);
          font-size: 13px;
        }
        .star-item.active {
          color: var(--color-accent);
          text-shadow: 0 0 6px var(--color-accent-glow);
        }
        .lock-icon-badge {
          color: var(--text-muted);
          background: var(--bg-overlay);
          padding: 4px;
          border-radius: 6px;
          display: flex;
        }

        .lesson-name {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 2px 0 0;
          color: var(--text-primary);
        }
        .lesson-desc {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0;
          min-height: 2.8em;
        }

        .lesson-keys-box {
          background: var(--bg-overlay);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 6px 10px;
        }
        .keys-label {
          font-size: 9px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }
        .lesson-keys {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .key-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 4px;
          padding: 2px 6px;
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .key-hint {
          font-size: 9px;
          color: var(--color-primary-light);
          opacity: 0.8;
        }
        .key-badge.more {
          background: transparent;
          border: none;
          color: var(--text-muted);
        }

        .card-metrics-row {
          display: flex;
          gap: var(--space-sm);
        }
        .metric-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .card-user-record {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--color-primary-light);
          font-family: var(--font-mono);
          border-top: 1px dashed var(--border-subtle);
          padding-top: 6px;
        }

        .card-btn-slot {
          margin-top: auto;
          padding-top: 6px;
        }
        .lesson-action-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 9px 16px;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }
        .btn-start {
          background: var(--color-primary);
          color: #ffffff;
          box-shadow: 0 2px 10px var(--color-primary-glow);
        }
        .btn-start:hover {
          background: var(--color-primary-light);
          transform: translateY(-1px);
        }
        .btn-again {
          background: var(--bg-overlay);
          border-color: var(--border-default);
          color: var(--text-primary);
        }
        .btn-again:hover {
          background: var(--bg-hover);
          border-color: var(--color-primary);
        }
        .btn-locked {
          background: transparent;
          border-color: var(--border-subtle);
          color: var(--text-muted);
          cursor: not-allowed;
        }

        .loading-state {
          text-align: center;
          color: var(--text-muted);
          padding: var(--space-3xl);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-md);
        }
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border-subtle);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 680px) {
          .curriculum-stat-group { grid-template-columns: 1fr; gap: var(--space-sm); }
          .lang-switcher-strip { flex-direction: column; border-radius: var(--radius-lg); }
          .chapter-header { flex-direction: column; align-items: flex-start; }
          .lessons-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}

function getLessonsForLanguage(language: Language): LessonDefinition[] {
  switch (language) {
    case 'en':
      return ENGLISH_LESSONS;
    case 'tanglish':
      return TANGLISH_LESSONS;
    case 'ta':
      return TAMIL_LESSONS;
    default:
      return ENGLISH_LESSONS;
  }
}
