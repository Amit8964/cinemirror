"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkCredentials, endAdminSession, requireAdmin, startAdminSession } from "@/lib/auth";
import { createPartner, deletePartner, rotatePartnerKey, updatePartner } from "@/lib/partners";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { runBulkImport, saveImport } from "@/lib/bulk-import";
import { importFromLink } from "@/lib/importer";
import { normalizeAdUrl, normalizePlayerUrl, rotateFirstPartyKey } from "@/lib/hosted-player";
import { isValidStreamPattern, isValidTvStreamPattern } from "@/lib/stream";
import { testEmbedPattern } from "@/lib/embed-test";
import {
  createServerRow, deleteServerRow, getServerRow, listServerRows, moveServerRow, newServerId, setServerEnabled,
  updateServerRow, validateServerInput, type ReferrerPolicy, type ServerInput,
} from "@/lib/local-servers";
import { setSetting } from "@/lib/settings";
import { createTitle, deleteTitle, updateTitle, type TitleInput } from "@/lib/titles";
import type { AudioVersion, Subtitle } from "@/lib/types";
import { detectSourceType, normalizeDomain, safeUrl, slugify, youtubeId } from "@/lib/util";

export interface FormState {
  error?: string;
  values?: Record<string, string>;
  /** Lines of feedback that are not an error (e.g. the result of "Test URL"). */
  info?: string[];
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

/** One version per line: "Hindi 1080p | hi | https://cdn.example.com/film/hi-1080.m3u8" (type from the URL). */
function parseVersions(raw: string): { list: AudioVersion[]; bad: string | null } {
  const list: AudioVersion[] = [];
  for (const line of raw.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const parts = line.split("|").map((p) => p.trim());
    const src = safeUrl(parts[2]);
    if (parts.length !== 3 || !parts[0] || !src) return { list, bad: line };
    const type = detectSourceType(src);
    if (type !== "hls" && type !== "mp4") return { list, bad: line };
    list.push({ label: parts[0].slice(0, 40), lang: (parts[1] || "en").slice(0, 10).toLowerCase(), src, type });
  }
  return { list: list.slice(0, 24), bad: null };
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
  const vers = parseVersions(String(fd.get("versions") ?? ""));
  if (vers.bad) return fail(`Language version not understood: “${vers.bad}”. Use: Label | lang | URL (an .m3u8 or .mp4 link)`);

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
    versions: vers.list,
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

/**
 * One-click import: link → streams + TMDB match → saved title with poster. Published straight away only
 * when the source confirms a public-domain / free licence (or it is a trailer); otherwise saved as a hidden
 * draft for the admin to review and publish.
 */
export async function quickImportAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const link = str(fd, "link");
  const back = (error: string): never =>
    redirect(`/admin/titles/new?${new URLSearchParams({ link, error: error.slice(0, 200) })}`);

  if (!link) back("Paste a link first.");
  const r = await importFromLink(link, { stream: str(fd, "stream"), tmdb: str(fd, "tmdb") });
  const out = await saveImport(r, { allowTrailer: true });
  if (!out.ok) back(out.reason);

  revalidatePath("/", "layout");
  redirect(`/admin/titles?${out.ok && out.published ? "imported=published" : "imported=draft"}`);
}

/**
 * Bulk import. A collection / category on archive.org or Wikimedia Commons imports every film in it (20 per batch);
 * any other page imports every distinct video on that one page as hidden drafts to review. Never crawls a whole site.
 */
export async function bulkImportAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const link = str(fd, "link");
  const batch = Number.parseInt(str(fd, "batch"), 10) || 1;
  const back = (error: string): never =>
    redirect(`/admin/titles/new?${new URLSearchParams({ error: error.slice(0, 200), blink: link })}`);

  if (!link) back("Paste a link first.");
  const sum = await runBulkImport(link, batch);
  if (sum.error) back(sum.error);

  revalidatePath("/", "layout");
  const q = new URLSearchParams({
    bulk: `${sum.published}-${sum.drafts}-${sum.skipped}`,
    ...(sum.more ? { next: String(batch + 1), nlink: link } : {}),
    ...(sum.reasons.length ? { why: sum.reasons.join(" • ").slice(0, 400) } : {}),
  });
  redirect(`/admin/titles?${q}`);
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

// ---- player -------------------------------------------------------------------------

export async function savePlayerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const mode = str(fd, "mode");
  if (mode !== "builtin" && mode !== "hosted" && mode !== "custom") return { error: "Choose a player.", values: values(fd) };

  const hostedRaw = str(fd, "url");
  const hosted = hostedRaw ? normalizePlayerUrl(hostedRaw) : "";
  if (hostedRaw && !hosted) return { error: "Hosted player URL must be a valid https:// address.", values: values(fd) };
  if (mode === "hosted" && !hosted) return { error: "Enter the URL where your player is hosted.", values: values(fd) };

