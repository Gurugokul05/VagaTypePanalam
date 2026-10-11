import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit } from './rateLimit';

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Unique key per test run avoids cross-test pollution
  });

  it('allows requests under the limit', () => {
    const key = `k1-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, { limit: 5, windowMs: 60_000 }).allowed).toBe(true);
    }
  });

  it('blocks requests over the limit', () => {
    const key = `k2-${Math.random()}`;
    for (let i = 0; i < 3; i++) rateLimit(key, { limit: 3, windowMs: 60_000 });
    const blocked = rateLimit(key, { limit: 3, windowMs: 60_000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('resets after the window passes', () => {
    const key = `k3-${Math.random()}`;
    for (let i = 0; i < 2; i++) rateLimit(key, { limit: 2, windowMs: 1000 });
    expect(rateLimit(key, { limit: 2, windowMs: 1000 }).allowed).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(rateLimit(key, { limit: 2, windowMs: 1000 }).allowed).toBe(true);
  });

  it('tracks keys independently', () => {
    const a = `k4-${Math.random()}`;
    const b = `k5-${Math.random()}`;
    for (let i = 0; i < 3; i++) rateLimit(a, { limit: 3, windowMs: 60_000 });
    expect(rateLimit(a, { limit: 3, windowMs: 60_000 }).allowed).toBe(false);
    expect(rateLimit(b, { limit: 3, windowMs: 60_000 }).allowed).toBe(true);
  });

  it('reports remaining count', () => {
    const key = `k6-${Math.random()}`;
    expect(rateLimit(key, { limit: 3, windowMs: 60_000 }).remaining).toBe(2);
    expect(rateLimit(key, { limit: 3, windowMs: 60_000 }).remaining).toBe(1);
    expect(rateLimit(key, { limit: 3, windowMs: 60_000 }).remaining).toBe(0);
  });
});
