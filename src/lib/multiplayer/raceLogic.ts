/**
 * Pure race logic — no browser or DB dependencies, unit-testable in Node.
 */

import {
  RACE_MAX_PLAYERS,
  RACE_MIN_PLAYERS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_REGEX,
  RACE_TEXT_MAX_CHARS,
  RACE_TEXT_MIN_CHARS,
  SIGNAL_MAX_PAYLOAD_BYTES,
  SIGNAL_TYPES,
  PLAYER_NAME_MAX_LENGTH,
  PEER_ID_MAX_LENGTH,
  type RacePlayerState,
  type RaceResultsEntry,
  type SignalType,
} from './protocol';

// ── Room codes ──

export function generateRoomCode(rand: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(rand() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

export function isValidRoomCode(value: unknown): value is string {
  return typeof value === 'string' && ROOM_CODE_REGEX.test(value);
}

// ── Matchmaking ──

/** Buckets players by ~20 WPM bands so races stay competitive. */
export function skillBucketForWpm(wpm: number | undefined | null): number {
  const safe = typeof wpm === 'number' && Number.isFinite(wpm) && wpm > 0 ? wpm : 0;
  return Math.max(0, Math.min(10, Math.floor(safe / 20)));
}

export function clampCapacity(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : RACE_MIN_PLAYERS;
  return Math.max(RACE_MIN_PLAYERS, Math.min(RACE_MAX_PLAYERS, n));
}

// ── Clock synchronization ──

export interface ClockSample {
  /** Client time when the ping was sent. */
  t0: number;
  /** Host time when the ping was received. */
  t1: number;
  /** Client time when the pong arrived. */
  t2: number;
}

/** Offset to ADD to local time to obtain host time. Median for robustness. */
export function clockOffsetFromSample(sample: ClockSample): number {
  const rtt = sample.t2 - sample.t0;
  return sample.t1 - sample.t0 - rtt / 2;
}

export function medianClockOffset(samples: ClockSample[]): number {
  if (samples.length === 0) return 0;
  const offsets = samples.map(clockOffsetFromSample).sort((a, b) => a - b);
  const mid = Math.floor(offsets.length / 2);
  return offsets.length % 2 === 0
    ? (offsets[mid - 1] + offsets[mid]) / 2
    : offsets[mid];
}

/** Convert a host timestamp into local time given a measured offset. */
export function hostTimeToLocal(hostMs: number, offsetToHostMs: number): number {
  return hostMs - offsetToHostMs;
}

// ── Race text validation (host-provided, shipped over the data channel) ──

export function validateRaceText(text: unknown): { valid: true } | { valid: false; error: string } {
  if (typeof text !== 'string') return { valid: false, error: 'Race text must be a string' };
  const trimmed = text.trim();
  if (trimmed.length < RACE_TEXT_MIN_CHARS) {
    return { valid: false, error: `Race text must be at least ${RACE_TEXT_MIN_CHARS} characters` };
  }
  if (text.length > RACE_TEXT_MAX_CHARS) {
    return { valid: false, error: `Race text must be at most ${RACE_TEXT_MAX_CHARS} characters` };
  }
  return { valid: true };
}

// ── Signaling envelope validation (server-side use) ──

export interface SignalEnvelope {
  from: string;
  to: string | null;
  type: SignalType;
  payload: unknown;
}

export function validateSignalEnvelope(body: unknown): { ok: true; value: SignalEnvelope } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Invalid body' };
  const b = body as Record<string, unknown>;

  if (typeof b.from !== 'string' || b.from.length === 0 || b.from.length > PEER_ID_MAX_LENGTH) {
    return { ok: false, error: 'Invalid from peer id' };
  }
  const to = b.to ?? null;
  if (to !== null && (typeof to !== 'string' || to.length === 0 || to.length > PEER_ID_MAX_LENGTH)) {
    return { ok: false, error: 'Invalid to peer id' };
  }
  if (typeof b.type !== 'string' || !SIGNAL_TYPES.includes(b.type as SignalType)) {
    return { ok: false, error: 'Invalid signal type' };
  }
  if (to === b.from) {
    return { ok: false, error: 'Cannot signal yourself' };
  }

  let encodedPayload: string;
  try {
    encodedPayload = JSON.stringify(b.payload ?? {});
  } catch {
    return { ok: false, error: 'Payload is not serializable' };
  }
  if (encodedPayload.length > SIGNAL_MAX_PAYLOAD_BYTES) {
    return { ok: false, error: 'Payload too large' };
  }

  return { ok: true, value: { from: b.from, to: to as string | null, type: b.type as SignalType, payload: b.payload ?? {} } };
}

// ── Board aggregation (host-authoritative) ──

export function newBoardEntry(peerId: string, name: string, isBot = false): RacePlayerState {
  return {
    peerId,
    name: name.slice(0, PLAYER_NAME_MAX_LENGTH),
    charIndex: 0,
    wpm: 0,
    accuracy: 1,
    finished: false,
    place: null,
    connected: true,
    ...(isBot ? { isBot: true } : {}),
  };
}

/**
 * Apply a peer's progress update to the board. Returns a new board array.
 * Placement is assigned when a player reports their finish:
 * place = (# of players already finished) + 1.
 */
export function applyProgress(
  board: RacePlayerState[],
  peerId: string,
  progress: { charIndex: number; wpm: number; accuracy: number },
  finished: boolean
): RacePlayerState[] {
  let finishedCount = board.filter(p => p.finished).length;

  return board.map(p => {
    if (p.peerId !== peerId) return p;

    const next: RacePlayerState = {
      ...p,
      charIndex: Math.max(p.charIndex, progress.charIndex),
      wpm: progress.wpm,
      accuracy: progress.accuracy,
    };

    if (finished && !p.finished) {
      next.finished = true;
      finishedCount += 1;
      next.place = finishedCount;
    } else if (!finished && p.finished) {
      next.finished = true;
      next.place = p.place;
    }

    return next;
  });
}

export function markDisconnected(board: RacePlayerState[], peerId: string): RacePlayerState[] {
  return board.map(p => (p.peerId === peerId ? { ...p, connected: false } : p));
}

/** Final standings: finishers by place first, then everyone else by distance. */
export function toResults(board: RacePlayerState[]): RaceResultsEntry[] {
  return [...board]
    .sort((a, b) => {
      if (a.finished && b.finished) return (a.place ?? 99) - (b.place ?? 99);
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.charIndex - a.charIndex;
    })
    .map(p => ({
      peerId: p.peerId,
      name: p.name,
      place: p.place,
      wpm: p.wpm,
      accuracy: p.accuracy,
      finished: p.finished,
      ...(p.isBot ? { isBot: true } : {}),
    }));
}

/** Whether the race is over: everyone finished, or only one player remains. */
export function isRaceComplete(board: RacePlayerState[]): boolean {
  const active = board.filter(p => p.connected);
  if (active.length === 0) return true;
  if (active.length === 1 && board.length > 1) return true;
  return active.every(p => p.finished);
}