  const movie = str(fd, "customMovie");
  const tv = str(fd, "customTv");
  if (movie && !isValidStreamPattern(movie)) return { error: "Movie pattern must be an https:// URL containing {id}.", values: values(fd) };
  if (tv && !isValidTvStreamPattern(tv)) return { error: "Series pattern must be an https:// URL containing {id}, {season} and {episode}.", values: values(fd) };
  if (mode === "custom" && !movie && !tv) return { error: "Enter at least a movie or a series pattern.", values: values(fd) };

  const adRaw = str(fd, "adUrl");
  const adUrl = adRaw ? normalizeAdUrl(adRaw) : "";
  if (adRaw && !adUrl) return { error: "Ad page URL must be a valid https:// address.", values: values(fd) };
  const skip = Math.min(30, Math.max(0, Math.floor(Number(str(fd, "adSkip"))) || 0));

  await setSetting("player_mode", mode);
  await setSetting("player_url", hosted ?? "");
  await setSetting("custom_movie_url", movie);
  await setSetting("custom_tv_url", tv);
  await setSetting("ad_url", adUrl ?? "");
  await setSetting("ad_skip", adUrl && skip ? String(skip) : "");
  revalidatePath("/", "layout");
  return { values: { ...values(fd), saved: "1" } };
}

export async function rotateFirstPartyKeyAction(): Promise<void> {
  await requireAdmin();
  await rotateFirstPartyKey();
  revalidatePath("/admin/player");
}

// ---- embed servers (Admin -> Servers) ---------------------------------------------

function serverInput(fd: FormData): ServerInput {
  return {
    label: str(fd, "label").slice(0, 40),
    movie: str(fd, "movie"),
    tv: str(fd, "tv"),
    sandbox: fd.get("sandbox") === "on",
    referrer: (str(fd, "referrer") || "origin") as ReferrerPolicy,
    enabled: fd.get("enabled") === "on",
  };
}

export async function saveServerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const fail = (error: string): FormState => ({ error, values: values(fd) });
  const editing = str(fd, "id");
  const input = serverInput(fd);
  const problem = validateServerInput(input);
  if (problem) return fail(problem);

  if (editing) {
    if (!(await getServerRow(editing))) return fail("That server no longer exists.");
    await updateServerRow(editing, input);
  } else {
    const taken = new Set((await listServerRows()).map((r) => r.id));
    const base = slugify(input.label).slice(0, 20).replace(/-+$/, "");
    let id = base && base !== "default" ? base : newServerId();
    for (let n = 2; taken.has(id); n++) id = `${base || "server"}-${n}`;
    await createServerRow(id, input);
  }
  revalidatePath("/", "layout");
  redirect("/admin/servers");
}

/** "Test URL": fetches the pattern(s) with a popular title and reports whether it can work as an embed. */
export async function testServerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const ip = clientIp(await headers());
  if (!rateLimit(`srvtest:${ip}`, 20, 60_000)) return { error: "Too many tests. Wait a minute.", values: values(fd) };
  const { movie, tv } = serverInput(fd);
  if (!movie && !tv) return { error: "Type a movie or series URL first.", values: values(fd) };

  const info: string[] = [];
  let blocked = false;
  for (const [kind, pattern] of [["movie", movie], ["tv", tv]] as const) {
    if (!pattern) continue;
    const r = await testEmbedPattern(pattern, kind);
    info.push(`${kind === "movie" ? "Movie" : "Series"} test → ${r.url}`);
    if (r.embeddable !== null) info.push(`   Framing: ${r.framing}`);
    for (const n of r.notes) info.push(`   ${n}`);
    if (r.embeddable === false || (r.status != null && r.status >= 400 && r.status !== 403 && r.status !== 401)) blocked = true;
  }
  info.push(blocked ? "✗ This URL looks unusable (see above)." : "✓ Nothing found that stops it from working. Save it, then try it on a movie page.");
  return { values: values(fd), info };
}

export async function deleteServerAction(fd: FormData): Promise<void> {
  await requireAdmin();
  await deleteServerRow(str(fd, "id"));
  revalidatePath("/", "layout");
}

export async function toggleServerAction(fd: FormData): Promise<void> {
  await requireAdmin();
  await setServerEnabled(str(fd, "id"), str(fd, "enable") === "1");
  revalidatePath("/", "layout");
}

export async function moveServerAction(fd: FormData): Promise<void> {
  await requireAdmin();
  await moveServerRow(str(fd, "id"), str(fd, "dir") === "up" ? -1 : 1);
  revalidatePath("/", "layout");
}
