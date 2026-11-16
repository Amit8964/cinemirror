import { randomBytes } from "node:crypto";
import { getSetting, setSetting } from "./settings";
import { getStreamPattern, getTvStreamPattern, isValidStreamPattern, isValidTvStreamPattern } from "./stream";

// Which player the site uses — chosen in Admin → Player:
//   "builtin"  the player built into this site (default)
//   "hosted"   your own cinemirror-player on its own domain. Same owner as this site, so it uses an automatic
//              first-party key instead of a partner key, and is locked to the player's own origin.
//   "custom"   any other player you are allowed to embed, given as URL patterns with {id} (TMDB id),
//              {season} and {episode}. Used on /movie and /series pages.
// Settings live in the `meta` table; PLAYER_URL / STREAM_EMBED_URL / STREAM_EMBED_TV_URL env vars are fallbacks.

export type PlayerMode = "builtin" | "hosted" | "custom";

export interface PlayerConfig {
  mode: PlayerMode;
  hostedUrl: string;
  customMovie: string;
  customTv: string;
}

export function normalizePlayerUrl(raw: string): string | null {
  const t = raw.trim().replace(/\/+$/, "");
  if (!t) return null;
  try {
    const u = new URL(t);
    const ok = u.protocol === "https:" || (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1"));
    return ok ? u.origin : null;
  } catch {
    return null;
  }
}

/** An ad page must be https and is kept whole (path and query), unlike the player URL. */
export function normalizeAdUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function getPlayerConfig(): Promise<PlayerConfig> {
  const [mode, hostedUrl, customMovie, customTv] = await Promise.all([
    getSetting("player_mode"), getSetting("player_url"), getSetting("custom_movie_url"), getSetting("custom_tv_url"),
  ]);
  const envUrl = process.env.PLAYER_URL?.trim() ?? "";
  const resolved: PlayerMode =
    mode === "builtin" || mode === "hosted" || mode === "custom" ? mode : envUrl ? "hosted" : "builtin";
  return { mode: resolved, hostedUrl: hostedUrl || envUrl, customMovie, customTv };
}

// ---- first-party key ----------------------------------------------------------------

/** The key your own player uses. Created on first use; rotate it from Admin → Player. */
export async function getFirstPartyKey(): Promise<string> {
  const existing = await getSetting("first_party_key");
  if (existing) return existing;
  const key = "fp_" + randomBytes(18).toString("base64url");
  await setSetting("first_party_key", key);
  return key;
}

export async function rotateFirstPartyKey(): Promise<void> {
  await setSetting("first_party_key", "fp_" + randomBytes(18).toString("base64url"));
}

/** Token subject for first-party tokens; changes when the key is rotated, which invalidates old tokens. */
export const firstPartyId = (key: string) => `fp:${key.slice(-8)}`;

// ---- what the pages use --------------------------------------------------------------

/** iframe src for a library title on /watch, or null when the hosted player isn't the active one. */
export async function getHostedPlayerSrc(slug: string): Promise<string | null> {
  const c = await getPlayerConfig();
  const base = c.mode === "hosted" ? normalizePlayerUrl(c.hostedUrl) : null;
  if (!base) return null;
  return `${base}/?${new URLSearchParams({ slug, k: await getFirstPartyKey(), autoplay: "1" })}`;
}

/** TMDB-id player patterns for /movie and /series: the custom player's when chosen, otherwise the env ones. */
export async function getActiveStreamPatterns(): Promise<{ movie: string | null; tv: string | null }> {
  const c = await getPlayerConfig();
  if (c.mode === "custom") {
    return {
      movie: isValidStreamPattern(c.customMovie) ? c.customMovie : null,
      tv: isValidTvStreamPattern(c.customTv) ? c.customTv : null,
    };
  }
  return { movie: getStreamPattern(), tv: getTvStreamPattern() };
}
