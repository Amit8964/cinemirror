import { resolveLink, type FoundStream, type Resolved } from "./resolve";
import { getMovie, LANGUAGES, matchMovie, tmdbEnabled, type TmdbDetails, type TmdbMovie } from "./tmdb";
import type { Title } from "./types";
import { slugify } from "./util";

export interface StreamOption extends FoundStream {
  /** true = the TMDB trailer offered because no (or as well as a) full stream. */
  trailer?: boolean;
}

export interface ImportResult {
  resolved: Resolved;
  candidates: TmdbMovie[];
  movie: TmdbDetails | null;
  /** "auto" = best match picked automatically, "none" = admin turned TMDB off. */
  tmdbMode: "auto" | "chosen" | "none";
  options: StreamOption[];
  chosen: number; // index into options, -1 = nothing playable
  prefill: Partial<Title>;
}

/** Title details from a TMDB movie, in the shape the title form uses. */
export function prefillFromTmdb(m: TmdbDetails): Partial<Title> {
  return {
    title: m.title,
    slug: slugify(m.title),
    description: m.overview,
    year: m.year,
    durationMin: m.runtime,
    genres: m.genres.map((g) => g.name),
    rating: m.certification,
    language: LANGUAGES.find((l) => l.code === m.language)?.label.replace(/ \(.*\)/, "") ?? m.language,
    posterUrl: m.posterUrl.replace("/w342/", "/w500/"),
    backdropUrl: m.backdropUrl,
    credit: "Film information and images: TMDB",
  };
}

/**
 * Paste a link → find the free streams on it, match the film on TMDB for poster
 * and details, and fall back to the TMDB trailer when there is no full stream.
 * `stream` / `tmdb` let the admin override the automatic choices.
 */
export async function importFromLink(link: string, pick: { stream?: string; tmdb?: string } = {}): Promise<ImportResult> {
  const resolved = await resolveLink(link);

  const tmdbParam = pick.tmdb ?? "";
  const forcedId = Number(tmdbParam) || 0;
  const tmdbMode: ImportResult["tmdbMode"] = tmdbParam === "none" ? "none" : forcedId ? "chosen" : "auto";

  const candidates = tmdbEnabled() && resolved.titleGuess ? await matchMovie(resolved.titleGuess, resolved.yearGuess) : [];
  const movieId = tmdbMode === "none" ? 0 : forcedId || candidates[0]?.id || 0;
  const movie = movieId ? await getMovie(movieId) : null;

  const options: StreamOption[] = [...resolved.streams];
  if (movie?.trailerKey && !options.some((o) => o.type === "youtube" && o.url.endsWith(movie.trailerKey))) {
    options.push({
      url: `https://www.youtube.com/watch?v=${movie.trailerKey}`,
      type: "youtube",
      label: `Official trailer from TMDB (YouTube)`,
      trailer: true,
    });
  }
  const asked = Number.parseInt(pick.stream ?? "", 10);
  const chosen = options.length ? (Number.isInteger(asked) && asked >= 0 && asked < options.length ? asked : 0) : -1;
  const stream = chosen >= 0 ? options[chosen] : null;

  const fromSource: Partial<Title> = {
    title: resolved.titleGuess,
    slug: slugify(resolved.titleGuess),
    description: resolved.description,
    year: resolved.yearGuess,
    posterUrl: "",
    backdropUrl: resolved.imageUrl,
  };
  const base = movie ? prefillFromTmdb(movie) : fromSource;

  const credit = [
    stream?.trailer ? "Trailer via YouTube" : resolved.license ? `${resolved.sourceName} — ${resolved.license}` : `Source: ${resolved.sourceName}`,
    movie ? "Film information and images: TMDB" : "",
  ].filter(Boolean).join(" · ");

  return {
    resolved,
    candidates,
    movie,
    tmdbMode,
    options,
    chosen,
    prefill: {
      ...base,
      // Keep the source's own description if TMDB has none.
      description: base.description || resolved.description,
      backdropUrl: base.backdropUrl || resolved.imageUrl,
      sourceUrl: stream?.url ?? "",
      sourceType: stream?.type ?? "mp4",
      credit: credit.slice(0, 300),
    },
  };
}
