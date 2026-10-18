/**
 * Per-keystroke performance probe for the SessionTracker hot path.
 *
 * Measures processKeystroke() (which includes emitSnapshot -> getSnapshot)
 * on a deep session, and the standalone getSnapshot() cost.
 *
 * These are informational numbers (logged, not asserted) used to compare
 * optimization work before/after. Run: npx vitest run src/engine/sessionTracker.perf.test.ts
 */
import { describe, it, vi } from 'vitest';

vi.mock('@/db/keyStats', () => ({
  createDefaultKeyStat: vi.fn(),
  batchSaveKeyStats: vi.fn().mockResolvedValue(undefined),
  getKeyStatsByLanguage: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/db/sessions', () => ({
  saveSession: vi.fn().mockResolvedValue(undefined),
  generateSessionId: vi.fn(() => 'perf-session-id'),
}));

vi.mock('@/db/profile', () => ({
  recordSessionInProfile: vi.fn().mockResolvedValue({ newBadges: [] }),
}));

vi.mock('@/lib/sync', () => ({
  requestCloudSync: vi.fn(),
}));

import { SessionTracker } from './sessionTracker';

const TEXT = 'the quick brown fox jumps over the lazy dog '.repeat(40).trim();

function stats(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const pick = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  return {
    n: samples.length,
    meanMs: +mean.toFixed(4),
    p50Ms: +pick(0.5).toFixed(4),
    p95Ms: +pick(0.95).toFixed(4),
    p99Ms: +pick(0.99).toFixed(4),
    maxMs: +pick(1).toFixed(4),
  };
}

describe('SessionTracker perf probe', () => {
  it('measures per-keystroke and getSnapshot cost on a ~2k char session', async () => {
    const tracker = new SessionTracker('en', 'practice');
    tracker.setCallbacks({ onStateChange: () => {} });
    await tracker.init(undefined, TEXT);

    const keystrokeSamples: number[] = [];
    for (const ch of TEXT) {
      const t0 = performance.now();
      tracker.processKeystroke(ch);
      keystrokeSamples.push(performance.now() - t0);
    }

    // @ts-expect-error private access for profiling only
    const snapshotSamples: number[] = [];
    for (let i = 0; i < 2000; i++) {
      const t0 = performance.now();
      // @ts-expect-error private access for profiling only
      tracker.getSnapshot();
      snapshotSamples.push(performance.now() - t0);
    }

    const ks = stats(keystrokeSamples);
    const ss = stats(snapshotSamples);
    const totalKeystrokeMs = keystrokeSamples.reduce((a, b) => a + b, 0);

    console.log(`[perf] chars=${TEXT.length}`);
    console.log(`[perf] processKeystroke+snapshot: ${JSON.stringify(ks)} totalMs=${totalKeystrokeMs.toFixed(1)}`);
    console.log(`[perf] getSnapshot alone:        ${JSON.stringify(ss)}`);
  });
});
