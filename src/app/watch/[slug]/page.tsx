import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Player from "@/components/Player";
import YouTubeFrame from "@/components/YouTubeFrame";
import { getTitleBySlug, toCard } from "@/lib/titles";
import { signPlayerGrant } from "@/lib/tokens";

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
