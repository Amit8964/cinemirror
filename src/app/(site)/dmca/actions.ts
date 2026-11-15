"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createDmcaReport } from "@/lib/dmca";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { safeUrl } from "@/lib/util";

export interface DmcaFormState {
  ok?: boolean;
  ref?: string;
  email?: string;
  error?: string;
  /** Field name → message, shown under each field. */
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;
const PHONE = /^[+\d][\d\s().-]{5,30}$/;

export async function submitDmcaAction(_prev: DmcaFormState, fd: FormData): Promise<DmcaFormState> {
  const str = (k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);
  const values: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$")) values[k] = v;
  });

  // Hidden field real people never see: bots that fill it get a fake success and nothing is stored.
  if (str("website", 200)) return { ok: true, ref: "DMCA-RECEIVED", email: str("email", 254) };

  const h = await headers();
  const ip = clientIp(h);
  if (!rateLimit(`dmca:${ip}`, 5, 60 * 60_000)) {
    return { error: "Too many notices from your network in the last hour. Please try again later or email us.", values };
  }

  const name = str("name", 120);
  const email = str("email", 254);
  const phone = str("phone", 40);
  const organization = str("organization", 160);
  const role = str("role", 10) === "agent" ? "agent" : "owner";
  const work = str("work", 4000);
  const originalRaw = str("originalUrl", 2000);
  const details = str("details", 5000);
  const signature = str("signature", 120);

  const urls: string[] = [];
  const badUrls: string[] = [];
  for (const line of String(fd.get("urls") ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 30)) {
    const u = safeUrl(line.slice(0, 2000));
    if (u) urls.push(u);
    else badUrls.push(line);
  }

  const e: Record<string, string> = {};
  if (name.length < 2) e.name = "Enter your full name.";
  if (!EMAIL.test(email)) e.email = "Enter a valid email address so we can reply.";
  if (phone && !PHONE.test(phone)) e.phone = "Enter a valid phone number, or leave it empty.";
  if (work.length < 10) e.work = "Describe the copyrighted work (at least a few words).";
  if (badUrls.length) e.urls = `Not a valid link: ${badUrls[0].slice(0, 80)}`;
  else if (!urls.length) e.urls = "Add at least one link from our site that you want removed.";
  if (originalRaw && !safeUrl(originalRaw)) e.originalUrl = "Enter a full link starting with https://";
  if (fd.get("goodFaith") !== "on") e.goodFaith = "Please confirm this statement.";
  if (fd.get("accuracy") !== "on") e.accuracy = "Please confirm this statement.";
  if (signature.length < 2) e.signature = "Type your full name as your electronic signature.";

  if (Object.keys(e).length) {
    return { error: "Please fix the highlighted fields.", fieldErrors: e, values };
  }

  const { ref } = await createDmcaReport({
    name, email, phone, organization, role, work, urls,
    originalUrl: safeUrl(originalRaw), details, signature,
    ip, userAgent: (h.get("user-agent") ?? "").slice(0, 300),
  });
  revalidatePath("/admin", "layout");
  return { ok: true, ref, email };
}
