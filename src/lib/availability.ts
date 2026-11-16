import { cache } from "react";
import { query } from "./db";
import { listTitles } from "./titles";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

export type HasStream = (title: string, year: number | null) => boolean;

/**
 * Which TMDB titles can actually be played on this site: those with a published title in our library
 * (same name, and same year when both are known), plus titles the stream provider sync has linked
 * (matched by name only). Built once per request. Everything else is "Coming soon".
 */
export const libraryIndex = cache(async (): Promise<HasStream> => {
  const byName = new Map<string, (number | null)[]>();
  for (const t of await listTitles()) {
    const k = norm(t.title);
    if (!k) continue;
    byName.set(k, [...(byName.get(k) ?? []), t.year]);
  }
  const linked = await query<{ title: string }>("SELECT title FROM stream_links WHERE available = 1").catch(() => []);
  for (const l of linked) {
    const k = norm(l.title);
    if (k) byName.set(k, [...(byName.get(k) ?? []), null]);
  }
  return (title, year) => {
    const years = byName.get(norm(title));
    return !!years && (year == null || years.some((y) => y == null || y === year));
  };
});
