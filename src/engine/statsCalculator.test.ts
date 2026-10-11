import { describe, it, expect } from 'vitest';
import {
  calculateWPM,
  calculateRawWPM,
  calculateBurstWPM,
  calculateAccuracy,
  formatAccuracy,
  formatWPM,
  formatDuration,
  getLocalDateString,
  calculateKogasa,
  calculateConsistency,
} from './statsCalculator';

describe('calculateWPM', () => {
  it('returns 0 for zero elapsed time', () => {
    expect(calculateWPM(100, 0)).toBe(0);
  });

  it('returns 0 for negative elapsed time', () => {
    expect(calculateWPM(100, -5)).toBe(0);
  });

  it('returns 0 for zero correct chars', () => {
    expect(calculateWPM(0, 60_000)).toBe(0);
  });

  it('computes standard WPM (5 chars = 1 word)', () => {
    // 250 correct chars in 60s = 50 WPM
    expect(calculateWPM(250, 60_000)).toBe(50);
  });

  it('rounds to nearest integer', () => {
    // 100 chars in 30s = 40 wpm exactly; 105/30s = 42
    expect(calculateWPM(105, 30_000)).toBe(42);
  });
});

describe('calculateRawWPM', () => {
  it('counts all characters including errors', () => {
    expect(calculateRawWPM(300, 60_000)).toBe(60);
  });

  it('returns 0 for invalid inputs', () => {
    expect(calculateRawWPM(0, 60_000)).toBe(0);
    expect(calculateRawWPM(10, 0)).toBe(0);
  });
});

describe('calculateBurstWPM', () => {
  it('measures single-segment speed', () => {
    // 25 chars in 5s = 5 words / (1/12 min) = 60 wpm
    expect(calculateBurstWPM(25, 5_000)).toBe(60);
  });

  it('returns 0 for invalid inputs', () => {
    expect(calculateBurstWPM(10, 0)).toBe(0);
  });
});

describe('calculateAccuracy', () => {
  it('returns 1 when nothing typed', () => {
    expect(calculateAccuracy(0, 0)).toBe(1);
  });

  it('returns correct ratio', () => {
    expect(calculateAccuracy(95, 100)).toBeCloseTo(0.95);
  });
});

describe('formatAccuracy', () => {
  it('formats with one decimal', () => {
    expect(formatAccuracy(975, 1000)).toBe('97.5%');
    expect(formatAccuracy(100, 100)).toBe('100.0%');
  });
});

describe('formatWPM', () => {
  it('clamps negatives to zero', () => {
    expect(formatWPM(-5)).toBe('0');
  });

  it('formats positive values as string', () => {
    expect(formatWPM(72)).toBe('72');
  });
});

describe('formatDuration', () => {
  it('formats sub-second as 0s', () => {
    expect(formatDuration(500)).toBe('0s');
  });

  it('formats seconds only', () => {
    expect(formatDuration(45_000)).toBe('45s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125_000)).toBe('2m 5s');
  });
});

describe('getLocalDateString', () => {
  it('formats as YYYY-MM-DD using local time parts', () => {
    const d = new Date(2026, 7, 9); // local: Aug 9 2026
    expect(getLocalDateString(d)).toBe('2026-08-09');
  });

  it('pads month and day', () => {
    const d = new Date(2026, 0, 5);
    expect(getLocalDateString(d)).toBe('2026-01-05');
  });
});

describe('calculateKogasa', () => {
  it('returns 1 for fewer than 2 samples', () => {
    expect(calculateKogasa([])).toBe(1);
    expect(calculateKogasa([100])).toBe(1);
  });

  it('returns 1 for perfectly consistent latencies', () => {
    expect(calculateKogasa([100, 100, 100, 100])).toBe(1);
  });

  it('filters out extreme pauses above 2 seconds', () => {
    // The 5000ms outlier is ignored; remaining are identical -> perfect score
    expect(calculateKogasa([100, 100, 100, 5000])).toBe(1);
  });

  it('returns lower score for erratic typing than steady typing', () => {
    const erratic = calculateKogasa([80, 400, 120, 900, 150]);
    const steady = calculateKogasa([100, 110, 105, 95, 108]);
    expect(erratic).toBeLessThan(steady);
  });

  it('clamps to [0, 1]', () => {
    const score = calculateKogasa([10, 2000]);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('calculateConsistency (legacy)', () => {
  it('returns 1 for identical wpms', () => {
    expect(calculateConsistency([60, 60, 60])).toBe(1);
  });

  it('penalizes variance', () => {
    expect(calculateConsistency([20, 100, 20, 100])).toBeLessThan(
      calculateConsistency([55, 60, 58, 62])
    );
  });
});
