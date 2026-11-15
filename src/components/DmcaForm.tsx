"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { submitDmcaAction, type DmcaFormState } from "@/app/(site)/dmca/actions";
import { CheckIcon } from "./icons";

const label = "block text-sm font-semibold text-text";
const hint = "mt-1 text-xs text-muted";

export default function DmcaForm({ defaultUrl = "" }: { defaultUrl?: string }) {
  const [state, action, pending] = useActionState<DmcaFormState, FormData>(submitDmcaAction, {});

  if (state.ok) {
    return (
      <div role="status" className="rounded-2xl border border-ok/30 bg-ok/[0.06] p-8 text-center sm:p-10">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ok/15 text-2xl text-ok"><CheckIcon /></span>
        <h2 className="mt-4 font-display text-4xl tracking-wide">Notice received</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Thank you. Our team will review your notice and reply to <strong className="text-text">{state.email}</strong>.
          Please keep your reference number for any follow-up.
        </p>
        <p className="mx-auto mt-5 inline-block rounded-lg border border-line bg-ink px-4 py-2 font-mono text-lg font-bold tracking-wider text-accent">
          {state.ref}
        </p>
        <div className="mt-6">
          <Link href="/dmca" className="btn btn-ghost">Submit another notice</Link>
        </div>
      </div>
    );
  }

  const v = state.values;
  const err = state.fieldErrors ?? {};
  const val = (k: string, d = "") => v?.[k] ?? d;
  const field = (k: string) => `field mt-1.5 ${err[k] ? "!border-danger" : ""}`;

  return (
    <form action={action} noValidate className="space-y-8" aria-describedby={state.error ? "dmca-error" : undefined}>
      {/* Spam trap — hidden from people and screen readers */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <Section n={1} title="Your details" subtitle="Who is sending this notice. We use this only to reply to you.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name *" error={err.name}>
            <input name="name" autoComplete="name" required defaultValue={val("name")} className={field("name")} />
          </Field>
          <Field label="Email *" error={err.email}>
            <input name="email" type="email" autoComplete="email" required defaultValue={val("email")} className={field("email")} />
          </Field>
          <Field label="Phone" error={err.phone}>
            <input name="phone" type="tel" autoComplete="tel" defaultValue={val("phone")} placeholder="Optional" className={field("phone")} />
          </Field>
          <Field label="Company / organisation">
            <input name="organization" autoComplete="organization" defaultValue={val("organization")} placeholder="Optional" className={field("organization")} />
          </Field>
        </div>
        <fieldset className="mt-4">
          <legend className={label}>You are *</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {[
              { value: "owner", title: "The copyright owner", text: "You own the rights to the work." },
              { value: "agent", title: "An authorised agent", text: "You act on behalf of the owner." },
            ].map((o) => (
              <label key={o.value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-ink/60 p-3 transition has-[:checked]:border-accent has-[:checked]:bg-accent/[0.06]">
                <input type="radio" name="role" value={o.value} defaultChecked={val("role", "owner") === o.value} className="mt-1 accent-[var(--color-accent)]" />
                <span>
                  <span className="block text-sm font-semibold">{o.title}</span>
                  <span className="block text-xs text-muted">{o.text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </Section>

      <Section n={2} title="The content" subtitle="Tell us what you own and exactly where it appears on our site.">
        <div className="space-y-4">
          <Field label="Copyrighted work *" error={err.work} help="E.g. film title, year, studio or production house.">
            <textarea name="work" rows={3} required defaultValue={val("work")} className={field("work")} />
          </Field>
          <Field label="Link(s) on our site *" error={err.urls} help="One link per line — the movie or watch page you want removed. Up to 30.">
            <textarea
              name="urls"
              rows={3}
              required
              defaultValue={val("urls", defaultUrl)}
              placeholder={"https://cinemirror.example/watch/movie-name"}
              className={`${field("urls")} font-mono !text-xs`}
            />
          </Field>
          <Field label="Link to the original work or proof of ownership" error={err.originalUrl}>
            <input name="originalUrl" type="url" defaultValue={val("originalUrl")} placeholder="https:// (optional)" className={field("originalUrl")} />
          </Field>
          <Field label="Anything else we should know">
            <textarea name="details" rows={3} defaultValue={val("details")} placeholder="Optional" className={field("details")} />
          </Field>
        </div>
      </Section>

      <Section n={3} title="Declarations" subtitle="Required by the DMCA (17 U.S.C. § 512(c)(3)).">
        <div className="space-y-3">
          <Check name="goodFaith" checked={v?.goodFaith === "on"} error={err.goodFaith}>
            I have a good-faith belief that use of the material in the manner complained of is not authorised by the
            copyright owner, its agent, or the law.
          </Check>
          <Check name="accuracy" checked={v?.accuracy === "on"} error={err.accuracy}>
            The information in this notice is accurate, and under penalty of perjury, I am the owner or authorised to act
            on behalf of the owner of the copyright that is allegedly infringed.
          </Check>
        </div>
        <div className="mt-4 max-w-sm">
          <Field label="Electronic signature *" error={err.signature} help="Type your full legal name.">
            <input name="signature" required defaultValue={val("signature")} className={`${field("signature")} font-semibold italic`} />
          </Field>
        </div>
      </Section>

      {state.error && (
        <p id="dmca-error" role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">Sending a false notice can make you liable for damages (17 U.S.C. § 512(f)).</p>
        <button className="btn btn-primary !px-7 !py-3" disabled={pending}>
          {pending ? "Sending…" : "Submit notice"}
        </button>
      </div>
    </form>
  );
}

function Section({ n, title, subtitle, children }: { n: number; title: string; subtitle: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-extrabold text-accent-ink">{n}</span>
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label: text, error, help, children }: { label: string; error?: string; help?: string; children: ReactNode }) {
  return (
    <label className={label}>
      {text}
      {children}
      {error ? <span className="mt-1 block text-xs font-semibold text-danger">{error}</span> : help ? <span className={`block ${hint}`}>{help}</span> : null}
    </label>
  );
}

function Check({ name, checked, error, children }: { name: string; checked: boolean; error?: string; children: ReactNode }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm text-text/85 ${error ? "border-danger/60" : "border-line bg-ink/60"}`}>
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]" />
      <span>
        {children}
        {error && <span className="mt-1 block text-xs font-semibold text-danger">{error}</span>}
      </span>
    </label>
  );
}
