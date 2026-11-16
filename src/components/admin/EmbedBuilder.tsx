"use client";

import { useState } from "react";
import { CopyButton } from "./bits";

interface Option {
  slug: string;
  title: string;
}

/** Builds the iframe snippet a partner pastes into their site. */
export default function EmbedBuilder({ origin, apiKey, titles, playerOrigin }: { origin: string; apiKey: string; titles: Option[]; playerOrigin?: string }) {
  const [slug, setSlug] = useState(titles[0]?.slug ?? "");
  const [tmdb, setTmdb] = useState("");
  const [autoplay, setAutoplay] = useState(false);
  const [preview, setPreview] = useState(false);

  if (!titles.length) {
    return <p className="text-sm text-muted">There are no published, embeddable titles yet.</p>;
  }

  const chosen = titles.find((t) => t.slug === slug) ?? titles[0];
  // With a hosted player attached the code points at it: /player/<tmdb id> or /?slug=<slug>. Otherwise the built-in /embed page.
  const tmdbId = /^[1-9]\d{0,9}$/.test(tmdb.trim()) ? tmdb.trim() : "";
  const extra = autoplay ? "&autoplay=1" : "";
  const src = playerOrigin
    ? tmdbId
      ? `${playerOrigin}/player/${tmdbId}?key=${apiKey}${extra}`
      : `${playerOrigin}/?slug=${chosen.slug}&key=${apiKey}${extra}`
    : `${origin}/embed/${chosen.slug}?key=${apiKey}${extra}`;
  const code = `<div style="position:relative;padding-top:56.25%">
  <iframe
    src="${src}"
    title="${chosen.title.replace(/"/g, "&quot;")}"
    style="position:absolute;inset:0;width:100%;height:100%;border:0"
    allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
    allowfullscreen
    referrerpolicy="origin"
    loading="lazy"></iframe>
</div>`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-4">
        <label className="block min-w-0 flex-1 text-sm font-semibold">
          Title to embed
          <select value={chosen.slug} onChange={(e) => setSlug(e.target.value)} className="field mt-1">
            {titles.map((t) => <option key={t.slug} value={t.slug}>{t.title}</option>)}
          </select>
        </label>
        {playerOrigin && (
          <label className="block w-40 text-sm font-semibold">
            or TMDB id
            <input value={tmdb} onChange={(e) => setTmdb(e.target.value)} inputMode="numeric" placeholder="969681" className="field mt-1" />
          </label>
        )}
        <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm font-semibold">
          <input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
          Autoplay
        </label>
      </div>

      <div className="relative">
        <pre className="overflow-x-auto rounded-lg border border-line bg-ink p-4 pr-24 font-mono text-xs leading-relaxed text-text/90">{code}</pre>
        <div className="absolute top-2.5 right-2.5"><CopyButton text={code} label="Copy code" /></div>
      </div>
      <p className="text-xs text-muted">
        To embed a different title, change the part after <code className="text-text">/embed/</code> to that title&apos;s slug.
        Add <code className="text-text">&amp;start=90</code> to start 90 seconds in.
      </p>

      <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => setPreview((p) => !p)}>
        {preview ? "Hide preview" : "Preview player"}
      </button>
      {preview && (
        <div>
          <div className="relative overflow-hidden rounded-lg border border-line pt-[56.25%]">
            <iframe
              key={src}
              src={src}
              title={`Preview: ${chosen.title}`}
              className="absolute inset-0 h-full w-full border-0"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
            />
          </div>
          <p className="mt-1.5 text-xs text-muted">Previews from this admin panel are not counted in the statistics.</p>
        </div>
      )}
    </div>
  );
}
