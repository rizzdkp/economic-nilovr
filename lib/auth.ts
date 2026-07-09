import crypto from "crypto";
import bcrypt from "bcryptjs";
import fs from "fs";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "finapp_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const RATE_LIMIT_MAX_ATTEMPTS = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; windowStart: number }>();

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET belum diset di environment.");
  }
  return secret;
}

function getPasswordHash(): string {
  const fromEnv = process.env.APP_PASSWORD_HASH;
  if (fromEnv && fromEnv.length >= 50) return fromEnv;
  const filePath = process.env.AUTH_HASH_FILE || "/var/lib/finapp_hash";
  try {
    const fromFile = fs.readFileSync(filePath, "utf8").trim();
    if (fromFile && fromFile.length >= 50) return fromFile;
  } catch {}
  throw new Error("APP_PASSWORD_HASH tidak ditemukan.");
}

export async function verifyPassword(plainPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, getPasswordHash());
}

export function createSessionToken(): string {
  const payload = JSON.stringify({
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payloadB64)
    .digest();
  return `${payloadB64}.${signature.toString("base64url")}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;

  const [payloadB64, signatureB64] = token.split(".");
  if (!payloadB64 || !signatureB64) return false;

  const expectedSignature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payloadB64)
    .digest();

  let actualSignature: Buffer;
  try {
    actualSignature = Buffer.from(signatureB64, "base64url");
  } catch {
    return false;
  }

  if (
    expectedSignature.length !== actualSignature.length ||
    !crypto.timingSafeEqual(expectedSignature, actualSignature)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

/** Pertahanan lapis kedua di dalam route handler, jangan andalkan proxy saja. */
export async function requireSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

/** Sederhana, in-memory: cukup untuk skala single-user (bukan multi-instance). */
export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return false;
  }

  entry.count += 1;
  return true;
}
