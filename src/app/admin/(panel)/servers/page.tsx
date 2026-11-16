import type { Metadata } from "next";
import Link from "next/link";
import { deleteServerAction, moveServerAction, toggleServerAction } from "@/app/admin/actions";
import { ConfirmSubmit } from "@/components/admin/bits";
import ServerForm from "@/components/admin/ServerForm";
import { getActiveStreamPatterns } from "@/lib/hosted-player";
import { extraServersEnabled, getServerRow, listServerRows } from "@/lib/local-servers";

export const metadata: Metadata = { title: "Servers" };
export const dynamic = "force-dynamic";

const card = "rounded-xl border border-line bg-surface p-5";
const mini = "btn btn-ghost !px-2.5 !py-1 !text-xs";

export default async function ServersPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const [rows, patterns, editing] = await Promise.all([listServerRows(), getActiveStreamPatterns(), edit ? getServerRow(edit) : Promise.resolve(null)]);
  const active = extraServersEnabled();

  return (
    <>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Servers</h1>
      <p className="mb-5 text-sm text-muted">
        Extra embed servers viewers can switch to on /movie and /series pages (the buttons above the player). The Default server comes first.
      </p>

      <div className={`mb-5 rounded-xl border p-4 text-sm ${active ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"}`}>
        {active ? (
          <p><b>Active.</b> These servers are offered to viewers while this site runs locally (<code>npm run dev</code>).</p>
        ) : (
          <p>
            <b>Not active right now.</b> Extra servers are local-only: they appear only when <code>LOCAL_EXTRA_SERVERS=on</code> is set in{" "}
            <code>.env.local</code> and the site runs with <code>npm run dev</code>. In a production build they are never shown.
            You can still prepare the list here.
          </p>
        )}
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-accent/15 px-2 py-0.5 text-[11px] font-extrabold tracking-wider text-accent uppercase">Default</span>
          <span className="text-sm font-semibold">Your main server</span>
          <Link href="/admin/player" className="ml-auto text-xs font-semibold text-accent hover:underline">Change in Player settings</Link>
        </div>
        <p className="mt-2 break-all font-mono text-xs text-muted">Movie: {patterns.movie ?? "— not set"}</p>
        <p className="mt-1 break-all font-mono text-xs text-muted">Series: {patterns.tv ?? "— not set"}</p>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Server</th>
              <th className="px-4 py-3 font-semibold">Has</th>
              <th className="px-4 py-3 font-semibold">Pop-up block</th>
              <th className="px-4 py-3 font-semibold">Shown</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={`border-b border-line/60 last:border-0 ${r.enabled ? "" : "opacity-60"}`}>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <form action={moveServerAction}>
                      <input type="hidden" name="id" value={r.id} /><input type="hidden" name="dir" value="up" />
                      <button className={mini} disabled={i === 0} aria-label={`Move ${r.label} up`}>↑</button>
                    </form>
                    <form action={moveServerAction}>
                      <input type="hidden" name="id" value={r.id} /><input type="hidden" name="dir" value="down" />
                      <button className={mini} disabled={i === rows.length - 1} aria-label={`Move ${r.label} down`}>↓</button>
                    </form>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/servers?edit=${r.id}#form`} className="font-semibold hover:text-accent">{r.label}</Link>
                  <p className="max-w-[22rem] truncate font-mono text-[11px] text-muted" title={r.movie || r.tv}>{(r.movie || r.tv).replace(/^https:\/\//, "")}</p>
                </td>
                <td className="px-4 py-3 text-xs text-muted">{[r.movie && "Movies", r.tv && "Series"].filter(Boolean).join(" + ")}</td>
                <td className="px-4 py-3 text-xs">{r.sandbox ? "On" : <span className="text-amber-400">Off</span>}</td>
                <td className="px-4 py-3">
                  <form action={toggleServerAction}>
                    <input type="hidden" name="id" value={r.id} /><input type="hidden" name="enable" value={r.enabled ? "0" : "1"} />
                    <button className={`rounded-full px-3 py-1 text-xs font-bold ${r.enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-muted"}`}>
                      {r.enabled ? "Shown" : "Hidden"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/servers?edit=${r.id}#form`} className={mini}>Edit</Link>
                    <form action={deleteServerAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmSubmit className={`${mini} hover:!text-danger`} message={`Delete the server “${r.label}”?`}>Delete</ConfirmSubmit>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">No extra servers yet. Add one below.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div id="form" className={`mt-6 scroll-mt-24 ${card}`}>
        <h2 className="mb-3 text-lg font-bold">{editing ? `Edit “${editing.label}”` : "Add a server"}</h2>
        <ServerForm key={editing?.id ?? "new"} server={editing ?? undefined} />
      </div>

      <div className={`mt-6 ${card} text-sm text-muted`}>
        <p className="font-semibold text-text">How to add a server properly</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li>
            Get the server&apos;s <b>embed URL</b> from its own site (look for “embed” or “API” docs). It must take a <b>TMDB id</b>, like{" "}
            <code>https://example.com/embed/movie/550</code>.
          </li>
          <li>Replace the id with <code>{"{id}"}</code>; for series use <code>{"{id}"}</code>, <code>{"{season}"}</code>, <code>{"{episode}"}</code>.</li>
          <li>Click <b>Test URL</b>. It tells you if the server allows being shown inside your page, and whether the sync can check its titles.</li>
          <li>Save, then open any movie page and click the new button to see it play. If it says “disable sandbox”, turn the pop-up block off for that server.</li>
        </ol>
        <p className="mt-3">
          A site that shows <b>X-Frame-Options</b> / <b>frame-ancestors</b> errors in the test cannot be embedded, and a normal website with its own catalog
          (its own ids instead of TMDB ids) will not work either.
        </p>
      </div>
    </>
  );
}
