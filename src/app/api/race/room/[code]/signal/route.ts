import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { rateLimit } from "@/lib/rateLimit";
import { getRoster } from "@/lib/multiplayer/server";
import { validateSignalEnvelope } from "@/lib/multiplayer/raceLogic";
import { isValidRoomCode, isValidPeerId } from "@/lib/multiplayer/protocol";

/**
 * POST /api/race/room/[code]/signal — relay a WebRTC signaling message.
 * Body: { from, to (null = broadcast), type, payload }
 *
 * GET  /api/race/room/[code]/signal?peer=X&after=N — poll mailbox + room state.
 */

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isValidRoomCode(code)) {
    return NextResponse.json({ error: "Invalid room code" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const envelope = validateSignalEnvelope(body);
  if (!envelope.ok) {
    return NextResponse.json({ error: envelope.error }, { status: 400 });
  }

  const limitResult = rateLimit(`race-signal:${envelope.value.from}`, { limit: 240, windowMs: 60_000 });
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: "Signaling rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(limitResult.retryAfterSeconds) } }
    );
  }

  try {
    const room = await prisma.raceRoom.findUnique({ where: { code } });
    if (!room || room.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const signal = await prisma.raceSignal.create({
      data: {
        roomCode: code,
        fromPeer: envelope.value.from,
        toPeer: envelope.value.to,
        type: envelope.value.type,
        payload: envelope.value.payload as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    // Room lifecycle transitions carried over the signaling channel.
    if (envelope.value.type === "started" && envelope.value.from === room.hostPeerId && room.status === "open") {
      await prisma.raceRoom.update({ where: { code }, data: { status: "started" } });
    }
    if (envelope.value.type === "closed" && envelope.value.from === room.hostPeerId && room.status !== "closed") {
      await prisma.raceRoom.update({ where: { code }, data: { status: "closed" } });
    }

    return NextResponse.json({ ok: true, id: signal.id }, { status: 201 });
  } catch (error) {
    console.error("[race] signal failed:", error);
    return NextResponse.json({ error: "Could not relay signal" }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isValidRoomCode(code)) {
    return NextResponse.json({ error: "Invalid room code" }, { status: 400 });
  }

  const url = new URL(req.url);
  const peer = url.searchParams.get("peer");
  if (!isValidPeerId(peer)) {
    return NextResponse.json({ error: "Invalid peer id" }, { status: 400 });
  }

  const limitResult = rateLimit(`race-poll:${peer}`, { limit: 180, windowMs: 60_000 });
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: "Polling too fast" },
      { status: 429, headers: { "Retry-After": String(limitResult.retryAfterSeconds) } }
    );
  }

  const after = Math.max(0, Number.parseInt(url.searchParams.get("after") ?? "0", 10) || 0);

  try {
    const room = await prisma.raceRoom.findUnique({ where: { code } });
    if (!room || room.expiresAt.getTime() < Date.now()) {
      // Keep polling clients cheap and simple: 200 with a closed status.
      return NextResponse.json({ status: "closed", hostPeerId: null, capacity: 0, roster: [], signals: [] });
    }

    const signals = await prisma.raceSignal.findMany({
      where: {
        roomCode: code,
        id: { gt: after },
        OR: [{ toPeer: null }, { toPeer: peer }],
      },
      orderBy: { id: "asc" },
      take: 100,
      select: { id: true, fromPeer: true, toPeer: true, type: true, payload: true, createdAt: true },
    });

    const roster = await getRoster(code, room.hostPeerId);

    return NextResponse.json({
      status: room.status,
      hostPeerId: room.hostPeerId,
      capacity: room.capacity,
      roster,
      signals: signals.map((s) => ({
        id: s.id,
        from: s.fromPeer,
        to: s.toPeer,
        type: s.type,
        payload: s.payload,
        at: s.createdAt,
      })),
    });
  } catch (error) {
    console.error("[race] poll failed:", error);
    return NextResponse.json({ error: "Could not fetch signals" }, { status: 500 });
  }
}
