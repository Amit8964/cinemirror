import type { NextRequest } from "next/server";
import { issueToken, preflight, resourceOf } from "@/lib/player-api";

export const dynamic = "force-dynamic";

// GET /api/player-token/<title-slug>?k=<partner key>&host=<embedding site>
export const OPTIONS = preflight;

export async function GET(req: NextRequest, ctx: RouteContext<"/api/player-token/[slug]">) {
  return issueToken(req, resourceOf(req, (await ctx.params).slug)!);
}
