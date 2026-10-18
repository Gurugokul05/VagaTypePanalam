/**
 * Multiplayer race protocol — shared between browser clients and API routes.
 *
 * Transport model: peer-to-peer WebRTC data channels (star topology with the
 * room host at the center). HTTP + Postgres (via /api/race/*) is used ONLY for
 * room discovery, matchmaking, and WebRTC signaling — never for gameplay.
 */

export const RACE_PROTOCOL_VERSION = 1;

// ── Room / roster ──
export const RACE_MIN_PLAYERS = 2;
export const RACE_MAX_PLAYERS = 4;
export const RACE_DEFAULT_CAPACITY = 4;
export const RACE_ROOM_CODE_LENGTH = 5;
export const RACE_ROOM_TTL_MS = 30 * 60 * 1000;
export const RACE_TEXT_MIN_CHARS = 50;
export const RACE_TEXT_MAX_CHARS = 3000;

// ── Signaling ──
export const SIGNAL_TYPES = ['offer', 'answer', 'ice', 'join', 'leave', 'started', 'closed'] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];
export const SIGNAL_MAX_PAYLOAD_BYTES = 16 * 1024;
export const SIGNAL_POLL_INTERVAL_MS = 1200;
export const PEER_ID_MAX_LENGTH = 64;
export const PLAYER_NAME_MAX_LENGTH = 24;

/** Confusable characters (I, O, 0, 1) removed for readable room codes. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_REGEX = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/;

// ── Race timing ──
export const RACE_START_DELAY_MS = 3000;
export const PROGRESS_SEND_INTERVAL_MS = 200;
export const BOARD_BROADCAST_INTERVAL_MS = 250;
export const CLOCK_SYNC_ROUNDS = 3;
export const HOST_DNF_GRACE_MS = 30_000;
export const RACE_MAX_DURATION_MS = 10 * 60 * 1000;

// ── Simulated race bots (local practice, mirrors existing bot behavior) ──
export interface RaceBotSpec {
  name: string;
  wpm: number;
}

/** A player's live state in the race board (host-authoritative). */
export interface RacePlayerState {
  peerId: string;
  name: string;
  charIndex: number;
  wpm: number;
  accuracy: number;
  finished: boolean;
  place: number | null;
  /** false after the host declares this player disconnected (DNF). */
  connected: boolean;
  isBot?: boolean;
}

export interface RaceResultsEntry {
  peerId: string;
  name: string;
  place: number | null;
  wpm: number;
  accuracy: number;
  finished: boolean;
  isBot?: boolean;
}

// ── WebRTC data-channel messages (browser → browser) ──
export type RaceChannelMessage =
  | { type: 'hello'; name: string; wpm: number }
  | { type: 'welcome'; name: string; capacity: number; peers: string[] }
  | { type: 'clock-ping'; t0: number }
  | { type: 'clock-pong'; t0: number; t1: number }
  | { type: 'start'; text: string; startAtHostMs: number }
  | { type: 'progress'; charIndex: number; wpm: number; accuracy: number }
  | { type: 'finish'; charIndex: number; wpm: number; accuracy: number }
  | { type: 'board'; players: RacePlayerState[]; startAtHostMs: number }
  | { type: 'results'; players: RaceResultsEntry[]; endedReason: RaceEndedReason }
  | { type: 'bye' };

export type RaceEndedReason = 'all-finished' | 'host-closed' | 'timeout' | 'aborted';

export function isRaceChannelMessage(value: unknown): value is RaceChannelMessage {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  switch (v.type) {
    case 'hello':
    case 'clock-ping':
    case 'clock-pong':
    case 'start':
    case 'progress':
    case 'finish':
    case 'board':
    case 'results':
    case 'welcome':
    case 'bye':
      return true;
    default:
      return false;
  }
}

/** Progress/finish payload guards used on the host (untrusted peer input). */
export function isProgressPayload(value: unknown): value is { charIndex: number; wpm: number; accuracy: number } {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.charIndex === 'number' && Number.isFinite(v.charIndex) && v.charIndex >= 0 &&
    typeof v.wpm === 'number' && Number.isFinite(v.wpm) &&
    typeof v.accuracy === 'number' && Number.isFinite(v.accuracy)
  );
}

export function isValidPeerId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= PEER_ID_MAX_LENGTH;
}

export function isValidRoomCode(value: unknown): value is string {
  return typeof value === 'string' && ROOM_CODE_REGEX.test(value);
}

export function isValidPlayerName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= PLAYER_NAME_MAX_LENGTH;
}
