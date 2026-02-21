import { NextResponse } from "next/server";
import { z } from "next/dist/compiled/zod";

import {
  createSessionToken,
  isAllowedOrigin,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  validateCredentials
} from "@/lib/auth";

export const runtime = "nodejs";

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

function secureJson(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: SECURITY_HEADERS
  });
}

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return secureJson({ error: "Forbidden origin." }, { status: 403 });
    }

    const payload = await request.json();
    const parsed = loginSchema.safeParse(payload);

    if (!parsed.success) {
      return secureJson({ error: "Invalid username or password." }, { status: 400 });
    }

    if (!validateCredentials(parsed.data.username, parsed.data.password)) {
      return secureJson({ error: "Invalid username or password." }, { status: 401 });
    }

    const token = createSessionToken(parsed.data.username);
    const response = secureJson({ ok: true, username: parsed.data.username });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS
    });

    return response;
  } catch {
    return secureJson({ error: "Login failed." }, { status: 500 });
  }
}
