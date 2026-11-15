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

/* ───────────────────────────── TV / web series ───────────────────────────── */

export interface TmdbShow {
  id: number;
  name: string;
  overview: string;
  year: number | null;
  posterUrl: string;
  backdropUrl: string;
  rating: number;
  language: string;
}

export interface TmdbSeasonSummary {
  number: number;
  name: string;
  episodeCount: number;
  year: number | null;
  posterUrl: string;
}

export interface TmdbShowDetails extends TmdbShow {
  tagline: string;
  genres: { id: number; name: string }[];
  status: string;
  creators: string[];
  networks: string[];
  seasons: TmdbSeasonSummary[];
  cast: { id: number; name: string; character: string; photoUrl: string }[];
  trailerKey: string;
  similar: TmdbShow[];
  certification: string;
}

export interface TmdbEpisode {
  number: number;
  name: string;
  overview: string;
  airDate: string;
  runtime: number | null;
  stillUrl: string;
  rating: number;
}

function yearOf(date: unknown): number | null {
  const s = String(date ?? "");
  return /^\d{4}/.test(s) ? Number(s.slice(0, 4)) : null;
}

function mapShow(r: Raw): TmdbShow {
  return {
    id: Number(r.id),
    name: String(r.name ?? r.original_name ?? ""),
    overview: String(r.overview ?? ""),
    year: yearOf(r.first_air_date),
    posterUrl: img("w342", r.poster_path),
    backdropUrl: img("w1280", r.backdrop_path),
    rating: Number(r.vote_average ?? 0),
    language: String(r.original_language ?? ""),
  };
}

function mapShows(data: Raw | null, limit = 20): TmdbShow[] {
  const results = Array.isArray(data?.results) ? (data!.results as Raw[]) : [];
  return results.filter((r) => r.poster_path).map(mapShow).filter((s) => s.id && s.name).slice(0, limit);
}

export type TvCategory = "trending" | "popular" | "top_rated" | "on_the_air" | "airing_today";

export const TV_CATEGORIES: Record<TvCategory, string> = {
  trending: "Trending series",
  popular: "Popular series",
  top_rated: "Top rated series",
  on_the_air: "New episodes this week",
  airing_today: "Airing today",
};

export async function listTv(cat: TvCategory, page = 1): Promise<TmdbShow[]> {
  if (cat === "trending") return mapShows(await call("/trending/tv/week", { page }));
  return mapShows(await call(`/tv/${cat}`, { page }));
}

export async function discoverTv(opts: { lang?: string; genre?: number; page?: number }): Promise<TmdbShow[]> {
  const params: Record<string, string | number> = { sort_by: "popularity.desc", "vote_count.gte": 10, page: opts.page ?? 1 };
  if (opts.lang) params.with_original_language = opts.lang;
  if (opts.genre) params.with_genres = opts.genre;
  return mapShows(await call("/discover/tv", params));
}

export async function searchTv(q: string, page = 1): Promise<TmdbShow[]> {
  const query = q.trim().slice(0, 100);
  if (!query) return [];
  return mapShows(await call("/search/tv", { query, page, include_adult: "false" }, 600));
}

export async function tvGenreList(): Promise<{ id: number; name: string }[]> {
  const data = await call("/genre/tv/list", {}, 86400);
  return Array.isArray(data?.genres) ? (data!.genres as { id: number; name: string }[]) : [];
}

