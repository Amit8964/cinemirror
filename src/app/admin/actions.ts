"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkCredentials, endAdminSession, requireAdmin, startAdminSession } from "@/lib/auth";
import { createPartner, deletePartner, rotatePartnerKey, updatePartner } from "@/lib/partners";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createTitle, deleteTitle, updateTitle, type TitleInput } from "@/lib/titles";
import type { Subtitle } from "@/lib/types";
import { detectSourceType, normalizeDomain, safeUrl, slugify, youtubeId } from "@/lib/util";

export interface FormState {
  error?: string;
  values?: Record<string, string>;
}

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const values = (fd: FormData) => {
  const out: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$")) out[k] = v;
  });
  return out;
};

// ---- session ------------------------------------------------------------------

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const ip = clientIp(await headers());
  if (!rateLimit(`login:${ip}`, 8, 10 * 60_000)) {
    return { error: "Too many attempts. Wait a few minutes and try again." };
  }
  const email = str(fd, "email");
  if (!checkCredentials(email, String(fd.get("password") ?? ""))) {
    return { error: "Wrong email or password.", values: { email } };
  }
  await startAdminSession(email);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await endAdminSession();
  redirect("/admin/login");
}

// ---- titles -------------------------------------------------------------------

function parseSubtitles(raw: string): { list: Subtitle[]; bad: string | null } {
  const list: Subtitle[] = [];
  for (const line of raw.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const parts = line.split("|").map((p) => p.trim());
    const url = safeUrl(parts[2]);
    if (parts.length !== 3 || !parts[0] || !url) return { list, bad: line };
    list.push({ label: parts[0].slice(0, 40), lang: (parts[1] || "en").slice(0, 10), url });
  }
  return { list, bad: null };
}

export async function saveTitleAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const fail = (error: string): FormState => ({ error, values: values(fd) });

  const id = str(fd, "id");
  const title = str(fd, "title");
  if (!title) return fail("Title is required.");

  let sourceUrl = safeUrl(str(fd, "sourceUrl"));
  if (!sourceUrl) return fail("Video source must be an http(s) URL or a path starting with “/”.");

  const posterRaw = str(fd, "posterUrl");
  const backdropRaw = str(fd, "backdropUrl");
  if (posterRaw && !safeUrl(posterRaw)) return fail("Poster must be an http(s) URL or a path starting with “/”.");
  if (backdropRaw && !safeUrl(backdropRaw)) return fail("Backdrop must be an http(s) URL or a path starting with “/”.");

  const subs = parseSubtitles(String(fd.get("subtitles") ?? ""));
  if (subs.bad) return fail(`Subtitle line not understood: “${subs.bad}”. Use: Label | lang | URL`);

  const year = Number(str(fd, "year"));
  const duration = Number(str(fd, "durationMin"));
  const typeField = str(fd, "sourceType");
  const sourceType =
    typeField === "hls" || typeField === "mp4" || typeField === "youtube" ? typeField : detectSourceType(sourceUrl);
  if (sourceType === "youtube") {
    const yt = youtubeId(sourceUrl);
    if (!yt) return fail("That doesn't look like a YouTube video link.");
    sourceUrl = `https://www.youtube.com/watch?v=${yt}`;
  }

  const input: TitleInput = {
    slug: slugify(str(fd, "slug") || title),
    title: title.slice(0, 200),
    description: str(fd, "description").slice(0, 4000),
    year: Number.isInteger(year) && year > 1870 && year < 2200 ? year : null,
    durationMin: Number.isInteger(duration) && duration > 0 && duration < 2000 ? duration : null,
    genres: [...new Set(str(fd, "genres").split(",").map((g) => g.trim().slice(0, 30)).filter(Boolean))].slice(0, 8),
    rating: str(fd, "rating").slice(0, 12),
    language: str(fd, "language").slice(0, 40),
    posterUrl: safeUrl(posterRaw),
    backdropUrl: safeUrl(backdropRaw),
    sourceUrl,
    sourceType,
    subtitles: subs.list,
    credit: str(fd, "credit").slice(0, 300),
    featured: fd.get("featured") === "on",
    published: fd.get("published") === "on",
    embeddable: fd.get("embeddable") === "on",
  };

  if (id) await updateTitle(id, input);
  else await createTitle(input);

  revalidatePath("/", "layout");
  redirect("/admin/titles");
}

export async function deleteTitleAction(fd: FormData): Promise<void> {
  await requireAdmin();
  await deleteTitle(str(fd, "id"));
  revalidatePath("/", "layout");
  redirect("/admin/titles");
}

// ---- partners -----------------------------------------------------------------

export async function savePartnerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const fail = (error: string): FormState => ({ error, values: values(fd) });

  const id = str(fd, "id");
  const name = str(fd, "name");
  if (!name) return fail("Partner name is required.");

  const domains: string[] = [];
  for (const raw of String(fd.get("allowedDomains") ?? "").split(/[\n,]/).map((d) => d.trim()).filter(Boolean)) {
    const d = normalizeDomain(raw);
    if (!d) return fail(`“${raw}” is not a valid domain. Use a bare host such as example.com.`);
    if (!domains.includes(d)) domains.push(d);
  }

  const input = {
    name: name.slice(0, 120),
    contactEmail: str(fd, "contactEmail").slice(0, 200),
    allowedDomains: domains.slice(0, 30),
    active: fd.get("active") === "on",
    notes: str(fd, "notes").slice(0, 2000),
  };

  let target = id;
  if (id) await updatePartner(id, input);
  else target = await createPartner(input);

  revalidatePath("/admin", "layout");
  redirect(`/admin/partners/${target}`);
}

export async function rotateKeyAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  await rotatePartnerKey(id);
  revalidatePath("/admin", "layout");
  redirect(`/admin/partners/${id}`);
}

export async function deletePartnerAction(fd: FormData): Promise<void> {
  await requireAdmin();
  await deletePartner(str(fd, "id"));
  revalidatePath("/admin", "layout");
  redirect("/admin/partners");
}
