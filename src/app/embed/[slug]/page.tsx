import type { Metadata } from "next";
import { headers } from "next/headers";
import Player from "@/components/Player";
import YouTubeFrame from "@/components/YouTubeFrame";
import { getAdmin } from "@/lib/auth";
import { getPartnerByKey } from "@/lib/partners";
import { getTitleBySlug, toCard } from "@/lib/titles";
import { signPlayerGrant } from "@/lib/tokens";
import { domainAllowed, hostFromUrl } from "@/lib/util";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CineMirror player",
  robots: { index: false, follow: false },
};

function Blocked({ heading, detail }: { heading: string; detail: string }) {
  return (
    <main className="grid h-dvh w-full place-items-center bg-black px-6 text-center text-white">
      <div className="max-w-sm">
        <p className="font-display text-3xl tracking-wide">
          CINE<span className="text-accent">MIRROR</span>
        </p>
        <p className="mt-4 text-lg font-semibold">{heading}</p>
        <p className="mt-1 text-sm text-white/60">{detail}</p>
      </div>
    </main>
  );
}

// The embeddable player: /embed/<title-slug>?key=<partner key>[&autoplay=1][&start=90]
export default async function EmbedPage({ params, searchParams }: PageProps<"/embed/[slug]">) {
  const [{ slug }, sp, h] = await Promise.all([params, searchParams, headers()]);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  const partner = await getPartnerByKey(one(sp.key));
  if (!partner) {
    return <Blocked heading="Invalid embed key" detail="This player was embedded with a key that does not exist. Ask the site owner to check their embed code." />;
  }
  if (!partner.active) {
    return <Blocked heading="Embed disabled" detail="Playback through this embed key has been turned off." />;
  }

  const title = await getTitleBySlug(slug);
  if (!title || !title.published || !title.embeddable) {
    return <Blocked heading="Video unavailable" detail="This title does not exist or is not available for embedding." />;
  }

  const ownHost = (h.get("x-forwarded-host") ?? h.get("host") ?? "").toLowerCase();
  const refHost = hostFromUrl(h.get("referer"));
  const sameSite = !!refHost && refHost === ownHost;
  const admin = await getAdmin();
  // Embedded from this site's own admin panel: a preview, never counted.
  const preview = !!admin && (sameSite || !refHost);

  if (!preview && partner.allowedDomains.length) {
    const dest = h.get("sec-fetch-dest");
    if (dest && dest !== "iframe") {
      return <Blocked heading="Embed only" detail="This player only works when embedded on an authorised website." />;
    }
    if (refHost && !sameSite && !domainAllowed(refHost, partner.allowedDomains)) {
      return <Blocked heading="Domain not authorised" detail={`${refHost} is not allowed to use this embed key.`} />;
    }
  }

  const grant = preview
    ? null
    : await signPlayerGrant({ t: title.id, p: partner.id, d: refHost && !sameSite ? refHost : null });

  const proto = h.get("x-forwarded-proto") ?? "http";
  const start = Number(one(sp.start));

  return (
    <main className="h-dvh w-full bg-black">
      {title.sourceType === "youtube" ? (
        <YouTubeFrame url={title.sourceUrl} title={title.title} autoPlay={one(sp.autoplay) === "1"} start={Number.isFinite(start) && start > 0 ? start : undefined} />
      ) : (
      <Player
        src={title.sourceUrl}
        type={title.sourceType}
        title={title.title}
        card={toCard(title)}
        poster={title.backdropUrl || title.posterUrl || undefined}
        subtitles={title.subtitles}
        grant={grant}
        embed
        brandHref={ownHost ? `${proto}://${ownHost}/title/${title.slug}` : undefined}
        autoPlay={one(sp.autoplay) === "1"}
        startAt={Number.isFinite(start) && start > 0 ? start : undefined}
      />
      )}
    </main>
  );
}
