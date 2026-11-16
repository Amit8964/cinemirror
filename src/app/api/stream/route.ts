import type { NextRequest } from "next/server";
import { checkToken, isPlayable, json, preflight, resourceOf, streamBody } from "@/lib/player-api";
import { findLibraryMatch } from "@/lib/titles";
import { getMovie } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

// GET /api/stream?type=movie&tmdb_id=<id>&t=<token from /api/player-token>&host=<embedding site>
// Resolves a TMDB id to a title in this site's own library (same title + year) and returns its stream.
// Series have no library entries yet, so type=tv answers "unavailable".
export const OPTIONS = preflight;

export async function GET(req: NextRequest) {
  const resource = resourceOf(req);
  if (!resource) return json({ error: "bad_request" }, 400);
  const denied = await checkToken(req, resource);
  if (denied) return denied;
  if (!resource.startsWith("movie|")) return json({ error: "unavailable" }, 404);
  const movie = await getMovie(Number(resource.split("|")[1])).catch(() => null);
  const title = movie ? await findLibraryMatch(movie.title, movie.year) : null;
  if (!isPlayable(title)) return json({ error: "unavailable" }, 404);
  return json(streamBody(title));
}
