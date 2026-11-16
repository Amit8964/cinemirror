import { importFromLink, importResolved, type ImportResult } from "./importer";
import { archiveId, getJson, resolveLink, guessTitle, type FoundStream, type Resolved } from "./resolve";
import { commonsFileUrl } from "./public-streams";
import { createTitle, findDuplicate } from "./titles";
import { safeUrl, slugify } from "./util";

// Bulk import. Two modes:
//  1. A collection / category on a free-media site (archive.org collection, Wikimedia Commons category):
//     every film in it is imported on its own, in batches. Published only when the source confirms a free licence.
//  2. Any other page: every distinct video found on that ONE page becomes its own hidden draft for review.
// It never follows links to crawl a whole site.

export const BATCH = 20;

export type SaveOutcome =
  | { ok: true; title: string; published: boolean }
  | { ok: false; title: string; reason: string };

/** Save an import result as a title. Published only if the source confirms a free licence (or it's a trailer) and `forceDraft` is off. */
export async function saveImport(r: ImportResult, opts: { forceDraft?: boolean; allowTrailer?: boolean } = {}): Promise<SaveOutcome> {
  const p = r.prefill;
  const name = (p.title ?? "").trim();
  const picked = r.chosen >= 0 ? r.options[r.chosen] : null;
  const label = name || r.resolved.input;

  if (!picked || !p.sourceUrl) return { ok: false, title: label, reason: r.resolved.error ?? "No playable stream found." };
  if (picked.trailer && !opts.allowTrailer) return { ok: false, title: label, reason: "No full stream (trailer only)." };
  if (!name) return { ok: false, title: label, reason: "Couldn't work out a title." };

  const dup = await findDuplicate(name, p.year ?? null, p.sourceUrl);
  if (dup) return { ok: false, title: label, reason: `Already in the library (“${dup.title}”).` };

  const published = !opts.forceDraft && (r.resolved.licenseOk === true || picked.trailer === true);
  await createTitle({
    slug: slugify(p.slug || name),
    title: name.slice(0, 200),
    description: (p.description ?? "").slice(0, 4000),
    year: p.year ?? null,
    durationMin: p.durationMin ?? null,
    genres: p.genres ?? [],
    rating: p.rating ?? "",
    language: p.language ?? "",
    posterUrl: safeUrl(p.posterUrl ?? ""),
    backdropUrl: safeUrl(p.backdropUrl ?? ""),
    sourceUrl: p.sourceUrl,
    sourceType: p.sourceType ?? "mp4",
    subtitles: [],
    versions: [],
    credit: (p.credit ?? "").slice(0, 300),
    featured: false,
    published,
    embeddable: false,
  });
  return { ok: true, title: name, published };
}

/* ───────────────────────────── collections & categories ───────────────────────────── */

interface BulkList {
  kind: "archive" | "commons" | "youtube";
  urls: string[];
  more: boolean;
}

const VIDEO_FILE = /\.(webm|mp4|m4v|ogv|mov|mpe?g)$/i;

/** Item page URLs of an archive.org collection or a Commons category, or null if the link is neither. */
async function listBulkItems(url: URL, batch: number): Promise<BulkList | null> {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  // YouTube playlist (?list=…) or channel (/channel/UC…): the public RSS feed lists its latest 15 videos, no API key needed.
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const list = url.searchParams.get("list") ?? "";
    const channel = url.pathname.match(/^\/channel\/(UC[\w-]{22})/)?.[1] ?? "";
    const feed = /^[\w-]{10,64}$/.test(list)
      ? `https://www.youtube.com/feeds/videos.xml?playlist_id=${list}`
      : channel
        ? `https://www.youtube.com/feeds/videos.xml?channel_id=${channel}`
        : "";
    if (!feed) return null;
    const res = await fetch(feed, { headers: { "user-agent": "CineMirror/1.0 (playlist import)" }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error("!YouTube didn't return that playlist or channel (is it public?).");
    const ids = [...new Set([...(await res.text()).matchAll(/<yt:videoId>([\w-]{11})<\/yt:videoId>/g)].map((m) => m[1]))];
    return { kind: "youtube", urls: ids.map((v) => `https://www.youtube.com/watch?v=${v}`), more: false };
  }

  if (host === "archive.org") {
    const id = archiveId(url);
    if (!id) return null;
    const kind = ((await getJson(`https://archive.org/metadata/${id}/metadata/mediatype`)).result ?? "") as string;
    if (kind !== "collection") return null;
    const api = new URL("https://archive.org/advancedsearch.php");
    api.searchParams.set("q", `collection:${id} AND mediatype:movies`);
    api.searchParams.append("fl[]", "identifier");
    api.searchParams.append("sort[]", "downloads desc");
    api.searchParams.set("rows", String(BATCH));
    api.searchParams.set("page", String(batch));
    api.searchParams.set("output", "json");
    const resp = (await getJson(api.toString())).response as { numFound?: number; docs?: { identifier?: string }[] } | undefined;
    const urls = (resp?.docs ?? []).map((d) => String(d.identifier ?? "")).filter((s) => /^[\w.-]+$/.test(s)).map((s) => `https://archive.org/details/${s}`);
    return { kind: "archive", urls, more: (resp?.numFound ?? 0) > batch * BATCH };
  }

  if (host === "commons.wikimedia.org" || host === "commons.m.wikimedia.org") {
    const cat = decodeURIComponent(url.pathname.match(/^\/wiki\/(Category:.+)$/)?.[1] ?? url.searchParams.get("title") ?? "").replace(/_/g, " ");
    if (!/^Category:/i.test(cat)) return null;
    const api = new URL("https://commons.wikimedia.org/w/api.php");
    for (const [k, v] of Object.entries({ action: "query", format: "json", formatversion: "2", list: "categorymembers", cmtitle: cat, cmtype: "file", cmlimit: "500" })) {
      api.searchParams.set(k, v);
    }
    const members = ((await getJson(api.toString())).query as { categorymembers?: { title?: string }[] } | undefined)?.categorymembers ?? [];
    const files = members.map((m) => String(m.title ?? "")).filter((t) => VIDEO_FILE.test(t));
    return {
      kind: "commons",
      urls: files.slice((batch - 1) * BATCH, batch * BATCH).map(commonsFileUrl),
      more: files.length > batch * BATCH,
    };
  }
  return null;
}

/* ───────────────────────────── one page, many videos ───────────────────────────── */

const GENERIC_NAME = /^(video|videos|index|master|playlist|stream|movie|film|media|main|file|clip|source|player|manifest|output|\d+)$/i;

/** Same file at different qualities → same key, so quality variants aren't imported as separate films. */
function variantKey(url: string): string {
  const file = (() => {
    try {
      return new URL(url).pathname.split("/").pop() ?? url;
    } catch {
      return url;
    }
  })();
  return file.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/\b(2160|1440|1080|720|480|360|240)p?\b|\b(hd|sd|low|medium|high)\b/g, "").replace(/[^a-z0-9]+/g, "");
}

