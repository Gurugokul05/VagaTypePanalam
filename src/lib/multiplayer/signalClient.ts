/**
 * HTTP signaling client — talks to /api/race/* for room discovery and
 * WebRTC offer/answer/ICE exchange. Browser-only.
 */

import { SIGNAL_POLL_INTERVAL_MS } from './protocol';

export interface SignalMessage {
  id: number;
  from: string;
  to: string | null;
  type: string;
  payload: unknown;
  at: string;
}

export interface RosterEntry {
  peerId: string;
  name: string;
  wpm: number | null;
  joinedAt: string;
  isHost: boolean;
}

export interface RoomPollResult {
  status: 'open' | 'started' | 'closed';
  hostPeerId: string | null;
  capacity: number;
  roster: RosterEntry[];
  signals: SignalMessage[];
}

export interface PeerIdentity {
  /** Opaque, per-tab id (crypto.randomUUID by default). */
  peerId: string;
  name: string;
  wpm?: number;
}

export function createPeerId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `peer-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function createRoom(identity: PeerIdentity & { capacity?: number; isPublic?: boolean }): Promise<{ code: string }> {
  return postJson('/api/race/room', {
    peerId: identity.peerId,
    name: identity.name,
    wpm: identity.wpm,
    capacity: identity.capacity,
    isPublic: identity.isPublic,
  });
}

export async function joinRoom(
  code: string,
  identity: PeerIdentity
): Promise<{ hostPeerId: string; capacity: number; roster: RosterEntry[] }> {
  return postJson(`/api/race/room/${code}/join`, {
    peerId: identity.peerId,
    name: identity.name,
    wpm: identity.wpm,
  });
}

export async function quickMatch(
  identity: PeerIdentity & { capacity?: number }
): Promise<{ role: 'host' | 'guest'; code: string; hostPeerId: string; roster?: RosterEntry[] }> {
  return postJson('/api/race/match', {
    peerId: identity.peerId,
    name: identity.name,
    wpm: identity.wpm,
    capacity: identity.capacity,
  });
}

export async function sendSignal(
  code: string,
  from: string,
  to: string | null,
  type: string,
  payload: unknown
): Promise<{ id: number }> {
  return postJson(`/api/race/room/${code}/signal`, { from, to, type, payload });
}

export async function leaveRoom(code: string, peerId: string): Promise<void> {
  await postJson(`/api/race/room/${code}/leave`, { peerId });
}

/** Fire-and-forget leave for page unload. */
export function leaveRoomBeacon(code: string, peerId: string): void {
  if (typeof navigator === 'undefined' || !('sendBeacon' in navigator)) return;
  const blob = new Blob([JSON.stringify({ peerId })], { type: 'application/json' });
  navigator.sendBeacon(`/api/race/room/${code}/leave`, blob);
}

/**
 * Polls a room's signaling mailbox. Signals are returned exactly once per
 * client via the monotonic `after` cursor. Browser-only.
 */
export class SignalPoller {
  private lastId = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(
    private readonly code: string,
    private readonly peerId: string,
    private readonly handlers: {
      onSignals: (room: RoomPollResult) => void;
      onClosed: (reason: 'room-closed' | 'room-gone') => void;
      onError?: (error: Error) => void;
    }
  ) {}

  start(): void {
    this.stopped = false;
    void this.tick();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private schedule(delayMs: number): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => void this.tick(), delayMs);
  }

  private async tick(): Promise<void> {
    if (this.stopped) return;
    let delay = SIGNAL_POLL_INTERVAL_MS;
    try {
      const url = `/api/race/room/${this.code}/signal?peer=${encodeURIComponent(this.peerId)}&after=${this.lastId}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.status === 404) {
        this.stopped = true;
        this.handlers.onClosed('room-gone');
        return;
      }
      if (!res.ok) {
        throw new Error(`Poll failed (${res.status})`);
      }
      const room = (await res.json()) as RoomPollResult;
      if (room.status === 'closed') {
        // Drain the final batch first so players can see closing signals.
        this.stopped = true;
        this.handlers.onSignals(room);
        this.handlers.onClosed('room-closed');
        return;
      }
      for (const s of room.signals) {
        if (s.id > this.lastId) this.lastId = s.id;
      }
      this.handlers.onSignals(room);
    } catch (error) {
      delay = SIGNAL_POLL_INTERVAL_MS * 2; // gentle backoff, keep trying
      this.handlers.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
    this.schedule(delay);
  }
}
