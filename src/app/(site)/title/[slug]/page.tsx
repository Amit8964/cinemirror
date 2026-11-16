import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlagIcon, PlayIcon } from "@/components/icons";
import { MyListButton } from "@/components/MyList";
import Poster from "@/components/Poster";
import TitleCard from "@/components/TitleCard";
import { getTitleBySlug, listTitles, toCard } from "@/lib/titles";
import { formatDuration, hueFor } from "@/lib/util";

export async function generateMetadata({ params }: PageProps<"/title/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const title = await getTitleBySlug(slug);
  if (!title || !title.published) return { title: "Not found" };
  return {
    title: title.title,
    description: title.description.slice(0, 160),
    openGraph: { title: title.title, description: title.description.slice(0, 160), images: title.posterUrl ? [title.posterUrl] : [] },
  };
}

export default async function TitlePage({ params }: PageProps<"/title/[slug]">) {
  const { slug } = await params;
  const title = await getTitleBySlug(slug);
  if (!title || !title.published) notFound();

  const related = (await listTitles())
    .filter((t) => t.id !== title.id)
    .map((t) => ({ t, score: t.genres.filter((g) => title.genres.includes(g)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.t);

  const hue = hueFor(title.title);
  const facts = [
    ["Released", title.year],
    ["Runtime", formatDuration(title.durationMin)],
    ["Rating", title.rating],
    ["Language", title.language],
  ].filter(([, v]) => v) as [string, string | number][];

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `radial-gradient(110% 100% at 80% 0%, hsl(${hue} 55% 28% / 0.85), transparent 62%)`,
          }}
        />
        {title.backdropUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={title.backdropUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/20" />

        <div className="mx-auto grid max-w-7xl gap-6 px-4 pt-10 pb-10 sm:grid-cols-[14rem_1fr] sm:gap-10 sm:px-6 sm:pt-16">
          <Poster title={title.title} src={title.posterUrl} className="w-40 shadow-2xl shadow-black/60 sm:w-full" />
          <div className="min-w-0 self-end">
            <h1 className="font-display text-5xl leading-[0.92] tracking-wide [text-wrap:balance] sm:text-7xl">{title.title}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {title.genres.map((g) => (
                <Link
                  key={g}
                  href={`/browse?genre=${encodeURIComponent(g)}`}
                  className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted hover:border-accent hover:text-accent"
                >
                  {g}
                </Link>
              ))}
            </div>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-text/85">{title.description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/watch/${title.slug}`} className="btn btn-primary !px-7 !py-3 !text-base">
                <PlayIcon /> {title.sourceType === "youtube" ? "Watch trailer" : "Play"}
              </Link>
              <MyListButton card={toCard(title)} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {facts.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-5 sm:grid-cols-4">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-semibold tracking-wider text-muted uppercase">{k}</dt>
                <dd className="mt-0.5 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {title.credit ? <p className="text-sm text-muted">Credit: {title.credit}</p> : <span />}
          <Link
            href={`/dmca?url=${encodeURIComponent(`/title/${title.slug}`)}#report`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-danger"
          >
            <FlagIcon /> Report this title
          </Link>
        </div>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-3xl tracking-wide">More like this</h2>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {related.map((t) => <TitleCard key={t.id} card={toCard(t)} />)}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
