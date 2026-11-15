import type { Metadata } from "next";
import Link from "next/link";
import DmcaForm from "@/components/DmcaForm";
import { ClockIcon, FlagIcon, MailIcon, PhoneIcon, ShieldIcon } from "@/components/icons";
import PageHero from "@/components/PageHero";
import { HOSTING_NOTICE, SITE, TAKEDOWN_NOTICE, telHref } from "@/lib/site";
import { safeUrl } from "@/lib/util";

export const metadata: Metadata = {
  title: "DMCA & Copyright",
  description: `Report copyrighted content on ${SITE.name}. Send a DMCA notice and we will remove the links or embeds.`,
};

const REQUIREMENTS = [
  "Your physical or electronic signature.",
  "The copyrighted work you believe is infringed.",
  "The exact link(s) on our site to the material.",
  "Your name, address, phone number and email.",
  "A statement of good-faith belief that the use is not authorised.",
  "A statement, under penalty of perjury, that the notice is accurate and you are authorised to act.",
];

const STEPS = [
  { title: "You submit", text: "Send the form below. You get a reference number straight away." },
  { title: "We review", text: "Our team checks the notice and the reported links, usually within 2–3 business days." },
  { title: "We act", text: "If the notice is valid, the links or embeds are removed or disabled on our site." },
  { title: "You hear back", text: "We reply by email with the outcome, quoting your reference number." },
];

export default async function DmcaPage({ searchParams }: PageProps<"/dmca">) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.url) ? sp.url[0] : sp.url;
  const defaultUrl = safeUrl(raw?.slice(0, 500));

  return (
    <>
      <PageHero kicker="Copyright" icon={<ShieldIcon />} title="DMCA & Content Removal">
        <p>{HOSTING_NOTICE}</p>
        <p>{TAKEDOWN_NOTICE}</p>
      </PageHero>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <ul className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { icon: <ClockIcon />, title: "Fast review", text: "Notices are reviewed within 2–3 business days." },
            { icon: <FlagIcon />, title: "Links removed", text: "Valid notices lead to removal of links and embeds." },
            { icon: <MailIcon />, title: "Tracked by reference", text: "Every notice gets a reference number." },
          ].map((c) => (
            <li key={c.title} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/12 text-lg text-accent">{c.icon}</span>
              <span>
                <span className="block text-sm font-bold">{c.title}</span>
                <span className="block text-xs text-muted">{c.text}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_21rem] lg:items-start">
          <div id="report" className="relative rounded-2xl border border-line bg-surface p-5 shadow-2xl shadow-black/30 sm:p-8">
            <h2 className="font-display text-4xl tracking-wide">File a DMCA notice</h2>
            <p className="mt-1 mb-8 text-sm text-muted">Fields marked * are required. Your details are only used to handle this notice.</p>
            <DmcaForm defaultUrl={defaultUrl} />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="font-bold">A valid notice includes</h2>
              <ol className="mt-3 space-y-2.5">
                {REQUIREMENTS.map((r, i) => (
                  <li key={r} className="flex gap-2.5 text-sm text-text/80">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-accent/50 text-[10px] font-bold text-accent">{i + 1}</span>
                    {r}
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="font-bold">Prefer email?</h2>
              <p className="mt-1 text-sm text-muted">Send your notice with the details above to our copyright team.</p>
              <a href={`mailto:${SITE.dmcaEmail}?subject=DMCA%20notice`} className="mt-3 flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
                <MailIcon /> {SITE.dmcaEmail}
              </a>
              <a href={telHref(SITE.phone)} className="mt-2 flex items-center gap-2 text-sm font-semibold text-text/80 hover:text-accent">
                <PhoneIcon /> {SITE.phone}
              </a>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="font-bold">Counter-notice</h2>
              <p className="mt-1 text-sm text-muted">
                If your content was removed by mistake, email {SITE.dmcaEmail} with the removed link, your contact details
                and a statement that you believe it was removed in error. We will review it and may restore the link.
              </p>
            </div>
          </aside>
        </div>

        <section className="mt-16">
          <h2 className="font-display text-4xl tracking-wide">What happens next</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl border border-line bg-surface p-5">
                <span className="font-display text-5xl leading-none text-accent/80">0{i + 1}</span>
                <h3 className="mt-2 font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-muted">
            Questions? See our <Link href="/disclaimer" className="font-semibold text-accent hover:underline">disclaimer</Link> or{" "}
            <Link href="/contact" className="font-semibold text-accent hover:underline">contact us</Link>.
          </p>
        </section>
      </div>
    </>
  );
}
