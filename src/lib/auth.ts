import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sign, verify } from "./tokens";

const COOKIE = "mh_admin";

function credentials(): { email: string; password: string } | null {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) return { email, password };
  if (process.env.NODE_ENV === "production") return null;
  // Development convenience only — never active in production builds.
  return { email: "admin@moviehub.local", password: "admin123" };
}

export function adminConfigured(): boolean {
  return credentials() !== null;
}

export function usingDevCredentials(): boolean {
  return process.env.NODE_ENV !== "production" && !(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
}

function same(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkCredentials(email: string, password: string): boolean {
  const c = credentials();
  if (!c) return false;
  const okEmail = same(email.trim().toLowerCase(), c.email.trim().toLowerCase());
  const okPass = same(password, c.password);
  return okEmail && okPass;
}

export async function startAdminSession(email: string): Promise<void> {
  const token = await sign({ email }, "admin", "7d");
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 86400,
  });
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function getAdmin(): Promise<{ email: string } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const payload = await verify<{ email?: string }>(token, "admin");
  return payload?.email ? { email: String(payload.email) } : null;
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin(): Promise<{ email: string }> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
