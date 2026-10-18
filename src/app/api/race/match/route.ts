import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { findMatch, purgeExpiredRooms } from "@/lib/multiplayer/server";
import { RACE_DEFAULT_CAPACITY, isValidPeerId, isValidPlayerName } from "@/lib/multiplayer/protocol";
import { clampCapacity } from "@/lib/multiplayer/raceLogic";

/**
 * POST /api/race/match — quick match.
 * Body: { peerId, name, wpm?, capacity? }
 *
 * Joins the oldest open public room near the player's skill bucket, or
 * creates a new room and returns role: "host" (the player then waits for
 * others to be matched into the room).
 */
export async function POST(req: Request) {
  const limitResult = rateLimit(`race-match:${getClientIp(req)}`, { limit: 12, windowMs: 60_000 });
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: "Too many match requests. Slow down." },
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
    const result = await findMatch({
      peerId: b.peerId,
      name: b.name,
      wpm: typeof b.wpm === "number" ? b.wpm : undefined,
      capacity: clampCapacity(b.capacity ?? RACE_DEFAULT_CAPACITY),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[race] match failed:", error);
    return NextResponse.json({ error: "Matchmaking failed" }, { status: 500 });
  }
}
