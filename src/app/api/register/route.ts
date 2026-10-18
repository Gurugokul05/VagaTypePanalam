import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/email/send";
import { readJsonWithLimit, validateEmail, validatePassword } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const MAX_REGISTER_BODY_BYTES = 10 * 1024;

export async function POST(req: Request) {
  try {
    const limitResult = rateLimit(`register:${getClientIp(req)}`, {
      limit: 10,
      windowMs: 15 * 60_000,
    });
    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limitResult.retryAfterSeconds) } }
      );
    }

    const parsed = await readJsonWithLimit(req, MAX_REGISTER_BODY_BYTES);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { email, password, name } = parsed.body as {
      email?: unknown;
      password?: unknown;
      name?: unknown;
    };

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return NextResponse.json({ error: emailCheck.error }, { status: 400 });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
    }

    const normalizedEmail = (email as string).toLowerCase();

    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 400 }
      );
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(password as string, 12);

    const displayName =
      (typeof name === "string" && name.trim().slice(0, 100)) ||
      normalizedEmail.split("@")[0]; // Fallback name

    // 3. Create the user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: displayName,
      },
    });

    // 4. Send welcome email (non-blocking)
    console.log("[Register] User created, sending welcome email to", normalizedEmail);
    sendWelcomeEmail({
      to: normalizedEmail,
      name: displayName,
    }).then((res) => {
      console.log("[Register] Welcome email result:", JSON.stringify(res));
    }).catch((err) => {
      console.error("[Register] Welcome email failed:", err.message);
    });

    return NextResponse.json(
      { message: "User registered successfully", userId: user.id, emailSent: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error during registration" },
      { status: 500 }
    );
  }
}
