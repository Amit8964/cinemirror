"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveTitleAction, type FormState } from "@/app/admin/actions";
import type { Title } from "@/lib/types";
import SourcePreview from "./SourcePreview";

const label = "block text-sm font-semibold";
const hint = "mt-1 text-xs font-normal text-muted";

export default function TitleForm({ title, prefill }: { title?: Title; prefill?: Partial<Title> }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveTitleAction, {});
  const v = state.values;
  const val = (key: string, initial: string | number | null | undefined) => v?.[key] ?? String(initial ?? "");
  // After a failed submit, checkboxes come back from the submitted values.
  const checked = (key: string, initial: boolean) => (v ? v[key] === "on" : initial);
  const src: Partial<Title> | undefined = title ?? prefill;
  const subs = title?.subtitles.map((s) => `${s.label} | ${s.lang} | ${s.url}`).join("\n") ?? "";
  const versions = title?.versions.map((x) => `${x.label} | ${x.lang} | ${x.src}`).join("\n") ?? "";

  return (
    <form action={action} className="space-y-6">
      {title && <input type="hidden" name="id" value={title.id} />}

      <fieldset className="grid gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
        <legend className="px-1 text-xs font-bold tracking-wider text-muted uppercase">Video</legend>
        <SourcePreview
          defaultUrl={val("sourceUrl", src?.sourceUrl)}
          defaultType={v?.sourceType ?? (src?.sourceUrl ? (src.sourceType ?? "auto") : "auto")}
          title={src?.title ?? ""}
          poster={src?.backdropUrl || src?.posterUrl || undefined}
          subtitles={title?.subtitles}
        />
        <label className={`${label} sm:col-span-2`}>
          Language / quality versions
          <textarea
            name="versions"
            rows={4}
            defaultValue={val("versions", versions)}
            placeholder={"Hindi 1080p | hi | https://cdn.example.com/film/hi-1080.m3u8\nHindi 720p | hi | https://cdn.example.com/film/hi-720.m3u8\nEnglish 1080p | en | https://cdn.example.com/film/en-1080.m3u8"}
            className="field mt-1 font-mono !text-xs"
          />
          <p className={hint}>
            One per line: Label | language code | URL of an .m3u8 or .mp4. These appear in the player&apos;s Language menu next to the main video above
            (name that one with the “Language” field below). A single .m3u8 that already has several qualities or audio tracks needs no lines here — the player shows those itself.
          </p>
        </label>
        <label className={`${label} sm:col-span-2`}>
          Subtitles
          <textarea name="subtitles" rows={2} defaultValue={val("subtitles", subs)} placeholder="English | en | https://cdn.example.com/film/en.vtt" className="field mt-1 font-mono !text-xs" />
          <p className={hint}>One per line: Label | language code | URL of a .vtt or .srt file (its host must allow cross-origin requests).</p>
        </label>
      </fieldset>

      <fieldset className="grid gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
        <legend className="px-1 text-xs font-bold tracking-wider text-muted uppercase">Details</legend>
        <label className={label}>
          Title *
          <input name="title" required defaultValue={val("title", src?.title)} className="field mt-1" />
        </label>
        <label className={label}>
          URL slug
          <input name="slug" defaultValue={val("slug", src?.slug)} placeholder="made from the title if empty" className="field mt-1" />
        </label>
        <label className={`${label} sm:col-span-2`}>
          Description
          <textarea name="description" rows={4} defaultValue={val("description", src?.description)} className="field mt-1" />
        </label>
        <label className={label}>
          Genres
          <input name="genres" defaultValue={val("genres", src?.genres?.join(", "))} placeholder="Drama, Thriller" className="field mt-1" />
          <p className={hint}>Comma separated.</p>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className={label}>
            Year
            <input name="year" type="number" min={1880} max={2100} defaultValue={val("year", src?.year)} className="field mt-1" />
          </label>
          <label className={label}>
            Runtime (min)
            <input name="durationMin" type="number" min={1} max={1999} defaultValue={val("durationMin", src?.durationMin)} className="field mt-1" />
          </label>
        </div>
        <label className={label}>
          Age rating
          <input name="rating" defaultValue={val("rating", src?.rating)} placeholder="PG-13, U/A…" className="field mt-1" />
        </label>
        <label className={label}>
          Language
          <input name="language" defaultValue={val("language", src?.language)} className="field mt-1" />
        </label>
        <label className={label}>
          Poster image URL
          <input name="posterUrl" defaultValue={val("posterUrl", src?.posterUrl)} placeholder="Portrait, 2:3" className="field mt-1" />
          <p className={hint}>Leave empty to use generated poster art.</p>
        </label>
        <label className={label}>
          Backdrop image URL
          <input name="backdropUrl" defaultValue={val("backdropUrl", src?.backdropUrl)} placeholder="Landscape, 16:9" className="field mt-1" />
        </label>
        <label className={`${label} sm:col-span-2`}>
          Credit / licence
          <input name="credit" defaultValue={val("credit", src?.credit)} placeholder="© Studio — licensed for streaming / CC BY 4.0 / Public domain" className="field mt-1" />
        </label>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-line bg-surface p-5">
        <legend className="px-1 text-xs font-bold tracking-wider text-muted uppercase">Visibility</legend>
        <Check name="published" defaultChecked={checked("published", title?.published ?? true)} title="Published" text="Visible on the site and playable." />
        <Check name="embeddable" defaultChecked={checked("embeddable", title?.embeddable ?? true)} title="Allow partner embeds" text="Partners with a valid key can embed this title." />
        <Check name="featured" defaultChecked={checked("featured", title?.featured ?? false)} title="Feature on the home page" text="The newest featured title becomes the home page hero." />
      </fieldset>

      {state.error && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm font-semibold text-danger">{state.error}</p>}

      <div className="flex gap-3">
        <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : title ? "Save changes" : "Add title"}</button>
        <Link href="/admin/titles" className="btn btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}

function Check({ name, defaultChecked, title, text }: { name: string; defaultChecked: boolean; title: string; text: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted">{text}</span>
      </span>
    </label>
  );
}
