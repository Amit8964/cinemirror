import type { NextRequest } from "next/server";
import { checkToken, isPlayable, json, preflight, resourceOf, streamBody } from "@/lib/player-api";
import { getTitleBySlug } from "@/lib/titles";

export const dynamic = "force-dynamic";

// GET /api/player/<title-slug>?t=<token from /api/player-token/<slug>>&host=<embedding site>
export const OPTIONS = preflight;

export async function GET(req: NextRequest, ctx: RouteContext<"/api/player/[slug]">) {
  const { slug } = await ctx.params;
  const denied = await checkToken(req, resourceOf(req, slug)!);
  if (denied) return denied;
  const title = await getTitleBySlug(slug);
  if (!isPlayable(title)) return json({ error: "unavailable" }, 404);
  return json(streamBody(title));
}
