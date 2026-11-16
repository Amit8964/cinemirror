import { libraryIndex } from "./availability";
import { query } from "./db";
import { checkNow } from "./stream-sync";

// What a TMDB list should do with each title:
//   "watch"  a stream exists (our library, the stream provider, or a checked extra server) → playable
//   "soon"   not out yet (release date in the future or unknown), or not checked yet → "Coming soon"
//   "hide"   already released but the provider has nothing for it (e.g. a TV show that never got a stream) → not listed
// Nothing is ever hidden without evidence: a title is hidden only when the provider's check answered "not found".
// Servers that can't be checked (they answer 200 for anything) can't prove a title missing, so they never hide one.

export type StreamStatus = "watch" | "soon" | "hide";

export interface StatusItem {
  id: number;
  title: string;
  year: number | null;
  /** Release / first-air date "YYYY-MM-DD", or "" when unknown. */
  date: string;
}

/**
 * Titles looked up on the spot (in this request) when nothing has checked them yet. Kept small so a first visit stays light;
 * the rest are picked up by later visits (or the sync) a few at a time.
 */
const CHECK_NOW_LIMIT = 12;

const today = () => new Date().toISOString().slice(0, 10);

type Kind = "movie" | "tv";

async function loadLinks(kind: Kind): Promise<{ checked: Map<number, boolean>; extra: Set<number> }> {
  const rows = await query<{ tmdb_id: number; available: number }>(
    "SELECT tmdb_id, available FROM stream_links WHERE kind = ?", [kind],
  ).catch(() => []);
  const extraRows = await query<{ tmdb_id: number }>(
    "SELECT DISTINCT tmdb_id FROM server_links WHERE kind = ? AND available = 1", [kind],
  ).catch(() => []);
  return { checked: new Map(rows.map((r) => [r.tmdb_id, r.available === 1])), extra: new Set(extraRows.map((r) => r.tmdb_id)) };
}

export async function resolveStreams(kind: Kind, items: StatusItem[]): Promise<Map<number, StreamStatus>> {
  const has = await libraryIndex();
  const now = today();
  const released = (d: string) => !!d && d <= now;

  let { checked, extra } = await loadLinks(kind);

  // Released titles nobody has checked yet: ask the provider now (bounded); the rest wait for the next visit.
  const unknown = items.filter((i) => released(i.date) && !checked.has(i.id) && !extra.has(i.id) && !has(i.title, i.year));
  if (unknown.length) {
    const first = unknown.slice(0, CHECK_NOW_LIMIT).map((i) => ({ kind, id: i.id, title: i.title }));
    await checkNow(first).catch(() => {});
    ({ checked, extra } = await loadLinks(kind));
  }

  const out = new Map<number, StreamStatus>();
  for (const i of items) {
    if (checked.get(i.id) === true || extra.has(i.id) || has(i.title, i.year)) out.set(i.id, "watch");
    else if (checked.get(i.id) === false && released(i.date)) out.set(i.id, "hide");
    else out.set(i.id, "soon");
  }
  return out;
}
