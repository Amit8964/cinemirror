import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon, ClockIcon, FlagIcon, MailIcon, PhoneIcon, ShieldIcon } from "@/components/icons";
import PageHero from "@/components/PageHero";
import { SITE, telHref } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Get in touch with the ${SITE.name} team by email or phone, or report copyrighted content.`,
};

const FAQ = [
  {
    q: "A movie link isn't working. What should I do?",
    a: "Videos come from third-party sources, so a link can sometimes go offline. Email us the page link and we'll check it.",
  },
  {
    q: "I own a movie that appears on your site. How do I get it removed?",
    a: "Use our DMCA report page. You'll get a reference number immediately and we'll reply once we've reviewed the notice.",
  },
  {
    q: "How quickly do you reply?",
    a: "We aim to answer general emails within 1–2 business days and copyright notices within 2–3 business days.",
  },
];

export default function ContactPage() {
  const cards = [
    {
      icon: <MailIcon />, title: "General enquiries", text: "Questions, feedback or broken links.",
      value: SITE.email, href: `mailto:${SITE.email}`,
    },
    {
      icon: <ShieldIcon />, title: "Copyright & DMCA", text: "Notices from rights holders.",
      value: SITE.dmcaEmail, href: `mailto:${SITE.dmcaEmail}?subject=DMCA%20notice`,
    },
    {
      icon: <PhoneIcon />, title: "Phone", text: SITE.hours,
      value: SITE.phone, href: telHref(SITE.phone),
    },
  ];

  return (
    <>
      <PageHero kicker="Support" icon={<MailIcon />} title="Contact Us">
        <p>Have a question, found a broken link or need something removed? Our team is happy to help.</p>
      </PageHero>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {cards.map((c) => (
            <li key={c.title}>
              <a
                href={c.href}
                className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-6 transition hover:-translate-y-1 hover:border-accent/60 hover:shadow-[0_20px_40px_-20px_rgb(246_184_60/0.35)]"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent/12 text-xl text-accent">{c.icon}</span>
                <span className="mt-4 block text-lg font-bold">{c.title}</span>
                <span className="block text-sm text-muted">{c.text}</span>
                <span className="mt-4 flex items-center gap-1 break-all text-sm font-semibold text-accent">
                  {c.value} <ChevronRightIcon className="shrink-0 transition group-hover:translate-x-0.5" />
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col justify-between gap-5 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/[0.12] to-surface p-6">
            <div>
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-xl text-accent-ink"><FlagIcon /></span>
              <h2 className="mt-4 font-display text-4xl tracking-wide">Report content</h2>
              <p className="mt-1 text-sm text-text/75">
                Own the rights to something on {SITE.name}? Send a DMCA notice and we&apos;ll remove the links or embeds after review.
              </p>
            </div>
            <Link href="/dmca" className="btn btn-primary self-start">File a DMCA notice</Link>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="font-display text-4xl tracking-wide">Common questions</h2>
            <div className="mt-3 divide-y divide-line">
              {FAQ.map((f) => (
                <details key={f.q} className="group py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronRightIcon className="shrink-0 text-muted transition group-open:rotate-90" />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.a}</p>
                </details>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted"><ClockIcon className="text-accent" /> Support hours: {SITE.hours}</p>
          </div>
        </div>
      </div>
    </>
  );
}
