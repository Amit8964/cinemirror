import { NextResponse, type NextRequest } from "next/server";
import { firstPartyId, getFirstPartyKey, getPlayerConfig, normalizePlayerUrl } from "@/lib/hosted-player";
import { getPartner, getPartnerByKey } from "@/lib/partners";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { signStreamToken, verifyStreamToken } from "@/lib/tokens";
import type { Title } from "@/lib/types";
import { domainAllowed, hostFromUrl } from "@/lib/util";

// Shared by the endpoints the separately hosted player calls (/api/stream, /api/player/<slug>, /api/player-config).
// They answer with CORS because the player lives on its own domain.

export const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "cache-control": "no-store",
};

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: CORS });
export const preflight = () => new NextResponse(null, { status: 204, headers: CORS });

function hostParam(req: NextRequest): string {
  const raw = req.nextUrl.searchParams.get("host") ?? "";
  return (hostFromUrl(raw) ?? raw).toLowerCase();
}

/** Resource string a token is bound to, from the request's own parameters. Null = malformed. */
export function resourceOf(req: NextRequest, slug?: string): string | null {
  if (slug) return `slug|${slug}`;
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type");
  const id = sp.get("tmdb_id") ?? "";
  if ((type !== "movie" && type !== "tv") || !/^[1-9]\d{0,9}$/.test(id)) return null;
  const n = (k: string) => (/^\d{1,5}$/.test(sp.get(k) ?? "") ? sp.get(k) : "0");
  return `${type}|${id}|${type === "tv" ? n("season") : "0"}|${type === "tv" ? n("episode") : "0"}`;
}

/**
 * Step 1 — /api/player-token: checks the partner key (`k`) and, if the partner lists domains, the embedding
 * site (`host`), then issues a 10-minute token bound to that partner and resource.
 */
export async function issueToken(req: NextRequest, resource: string): Promise<NextResponse> {
  if (!rateLimit(`token:${clientIp(req.headers)}`, 60, 60_000)) return json({ error: "rate_limited" }, 429);
  const k = req.nextUrl.searchParams.get("k") ?? "";
  if (k.startsWith("fp_")) return issueFirstPartyToken(req, k, resource);
  const partner = await getPartnerByKey(k);
  if (!partner) return json({ error: "invalid_key" }, 401);
  if (!partner.active) return json({ error: "key_disabled" }, 403);
  const host = hostParam(req);
  if (partner.allowedDomains.length && host && !domainAllowed(host, partner.allowedDomains)) {
    return json({ error: "domain_not_allowed" }, 403);
  }
  return json({ t: await signStreamToken({ p: partner.id, r: resource, d: host || null }) });
}

/**
 * Your own player: the key is checked against the automatic first-party key, and the browser-set Origin header
 * must be the player's configured origin — so a copied key is useless from any other site.
 */
async function issueFirstPartyToken(req: NextRequest, k: string, resource: string): Promise<NextResponse> {
  const [real, cfg] = await Promise.all([getFirstPartyKey(), getPlayerConfig()]);
  if (k !== real) return json({ error: "invalid_key" }, 401);
  const playerOrigin = normalizePlayerUrl(cfg.hostedUrl);
  if (!playerOrigin || req.headers.get("origin") !== playerOrigin) return json({ error: "domain_not_allowed" }, 403);
  return json({ t: await signStreamToken({ p: firstPartyId(real), r: resource, d: null }) });
}

/** Step 2 — /api/stream and /api/player/<slug>: the token (`t`) must be valid, unexpired, for this resource, and the partner still active. Null = allowed. */
export async function checkToken(req: NextRequest, resource: string): Promise<NextResponse | null> {
  const tok = await verifyStreamToken(req.nextUrl.searchParams.get("t"));
  if (!tok) return json({ error: "invalid_token" }, 401);
  if (tok.r !== resource) return json({ error: "token_mismatch" }, 403);
  if (tok.p.startsWith("fp:")) {
    // First-party token: valid only while the key it was issued under is still the current one.
    return tok.p === firstPartyId(await getFirstPartyKey()) ? null : json({ error: "invalid_token" }, 401);
  }
  const partner = await getPartner(tok.p);
  if (!partner?.active) return json({ error: "key_disabled" }, 403);
  const host = hostParam(req);
  if (partner.allowedDomains.length && host && !domainAllowed(host, partner.allowedDomains)) {
    return json({ error: "domain_not_allowed" }, 403);
  }
  return null;
}

export function streamBody(title: Title) {
  return {
    title: title.title,
    src: title.sourceUrl,
    type: title.sourceType, // "hls" | "mp4" | "youtube"
    poster: title.backdropUrl || title.posterUrl || "",
    subtitles: title.subtitles,
    /** Name of the main video's language (the Title's "language" field) and the extra versions. */
    language: title.language,
    versions: title.versions,
    year: title.year,
  };
}

export const isPlayable = (t: Title | null): t is Title => !!t && t.published && t.embeddable;
