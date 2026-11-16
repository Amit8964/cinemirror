import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Player from "@/components/Player";
import YouTubeFrame from "@/components/YouTubeFrame";
import { getTitleBySlug, toCard } from "@/lib/titles";
import { signPlayerGrant } from "@/lib/tokens";
import { getHostedPlayerSrc } from "@/lib/hosted-player";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/watch/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const title = await getTitleBySlug(slug);
  return { title: title?.published ? `Watch ${title.title}` : "Not found" };
}

export default async function WatchPage({ params }: PageProps<"/watch/[slug]">) {
  const { slug } = await params;
  const title = await getTitleBySlug(slug);
  if (!title || !title.published) notFound();

  // A separately hosted player (PLAYER_URL) takes over when configured; otherwise the built-in one is used.
  const hosted = await getHostedPlayerSrc(title.slug);
  if (hosted) {
    return (
      <main className="h-dvh w-full bg-black">
        <iframe
          src={hosted}
          title={title.title}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </main>
    );
  }

  const grant = await signPlayerGrant({ t: title.id, p: null, d: null });

  return (
    <main className="h-dvh w-full bg-black">
      {title.sourceType === "youtube" ? (
        <YouTubeFrame url={title.sourceUrl} title={title.title} backHref={`/title/${title.slug}`} autoPlay />
      ) : (
      <Player
        src={title.sourceUrl}
        type={title.sourceType}
        title={title.title}
        card={toCard(title)}
        poster={title.backdropUrl || undefined}
        subtitles={title.subtitles}
        grant={grant}
        backHref={`/title/${title.slug}`}
        autoPlay
      />
      )}
    </main>
  );
}
