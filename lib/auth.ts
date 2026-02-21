import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE_NAME = "orti_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const FALLBACK_DEV_SECRET = "potymarket-dev-secret-change-me";
const USER_PASSWORD = "ort123456";

const allowedUsers = new Set([
  "PelegChen",
  "AvivTuval",
  "DorStav",
  "YinonDolev",
  "YoavLiban",
  "MaayanBeer",
  "OmerMarian",
  "OmerYosef",
  "BarPompas",
  "ArielKutner",
  "DanielGlassberg",
  "LiadHabani",
  "BarAchdut",
  "RomiCohen",
  "LarryArinson",
  "PelegBazak",
  "ShohamArmoza",
  "ShayPsh",
  "OdedEvron",
  "TomerWaldman",
  "YairYanovice"
]);

function getAuthSecret(): string {
  return process.env.AUTH_SECRET?.trim() || FALLBACK_DEV_SECRET;
}

function signSessionPayload(payload: string): string {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("hex");
}

export function createSessionToken(username: string): string {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = `${username}.${expiresAt}`;
  const signature = signSessionPayload(payload);
  return `${payload}.${signature}`;
}

function verifySessionToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [username, expiresAtRaw, signatureRaw] = parts;
  if (!username || !expiresAtRaw || !signatureRaw) {
    return null;
  }

  if (!allowedUsers.has(username)) {
    return null;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return null;
  }

  const expectedSignature = signSessionPayload(`${username}.${expiresAtRaw}`);
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const gotBuffer = Buffer.from(signatureRaw, "utf8");

  if (expectedBuffer.length !== gotBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, gotBuffer)) {
    return null;
  }

  return username;
}

export function validateCredentials(username: string, password: string): boolean {
  return allowedUsers.has(username) && password === USER_PASSWORD;
}

export function getAllowedUsers(): string[] {
  return Array.from(allowedUsers);
}

export function getSessionUser(): string | null {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifySessionToken(token);
}

export function requireSessionUser(): string {
  const user = getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((acc, pair) => {
    const [rawKey, ...rawValue] = pair.trim().split("=");
    if (!rawKey) {
      return acc;
    }

    acc[rawKey] = decodeURIComponent(rawValue.join("=") || "");
    return acc;
  }, {});
}

export function getSessionUserFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  const parsedCookies = parseCookieHeader(cookieHeader);
  const token = parsedCookies[SESSION_COOKIE_NAME];
  if (!token) {
    return null;
  }
  return verifySessionToken(token);
}

export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
