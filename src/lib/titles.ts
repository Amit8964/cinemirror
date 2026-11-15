import { query, run, newId, nowSec, type Row } from "./db";
import type { Subtitle, Title, TitleCardData } from "./types";

function parseJson<T>(value: unknown, fallback: T): T {
  try {
    const v = JSON.parse(String(value ?? ""));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function toTitle(r: Row): Title {
  return {
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.title),
    description: String(r.description ?? ""),
    year: r.year == null ? null : Number(r.year),
    durationMin: r.duration_min == null ? null : Number(r.duration_min),
    genres: parseJson<string[]>(r.genres, []),
    rating: String(r.rating ?? ""),
    language: String(r.language ?? ""),
    posterUrl: String(r.poster_url ?? ""),
    backdropUrl: String(r.backdrop_url ?? ""),
    sourceUrl: String(r.source_url ?? ""),
    sourceType: r.source_type === "hls" ? "hls" : "mp4",
    subtitles: parseJson<Subtitle[]>(r.subtitles, []),
    credit: String(r.credit ?? ""),
    featured: Number(r.featured) === 1,
    published: Number(r.published) === 1,
    embeddable: Number(r.embeddable) === 1,
    createdAt: Number(r.created_at),
  };
}

export function toCard(t: Title): TitleCardData {
  return {
    slug: t.slug,
    title: t.title,
    year: t.year,
    posterUrl: t.posterUrl,
    genres: t.genres,
    durationMin: t.durationMin,
  };
}

export async function listTitles(opts: { includeDrafts?: boolean } = {}): Promise<Title[]> {
  const rows = await query(
    `SELECT * FROM titles ${opts.includeDrafts ? "" : "WHERE published = 1"} ORDER BY created_at DESC`,
  );
  return rows.map(toTitle);
}

export async function getTitleBySlug(slug: string): Promise<Title | null> {
  const rows = await query("SELECT * FROM titles WHERE slug = ?", [slug]);
  return rows[0] ? toTitle(rows[0]) : null;
}

export async function getTitleById(id: string): Promise<Title | null> {
  const rows = await query("SELECT * FROM titles WHERE id = ?", [id]);
  return rows[0] ? toTitle(rows[0]) : null;
}

/** Slugs of published titles ordered by plays in the last `days` days. */
export async function trendingSlugs(days = 14, limit = 12): Promise<string[]> {
  const rows = await query<{ slug: string }>(
    `SELECT t.slug AS slug FROM plays p JOIN titles t ON t.id = p.title_id
     WHERE p.started_at >= ? AND t.published = 1
     GROUP BY t.id ORDER BY COUNT(*) DESC LIMIT ?`,
    [nowSec() - days * 86400, limit],
  );
  return rows.map((r) => r.slug);
}

export type TitleInput = Omit<Title, "id" | "createdAt">;

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || "title";
  let slug = root;
  for (let n = 2; ; n++) {
    const rows = await query("SELECT id FROM titles WHERE slug = ?", [slug]);
    if (!rows.length || rows[0].id === excludeId) return slug;
    slug = `${root}-${n}`;
  }
}

export async function createTitle(input: TitleInput): Promise<string> {
  const id = newId();
  const slug = await uniqueSlug(input.slug);
  await run(
    `INSERT INTO titles (id, slug, title, description, year, duration_min, genres, rating, language,
       poster_url, backdrop_url, source_url, source_type, subtitles, credit, featured, published,
       embeddable, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, slug, input.title, input.description, input.year, input.durationMin,
      JSON.stringify(input.genres), input.rating, input.language, input.posterUrl, input.backdropUrl,
      input.sourceUrl, input.sourceType, JSON.stringify(input.subtitles), input.credit,
      input.featured ? 1 : 0, input.published ? 1 : 0, input.embeddable ? 1 : 0, nowSec(),
    ],
  );
  return id;
}

export async function updateTitle(id: string, input: TitleInput): Promise<void> {
  const slug = await uniqueSlug(input.slug, id);
  await run(
    `UPDATE titles SET slug = ?, title = ?, description = ?, year = ?, duration_min = ?, genres = ?,
       rating = ?, language = ?, poster_url = ?, backdrop_url = ?, source_url = ?, source_type = ?,
       subtitles = ?, credit = ?, featured = ?, published = ?, embeddable = ?
     WHERE id = ?`,
    [
      slug, input.title, input.description, input.year, input.durationMin,
      JSON.stringify(input.genres), input.rating, input.language, input.posterUrl, input.backdropUrl,
      input.sourceUrl, input.sourceType, JSON.stringify(input.subtitles), input.credit,
      input.featured ? 1 : 0, input.published ? 1 : 0, input.embeddable ? 1 : 0, id,
    ],
  );
}

export async function deleteTitle(id: string): Promise<void> {
  await run("DELETE FROM titles WHERE id = ?", [id]);
}
