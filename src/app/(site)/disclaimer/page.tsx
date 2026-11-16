import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AlertIcon, FlagIcon, ShieldIcon } from "@/components/icons";
import PageHero from "@/components/PageHero";
import { HOSTING_NOTICE, SITE, TAKEDOWN_NOTICE, TMDB_NOTICE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: `${SITE.name} is an index and discovery platform. Read how content, third-party sources and copyright work on this site.`,
};

const SECTIONS: { title: string; body: ReactNode }[] = [
  {
    title: "No video files on our servers",
    body: <p>{HOSTING_NOTICE}</p>,
  },
  {
    title: "Third-party content",
    body: (
      <p>
        Videos, players and links that appear on {SITE.name} are provided by external websites and services that we do
        not own or control. The availability, quality, accuracy and legality of that content is the responsibility of the
        third party that hosts it. A link or embed on our site is not an endorsement of the host.
      </p>
    ),
  },
  {
    title: "Copyright concerns",
    body: (
      <>
        <p>{TAKEDOWN_NOTICE}</p>
        <p>
          Rights holders can send a notice through our{" "}
          <Link href="/dmca" className="font-semibold text-accent hover:underline">DMCA report page</Link>. Every notice is
          reviewed and valid notices lead to the reported links or embeds being removed or disabled.
        </p>
      </>
    ),
  },
  {
    title: "Movie information and artwork",
    body: (
      <p>
        Titles, descriptions, posters and other movie information come from The Movie Database (TMDB). {TMDB_NOTICE} All
        trademarks, logos and artwork belong to their respective owners and are shown for identification only.
      </p>
    ),
  },
  {
    title: "External links",
    body: (
      <p>
        Our pages may link to other websites. We are not responsible for their content, privacy practices or availability.
        Visit them at your own discretion.
      </p>
    ),
  },
  {
    title: "No warranty",
    body: (
      <p>
        {SITE.name} is provided “as is”, without warranties of any kind. We do not guarantee that the site or any linked
        content will always be available, uninterrupted or error-free.
      </p>
    ),
  },
  {
    title: "Changes to this page",
    body: <p>We may update this disclaimer from time to time. The date at the bottom shows when it last changed.</p>,
  },
];

export default function DisclaimerPage() {
  return (
    <>
      <PageHero kicker="Legal" icon={<AlertIcon />} title="Disclaimer">
        <p>Please read this before using {SITE.name}. By using the site you accept the terms below.</p>
      </PageHero>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_1fr] lg:items-start">
          <nav aria-label="On this page" className="hidden lg:sticky lg:top-24 lg:block">
            <p className="text-[11px] font-bold tracking-[0.18em] text-muted uppercase">On this page</p>
            <ol className="mt-3 space-y-1 border-l border-line">
              {SECTIONS.map((s, i) => (
                <li key={s.title}>
                  <a href={`#s${i + 1}`} className="-ml-px block border-l border-transparent py-1 pl-4 text-sm text-muted hover:border-accent hover:text-text">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="max-w-3xl">
            <div className="flex gap-3 rounded-2xl border border-accent/30 bg-accent/[0.07] p-5">
              <ShieldIcon className="mt-0.5 shrink-0 text-xl text-accent" />
              <p className="text-[15px] leading-relaxed text-text/90">
                <strong className="text-text">In short:</strong> {SITE.name} is an index and discovery platform. If you own
                content linked here and want it removed, <Link href="/dmca" className="font-semibold text-accent hover:underline">send us a DMCA notice</Link> and we will take action.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              {SECTIONS.map((s, i) => (
                <section key={s.title} id={`s${i + 1}`} className="scroll-mt-24 rounded-2xl border border-line bg-surface p-5 sm:p-6">
                  <h2 className="flex items-baseline gap-3 text-lg font-bold">
                    <span className="font-display text-2xl text-accent">{String(i + 1).padStart(2, "0")}</span>
                    {s.title}
                  </h2>
                  <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-text/75">{s.body}</div>
                </section>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-line bg-gradient-to-br from-raised to-surface p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">Found something that shouldn&apos;t be here?</p>
                <p className="text-sm text-muted">Report it and our team will review it.</p>
              </div>
              <Link href="/dmca" className="btn btn-primary shrink-0"><FlagIcon /> Report content</Link>
            </div>

            <p className="mt-6 text-xs text-muted">Last updated: {SITE.legalUpdated}</p>
          </div>
        </div>
      </div>
    </>
  );
}