export async function getShow(id: number): Promise<TmdbShowDetails | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const d = await call(`/tv/${id}`, { append_to_response: "aggregate_credits,videos,content_ratings,similar" }, 21600);
  if (!d || !d.id) return null;

  const credits = (d.aggregate_credits ?? {}) as Raw;
  const cast = (Array.isArray(credits.cast) ? (credits.cast as Raw[]) : []).slice(0, 12).map((c) => {
    const roles = Array.isArray(c.roles) ? (c.roles as Raw[]) : [];
    return {
      id: Number(c.id),
      name: String(c.name ?? ""),
      character: String(roles[0]?.character ?? ""),
      photoUrl: img("w185", c.profile_path),
    };
  });

  const vids = Array.isArray((d.videos as Raw | undefined)?.results) ? (((d.videos as Raw).results) as Raw[]) : [];
  const trailer =
    vids.find((v) => v.site === "YouTube" && v.type === "Trailer") ?? vids.find((v) => v.site === "YouTube");
  const trailerKey = /^[\w-]{6,20}$/.test(String(trailer?.key ?? "")) ? String(trailer!.key) : "";

  const ratings = Array.isArray((d.content_ratings as Raw | undefined)?.results) ? (((d.content_ratings as Raw).results) as Raw[]) : [];
  const cert = ratings.find((r) => r.iso_3166_1 === "IN") ?? ratings.find((r) => r.iso_3166_1 === "US");

  const seasons = (Array.isArray(d.seasons) ? (d.seasons as Raw[]) : [])
    .map((s) => ({
      number: Number(s.season_number),
      name: String(s.name ?? `Season ${s.season_number}`),
      episodeCount: Number(s.episode_count ?? 0),
      year: yearOf(s.air_date),
      posterUrl: img("w342", s.poster_path),
    }))
    .filter((s) => s.number > 0 && s.episodeCount > 0);

  return {
    ...mapShow(d),
    tagline: String(d.tagline ?? ""),
    genres: Array.isArray(d.genres) ? (d.genres as { id: number; name: string }[]) : [],
    status: String(d.status ?? ""),
    creators: (Array.isArray(d.created_by) ? (d.created_by as Raw[]) : []).map((c) => String(c.name ?? "")).filter(Boolean),
    networks: (Array.isArray(d.networks) ? (d.networks as Raw[]) : []).map((n) => String(n.name ?? "")).filter(Boolean),
    seasons,
    cast,
    trailerKey,
    similar: mapShows((d.similar as Raw) ?? null, 12),
    certification: String(cert?.rating ?? ""),
  };
}

export async function getSeason(showId: number, season: number): Promise<TmdbEpisode[]> {
  if (!Number.isInteger(showId) || showId <= 0 || !Number.isInteger(season) || season < 0) return [];
  const d = await call(`/tv/${showId}/season/${season}`, {}, 21600);
  const eps = Array.isArray(d?.episodes) ? (d!.episodes as Raw[]) : [];
  return eps.map((e) => ({
    number: Number(e.episode_number),
    name: String(e.name ?? ""),
    overview: String(e.overview ?? ""),
    airDate: String(e.air_date ?? ""),
    runtime: typeof e.runtime === "number" && e.runtime > 0 ? e.runtime : null,
    stillUrl: img("w300", e.still_path),
    rating: Number(e.vote_average ?? 0),
  }));
}

export function showToCard(s: TmdbShow): TitleCardData {
  return { slug: String(s.id), title: s.name, year: s.year, posterUrl: s.posterUrl, genres: [], durationMin: null };
}

/* ───────────────────────────── link import matching ───────────────────────────── */

const normTitle = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/^(the|a|an)\s+/, "").replace(/[^a-z0-9]+/g, "");

/** TMDB movies that best match a title guessed from a link, best first. */
export async function matchMovie(title: string, year: number | null): Promise<TmdbMovie[]> {
  const query = title.trim().slice(0, 100);
  if (!query) return [];
  const [withYear, any] = await Promise.all([
    year ? call("/search/movie", { query, year, include_adult: "false" }, 600) : Promise.resolve(null),
    call("/search/movie", { query, include_adult: "false" }, 600),
  ]);
  const seen = new Set<number>();
  const list = [...mapList(withYear, 8), ...mapList(any, 10)].filter((m) => !seen.has(m.id) && seen.add(m.id));
  const q = normTitle(query);
  const score = (m: TmdbMovie, i: number) => {
    let s = -i * 0.05; // keep TMDB's relevance order as the tie-breaker
    const t = normTitle(m.title);
    if (t === q) s += 3;
    else if (t.startsWith(q) || q.startsWith(t)) s += 1;
    if (year && m.year) s += m.year === year ? 2 : Math.abs(m.year - year) <= 1 ? 1 : 0;
    return s;
  };
  return list.map((m, i) => ({ m, s: score(m, i) })).sort((a, b) => b.s - a.s).map((x) => x.m).slice(0, 8);
}
