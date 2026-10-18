import { describe, it, expect } from 'vitest';
import {
  generateRoomCode,
  isValidRoomCode,
  skillBucketForWpm,
  clampCapacity,
  clockOffsetFromSample,
  medianClockOffset,
  hostTimeToLocal,
  validateRaceText,
  validateSignalEnvelope,
  newBoardEntry,
  applyProgress,
  markDisconnected,
  toResults,
  isRaceComplete,
} from './raceLogic';
import { RACE_TEXT_MIN_CHARS, type RacePlayerState } from './protocol';

describe('room codes', () => {
  it('generates valid 5-char codes from the safe alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      expect(isValidRoomCode(code)).toBe(true);
      expect(code).toHaveLength(5);
      expect(code).not.toMatch(/[IO01]/);
    }
  });

  it('rejects malformed codes', () => {
    expect(isValidRoomCode('abc12')).toBe(false); // lowercase
    expect(isValidRoomCode('ABC1O')).toBe(false); // confusable chars
    expect(isValidRoomCode('ABCD')).toBe(false); // too short
    expect(isValidRoomCode(12345)).toBe(false);
  });
});

describe('matchmaking buckets', () => {
  it('buckets by ~20 wpm bands', () => {
    expect(skillBucketForWpm(0)).toBe(0);
    expect(skillBucketForWpm(39)).toBe(1);
    expect(skillBucketForWpm(40)).toBe(2);
    expect(skillBucketForWpm(120)).toBe(6);
  });

  it('clamps invalid and extreme values', () => {
    expect(skillBucketForWpm(undefined)).toBe(0);
    expect(skillBucketForWpm(-5)).toBe(0);
    expect(skillBucketForWpm(NaN)).toBe(0);
    expect(skillBucketForWpm(9999)).toBe(10);
  });

  it('clamps capacity to 2..4', () => {
    expect(clampCapacity(1)).toBe(2);
    expect(clampCapacity(3)).toBe(3);
    expect(clampCapacity(99)).toBe(4);
    expect(clampCapacity('x')).toBe(2);
  });
});

describe('clock synchronization', () => {
  it('computes offset from a symmetric sample', () => {
    // Host is 500ms ahead; RTT 100ms (t0=0, host receives at 550, client gets pong at 100)
    const offset = clockOffsetFromSample({ t0: 0, t1: 550, t2: 100 });
    expect(offset).toBe(500);
  });

  it('uses the median across noisy samples', () => {
    const offset = medianClockOffset([
      { t0: 0, t1: 520, t2: 60 }, // 490
      { t0: 0, t1: 800, t2: 640 }, // 480 (one slow hop)
      { t0: 0, t1: 505, t2: 30 }, // 490
    ]);
    expect(offset).toBe(490);
  });

  it('returns 0 with no samples', () => {
    expect(medianClockOffset([])).toBe(0);
  });

  it('converts host time to local time', () => {
    expect(hostTimeToLocal(10_000, 500)).toBe(9_500);
  });
});

describe('race text validation', () => {
  it('accepts texts within bounds', () => {
    expect(validateRaceText('a'.repeat(RACE_TEXT_MIN_CHARS)).valid).toBe(true);
  });

  it('rejects too short / too long / non-string', () => {
    expect(validateRaceText('too short').valid).toBe(false);
    expect(validateRaceText('a'.repeat(4000)).valid).toBe(false);
    expect(validateRaceText(42).valid).toBe(false);
  });
});

describe('signal envelope validation', () => {
  it('accepts a valid offer', () => {
    const res = validateSignalEnvelope({ from: 'peer-a', to: null, type: 'offer', payload: { sdp: 'x' } });
    expect(res.ok).toBe(true);
  });

  it('rejects unknown types, self-signaling, bad ids', () => {
    expect(validateSignalEnvelope({ from: 'a', to: null, type: 'hack', payload: {} }).ok).toBe(false);
    expect(validateSignalEnvelope({ from: 'a', to: 'a', type: 'offer', payload: {} }).ok).toBe(false);
    expect(validateSignalEnvelope({ from: '', to: null, type: 'offer', payload: {} }).ok).toBe(false);
    expect(validateSignalEnvelope({ from: 'a', to: null, type: 'offer', payload: 'x'.repeat(20_000) }).ok).toBe(false);
  });
});

describe('board aggregation (host-authoritative)', () => {
  const base = (): RacePlayerState[] => [
    newBoardEntry('host', 'Host'),
    newBoardEntry('guest', 'Guest'),
  ];

  it('assigns places in finish order', () => {
    let board = base();
    board = applyProgress(board, 'guest', { charIndex: 300, wpm: 80, accuracy: 0.98 }, true);
    board = applyProgress(board, 'host', { charIndex: 300, wpm: 60, accuracy: 0.95 }, true);
    expect(board.find(p => p.peerId === 'guest')!.place).toBe(1);
    expect(board.find(p => p.peerId === 'host')!.place).toBe(2);
  });

  it('never regresses charIndex on out-of-order updates', () => {
    let board = base();
    board = applyProgress(board, 'guest', { charIndex: 100, wpm: 70, accuracy: 1 }, false);
    board = applyProgress(board, 'guest', { charIndex: 80, wpm: 60, accuracy: 1 }, false);
    expect(board.find(p => p.peerId === 'guest')!.charIndex).toBe(100);
  });

  it('ignores updates for unknown peers', () => {
    const board = applyProgress(base(), 'stranger', { charIndex: 50, wpm: 90, accuracy: 1 }, false);
    expect(board.find(p => p.peerId === 'stranger')).toBeUndefined();
  });

  it('marks disconnects and treats their place as unassigned', () => {
    let board = base();
    board = markDisconnected(board, 'guest');
    expect(board.find(p => p.peerId === 'guest')!.connected).toBe(false);
  });

  it('sorts results: finishers by place, others by distance', () => {
    let board = base();
    board = applyProgress(board, 'guest', { charIndex: 300, wpm: 80, accuracy: 1 }, true);
    board = applyProgress(board, 'host', { charIndex: 200, wpm: 50, accuracy: 1 }, false);
    const results = toResults(board);
    expect(results[0].peerId).toBe('guest');
    expect(results[1].peerId).toBe('host');
  });

  it('detects race completion', () => {
    let board = base();
    expect(isRaceComplete(board)).toBe(false);
    board = applyProgress(board, 'guest', { charIndex: 300, wpm: 80, accuracy: 1 }, true);
    expect(isRaceComplete(board)).toBe(false);
    board = applyProgress(board, 'host', { charIndex: 300, wpm: 70, accuracy: 1 }, true);
    expect(isRaceComplete(board)).toBe(true);
  });

  it('completes when the last remaining player is alone', () => {
    let board = base();
    board = markDisconnected(board, 'guest');
    board = applyProgress(board, 'host', { charIndex: 50, wpm: 30, accuracy: 1 }, false);
    expect(isRaceComplete(board)).toBe(true);
  });
});
