"use client";

import Link from "next/link";
import { useActionState } from "react";
import { savePartnerAction, type FormState } from "@/app/admin/actions";
import type { Partner } from "@/lib/types";

const label = "block text-sm font-semibold";
const hint = "mt-1 text-xs font-normal text-muted";

export default function PartnerForm({ partner }: { partner?: Partner }) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePartnerAction, {});
  const v = state.values;
  const val = (key: string, initial: string | undefined) => v?.[key] ?? initial ?? "";

  return (
    <form action={action} className="space-y-4">
      {partner && <input type="hidden" name="id" value={partner.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Partner / website name *
          <input name="name" required defaultValue={val("name", partner?.name)} placeholder="Example Movies Blog" className="field mt-1" />
        </label>
        <label className={label}>
          Contact email
          <input name="contactEmail" type="email" defaultValue={val("contactEmail", partner?.contactEmail)} className="field mt-1" />
        </label>
      </div>
      <label className={label}>
        Allowed domains
        <textarea name="allowedDomains" rows={3} defaultValue={val("allowedDomains", partner?.allowedDomains.join("\n"))} placeholder={"example.com\nblog.example.org"} className="field mt-1 font-mono !text-xs" />
        <p className={hint}>
          One per line. The player only loads on these sites and their subdomains. Leave empty to allow any site
          (not recommended — anyone who copies the key could use it).
        </p>
      </label>
      <label className={label}>
        Internal notes
        <textarea name="notes" rows={2} defaultValue={val("notes", partner?.notes)} className="field mt-1" />
      </label>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" name="active" defaultChecked={v ? v.active === "on" : (partner?.active ?? true)} className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
        <span>
          <span className="block text-sm font-semibold">Active</span>
          <span className="block text-xs text-muted">Turn off to stop all playback through this partner&apos;s key immediately.</span>
        </span>
      </label>

      {state.error && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm font-semibold text-danger">{state.error}</p>}

      <div className="flex gap-3">
        <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : partner ? "Save changes" : "Create partner"}</button>
        {!partner && <Link href="/admin/partners" className="btn btn-ghost">Cancel</Link>}
      </div>
    </form>
  );
}
