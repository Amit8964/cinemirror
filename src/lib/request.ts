import { createHash } from "node:crypto";
import { clientIp } from "./rate-limit";

export function deviceFromUA(ua: string): string {
  const s = ua.toLowerCase();
  if (/smart-?tv|hbbtv|appletv|googletv|roku|tizen|webos|bravia|crkey|aftb|aftt/.test(s)) return "tv";
  if (/ipad|tablet|kindle|silk|playbook/.test(s) || (/android/.test(s) && !/mobile/.test(s))) return "tablet";
  if (/mobi|iphone|ipod|android/.test(s)) return "mobile";
  return "desktop";
}

/** Two-letter country code when the host/CDN provides one (Vercel, Cloudflare, …). */
export function countryFrom(headers: Headers): string | null {
  const c =
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("cloudfront-viewer-country") ||
    headers.get("x-country-code");
  return c && /^[A-Za-z]{2}$/.test(c) && c.toUpperCase() !== "XX" ? c.toUpperCase() : null;
}

/** Anonymous viewer id: the browser-generated id when present, otherwise a hash of IP + UA. */
export function viewerIdFrom(headers: Headers, clientId: unknown): string {
  if (typeof clientId === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(clientId)) return clientId;
  const raw = `${clientIp(headers)}|${headers.get("user-agent") ?? ""}`;
  return "anon_" + createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

/** sendBeacon posts text/plain, fetch posts JSON — accept both. */
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const text = await request.text();
    if (text.length > 8000) return {};
    const data = JSON.parse(text);
    return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
