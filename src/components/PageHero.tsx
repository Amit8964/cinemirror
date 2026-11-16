import type { ReactNode } from "react";

/** Header band for content pages (DMCA, Disclaimer, Contact). Pure CSS, no images. */
export default function PageHero({
  kicker, icon, title, children,
}: { kicker: string; icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden border-b border-white/5">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(70% 120% at 90% -20%, rgb(246 184 60 / 0.16), transparent 60%), radial-gradient(50% 90% at 0% 0%, rgb(99 102 241 / 0.12), transparent 60%)",
        }}
      />
      <div className="mx-auto max-w-7xl px-4 pt-10 pb-10 sm:px-6 sm:pt-16 sm:pb-14">
        <p className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-bold tracking-[0.18em] text-accent uppercase">
          {icon}
          {kicker}
        </p>
        <h1 className="mt-4 font-display text-5xl leading-[0.95] tracking-wide [text-wrap:balance] sm:text-7xl">{title}</h1>
        {children && <div className="mt-4 max-w-3xl space-y-3 text-[15px] leading-relaxed text-text/80 sm:text-base">{children}</div>}
      </div>
    </section>
  );
}
