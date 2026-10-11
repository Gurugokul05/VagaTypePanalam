import { describe, it, expect, vi, beforeEach } from 'vitest';

// KeyProfiler persists to IndexedDB — mock the storage layer so tests
// run in a plain Node environment.
vi.mock('@/db/keyStats', () => ({
  createDefaultKeyStat: vi.fn(),
  batchSaveKeyStats: vi.fn().mockResolvedValue(undefined),
}));

import { KeyProfiler } from './keyProfiler';
import { RECENT_LATENCY_BUFFER_SIZE } from './constants';

describe('KeyProfiler', () => {
  let profiler: KeyProfiler;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-21T10:00:00Z'));
    profiler = new KeyProfiler('english');
  });

  it('creates a new profile on first keystroke', () => {
    profiler.recordKeystroke('a', true, 150);
    const stats = profiler.getAllStats();
    expect(stats).toHaveLength(1);
    expect(stats[0].char).toBe('a');
    expect(stats[0].totalAttempts).toBe(1);
    expect(stats[0].correctAttempts).toBe(1);
  });

  it('accumulates accuracy across keystrokes', () => {
    profiler.recordKeystroke('a', true, 100);
    profiler.recordKeystroke('a', false, 120);
    profiler.recordKeystroke('a', true, 140);
    const stat = profiler.getAllStats().find(s => s.char === 'a')!;
    expect(stat.totalAttempts).toBe(3);
    expect(stat.correctAttempts).toBe(2);
  });

  it('caps the latency circular buffer at its configured size', () => {
    for (let i = 0; i < RECENT_LATENCY_BUFFER_SIZE + 10; i++) {
      profiler.recordKeystroke('b', true, i + 1);
      vi.advanceTimersByTime(1);
    }
    const stat = profiler.getAllStats().find(s => s.char === 'b')!;
    expect(stat.recentLatencies).toHaveLength(RECENT_LATENCY_BUFFER_SIZE);
    // Oldest samples must be evicted, newest must be retained.
    // Note: the buffer overwrites in place, so order is rotated —
    // consumers only rely on membership/averages, never on sort order.
    expect(stat.recentLatencies).not.toContain(5); // evicted
    expect(stat.recentLatencies).toContain(30); // newest kept
  });

  it('marks fast accurate keys as not weak', () => {
    for (let i = 0; i < 20; i++) {
      profiler.recordKeystroke('c', true, 100);
      vi.advanceTimersByTime(5);
    }
    expect(profiler.isKeyWeak('c')).toBe(false);
    expect(profiler.getConfidence('c')).toBeGreaterThan(0.6);
  });

  it('keeps error-prone keys weak', () => {
    for (let i = 0; i < 20; i++) {
      profiler.recordKeystroke('d', i % 2 === 0, 900);
      vi.advanceTimersByTime(5);
    }
    expect(profiler.isKeyWeak('d')).toBe(true);
  });

  it('identifies weakest keys sorted by confidence', () => {
    for (let i = 0; i < 15; i++) {
      profiler.recordKeystroke('x', true, 100); // strong
      vi.advanceTimersByTime(2);
      profiler.recordKeystroke('y', true, 1200); // slow
      vi.advanceTimersByTime(2);
      profiler.recordKeystroke('z', false, 1300); // slow + wrong
      vi.advanceTimersByTime(2);
    }
    const weakest = profiler.getWeakestKeys(2);
    expect(weakest).toHaveLength(2);
    expect(weakest[0].confidence).toBeLessThanOrEqual(weakest[1].confidence);
    expect(['y', 'z']).toContain(weakest[0].char);
  });

  it('records digraphs for consecutive correct keystrokes', () => {
    profiler.recordKeystroke('t', true, 100);
    vi.advanceTimersByTime(50);
    profiler.recordKeystroke('h', true, 80);

    const digraph = profiler.getAllStats().find(s => s.char === 'th');
    expect(digraph).toBeDefined();
    expect(digraph!.totalAttempts).toBe(1);
  });

  it('does not record digraphs across long pauses', () => {
    profiler.recordKeystroke('q', true, 100);
    vi.advanceTimersByTime(3000);
    profiler.recordKeystroke('w', true, 100);

    const digraph = profiler.getAllStats().find(s => s.char === 'qw');
    expect(digraph).toBeUndefined();
  });

  it('does not record digraphs when second keystroke is an error', () => {
    profiler.recordKeystroke('e', true, 100);
    vi.advanceTimersByTime(50);
    profiler.recordKeystroke('r', false, 100);

    const digraph = profiler.getAllStats().find(s => s.char === 'er');
    expect(digraph).toBeUndefined();
  });

  it('reports calibration only after enough latency samples', () => {
    expect(profiler.isCalibrated('f')).toBe(false);
    for (let i = 0; i < 10; i++) {
      profiler.recordKeystroke('f', true, 200);
      vi.advanceTimersByTime(1);
    }
    expect(profiler.isCalibrated('f')).toBe(true);
  });
});
