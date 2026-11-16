// Extra third-party embed servers for the /movie and /series players, managed in Admin -> Servers.
// LOCAL USE ONLY: they are offered only when NODE_ENV is not "production" AND LOCAL_EXTRA_SERVERS=on.
// A production build (`next build && next start`) never shows them, whatever the env or the admin says.
// Server-only: reads process.env and the database.
// The list itself lives in the database (Admin -> Servers); no provider URLs are kept in the source code.

import { newId, nowSec, query, run } from "./db";
import { isValidStreamPattern, isValidTvStreamPattern } from "./stream";

import { REFERRERS, type ReferrerPolicy, type ServerRow } from "./embed-types";
export { REFERRERS };
export type { ReferrerPolicy, ServerRow };

/** What the player components get. */
export interface StreamServer {
  id: string;
  label: string;
  /** Pattern for ExternalStreamPlayer: {id} for movies; {id}, {season}, {episode} for TV. */
  pattern: string;
  /** Sandbox by default (blocks pop-up / redirect ads). The viewer can flip it per server; the choice is kept in the browser. */
  sandboxDefault: boolean;
  referrerPolicy: ReferrerPolicy;
}

export function extraServersEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.LOCAL_EXTRA_SERVERS?.trim() === "on";
}

type Raw = { id: string; label: string; movie_url: string; tv_url: string; sandbox: number; referrer: string; enabled: number; position: number };
const REFERRER_VALUES = REFERRERS.map((r) => r.value) as string[];

function toRow(r: Raw): ServerRow {
  return {
    id: r.id,
    label: r.label,
    movie: r.movie_url,
    tv: r.tv_url,
    sandbox: Number(r.sandbox) === 1,
    referrer: (REFERRER_VALUES.includes(r.referrer) ? r.referrer : "origin") as ReferrerPolicy,
    enabled: Number(r.enabled) === 1,
    position: Number(r.position),
  };
}

export async function listServerRows(): Promise<ServerRow[]> {
  const rows = await query<Raw>("SELECT * FROM embed_servers ORDER BY position, created_at, id");
  return rows.map(toRow);
}

export async function getServerRow(id: string): Promise<ServerRow | null> {
  const rows = await query<Raw>("SELECT * FROM embed_servers WHERE id = ?", [id]);
  return rows[0] ? toRow(rows[0]) : null;
}

export interface ServerInput {
  label: string;
  movie: string;
  tv: string;
  sandbox: boolean;
  referrer: ReferrerPolicy;
  enabled: boolean;
}

/** Returns an error message, or null when the input is fine. */
export function validateServerInput(i: ServerInput): string | null {
  if (!i.label || i.label.length > 40) return "Give the server a name (up to 40 characters).";
  if (!i.movie && !i.tv) return "Add a movie URL, a series URL, or both.";
  if (i.movie && !isValidStreamPattern(i.movie)) {
    return "Movie URL must start with https:// and contain {id} (the TMDB id), e.g. https://example.com/embed/movie/{id}";
  }
  if (i.tv && !isValidTvStreamPattern(i.tv)) {
    return "Series URL must start with https:// and contain {id}, {season} and {episode}, e.g. https://example.com/embed/tv/{id}/{season}/{episode}";
  }
  if (!REFERRER_VALUES.includes(i.referrer)) return "Unknown referrer policy.";
  return null;
}

export async function createServerRow(id: string, i: ServerInput): Promise<void> {
  const last = await query<{ p: number | null }>("SELECT MAX(position) AS p FROM embed_servers");
  await run(
    `INSERT INTO embed_servers (id, label, movie_url, tv_url, sandbox, referrer, enabled, position, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, i.label, i.movie, i.tv, i.sandbox ? 1 : 0, i.referrer, i.enabled ? 1 : 0, Number(last[0]?.p ?? 0) + 10, nowSec()],
  );
}

export async function updateServerRow(id: string, i: ServerInput): Promise<void> {
  await run(
    "UPDATE embed_servers SET label = ?, movie_url = ?, tv_url = ?, sandbox = ?, referrer = ?, enabled = ? WHERE id = ?",
    [i.label, i.movie, i.tv, i.sandbox ? 1 : 0, i.referrer, i.enabled ? 1 : 0, id],
  );
}

export async function deleteServerRow(id: string): Promise<void> {
  await run("DELETE FROM embed_servers WHERE id = ?", [id]);
  // What the availability sync learned about this server is no longer needed.
  await run("DELETE FROM server_links WHERE server_id = ?", [id]);
}

export async function setServerEnabled(id: string, enabled: boolean): Promise<void> {
  await run("UPDATE embed_servers SET enabled = ? WHERE id = ?", [enabled ? 1 : 0, id]);
}

/** Move a server one step up (-1) or down (+1) in the list the viewer sees. */
export async function moveServerRow(id: string, dir: -1 | 1): Promise<void> {
  const rows = await listServerRows();
  const i = rows.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return;
  const order = rows.map((r) => r.id);
  [order[i], order[j]] = [order[j], order[i]];
  for (const [n, rid] of order.entries()) await run("UPDATE embed_servers SET position = ? WHERE id = ?", [(n + 1) * 10, rid]);
}

export const newServerId = () => newId().slice(0, 8);

/** The extra servers' patterns for the availability sync. Empty unless local extras are enabled. */
export async function getExtraServerPatterns(): Promise<{ id: string; label: string; movie: string | null; tv: string | null }[]> {
  if (!extraServersEnabled()) return [];
  return (await listServerRows())
    .filter((r) => r.enabled)
    .map((r) => ({
      id: r.id,
      label: r.label,
      movie: r.movie && isValidStreamPattern(r.movie) ? r.movie : null,
      tv: r.tv && isValidTvStreamPattern(r.tv) ? r.tv : null,
    }));
}

/**
 * Servers for a player: the site's configured pattern first (when it has one), then — locally only —
 * the enabled extra servers in the admin's order. Empty list → the page shows no player.
 * `isUnavailable` lets the availability sync hide an extra server that has nothing for this title.
 */
export async function getPlayerServers(
  kind: "movie" | "tv", primary: string | null, isUnavailable?: (serverId: string) => boolean,
): Promise<StreamServer[]> {
  const valid = kind === "movie" ? isValidStreamPattern : isValidTvStreamPattern;
  const list: StreamServer[] = [];
  if (primary && valid(primary)) {
    list.push({ id: "default", label: "Default", pattern: primary, sandboxDefault: true, referrerPolicy: "strict-origin-when-cross-origin" });
  }
  if (extraServersEnabled()) {
    for (const r of await listServerRows()) {
      if (!r.enabled || isUnavailable?.(r.id)) continue;
      const pattern = kind === "movie" ? r.movie : r.tv;
      if (pattern && valid(pattern)) {
        list.push({ id: r.id, label: r.label, pattern, sandboxDefault: r.sandbox, referrerPolicy: r.referrer });
      }
    }
  }
  return list;
}
