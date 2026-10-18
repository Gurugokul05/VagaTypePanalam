import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { readJsonWithLimit } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

// Full-history backup push: generous but bounded, so a buggy or malicious
// client cannot push an arbitrarily large body into the server.
// (Follow-up: move to incremental sync + payload pruning.)
const MAX_SYNC_BODY_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitResult = rateLimit(`sync:${session.user.id}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: "Too many sync requests" },
      { status: 429, headers: { "Retry-After": String(limitResult.retryAfterSeconds) } }
    );
  }

  try {
    const parsed = await readJsonWithLimit(req, MAX_SYNC_BODY_BYTES);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { stats, sessions, profile } = parsed.body as {
      stats?: any[];
      sessions?: any[];
      profile?: any;
    };

    if (!Array.isArray(stats) || !Array.isArray(sessions)) {
      return NextResponse.json(
        { error: "Invalid payload: stats and sessions must be arrays" },
        { status: 400 }
      );
    }

    const backup = await prisma.cloudBackup.upsert({
      where: { userId: session.user.id },
      update: {
        stats,
        sessions,
        profile,
      },
      create: {
        userId: session.user.id,
        stats,
        sessions,
        profile,
      },
    });

    return NextResponse.json({ success: true, updatedAt: backup.updatedAt });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const backup = await prisma.cloudBackup.findUnique({
      where: { userId: session.user.id },
    });

    if (!backup) {
      return NextResponse.json({ error: "No backup found" }, { status: 404 });
    }

    return NextResponse.json({
      stats: backup.stats,
      sessions: backup.sessions,
      profile: backup.profile,
      updatedAt: backup.updatedAt,
    });
  } catch (error) {
    console.error("Fetch backup error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
