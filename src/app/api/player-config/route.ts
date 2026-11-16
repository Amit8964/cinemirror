import { json, preflight } from "@/lib/player-api";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

// GET /api/player-config?surface=embed — branding and the ad setting the player reads on start.
// The ad lives here, not in the embed code, so changing it in Admin → Player updates every partner's embed at once.
export const OPTIONS = preflight;

export async function GET() {
  const [adUrl, skip] = await Promise.all([getSetting("ad_url"), getSetting("ad_skip")]);
  return json({
    name: "CineMirror",
    accent: "#f5b301",
    ad: adUrl ? { url: adUrl, skipAfter: Number(skip) || 5 } : null,
  });
}
