'use client';

/**
 * VangaTypePanalam — Individual Lesson Page
 */

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Target, CheckCircle2,
  Sparkles, Trophy, RotateCcw, Flame
} from 'lucide-react';
import TypingArea from '@/components/typing/TypingArea';
import VirtualKeyboard from '@/components/keyboard/VirtualKeyboard';
import TypingMascot, { type MascotMood } from '@/components/character/TypingMascot';
import Confetti from '@/components/ui/Confetti';
import { useUIStore } from '@/store/uiStore';
import { useTypingStore } from '@/store/typingStore';
import { ENGLISH_LESSONS, type LessonDefinition } from '@/data/lessons/english';
import { TAMIL_LESSONS } from '@/data/lessons/tamil';
import { TANGLISH_LESSONS } from '@/data/lessons/tanglish';
import { KEY_TO_FINGER, getFingerColor } from '@/data/keyboards/qwerty';
import { recordLessonAttempt } from '@/db/lessonProgress';
import type { Session, Language } from '@/db/schema';

export default function LessonDetailPage({ lessonTitle: _lessonTitle }: { lessonTitle?: string | null }) {
  const params = useParams();
  const router = useRouter();
  const { showKeyboard, keyboardLayout } = useUIStore();
  const snapshot = useTypingStore((s) => s.snapshot);

  const [completedSession, setCompletedSession] = useState<{
    wpm: number;
    accuracy: number;
    passed: boolean;
  } | null>(null);

  const lessonId = params?.id as string;
  let lesson: LessonDefinition | undefined = ENGLISH_LESSONS.find((l) => l.id === lessonId);
  if (!lesson) lesson = TAMIL_LESSONS.find((l) => l.id === lessonId);
  if (!lesson) lesson = TANGLISH_LESSONS.find((l) => l.id === lessonId);

  const lessonLanguage: Language = lessonId?.startsWith('tamil-') ? 'ta' : lessonId?.startsWith('tanglish-') ? 'tanglish' : 'en';

  if (!lesson) {
    return (
      <main className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1>Lesson not found</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
          The lesson &ldquo;{lessonId}&rdquo; does not exist.
        </p>
        <button
          className="btn btn-primary"
          style={{ marginTop: '1.5rem' }}
          onClick={() => router.push('/lessons')}
        >
          Back to Lessons
        </button>
      </main>
    );
  }

  const currentLessons = lessonId.startsWith('tamil-') ? TAMIL_LESSONS : (lessonId.startsWith('tanglish-') ? TANGLISH_LESSONS : ENGLISH_LESSONS);
  const currentIndex = currentLessons.findIndex(l => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? currentLessons[currentIndex - 1] : undefined;
  const nextLesson = currentIndex >= 0 && currentIndex < currentLessons.length - 1
    ? currentLessons[currentIndex + 1]
    : undefined;

  const handleComplete = async (session: Session) => {
    const passed = session.wpm >= lesson.targetWpm && session.accuracy >= lesson.targetAccuracy;
    setCompletedSession({
      wpm: session.wpm,
      accuracy: session.accuracy,
      passed,
    });

    await recordLessonAttempt(
      lesson.id,
      lessonLanguage,
      lesson.level,
      session.wpm,
      session.accuracy,
      lesson.targetWpm,
      lesson.targetAccuracy
    );
    window.dispatchEvent(new Event('lesson-progress-updated'));
  };

  const handleRetry = () => {
    setCompletedSession(null);
    router.refresh();
  };

  // Dynamic Mascot mood based on real-time typing events
  const mascotMood: MascotMood = useMemo(() => {
    if (completedSession?.passed) return 'celebrate';
    if (completedSession && !completedSession.passed) return 'oops';
    if (snapshot.state === 'typing') {
      if (snapshot.wpm >= lesson.targetWpm * 1.25) return 'fire';
      if (snapshot.accuracy < 0.8 && snapshot.totalKeystrokes > 5) return 'oops';
      return 'typing';
    }
    return 'idle';
  }, [completedSession, snapshot.state, snapshot.wpm, snapshot.accuracy, snapshot.totalKeystrokes, lesson.targetWpm]);

  // Mascot dynamic speech bubble
  const mascotMessage = useMemo(() => {
    if (completedSession?.passed) {
      return `🎉 LEVEL ${lesson.level} MASTERED! ${completedSession.wpm} WPM & ${(completedSession.accuracy * 100).toFixed(0)}% Acc! Awesome! 🏆`;
    }
    if (completedSession && !completedSession.passed) {
      return `Target is ${lesson.targetWpm} WPM / ${(lesson.targetAccuracy * 100).toFixed(0)}% Acc. You are super close, try once more! 💪`;
    }
    if (snapshot.state === 'typing') {
      if (snapshot.wpm >= lesson.targetWpm * 1.25) {
        return `Speed Demon! ${snapshot.wpm} WPM! Keep fingers light! 🔥`;
      }
      return `Focus keys: ${lesson.keys.map(k => k === ' ' ? 'Space' : k.toUpperCase()).join(' ')} ✨`;
    }
    return `Level ${lesson.level}: ${lesson.description}`;
  }, [completedSession, snapshot.state, snapshot.wpm, lesson]);

  const isTamilLesson = lesson.id.startsWith('tamil-');

  return (
    <main className="lesson-studio-page">
      {/* Confetti celebration on pass */}
      {completedSession?.passed && <Confetti count={50} />}

      <div className="container">
        {/* Top Studio Bar */}
        <div className="studio-top-bar">
          <Link href="/lessons" className="studio-nav-btn">
            <ArrowLeft size={15} />
            <span>All Lessons</span>
          </Link>

          <div className="studio-nav-actions">
            {prevLesson && (
              <Link href={`/lessons/${prevLesson.id}`} className="studio-nav-btn" title={prevLesson.title}>
                <span>Prev Level</span>
              </Link>
            )}
            {nextLesson && (
              <Link href={`/lessons/${nextLesson.id}`} className="studio-nav-btn next-btn" title={nextLesson.title}>
                <span>Next Level</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>

        {/* Victory Celebration Card when passed */}
        {completedSession && (
          <div className={`lesson-result-banner ${completedSession.passed ? 'passed' : 'try-again'}`}>
            <div className="result-banner-left">
              <div className="result-icon-circle">
                {completedSession.passed ? <Trophy size={28} /> : <Flame size={28} />}
              </div>
              <div className="result-text-col">
                <h2 className="result-title">
                  {completedSession.passed ? 'Level Passed with Flying Colors!' : 'Keep Going, Almost There!'}
                </h2>
                <div className="result-stats-row">
                  <span className="result-pill">
                    Speed: <strong>{completedSession.wpm} WPM</strong> (Target: {lesson.targetWpm})
                  </span>
                  <span className="result-pill">
                    Accuracy: <strong>{(completedSession.accuracy * 100).toFixed(0)}%</strong> (Target: {(lesson.targetAccuracy * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="result-actions">
              <button onClick={handleRetry} className="result-btn retry-btn">
                <RotateCcw size={14} />
                <span>Retry</span>
              </button>
              {completedSession.passed && nextLesson && (
                <Link href={`/lessons/${nextLesson.id}`} className="result-btn next-level-btn">
                  <span>Continue to Level {nextLesson.level}</span>
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Focus Lesson Banner + Mascot Sidekick */}
        <div className="lesson-focus-card">
          <div className="focus-card-left">
            <div className="focus-header">
              <div className="level-pill-badge">
                <Sparkles size={12} />
                <span>LEVEL {lesson.level}</span>
              </div>
              <div className="focus-goals">
                <div className="goal-badge">
                  <Target size={13} />
                  <span>Target: <strong>{lesson.targetWpm} WPM</strong></span>
                </div>
                <div className="goal-badge">
                  <CheckCircle2 size={13} />
                  <span>Accuracy: <strong>{(lesson.targetAccuracy * 100).toFixed(0)}%</strong></span>
                </div>
              </div>
            </div>

            <h1 className="focus-title">{lesson.title}</h1>
            <p className="focus-description">{lesson.description}</p>

            <div className="focus-keys-row">
              <span className="focus-keys-label">Target Keys:</span>
              <div className="keys-chips">
                {lesson.keys.map(k => {
                  const fingerInfo = KEY_TO_FINGER.get(k.toLowerCase());
                  const fingerColor = fingerInfo ? getFingerColor(fingerInfo.finger) : undefined;
                  return (
                    <span key={k} className="focus-key-chip" style={{ borderColor: fingerColor ? `${fingerColor}` : undefined }}>
                      {fingerColor && (
                        <span className="chip-finger-dot" style={{ backgroundColor: fingerColor }} />
                      )}
                      <span className="chip-key-char">{k === ' ' ? 'SPACEBAR' : k.toUpperCase()}</span>
                      {fingerInfo && (
                        <span className="chip-finger-name">{fingerInfo.finger}</span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive Mascot Companion */}
          <div className="focus-card-mascot">
            <TypingMascot
              mood={mascotMood}
              message={mascotMessage}
              size="md"
            />
          </div>
        </div>

        {/* Typing Practice Area */}
        <div className="typing-studio-box">
          <TypingArea
            language={lessonLanguage}
            targetKeys={lesson.keys}
            onComplete={handleComplete}
            mode="lesson"
            nextLessonId={nextLesson?.id}
            targetWpm={lesson.targetWpm}
            targetAccuracy={lesson.targetAccuracy}
          />
        </div>

        {/* Virtual Keyboard Guidance with Hands Visualizer */}
        {showKeyboard && (
          <div className="lesson-keyboard-wrap">
            {isTamilLesson && (
              <p className="keyboard-note">
                {keyboardLayout === 'phonetic' ? 'OW Phonetic' : 'Tamil99'} layout active. Follow the animated hand guide below for finger targets.
              </p>
            )}
            <VirtualKeyboard
              showFingerColors={true}
              unlockedKeys={lesson.keys}
              language={lessonLanguage}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        .lesson-studio-page {
          min-height: 100dvh;
          padding: var(--space-xl) 0 var(--space-3xl);
          position: relative;
        }
        .container {
          max-width: 1040px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
          padding: 0 var(--space-md);
        }

        /* --- Top Bar --- */
        .studio-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        .studio-nav-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-full);
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .studio-nav-btn:hover {
          color: var(--text-primary);
          border-color: var(--color-primary);
          background: var(--bg-hover);
        }
        .studio-nav-actions {
          display: flex;
          gap: 8px;
        }
        .next-btn {
          color: var(--color-primary-light);
          border-color: rgba(129, 140, 248, 0.3);
        }

        /* --- Result / Victory Banner --- */
        .lesson-result-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-md);
          padding: var(--space-lg) var(--space-xl);
          border-radius: var(--radius-xl);
          animation: bannerSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .lesson-result-banner.passed {
          background: linear-gradient(135deg, rgba(52, 211, 153, 0.14), rgba(20, 21, 30, 0.95));
          border: 1.5px solid rgba(52, 211, 153, 0.4);
          box-shadow: 0 10px 40px rgba(52, 211, 153, 0.15);
        }
        .lesson-result-banner.try-again {
          background: linear-gradient(135deg, rgba(238, 194, 36, 0.12), rgba(20, 21, 30, 0.95));
          border: 1.5px solid rgba(238, 194, 36, 0.35);
          box-shadow: 0 10px 40px rgba(238, 194, 36, 0.12);
        }

        @keyframes bannerSlideIn {
          0% { opacity: 0; transform: translateY(-12px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .result-banner-left {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }
        .result-icon-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .passed .result-icon-circle {
          background: rgba(52, 211, 153, 0.2);
          color: #34d399;
          box-shadow: 0 0 20px rgba(52, 211, 153, 0.3);
        }
        .try-again .result-icon-circle {
          background: rgba(238, 194, 36, 0.2);
          color: #fbbf24;
          box-shadow: 0 0 20px rgba(238, 194, 36, 0.3);
        }

        .result-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 6px 0;
        }
        .result-stats-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .result-pill {
          font-size: 12px;
          color: var(--text-secondary);
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-subtle);
          padding: 3px 10px;
          border-radius: var(--radius-full);
          font-family: var(--font-mono);
        }
        .result-pill strong {
          color: var(--text-primary);
        }

        .result-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .result-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          padding: 8px 18px;
          border-radius: var(--radius-full);
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        .retry-btn {
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          color: var(--text-secondary);
        }
        .retry-btn:hover {
          color: var(--text-primary);
          border-color: var(--text-muted);
        }
        .next-level-btn {
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: #ffffff;
          box-shadow: 0 4px 18px rgba(129, 140, 248, 0.4);
        }
        .next-level-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 22px rgba(129, 140, 248, 0.55);
        }

        /* --- Focus Card --- */
        .lesson-focus-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-xl);
          padding: var(--space-xl);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-xl);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.02), rgba(0, 0, 0, 0.2));
        }

        .focus-card-left {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          flex: 1;
          min-width: 0;
        }

        .focus-card-mascot {
          flex-shrink: 0;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .focus-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-sm);
        }
        .level-pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(129, 140, 248, 0.12);
          border: 1px solid rgba(129, 140, 248, 0.3);
          color: var(--color-primary-light);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          padding: 4px 12px;
          border-radius: 9999px;
          font-family: var(--font-mono);
        }
        .focus-goals {
          display: flex;
          gap: var(--space-md);
        }
        .goal-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }
        .goal-badge strong {
          color: var(--text-primary);
        }

        .focus-title {
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 800;
          letter-spacing: -0.01em;
          margin: 0;
          color: var(--text-primary);
        }
        .focus-description {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.6;
        }

        .focus-keys-row {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          margin-top: var(--space-xs);
          padding-top: var(--space-sm);
          border-top: 1px dashed var(--border-subtle);
          flex-wrap: wrap;
        }
        .focus-keys-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
        }
        .keys-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .focus-key-chip {
          background: var(--bg-overlay);
          border: 1.5px solid var(--border-default);
          border-radius: 8px;
          padding: 4px 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          transition: transform 0.15s ease;
        }
        .focus-key-chip:hover {
          transform: translateY(-2px);
        }
        .chip-finger-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          box-shadow: 0 0 6px currentColor;
        }
        .chip-key-char {
          font-size: 13px;
          font-family: var(--font-mono);
          font-weight: 800;
          color: var(--text-primary);
        }
        .chip-finger-name {
          font-size: 10px;
          text-transform: capitalize;
          color: var(--text-muted);
          font-weight: 600;
        }

        .typing-studio-box {
          position: relative;
        }

        .lesson-keyboard-wrap {
          margin-top: var(--space-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-sm);
          width: 100%;
        }
        .lesson-keyboard-wrap :global(.virtual-keyboard-wrapper) {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .keyboard-note {
          text-align: center;
          font-size: var(--text-xs);
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        @media (max-width: 768px) {
          .lesson-focus-card {
            flex-direction: column;
            align-items: stretch;
          }
          .focus-card-mascot {
            order: -1;
            margin-bottom: var(--space-sm);
          }
          .focus-header { flex-direction: column; align-items: flex-start; }
          .focus-keys-row { flex-direction: column; align-items: flex-start; }
          .lesson-result-banner { flex-direction: column; align-items: flex-start; }
          .result-actions { width: 100%; justify-content: stretch; }
          .result-actions .result-btn { flex: 1; justify-content: center; }
        }
      `}</style>
    </main>
  );
}
