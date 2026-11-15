import { NextResponse } from "next/server";
import { recordStart } from "@/lib/analytics";
import { getPartner } from "@/lib/partners";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { countryFrom, deviceFromUA, readBody, viewerIdFrom } from "@/lib/request";
import { signPlayGrant, verifyPlayerGrant } from "@/lib/tokens";
import { domainAllowed, hostFromUrl } from "@/lib/util";

export const dynamic = "force-dynamic";

// Called once when a player actually starts playing. Creates the play row and
// returns a token that authorises heartbeats for it.
export async function POST(request: Request) {
  const headers = request.headers;
  if (!rateLimit(`start:${clientIp(headers)}`, 40, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await readBody(request);
  const grant = await verifyPlayerGrant(body.token);
  if (!grant?.t) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  let domain: string | null = null;
  if (grant.p) {
    const partner = await getPartner(grant.p);
    if (!partner?.active) return NextResponse.json({ error: "partner_inactive" }, { status: 403 });
    // Prefer the host the server saw when rendering the embed; fall back to
    // what the browser reports as the embedding page.
    domain = grant.d ?? hostFromUrl(typeof body.ref === "string" ? body.ref : null);
    if (domain && partner.allowedDomains.length && !domainAllowed(domain, partner.allowedDomains)) {
      return NextResponse.json({ error: "domain_not_allowed" }, { status: 403 });
    }
  }

  const playId = await recordStart({
    titleId: grant.t,
    partnerId: grant.p ?? null,
    viewerId: viewerIdFrom(headers, body.vid),
    domain,
    country: countryFrom(headers),
    device: deviceFromUA(headers.get("user-agent") ?? ""),
  });

  return NextResponse.json({ play: await signPlayGrant(playId) });
}
