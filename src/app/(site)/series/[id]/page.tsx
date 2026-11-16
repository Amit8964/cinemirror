import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MultiServerPlayer from "@/components/MultiServerPlayer";
import { FlagIcon, PlayIcon, StarIcon } from "@/components/icons";
import Poster from "@/components/Poster";
import TitleCard from "@/components/TitleCard";
import { libraryIndex } from "@/lib/availability";
import { resolveStreams } from "@/lib/stream-status";
import { getActiveStreamPatterns } from "@/lib/hosted-player";
import { getPlayerServers } from "@/lib/local-servers";
import { linkIndex, serverLinkIndex } from "@/lib/stream-sync";
import { getSeason, getShow, showToCard, type TmdbEpisode } from "@/lib/tmdb";
import { hueFor } from "@/lib/util";

export async function generateMetadata({ params }: PageProps<"/series/[id]">): Promise<Metadata> {
  const { id } = await params;
  const s = await getShow(Number(id));
  if (!s) return { title: "Not found" };
  return {
    title: s.name,
    description: s.overview.slice(0, 160),
    openGraph: { title: s.name, description: s.overview.slice(0, 160), images: s.posterUrl ? [s.posterUrl] : [] },
  };
}

export default async function ShowPage({ params, searchParams }: PageProps<"/series/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const show = await getShow(Number(id));
  if (!show) notFound();

  const wanted = Number(Array.isArray(sp.season) ? sp.season[0] : sp.season);
  const season = show.seasons.find((x) => x.number === wanted) ?? show.seasons[0];
  const episodes = season ? await getSeason(show.id, season.number) : [];
  const hue = hueFor(show.name);
  const hasStream = await libraryIndex();
  const simStatus = await resolveStreams("tv", show.similar.map((x) => ({ id: x.id, title: x.name, year: x.year, date: x.firstAirDate })));
  const similar = show.similar.filter((x) => simStatus.get(x.id) !== "hide").slice(0, 6);
  const primaryTvPattern = (await linkIndex().catch(() => null))?.("tv", show.id) === "unavailable" ? null : (await getActiveStreamPatterns()).tv;
  // Locally (LOCAL_EXTRA_SERVERS=on, dev only) extra servers are added after the configured one.
  const sIdx = await serverLinkIndex().catch(() => null);
  const tvServers = await getPlayerServers("tv", primaryTvPattern, (sid) => sIdx?.(sid, "tv", show.id) === "unavailable");
  const tvPattern = tvServers[0]?.pattern ?? null;
  const epParam = Number(Array.isArray(sp.episode) ? sp.episode[0] : sp.episode);
  // Like the movie page, the player is always there: the chosen episode, otherwise the first one of the season.
  const playing: TmdbEpisode | null = tvPattern && season
    ? (Number.isInteger(epParam) && epParam > 0 ? episodes.find((e) => e.number === epParam) : undefined)
      ?? episodes[0]
      ?? { number: 1, name: "", overview: "", airDate: "", runtime: null, stillUrl: "", rating: 0 }
    : null;

  const facts = [
    ["First aired", show.year],
    ["Seasons", show.seasons.length || ""],
    ["Status", show.status],
    ["Rated", show.certification],
    ["Network", show.networks.slice(0, 2).join(", ")],
    ["Created by", show.creators.slice(0, 2).join(", ")],
  ].filter(([, v]) => v) as [string, string | number][];

  return (
    <>
      <section className="relative isolate -mt-16 overflow-hidden pt-16">
        <div className="absolute inset-0 -z-10" style={{ backgroundImage: `radial-gradient(110% 100% at 80% 0%, hsl(${hue} 55% 28% / 0.85), transparent 62%)` }} />
        {show.backdropUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={show.backdropUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/90 via-ink/40 to-transparent" />

        <div className="mx-auto grid max-w-[90rem] gap-6 px-4 pt-10 pb-10 sm:grid-cols-[14rem_1fr] sm:gap-10 sm:px-8 sm:pt-20">
          <Poster title={show.name} src={show.posterUrl} className="w-40 shadow-2xl shadow-black/60 sm:w-full" />
          <div className="min-w-0 self-end">
            <p className="text-xs font-bold tracking-[0.3em] text-accent uppercase">Web Series</p>
            <h1 className="mt-1 font-display text-5xl leading-[0.92] tracking-wide [text-wrap:balance] sm:text-7xl">{show.name}</h1>
            {show.tagline && <p className="mt-2 text-sm text-muted italic">{show.tagline}</p>}
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-text/85">
              {show.rating > 0 && <span className="flex items-center gap-1 text-accent"><StarIcon /> {show.rating.toFixed(1)}</span>}
              {show.year && <span>{show.year}</span>}
              {show.seasons.length > 0 && <span>{show.seasons.length} {show.seasons.length === 1 ? "season" : "seasons"}</span>}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {show.genres.map((g) => (
                <Link key={g.id} href={`/series?genre=${g.id}`} className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted hover:border-accent hover:text-accent">
                  {g.name}
                </Link>
              ))}
            </div>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-text/85">{show.overview || "No description available."}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {tvPattern && (
                <a href="#watch" className="btn btn-primary !px-7 !py-3 !text-base"><PlayIcon /> Play</a>
              )}
              <a href="#episodes" className={`btn ${tvPattern ? "btn-ghost" : "btn-primary"} !px-7 !py-3 !text-base`}>Episodes</a>
              {!tvPattern && !hasStream(show.name, show.year) && (
                <span className="inline-flex items-center rounded-lg border border-line bg-white/90 px-4 py-3 text-sm font-extrabold tracking-wider text-ink uppercase">
                  Coming soon
                </span>
              )}
              {show.trailerKey && <a href="#trailer" className="btn btn-ghost !px-6 !py-3 !text-base">Watch trailer</a>}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[90rem] px-4 sm:px-8">
        {facts.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-5 sm:grid-cols-3 lg:grid-cols-6">
            {facts.map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-xs font-semibold tracking-wider text-muted uppercase">{k}</dt>
                <dd className="mt-0.5 truncate font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        {playing && season && (
          <section id="watch" className="mt-10 scroll-mt-24">
            <h2 className="font-display text-3xl tracking-wide">
              Watch · S{season.number} E{playing.number} <span className="text-muted">{playing.name}</span>
            </h2>
            <MultiServerPlayer
              servers={tvServers}
              resourceId={show.id}
              season={season.number}
              episode={playing.number}
              title={`${show.name} S${season.number}E${playing.number} — player`}
              poster={playing.stillUrl || show.backdropUrl}
              className="mt-4 max-w-5xl"
            />
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
              {episodes.some((e) => e.number === playing.number + 1) && (
                <Link
                  href={`/series/${show.id}?season=${season.number}&episode=${playing.number + 1}#watch`}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  Next episode →
                </Link>
              )}
              <Link
                href={`/dmca?url=${encodeURIComponent(`/series/${show.id}`)}#report`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-danger"
              >
                <FlagIcon /> Report this video
              </Link>
            </div>
          </section>
        )}

        {season && (
          <section id="episodes" className="mt-10 scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display text-3xl tracking-wide">Episodes</h2>
              <p className="text-sm text-muted">{season.name}{season.year ? ` · ${season.year}` : ""} · {season.episodeCount} episodes</p>
            </div>
            {show.seasons.length > 1 && (
              <nav aria-label="Seasons" className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
                {show.seasons.map((x) => (
                  <Link
                    key={x.number}
                    href={`/series/${show.id}?season=${x.number}#episodes`}
                    scroll={false}
                    aria-current={x.number === season.number ? "true" : undefined}
                    className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                      x.number === season.number ? "border-accent bg-accent text-accent-ink" : "border-line text-muted hover:border-muted hover:text-text"
                    }`}
                  >
                    Season {x.number}
                  </Link>
                ))}
              </nav>
            )}
            <ol className="mt-5 grid gap-3 lg:grid-cols-2">
              {episodes.map((e) => (
                <li key={e.number} className="flex gap-4 rounded-xl border border-line bg-surface p-3">
                  <div className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-lg bg-raised sm:w-44">
                    {e.stillUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.stillUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center font-display text-3xl text-muted">E{e.number}</div>
                    )}
                    <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 text-[11px] font-bold">E{e.number}</span>
                  </div>
                  <div className="min-w-0 py-0.5">
                    <p className="truncate font-semibold">{e.number}. {e.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {[e.airDate, e.runtime ? `${e.runtime} min` : ""].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-1.5 line-clamp-3 text-sm text-text/75">{e.overview || "No description yet."}</p>
                    {tvPattern && (
                      <Link
                        href={`/series/${show.id}?season=${season.number}&episode=${e.number}#watch`}
                        className={`btn mt-2 !px-3 !py-1.5 !text-xs ${playing?.number === e.number ? "btn-ghost" : "btn-primary"}`}
                      >
                        <PlayIcon /> {playing?.number === e.number ? "Playing" : "Play"}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            {!episodes.length && <p className="mt-5 text-sm text-muted">Episode details are not available for this season.</p>}
          </section>
        )}

        {show.trailerKey && (
          <section id="trailer" className="mt-12 scroll-mt-24">
            <h2 className="font-display text-3xl tracking-wide">Trailer</h2>
            <div className="mt-4 aspect-video max-w-3xl overflow-hidden rounded-xl border border-line bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${show.trailerKey}`}
                title={`${show.name} trailer`}
                loading="lazy"
                allow="encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="h-full w-full"
              />
            </div>
          </section>
        )}

        {show.cast.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-3xl tracking-wide">Cast</h2>
            <ul className="no-scrollbar mt-4 flex gap-4 overflow-x-auto pb-2">
              {show.cast.map((c) => (
                <li key={c.id} className="w-24 shrink-0 text-center sm:w-28">
                  <Poster title={c.name} src={c.photoUrl} ratio="aspect-square" className="!rounded-full" />
                  <p className="mt-2 truncate text-xs font-semibold">{c.name}</p>
                  <p className="truncate text-xs text-muted">{c.character}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {similar.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-3xl tracking-wide">More like this</h2>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {similar.map((s) => <TitleCard key={s.id} card={showToCard(s)} href={`/series/${s.id}`} rating={s.rating} comingSoon={simStatus.get(s.id) !== "watch"} />)}
            </div>
          </section>
        )}

        <p className="mt-12 text-xs text-muted">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </div>
    </>
  );
}
