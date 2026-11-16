import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ExternalStreamPlayer from "@/components/ExternalStreamPlayer";
import { FlagIcon, PlayIcon } from "@/components/icons";
import Poster from "@/components/Poster";
import TitleCard from "@/components/TitleCard";
import { getStreamPattern } from "@/lib/stream";
import { findLibraryMatch } from "@/lib/titles";
import { getMovie, tmdbToCard } from "@/lib/tmdb";
import { formatDuration, hueFor } from "@/lib/util";

export async function generateMetadata({ params }: PageProps<"/movie/[id]">): Promise<Metadata> {
  const { id } = await params;
  const m = await getMovie(Number(id));
  if (!m) return { title: "Not found" };
  return {
    title: m.title,
    description: m.overview.slice(0, 160),
    openGraph: { title: m.title, description: m.overview.slice(0, 160), images: m.posterUrl ? [m.posterUrl] : [] },
  };
}

export default async function MoviePage({ params }: PageProps<"/movie/[id]">) {
  const { id } = await params;
  const m = await getMovie(Number(id));
  if (!m) notFound();

  const inLibrary = await findLibraryMatch(m.title, m.year);
  const streamPattern = getStreamPattern();
  const hue = hueFor(m.title);
  const facts = [
    ["Released", m.year],
    ["Runtime", formatDuration(m.runtime)],
    ["Rated", m.certification],
    ["Director", m.director],
    ["TMDB score", m.rating ? `${m.rating.toFixed(1)} / 10` : ""],
  ].filter(([, v]) => v) as [string, string | number][];

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{ backgroundImage: `radial-gradient(110% 100% at 80% 0%, hsl(${hue} 55% 28% / 0.85), transparent 62%)` }}
        />
        {m.backdropUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.backdropUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/20" />

        <div className="mx-auto grid max-w-7xl gap-6 px-4 pt-10 pb-10 sm:grid-cols-[14rem_1fr] sm:gap-10 sm:px-6 sm:pt-16">
          <Poster title={m.title} src={m.posterUrl} className="w-40 shadow-2xl shadow-black/60 sm:w-full" />
          <div className="min-w-0 self-end">
            <h1 className="font-display text-5xl leading-[0.92] tracking-wide [text-wrap:balance] sm:text-7xl">{m.title}</h1>
            {m.tagline && <p className="mt-2 text-sm text-muted italic">{m.tagline}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {m.genres.map((g) => (
                <Link
                  key={g.id}
                  href={`/discover?genre=${g.id}`}
                  className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted hover:border-accent hover:text-accent"
                >
                  {g.name}
                </Link>
              ))}
            </div>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-text/85">{m.overview || "No description available."}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {inLibrary ? (
                <Link href={`/watch/${inLibrary.slug}`} className="btn btn-primary !px-7 !py-3 !text-base">
                  <PlayIcon /> Play
                </Link>
              ) : streamPattern ? (
                <a href="#watch" className="btn btn-primary !px-7 !py-3 !text-base">
                  <PlayIcon /> Play
                </a>
              ) : (
                <span className="rounded-lg border border-line px-4 py-3 text-sm font-semibold text-muted">
                  Not in the CineMirror library yet
                </span>
              )}
              {m.trailerKey && (
                <a href="#trailer" className="btn btn-ghost !px-6 !py-3 !text-base">Watch trailer</a>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {facts.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-5 sm:grid-cols-5">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-semibold tracking-wider text-muted uppercase">{k}</dt>
                <dd className="mt-0.5 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        {streamPattern && !inLibrary && (
          <section id="watch" className="mt-10 scroll-mt-24">
            <h2 className="font-display text-3xl tracking-wide">Watch</h2>
            <ExternalStreamPlayer
              resourceId={m.id}
              pattern={streamPattern}
              title={`${m.title} — player`}
              poster={m.backdropUrl}
              className="mt-4 max-w-5xl"
            />
            <Link
              href={`/dmca?url=${encodeURIComponent(`/movie/${m.id}`)}#report`}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-danger"
            >
              <FlagIcon /> Report this video
            </Link>
          </section>
        )}

        {m.trailerKey && (
          <section id="trailer" className="mt-10 scroll-mt-24">
            <h2 className="font-display text-3xl tracking-wide">Trailer</h2>
            <div className="mt-4 aspect-video max-w-3xl overflow-hidden rounded-xl border border-line bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${m.trailerKey}`}
                title={`${m.title} trailer`}
                loading="lazy"
                allow="encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="h-full w-full"
              />
            </div>
          </section>
        )}

        {m.cast.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-3xl tracking-wide">Cast</h2>
            <ul className="no-scrollbar mt-4 flex gap-4 overflow-x-auto pb-2">
              {m.cast.map((c) => (
                <li key={c.id} className="w-24 shrink-0 text-center sm:w-28">
                  <Poster title={c.name} src={c.photoUrl} ratio="aspect-square" className="!rounded-full" />
                  <p className="mt-2 truncate text-xs font-semibold">{c.name}</p>
                  <p className="truncate text-xs text-muted">{c.character}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {m.similar.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-3xl tracking-wide">More like this</h2>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {m.similar.slice(0, 6).map((s) => <TitleCard key={s.id} card={tmdbToCard(s)} href={`/movie/${s.id}`} />)}
            </div>
          </section>
        )}

        <p className="mt-12 text-xs text-muted">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </div>
    </>
  );
}
