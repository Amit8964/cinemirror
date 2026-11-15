import { NextResponse, type NextRequest } from "next/server";
import { getPartnerByKey } from "@/lib/partners";
import { frameAncestorsFor } from "@/lib/util";

// Decides which sites are allowed to put the embed player in an <iframe>.
// The browser enforces this, so a key copied onto an unauthorised site
// simply will not render there.
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const key = request.nextUrl.searchParams.get("key") ?? "";

  let ancestors = "*"; // unknown/invalid key: allow framing so the error message is visible
  try {
    const partner = key ? await getPartnerByKey(key) : null;
    if (partner?.active && partner.allowedDomains.length) {
      ancestors = frameAncestorsFor(partner.allowedDomains);
    }
  } catch {
    ancestors = "'self'"; // fail closed if the lookup breaks
  }

  response.headers.set("Content-Security-Policy", `frame-ancestors ${ancestors}`);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: "/embed/:path*",
};
