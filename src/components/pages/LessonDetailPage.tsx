'use client';

/**
 * VangaTypePanalam — Individual Lesson Page
 */

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Target, CheckCircle2, Sparkles, BookOpen } from 'lucide-react';
import TypingArea from '@/components/typing/TypingArea';
import VirtualKeyboard from '@/components/keyboard/VirtualKeyboard';
import { useUIStore } from '@/store/uiStore';
import { ENGLISH_LESSONS, type LessonDefinition } from '@/data/lessons/english';
import { TAMIL_LESSONS } from '@/data/lessons/tamil';
import { TANGLISH_LESSONS } from '@/data/lessons/tanglish';
import { recordLessonAttempt } from '@/db/lessonProgress';
import type { Session, Language } from '@/db/schema';

export default function LessonDetailPage({ lessonTitle: _lessonTitle }: { lessonTitle?: string | null }) {
  const params = useParams();
  const router = useRouter();
  const { showKeyboard, keyboardLayout } = useUIStore();

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

  const isTamilLesson = lesson.id.startsWith('tamil-');

  return (
    <main className="lesson-studio-page">
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

        {/* Focus Lesson Banner */}
        <div className="lesson-focus-card">
          <div className="focus-header">
            <div className="level-pill-badge">LEVEL {lesson.level}</div>
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
            <span className="focus-keys-label">Focus Keys:</span>
            <div className="keys-chips">
              {lesson.keys.map(k => (
                <span key={k} className="focus-key-chip">
                  {k === ' ' ? 'SPACEBAR' : k.toUpperCase()}
                </span>
              ))}
            </div>
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

        {/* Virtual Keyboard Guidance */}
        {showKeyboard && (
          <div className="lesson-keyboard-wrap">
            {isTamilLesson && (
              <p className="keyboard-note">
                {keyboardLayout === 'phonetic' ? 'OW Phonetic' : 'Tamil99'} layout active. Highlighted keys indicate this lesson&apos;s finger targets.
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
        }
        .container {
          max-width: 920px;
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

        /* --- Focus Card --- */
        .lesson-focus-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-xl);
          padding: var(--space-xl);
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
        }
        .focus-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-sm);
        }
        .level-pill-badge {
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
          gap: 6px;
          flex-wrap: wrap;
        }
        .focus-key-chip {
          background: var(--bg-overlay);
          border: 1px solid var(--border-default);
          border-radius: 6px;
          padding: 3px 10px;
          font-size: 12px;
          font-family: var(--font-mono);
          font-weight: 800;
          color: var(--color-primary-light);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
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
        }
        .keyboard-note {
          text-align: center;
          font-size: var(--text-xs);
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        @media (max-width: 600px) {
          .focus-header { flex-direction: column; align-items: flex-start; }
          .focus-keys-row { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </main>
  );
}
