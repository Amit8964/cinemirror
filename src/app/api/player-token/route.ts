import type { NextRequest } from "next/server";
import { issueToken, json, preflight, resourceOf } from "@/lib/player-api";

export const dynamic = "force-dynamic";

// GET /api/player-token?type=movie&tmdb_id=<id>&k=<partner key>&host=<embedding site>[&season=&episode=]
// Trades a partner key for a short-lived signed token that /api/stream then requires.
export const OPTIONS = preflight;

export async function GET(req: NextRequest) {
  const r = resourceOf(req);
  if (!r) return json({ error: "bad_request" }, 400);
  return issueToken(req, r);
}
