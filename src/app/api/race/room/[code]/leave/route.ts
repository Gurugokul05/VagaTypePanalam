import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { isValidPeerId, isValidRoomCode } from "@/lib/multiplayer/protocol";

/**
 * POST /api/race/room/[code]/leave — announce departure.
 * Body: { peerId }
 * When the host leaves, the room is closed and all pollers are told.
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

  const b = (body ?? {}) as Record<string, unknown>;
  if (!isValidPeerId(b.peerId)) {
    return NextResponse.json({ error: "Invalid peer id" }, { status: 400 });
  }

  const limitResult = rateLimit(`race-leave:${b.peerId}`, { limit: 30, windowMs: 60_000 });
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: "Too many leave requests" },
      { status: 429, headers: { "Retry-After": String(limitResult.retryAfterSeconds) } }
    );
  }

  try {
    const room = await prisma.raceRoom.findUnique({ where: { code } });
    if (!room) {
      return NextResponse.json({ ok: true }); // already gone
    }

    await prisma.raceSignal.create({
      data: { roomCode: code, fromPeer: b.peerId, toPeer: null, type: "leave", payload: {} },
    });

    if (b.peerId === room.hostPeerId && room.status !== "closed") {
      await prisma.raceRoom.update({ where: { code }, data: { status: "closed" } });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[race] leave failed:", error);
    return NextResponse.json({ error: "Could not leave room" }, { status: 500 });
  }
}
