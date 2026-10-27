import bcrypt from "bcryptjs";
import type { Database } from "./database.ts";
import { one } from "./database.ts";
import type { User } from "../types.ts";
import { AppError } from "./rules.ts";
export const COOKIE = "campusslot_session";
export async function digest(value: string): Promise<string> {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export function tokenFromRequest(request: Request): string | undefined {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(COOKIE + "="))
    ?.slice(COOKIE.length + 1);
}
export async function sessionUser(
  db: Database,
  request: Request,
): Promise<User | null> {
  const token = tokenFromRequest(request);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return one<User>(
    db,
    "SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?",
    await digest(token),
    Date.now(),
  );
}
export async function login(
  db: Database,
  email: unknown,
  password: unknown,
): Promise<{ user: User; token: string }> {
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.length > 150 ||
    password.length > 72 ||
    bcrypt.truncates(password)
  )
    throw new AppError(400, "Enter a valid email and password.");
  const normalized = email.trim().toLowerCase(),
    now = Date.now();
  // One atomic counter for each normalized account. No IP-address collection in this fictional demo.
  const key = await digest(normalized);
  await db
    .prepare(
      "INSERT INTO login_attempts (key,count,window_start) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_start<? THEN 1 ELSE count+1 END,window_start=CASE WHEN window_start<? THEN excluded.window_start ELSE window_start END",
    )
    .bind(key, now, now - 900000, now - 900000)
    .run();
  const attempts = await one<{ count: number }>(
    db,
    "SELECT count FROM login_attempts WHERE key=?",
    key,
  );
  if ((attempts?.count ?? 0) > 20)
    throw new AppError(
      429,
      "Too many sign-in attempts. Try again in 15 minutes.",
    );
  const found = await one<User & { password_hash: string }>(
    db,
    "SELECT * FROM users WHERE email=?",
    normalized,
  );
  const fallback =
    "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
  const valid = await bcrypt.compare(
    password,
    found?.password_hash ?? fallback,
  );
  if (!found || !valid)
    throw new AppError(401, "Email or password is incorrect.");
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  await db.batch([
    db.prepare("DELETE FROM sessions WHERE expires_at<=?").bind(now),
    db
      .prepare(
        "INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)",
      )
      .bind(await digest(token), found.id, now + 8 * 3600000),
    db.prepare("DELETE FROM login_attempts WHERE key=?").bind(key),
  ]);
  return {
    user: {
      id: found.id,
      email: found.email,
      name: found.name,
      role: found.role,
    },
    token,
  };
}
export function cookie(token: string, request: Request, clear = false): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 28800}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
export function checkMutation(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new AppError(
      403,
      "Request origin could not be verified. Refresh this page.",
    );
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new AppError(415, "Send JSON data.");
  if (request.headers.get("x-campusslot-request") !== "1")
    throw new AppError(403, "Request verification failed.");
}
