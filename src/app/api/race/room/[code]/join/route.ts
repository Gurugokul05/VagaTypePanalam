import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { joinRoom } from "@/lib/multiplayer/server";
import { isValidPeerId, isValidPlayerName, isValidRoomCode } from "@/lib/multiplayer/protocol";

/**
 * POST /api/race/room/[code]/join — join a race lobby by code.
 * Body: { peerId, name, wpm? }
 */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isValidRoomCode(code)) {
    return NextResponse.json({ error: "Invalid room code" }, { status: 400 });
  }

  const limitResult = rateLimit(`race-join:${getClientIp(req)}`, { limit: 30, windowMs: 60_000 });
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: "Too many join attempts" },
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
    const result = await joinRoom(code, b.peerId, b.name, typeof b.wpm === "number" ? b.wpm : undefined);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      ok: true,
      code,
      hostPeerId: result.hostPeerId,
      capacity: result.capacity,
      roster: result.roster,
    });
  } catch (error) {
    console.error("[race] join failed:", error);
    return NextResponse.json({ error: "Could not join room" }, { status: 500 });
  }
}
