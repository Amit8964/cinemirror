import type { TitleCardData } from "./types";

// Thin TMDB (themoviedb.org) client. Server-side only: the key never reaches the browser.
// Set TMDB_API_KEY to either the v3 "API Key" or the v4 "API Read Access Token".
// Without a key every function returns empty data and the site simply hides TMDB sections.

const BASE = "https://api.themoviedb.org/3";
export const IMG = "https://image.tmdb.org/t/p";

export function tmdbEnabled(): boolean {
  return !!process.env.TMDB_API_KEY?.trim();
}

export interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  year: number | null;
  posterUrl: string;
  backdropUrl: string;
  rating: number; // 0-10
  language: string; // ISO 639-1
  genreIds: number[];
}

export interface TmdbDetails extends TmdbMovie {
  tagline: string;
  runtime: number | null;
  genres: { id: number; name: string }[];
  cast: { id: number; name: string; character: string; photoUrl: string }[];
  director: string;
  certification: string;
  trailerKey: string;
  similar: TmdbMovie[];
}

type Raw = Record<string, unknown>;

async function call(path: string, params: Record<string, string | number> = {}, revalidate = 3600): Promise<Raw | null> {
  const key = process.env.TMDB_API_KEY?.trim();
  if (!key) return null;
  const url = new URL(BASE + path);
  const headers: Record<string, string> = { accept: "application/json" };
  if (key.startsWith("eyJ")) headers.authorization = `Bearer ${key}`;
  else url.searchParams.set("api_key", key);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  try {
    const res = await fetch(url, { headers, next: { revalidate }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return (await res.json()) as Raw;
  } catch {
    return null;
  }
}

const img = (size: string, p: unknown) => (typeof p === "string" && p ? `${IMG}/${size}${p}` : "");

function mapMovie(r: Raw): TmdbMovie {
  const date = String(r.release_date ?? "");
  const year = /^\d{4}/.test(date) ? Number(date.slice(0, 4)) : null;
  return {
    id: Number(r.id),
    title: String(r.title ?? r.name ?? ""),
    overview: String(r.overview ?? ""),
    year,
    posterUrl: img("w342", r.poster_path),
    backdropUrl: img("w1280", r.backdrop_path),
    rating: Number(r.vote_average ?? 0),
    language: String(r.original_language ?? ""),
    genreIds: Array.isArray(r.genre_ids) ? (r.genre_ids as number[]) : [],
  };
}

function mapList(data: Raw | null, limit = 20): TmdbMovie[] {
  const results = Array.isArray(data?.results) ? (data!.results as Raw[]) : [];
  return results.filter((r) => r.poster_path).map(mapMovie).filter((m) => m.id && m.title).slice(0, limit);
}

export type Category = "trending" | "now_playing" | "popular" | "top_rated" | "upcoming";

export const CATEGORIES: Record<Category, string> = {
  trending: "Trending this week",
  now_playing: "Now playing",
  popular: "Popular",
  top_rated: "Top rated",
  upcoming: "Coming soon",
};

export async function listCategory(cat: Category, page = 1, region = "IN"): Promise<TmdbMovie[]> {
  if (cat === "trending") return mapList(await call("/trending/movie/week", { page }));
  return mapList(await call(`/movie/${cat}`, { page, region }));
}

/** Popular movies in one original language (hi = Bollywood, ta/te/ml/kn = South Indian, ko = Korean…). */
export async function discoverByLanguage(lang: string, page = 1): Promise<TmdbMovie[]> {
  return mapList(
    await call("/discover/movie", {
      with_original_language: lang,
      sort_by: "popularity.desc",
      "vote_count.gte": 20,
      page,
    }),
  );
}

export async function discoverByGenre(genreId: number, page = 1): Promise<TmdbMovie[]> {
  return mapList(await call("/discover/movie", { with_genres: genreId, sort_by: "popularity.desc", "vote_count.gte": 50, page }));
}

export async function searchMovies(q: string, page = 1): Promise<TmdbMovie[]> {
  const query = q.trim().slice(0, 100);
  if (!query) return [];
  return mapList(await call("/search/movie", { query, page, include_adult: "false" }, 600));
}

export async function genreList(): Promise<{ id: number; name: string }[]> {
  const data = await call("/genre/movie/list", {}, 86400);
  return Array.isArray(data?.genres) ? (data!.genres as { id: number; name: string }[]) : [];
}

export async function getMovie(id: number): Promise<TmdbDetails | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const d = await call(`/movie/${id}`, { append_to_response: "credits,videos,release_dates,similar" }, 21600);
  if (!d || !d.id) return null;

  const base = mapMovie({ ...d, genre_ids: [] });
  const credits = (d.credits ?? {}) as Raw;
  const cast = (Array.isArray(credits.cast) ? (credits.cast as Raw[]) : []).slice(0, 12).map((c) => ({
    id: Number(c.id),
    name: String(c.name ?? ""),
    character: String(c.character ?? ""),
    photoUrl: img("w185", c.profile_path),
  }));
  const crew = Array.isArray(credits.crew) ? (credits.crew as Raw[]) : [];
  const director = String(crew.find((c) => c.job === "Director")?.name ?? "");

  const vids = Array.isArray((d.videos as Raw | undefined)?.results) ? (((d.videos as Raw).results) as Raw[]) : [];
  const trailer =
    vids.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ??
    vids.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
    vids.find((v) => v.site === "YouTube");
  const trailerKey = /^[\w-]{6,20}$/.test(String(trailer?.key ?? "")) ? String(trailer!.key) : "";

  const rel = Array.isArray((d.release_dates as Raw | undefined)?.results) ? (((d.release_dates as Raw).results) as Raw[]) : [];
  const pick = rel.find((r) => r.iso_3166_1 === "IN") ?? rel.find((r) => r.iso_3166_1 === "US");
  const dates = Array.isArray(pick?.release_dates) ? (pick!.release_dates as Raw[]) : [];
  const certification = String(dates.find((x) => x.certification)?.certification ?? "");

  return {
    ...base,
    tagline: String(d.tagline ?? ""),
    runtime: typeof d.runtime === "number" && d.runtime > 0 ? d.runtime : null,
    genres: Array.isArray(d.genres) ? (d.genres as { id: number; name: string }[]) : [],
    cast,
    director,
    certification,
    trailerKey,
    similar: mapList((d.similar as Raw) ?? null, 12),
  };
}

/** Language filters offered on the Discover page (TMDB original_language codes). */
export const LANGUAGES: { code: string; label: string }[] = [
  { code: "hi", label: "Bollywood (Hindi)" },
  { code: "en", label: "Hollywood (English)" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "ml", label: "Malayalam" },
  { code: "kn", label: "Kannada" },
  { code: "ko", label: "Korean" },
  { code: "ja", label: "Japanese" },
];

export function tmdbToCard(m: TmdbMovie): TitleCardData {
  return { slug: String(m.id), title: m.title, year: m.year, posterUrl: m.posterUrl, genres: [], durationMin: null };
}
