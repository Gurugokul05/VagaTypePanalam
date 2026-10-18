/**
 * Server-side helpers for multiplayer races (signaling + matchmaking).
 *
 * Gameplay never touches this code path — these helpers only manage rooms,
 * rosters, quick-match and WebRTC signaling mailboxes.
 */

import prisma from '@/lib/prisma';
import { generateRoomCode, clampCapacity, skillBucketForWpm } from './raceLogic';
import {
  RACE_ROOM_TTL_MS,
  RACE_DEFAULT_CAPACITY,
  PLAYER_NAME_MAX_LENGTH,
  isValidPeerId,
} from './protocol';

export interface RosterEntry {
  peerId: string;
  name: string;
  wpm: number | null;
  joinedAt: Date;
  isHost: boolean;
}

const PURGE_GRACE_MS = 60 * 60 * 1000;

export async function purgeExpiredRooms(): Promise<void> {
  await prisma.raceRoom.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - PURGE_GRACE_MS) } },
  });
}

/** Roster is derived from join/leave signals within the room's TTL window. */
export async function getRoster(roomCode: string, hostPeerId: string, hostName = 'Host'): Promise<RosterEntry[]> {
  const since = new Date(Date.now() - RACE_ROOM_TTL_MS);
  const signals = await prisma.raceSignal.findMany({
    where: { roomCode, type: { in: ['join', 'leave'] }, createdAt: { gte: since } },
    orderBy: { id: 'asc' },
    select: { fromPeer: true, type: true, payload: true, createdAt: true },
  });

  const map = new Map<string, RosterEntry>();
  let hostDisplayName = hostName;
  let hostWpm: number | null = null;
  for (const s of signals) {
    if (s.type === 'join') {
      const p = (s.payload ?? {}) as { name?: unknown; wpm?: unknown };
      if (s.fromPeer === hostPeerId) {
        if (typeof p.name === 'string' && p.name.length > 0) hostDisplayName = p.name.slice(0, PLAYER_NAME_MAX_LENGTH);
        if (typeof p.wpm === 'number' && Number.isFinite(p.wpm)) hostWpm = p.wpm;
        continue;
      }
      map.set(s.fromPeer, {
        peerId: s.fromPeer,
        name: typeof p.name === 'string' ? p.name.slice(0, PLAYER_NAME_MAX_LENGTH) : 'Player',
        wpm: typeof p.wpm === 'number' && Number.isFinite(p.wpm) ? p.wpm : null,
        joinedAt: s.createdAt,
        isHost: false,
      });
    } else {
      map.delete(s.fromPeer);
    }
  }

  return [
    { peerId: hostPeerId, name: hostDisplayName, wpm: hostWpm, joinedAt: new Date(0), isHost: true },
    ...map.values(),
  ];
}

export async function createRoom(opts: {
  hostPeerId: string;
  hostName: string;
  wpm?: number;
  capacity?: number;
  isPublic?: boolean;
}): Promise<{ code: string }> {
  const capacity = clampCapacity(opts.capacity ?? RACE_DEFAULT_CAPACITY);
  const skillBucket = skillBucketForWpm(opts.wpm);
  const expiresAt = new Date(Date.now() + RACE_ROOM_TTL_MS);
  const hostName = opts.hostName.slice(0, PLAYER_NAME_MAX_LENGTH) || 'Host';

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    try {
      await prisma.raceRoom.create({
        data: {
          code,
          hostPeerId: opts.hostPeerId,
          capacity,
          skillBucket,
          isPublic: opts.isPublic ?? true,
          expiresAt,
        },
      });
      // Seed the host's name so rosters and lobby UIs can show it.
      await prisma.raceSignal.create({
        data: { roomCode: code, fromPeer: opts.hostPeerId, toPeer: null, type: 'join', payload: { name: hostName, wpm: opts.wpm ?? null } },
      });
      return { code };
    } catch (error) {
      const code_ = (error as { code?: string }).code;
      if (code_ !== 'P2002') throw error; // not a unique-collision, rethrow
    }
  }
  throw new Error('Could not allocate a unique room code');
}

export type JoinResult =
  | { ok: true; hostPeerId: string; capacity: number; roster: RosterEntry[] }
  | { ok: false; status: number; error: string };

export async function joinRoom(
  code: string,
  peerId: string,
  name: string,
  wpm?: number
): Promise<JoinResult> {
  const room = await prisma.raceRoom.findUnique({ where: { code } });
  if (!room || room.expiresAt.getTime() < Date.now()) {
    return { ok: false, status: 404, error: 'Room not found' };
  }
  if (room.status !== 'open') {
    return { ok: false, status: 409, error: 'Race already started' };
  }
  if (!isValidPeerId(peerId)) {
    return { ok: false, status: 400, error: 'Invalid peer id' };
  }

  const roster = await getRoster(code, room.hostPeerId);

  if (peerId !== room.hostPeerId) {
    const alreadyIn = roster.some(r => r.peerId === peerId);
    if (!alreadyIn && roster.length >= room.capacity) {
      return { ok: false, status: 409, error: 'Room is full' };
    }
    await prisma.raceSignal.create({
      data: {
        roomCode: code,
        fromPeer: peerId,
        toPeer: null,
        type: 'join',
        payload: { name: name.slice(0, PLAYER_NAME_MAX_LENGTH) || 'Player', wpm: wpm ?? null },
      },
    });
  }

  return { ok: true, hostPeerId: room.hostPeerId, capacity: room.capacity, roster };
}

/** Find the oldest joinable public room near the player's skill bucket. */
export async function findMatch(opts: {
  peerId: string;
  name: string;
  wpm?: number;
  capacity?: number;
}): Promise<{ role: 'host' | 'guest'; code: string; hostPeerId: string; roster?: RosterEntry[] }> {
  const bucket = skillBucketForWpm(opts.wpm);

  const candidates = await prisma.raceRoom.findMany({
    where: {
      status: 'open',
      isPublic: true,
      hostPeerId: { not: opts.peerId },
      expiresAt: { gt: new Date() },
      skillBucket: { gte: Math.max(0, bucket - 1), lte: bucket + 1 },
    },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  for (const room of candidates) {
    const roster = await getRoster(room.code, room.hostPeerId);
    if (roster.length >= room.capacity) continue;
    const joined = await joinRoom(room.code, opts.peerId, opts.name, opts.wpm);
    if (joined.ok) {
      return { role: 'guest', code: room.code, hostPeerId: room.hostPeerId, roster: joined.roster };
    }
  }

  const { code } = await createRoom({
    hostPeerId: opts.peerId,
    hostName: opts.name,
    wpm: opts.wpm,
    capacity: opts.capacity,
  });
  return { role: 'host', code, hostPeerId: opts.peerId };
}
