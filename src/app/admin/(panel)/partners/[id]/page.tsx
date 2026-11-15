import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePartnerAction, rotateKeyAction } from "@/app/admin/actions";
import { ConfirmSubmit, CopyButton } from "@/components/admin/bits";
import EmbedBuilder from "@/components/admin/EmbedBuilder";
import PartnerForm from "@/components/admin/PartnerForm";
import StatsView, { parseDays, RangeTabs } from "@/components/admin/StatsView";
import { getPartner } from "@/lib/partners";
import { listTitles } from "@/lib/titles";

export const metadata: Metadata = { title: "Partner" };

export default async function PartnerPage({ params, searchParams }: PageProps<"/admin/partners/[id]">) {
  const [{ id }, sp, h] = await Promise.all([params, searchParams, headers()]);
  const partner = await getPartner(id);
  if (!partner) notFound();

  const days = parseDays(sp.days);
  const titles = (await listTitles()).filter((t) => t.embeddable).map((t) => ({ slug: t.slug, title: t.title }));
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const card = "rounded-xl border border-line bg-surface p-5";

  return (
    <>
      <Link href="/admin/partners" className="text-sm font-semibold text-muted hover:text-text">← Partners</Link>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">{partner.name}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${partner.active ? "bg-ok/15 text-ok" : "bg-danger/15 text-danger"}`}>
          {partner.active ? "Active" : "Disabled"}
        </span>
      </div>

      <div className="space-y-4">
        <section className={card}>
          <h2 className="text-sm font-bold">Embed code</h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            Send this to {partner.name}. It contains their key, so every play is counted under their name
            {partner.allowedDomains.length ? ` and only works on ${partner.allowedDomains.join(", ")}.` : ". It is not restricted to a domain yet."}
          </p>
          <EmbedBuilder origin={origin} apiKey={partner.apiKey} titles={titles} />

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <span className="text-xs font-semibold tracking-wider text-muted uppercase">Key</span>
            <code className="min-w-0 truncate rounded bg-ink px-2 py-1 font-mono text-xs">{partner.apiKey}</code>
            <CopyButton text={partner.apiKey} />
            <form action={rotateKeyAction} className="ml-auto">
              <input type="hidden" name="id" value={partner.id} />
              <ConfirmSubmit
                className="btn btn-ghost !px-3 !py-1.5 !text-xs"
                message="Generate a new key? Every embed using the current key stops working until the partner updates their code."
              >
                Regenerate key
              </ConfirmSubmit>
            </form>
          </div>
        </section>

        <div className="flex flex-wrap items-end justify-between gap-3 pt-4">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">Streaming through this partner</h2>
            <p className="text-sm text-muted">Only plays that used this partner&apos;s key.</p>
          </div>
          <RangeTabs days={days} basePath={`/admin/partners/${partner.id}`} />
        </div>
        <StatsView filter={{ days, partnerId: partner.id }} />

        <section className={`${card} !mt-8`}>
          <h2 className="mb-4 text-sm font-bold">Settings</h2>
          <PartnerForm partner={partner} />
        </section>

        <section className="rounded-xl border border-danger/30 p-5">
          <h2 className="text-sm font-bold">Delete partner</h2>
          <p className="mt-1 text-sm text-muted">Their embeds stop working immediately. Past statistics are kept.</p>
          <form action={deletePartnerAction} className="mt-3">
            <input type="hidden" name="id" value={partner.id} />
            <ConfirmSubmit className="btn btn-danger" message={`Delete ${partner.name}? Their embeds will stop working.`}>Delete partner</ConfirmSubmit>
          </form>
        </section>
      </div>
    </>
  );
}
