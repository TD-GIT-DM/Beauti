import { deviceIdFrom } from "./db";

export const SESSION_COOKIE = "beauti_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const PBKDF2_ITERATIONS = 100_000;
const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export interface AuthUser {
  id: string;
  username: string;
  themeMain: string | null;
  themeSecondary: string | null;
}

interface UserRow {
  id: string;
  username: string | null;
  password_hash: string | null;
  password_salt: string | null;
  theme_main: string | null;
  theme_secondary: string | null;
}

export function accountScope(userId: string): string {
  return `acct:${userId}`;
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
  if (!USERNAME_RE.test(username)) {
    return "Username must be 3 to 24 characters: lowercase letters, numbers, or underscore.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password is too long.";
  return null;
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function derivePasswordHash(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt);
  return { hash, salt: bytesToHex(salt) };
}

export async function verifyPassword(password: string, hash: string, saltHex: string): Promise<boolean> {
  const computed = await derivePasswordHash(password, hexToBytes(saltHex));
  return timingSafeEqual(computed, hash);
}

export function sessionIdFrom(request: Request): string | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)beauti_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === "https:";
}

export function sessionCookie(id: string, secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(id)}`,
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(secure: boolean): string {
  const parts = [`${SESSION_COOKIE}=`, "Path=/", "Max-Age=0", "HttpOnly", "SameSite=Lax"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function mapUser(row: UserRow): AuthUser | null {
  if (!row.username) return null;
  return {
    id: row.id,
    username: row.username,
    themeMain: row.theme_main,
    themeSecondary: row.theme_secondary,
  };
}

export async function userFromRequest(request: Request, db: D1Database): Promise<AuthUser | null> {
  const sessionId = sessionIdFrom(request);
  if (!sessionId) return null;
  const now = new Date().toISOString();
  const row = await db
    .prepare(
      `SELECT u.id, u.username, u.password_hash, u.password_salt, u.theme_main, u.theme_secondary
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > ?`,
    )
    .bind(sessionId, now)
    .first<UserRow>();
  return row ? mapUser(row) : null;
}

export async function findUserByUsername(db: D1Database, username: string): Promise<UserRow | null> {
  return db
    .prepare(
      `SELECT id, username, password_hash, password_salt, theme_main, theme_secondary
       FROM users WHERE username = ?`,
    )
    .bind(username)
    .first<UserRow>();
}

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_MAX_AGE * 1000);
  await db
    .prepare(`INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`)
    .bind(id, userId, now.toISOString(), expires.toISOString())
    .run();
  return id;
}

export async function destroySession(request: Request, db: D1Database): Promise<void> {
  const sessionId = sessionIdFrom(request);
  if (!sessionId) return;
  await db.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run();
}

/**
 * Union this device's guest hearts into the account, and copy account hearts
 * onto the device so sign-out does not empty the local wishlist.
 */
export async function mergeGuestWishlist(db: D1Database, userId: string, deviceId: string): Promise<string[]> {
  const now = new Date().toISOString();
  const acct = accountScope(userId);
  await db
    .prepare(
      `INSERT OR IGNORE INTO wishlist (device_id, product_id, user_id, created_at)
       SELECT ?, product_id, ?, COALESCE(created_at, ?) FROM wishlist WHERE device_id = ?`,
    )
    .bind(acct, userId, now, deviceId)
    .run();
  await db
    .prepare(
      `INSERT OR IGNORE INTO wishlist (device_id, product_id, created_at)
       SELECT ?, product_id, COALESCE(created_at, ?)
       FROM wishlist
       WHERE user_id = ?
         AND product_id NOT IN (SELECT product_id FROM wishlist WHERE device_id = ?)`,
    )
    .bind(deviceId, now, userId, deviceId)
    .run();

  const { results } = await db
    .prepare(`SELECT DISTINCT product_id FROM wishlist WHERE user_id = ?`)
    .bind(userId)
    .all<{ product_id: string }>();
  return (results ?? []).map((row) => row.product_id);
}

export function deviceFrom(request: Request): string {
  return deviceIdFrom(request) ?? crypto.randomUUID();
}
