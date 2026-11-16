import type { Metadata } from "next";
import { rotateFirstPartyKeyAction } from "@/app/admin/actions";
import { ConfirmSubmit, CopyButton } from "@/components/admin/bits";
import PlayerForm from "@/components/admin/PlayerForm";
import { getFirstPartyKey, getPlayerConfig } from "@/lib/hosted-player";
import { getSetting } from "@/lib/settings";

export const metadata: Metadata = { title: "Player" };
export const dynamic = "force-dynamic";

export default async function PlayerSettingsPage() {
  const [cfg, adUrl, adSkip, key] = await Promise.all([getPlayerConfig(), getSetting("ad_url"), getSetting("ad_skip"), getFirstPartyKey()]);
  const card = "rounded-xl border border-line bg-surface p-5";
  return (
    <>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Player</h1>
      <p className="mb-5 text-sm text-muted">Choose which player this site uses. You can switch at any time.</p>
      <div className={card}>
        <PlayerForm mode={cfg.mode} hostedUrl={cfg.hostedUrl} customMovie={cfg.customMovie} customTv={cfg.customTv} adUrl={adUrl} adSkip={adSkip} />
      </div>

      <div className={`mt-5 ${card}`}>
        <h2 className="text-sm font-bold">First-party key</h2>
        <p className="mt-1 text-sm text-muted">
          Created automatically for your own hosted player, no partner needed. It only works when the request comes from
          the player URL above, so a copied key is useless elsewhere. Other websites should get their own key under Partners.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <code className="min-w-0 truncate rounded bg-ink px-2 py-1 font-mono text-xs">{key}</code>
          <CopyButton text={key} />
          <form action={rotateFirstPartyKeyAction} className="ml-auto">
            <ConfirmSubmit className="btn btn-ghost !px-3 !py-1.5 !text-xs" message="Generate a new key? Open players stop working until reloaded.">
              Regenerate key
            </ConfirmSubmit>
          </form>
        </div>
      </div>

      <div className={`mt-5 ${card} text-sm text-muted`}>
        <p className="font-semibold text-text">Embed URLs your hosted player serves</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 font-mono text-xs">
          <li>/?slug=&lt;title-slug&gt;&amp;k=&lt;key&gt;</li>
          <li>/player/&lt;tmdb id&gt;?key=&lt;key&gt;[&amp;close=1]</li>
          <li>/embed/movie/&lt;tmdb id&gt;?k=&lt;key&gt;</li>
        </ul>
      </div>
    </>
  );
}
