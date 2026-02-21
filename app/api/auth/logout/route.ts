import { NextResponse } from "next/server";

import { isAllowedOrigin, SESSION_COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

function secureJson(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: SECURITY_HEADERS
  });
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return secureJson({ error: "Forbidden origin." }, { status: 403 });
  }

  const response = secureJson({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  return response;
}
