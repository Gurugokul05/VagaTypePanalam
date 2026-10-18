import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { createRoom, purgeExpiredRooms } from "@/lib/multiplayer/server";
import { RACE_DEFAULT_CAPACITY, isValidPeerId, isValidPlayerName } from "@/lib/multiplayer/protocol";
import { clampCapacity } from "@/lib/multiplayer/raceLogic";

/**
 * POST /api/race/room — create a race lobby.
 * Body: { peerId, name, wpm?, capacity?, isPublic? }
 */
export async function POST(req: Request) {
  const limitResult = rateLimit(`race-create:${getClientIp(req)}`, { limit: 10, windowMs: 60_000 });
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: "Too many rooms created. Slow down." },
      { status: 429, headers: { "Retry-After": String(limitResult.retryAfterSeconds) } }
    );
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
  if (!isValidPlayerName(b.name)) {
    return NextResponse.json({ error: "Invalid player name" }, { status: 400 });
  }

  try {
    await purgeExpiredRooms();
    const { code } = await createRoom({
      hostPeerId: b.peerId,
      hostName: b.name,
      wpm: typeof b.wpm === "number" ? b.wpm : undefined,
      capacity: clampCapacity(b.capacity ?? RACE_DEFAULT_CAPACITY),
      isPublic: b.isPublic !== false,
    });
    return NextResponse.json({ code, hostPeerId: b.peerId }, { status: 201 });
  } catch (error) {
    console.error("[race] room create failed:", error);
    return NextResponse.json({ error: "Could not create room" }, { status: 500 });
  }
}
