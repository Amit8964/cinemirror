"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { saveServerAction, testServerAction, type FormState } from "@/app/admin/actions";
import { REFERRERS, type ReferrerPolicy, type ServerRow } from "@/lib/embed-types";

const label = "block text-sm font-semibold";
const hint = "mt-1 text-xs font-normal text-muted";

export default function ServerForm({ server }: { server?: ServerRow }) {
  const [state, save, saving] = useActionState<FormState, FormData>(saveServerAction, {});
  const [tested, test, testing] = useActionState<FormState, FormData>(testServerAction, {});
  const v = state.values;

  // Controlled, and submitted by hand: React would otherwise reset the form after every action, wiping what was
  // typed (after a validation error or a "Test URL").
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => (fd.get("intent") === "test" ? test(fd) : save(fd)));
  };
  const [name, setName] = useState(v?.label ?? server?.label ?? "");
  const [movie, setMovie] = useState(v?.movie ?? server?.movie ?? "");
  const [tv, setTv] = useState(v?.tv ?? server?.tv ?? "");
  const [sandbox, setSandbox] = useState(v ? v.sandbox === "on" : (server?.sandbox ?? true));
  const [enabled, setEnabled] = useState(v ? v.enabled === "on" : (server?.enabled ?? true));
  const [referrer, setReferrer] = useState<ReferrerPolicy>((v?.referrer as ReferrerPolicy) ?? server?.referrer ?? "origin");

  return (
    <form onSubmit={submit} className="space-y-4">
      {server && <input type="hidden" name="id" value={server.id} />}

      <label className={label}>
        Server name *
        <input name="label" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. VidKing" className="field mt-1" />
        <p className={hint}>This is the button text viewers see above the player.</p>
      </label>

      <label className={label}>
        Movie URL
        <input name="movie" value={movie} onChange={(e) => setMovie(e.target.value)} placeholder="https://example.com/embed/movie/{id}" className="field mt-1 font-mono !text-sm" />
        <p className={hint}>
          Use <code>{"{id}"}</code> where the TMDB id goes. Example: <code>https://example.com/embed/movie/{"{id}"}</code>. Leave empty if the server has no movies.
        </p>
      </label>

      <label className={label}>
        Series URL
        <input name="tv" value={tv} onChange={(e) => setTv(e.target.value)} placeholder="https://example.com/embed/tv/{id}/{season}/{episode}" className="field mt-1 font-mono !text-sm" />
        <p className={hint}>
          Needs <code>{"{id}"}</code>, <code>{"{season}"}</code> and <code>{"{episode}"}</code>. Example: <code>https://example.com/embed/tv/{"{id}"}/{"{season}"}/{"{episode}"}</code>. Leave empty if the server has no series.
        </p>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 text-sm">
          <input type="checkbox" name="sandbox" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} className="mt-1" />
          <span>
            <b>Block pop-up ads (sandbox) by default</b>
            <span className="mt-0.5 block text-xs text-muted">
              Turn this OFF only if the server says “disable sandbox” or never starts playing. Viewers can still flip it with the
              Ad Block button on the player.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 text-sm">
          <input type="checkbox" name="enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-1" />
          <span>
            <b>Show this server to viewers</b>
            <span className="mt-0.5 block text-xs text-muted">Untick to hide it without deleting it.</span>
          </span>
        </label>
      </div>

      <label className={label}>
        Referrer sent to the server
        <select name="referrer" value={referrer} onChange={(e) => setReferrer(e.target.value as ReferrerPolicy)} className="field mt-1">
          {REFERRERS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <p className={hint}>Keep “origin” unless a server only works with another setting.</p>
      </label>

      {state.error && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm font-semibold text-danger">{state.error}</p>}
      {tested.error && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm font-semibold text-danger">{tested.error}</p>}
      {tested.info && (
        <div role="status" className="rounded-lg border border-line bg-ink p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
          {tested.info.join("\n")}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button name="intent" value="save" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : server ? "Save changes" : "Add server"}</button>
        <button type="submit" name="intent" value="test" formNoValidate className="btn btn-ghost" disabled={testing}>{testing ? "Testing…" : "Test URL"}</button>
        {server && <Link href="/admin/servers" className="text-sm font-semibold text-muted hover:text-text">Cancel</Link>}
      </div>
    </form>
  );
}