function pageItems(r: Resolved): Resolved[] {
  const seen = new Set<string>();
  const distinct: FoundStream[] = [];
  for (const s of r.streams) {
    const key = s.type === "youtube" ? s.url : variantKey(s.url);
    if (seen.has(key)) continue;
    seen.add(key);
    distinct.push(s);
  }
  return distinct.map((s, i) => {
    const file = s.type === "youtube" ? "" : (() => {
      try {
        return new URL(s.url).pathname.split("/").pop() ?? "";
      } catch {
        return "";
      }
    })();
    const g = guessTitle(file);
    const meaningful = g.title.length >= 3 && !GENERIC_NAME.test(g.title);
    const base = r.titleGuess || "Video";
    return {
      ...r,
      streams: [s],
      titleGuess: meaningful ? g.title : distinct.length > 1 ? `${base} ${i + 1}` : base,
      yearGuess: meaningful ? (g.year ?? r.yearGuess) : r.yearGuess,
      licenseOk: null,
    };
  });
}

/* ───────────────────────────── runner ───────────────────────────── */

export interface BulkSummary {
  published: number;
  drafts: number;
  skipped: number;
  more: boolean;
  /** Short reasons for skipped items (first few). */
  reasons: string[];
  error?: string;
}

async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

const SINGLE_SOURCES = new Set(["Internet Archive", "Wikimedia Commons", "YouTube"]);

export async function runBulkImport(link: string, batchRaw: number): Promise<BulkSummary> {
  const sum: BulkSummary = { published: 0, drafts: 0, skipped: 0, more: false, reasons: [] };
  const tally = (o: SaveOutcome) => {
    if (o.ok) o.published ? sum.published++ : sum.drafts++;
    else {
      sum.skipped++;
      if (sum.reasons.length < 5) sum.reasons.push(`${o.title}: ${o.reason}`);
    }
  };
  const batch = Math.min(Math.max(1, Math.floor(batchRaw) || 1), 50);

  let url: URL;
  try {
    url = new URL(link);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
  } catch {
    return { ...sum, error: "That isn't a valid link. Paste a full URL starting with https://" };
  }

  try {
    // Mode 1: a collection / category → every item on its own.
    const list = await listBulkItems(url, batch);
    if (list) {
      if (!list.urls.length) return { ...sum, error: "Nothing to import in that collection (or this batch number is past the end)." };
      sum.more = list.more;
      const results = await pool(list.urls, 4, (u) => importFromLink(u).catch(() => null));
      for (const r of results) {
        if (!r) tally({ ok: false, title: "(item)", reason: "Couldn't read it." });
        else tally(await saveImport(r)); // sequential: slug uniqueness
      }
      return sum;
    }

    // Mode 2: a single page.
    const resolved = await resolveLink(link);
    if (!resolved.streams.length) return { ...sum, error: resolved.error ?? "No video stream was found on that page." };

    if (SINGLE_SOURCES.has(resolved.sourceName)) {
      tally(await saveImport(await importResolved(resolved), { allowTrailer: true }));
      return sum;
    }

    const items = pageItems(resolved);
    const results = await pool(items, 4, (r) => importResolved(r).catch(() => null));
    for (const r of results) {
      if (!r) tally({ ok: false, title: "(video)", reason: "Couldn't process it." });
      else tally(await saveImport(r, { forceDraft: true })); // other sites: always a draft to review
    }
    return sum;
  } catch (err) {
    return { ...sum, error: err instanceof Error && err.message.startsWith("!") ? err.message.slice(1) : "Couldn't read that link." };
  }
}
