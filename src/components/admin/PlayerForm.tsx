"use client";

import { useActionState, useState } from "react";
import { savePlayerAction, type FormState } from "@/app/admin/actions";
import type { PlayerMode } from "@/lib/hosted-player";

const label = "block text-sm font-semibold";
const hint = "mt-1 text-xs font-normal text-muted";

export interface PlayerFormProps {
  mode: PlayerMode;
  hostedUrl: string;
  customMovie: string;
  customTv: string;
  adUrl: string;
  adSkip: string;
}

const MODES: { id: PlayerMode; title: string; text: string }[] = [
  { id: "builtin", title: "Built-in player", text: "The player inside this site. No setup." },
  { id: "hosted", title: "My hosted player", text: "Your own cinemirror-player on its own domain. Uses an automatic key." },
  { id: "custom", title: "Another player", text: "Embed any other player you are allowed to use, by URL pattern." },
];

export default function PlayerForm({ mode, hostedUrl, customMovie, customTv, adUrl, adSkip }: PlayerFormProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePlayerAction, {});
  const v = state.values;
  const [picked, setPicked] = useState<PlayerMode>((v?.mode as PlayerMode) ?? mode);

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {MODES.map((m) => (
          <label
            key={m.id}
            className={`cursor-pointer rounded-lg border p-3 transition ${picked === m.id ? "border-accent bg-accent/10" : "border-line hover:border-muted"}`}
          >
            <input type="radio" name="mode" value={m.id} checked={picked === m.id} onChange={() => setPicked(m.id)} className="sr-only" />
            <span className="block text-sm font-bold">{m.title}</span>
            <span className="mt-1 block text-xs text-muted">{m.text}</span>
          </label>
        ))}
      </div>

      <div className={picked === "hosted" ? "" : "hidden"}>
        <label className={label}>
          Player URL
          <input name="url" defaultValue={v?.url ?? hostedUrl} placeholder="https://player.your-domain.com" className="field mt-1 font-mono !text-sm" />
          <p className={hint}>Where your cinemirror-player is hosted. Used on watch pages for titles in your library.</p>
        </label>
      </div>

      <div className={`space-y-3 ${picked === "custom" ? "" : "hidden"}`}>
        <label className={label}>
          Movie URL pattern
          <input name="customMovie" defaultValue={v?.customMovie ?? customMovie} placeholder="https://player.example.com/embed/movie/{id}" className="field mt-1 font-mono !text-sm" />
          <p className={hint}><code>{"{id}"}</code> is replaced by the TMDB id. Shown on /movie pages.</p>
        </label>
        <label className={label}>
          Series URL pattern
          <input name="customTv" defaultValue={v?.customTv ?? customTv} placeholder="https://player.example.com/embed/tv/{id}/{season}/{episode}" className="field mt-1 font-mono !text-sm" />
          <p className={hint}>Needs <code>{"{id}"}</code>, <code>{"{season}"}</code> and <code>{"{episode}"}</code>. Shown on /series pages.</p>
        </label>
        <p className="text-xs text-muted">Only embed players you have the right to use. The frame is sandboxed, so it cannot open pop-ups or redirect your page.</p>
      </div>

      <fieldset className="space-y-3 rounded-lg border border-line p-4">
        <legend className="px-1 text-sm font-bold">Ads in my hosted player (optional)</legend>
        <label className={label}>
          Ad page URL
          <input name="adUrl" defaultValue={v?.adUrl ?? adUrl} placeholder="https://ads.your-domain.com/preroll.html" className="field mt-1 font-mono !text-sm" />
          <p className={hint}>
            Shown before playback in every embed of your hosted player, including partner sites. Loads in a sandboxed
            frame (no pop-ups, no redirects).
          </p>
        </label>
        <label className={label}>
          Skip after (seconds)
          <input name="adSkip" type="number" min={0} max={30} defaultValue={v?.adSkip ?? adSkip} placeholder="5" className="field mt-1 w-28" />
        </label>
      </fieldset>

      {state.error && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm font-semibold text-danger">{state.error}</p>}
      {v?.saved && !state.error && <p role="status" className="text-sm font-semibold text-accent">Saved.</p>}
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save player"}</button>
    </form>
  );
}
