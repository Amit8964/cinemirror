"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, InfoIcon, PlayIcon, StarIcon } from "./icons";

export interface HeroSlide {
  key: string;
  title: string;
  overview: string;
  backdropUrl: string;
  meta: string[];
  rating?: number;
  kicker: string;
  playHref?: string;
  infoHref: string;
}

const INTERVAL = 7000;

export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const go = useCallback((n: number) => setIndex(((n % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => go(index + 1), INTERVAL);
    return () => window.clearTimeout(t);
  }, [index, paused, count, go]);

  if (!count) return null;
  const s = slides[index];

  return (
    <section
      className="relative isolate h-[72vh] min-h-[30rem] max-h-[52rem] overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slide.key}
          src={slide.backdropUrl}
          alt=""
          aria-hidden="true"
          loading={i === 0 ? "eager" : "lazy"}
          className={`absolute inset-0 -z-20 h-full w-full object-cover transition-opacity duration-1000 ${
            i === index ? "scale-105 opacity-100" : "opacity-0"
          }`}
          style={{ transition: "opacity 1s ease, transform 8s ease-out" }}
        />
      ))}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-transparent to-ink/30" />

      <div className="mx-auto flex h-full max-w-[90rem] items-end px-4 pb-16 sm:px-8 sm:pb-24">
        <div key={s.key} className="max-w-2xl animate-[heroIn_.6s_ease-out]" aria-live="polite">
          <p className="text-xs font-bold tracking-[0.3em] text-accent uppercase">{s.kicker}</p>
          <h1 className="mt-2 font-display text-6xl leading-[0.9] tracking-wide [text-wrap:balance] sm:text-8xl">{s.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-text/85">
            {s.rating ? (
              <span className="flex items-center gap-1 text-accent"><StarIcon /> {s.rating.toFixed(1)}</span>
            ) : null}
            {s.meta.map((m) => <span key={m}>{m}</span>)}
          </p>
          <p className="mt-4 line-clamp-3 max-w-xl text-base text-text/80">{s.overview}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {s.playHref && (
              <Link href={s.playHref} className="btn btn-primary !px-7 !py-3 !text-base"><PlayIcon /> Play</Link>
            )}
            <Link href={s.infoHref} className="btn btn-ghost !bg-white/15 !px-7 !py-3 !text-base backdrop-blur hover:!bg-white/25">
              <InfoIcon /> More info
            </Link>
          </div>
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous"
            className="absolute top-1/2 left-2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-2xl text-white/80 backdrop-blur transition hover:bg-black/70 hover:text-white sm:grid"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next"
            className="absolute top-1/2 right-2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-2xl text-white/80 backdrop-blur transition hover:bg-black/70 hover:text-white sm:grid"
          >
            <ChevronRightIcon />
          </button>
          <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.key}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show ${slide.title}`}
                aria-current={i === index ? "true" : undefined}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-accent" : "w-3 bg-white/40 hover:bg-white/70"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
