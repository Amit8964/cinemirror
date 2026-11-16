import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { SourceType } from "./types";
import { detectSourceType, youtubeId } from "./util";

// Turns a pasted link (archive.org item, Wikimedia Commons file, YouTube video,
// a direct .m3u8/.mp4, or any web page with a video on it) into playable streams
// plus whatever title / year / licence information the source publishes.

export interface FoundStream {
  url: string;
  type: SourceType;
  label: string;
  /** Height in pixels when the source tells us, for sorting. */
  height?: number;
}

export interface Resolved {
  input: string;
  sourceName: string;
  pageUrl: string;
  streams: FoundStream[];
  titleGuess: string;
  yearGuess: number | null;
  description: string;
  imageUrl: string;
  /** Human-readable licence, e.g. "Public Domain Mark 1.0" or a licence URL. */
  license: string;
  /** true = the source marks it public domain / free licence; null = unknown. */
  licenseOk: boolean | null;
  error?: string;
}

/**
 * A Provider knows how to turn one kind of link into streams + metadata.
 * To support a new source, write one and add it to PROVIDERS (or call registerProvider) —
 * resolveLink, the importer, TMDB matching and the admin UI need no changes.
 * Providers must fetch through getJson / getPage so private-network addresses stay blocked.
 */
export interface StreamProvider {
  name: string;
  /** Cheap, synchronous check: does this provider handle this URL? */
  matches(url: URL): boolean;
  resolve(input: string, url: URL): Promise<Resolved>;
}

const hostOf = (u: URL) => u.hostname.toLowerCase().replace(/^www\./, "");

const youtubeProvider: StreamProvider = {
  name: "YouTube",
  matches: (u) => !!youtubeId(u.toString()),
  resolve: (input) => fromYouTube(input),
};

const archiveProvider: StreamProvider = {
  name: "Internet Archive",
  matches: (u) => (hostOf(u) === "archive.org" || hostOf(u).endsWith(".archive.org")) && !!archiveId(u),
  resolve: (input, u) => fromArchive(input, archiveId(u)),
};

const commonsProvider: StreamProvider = {
  name: "Wikimedia Commons",
  matches: (u) => /(^|\.)commons\.(m\.)?wikimedia\.org$/.test(hostOf(u)) && !!commonsFile(u),
  resolve: (input, u) => fromCommons(input, commonsFile(u)),
};

const directFileProvider: StreamProvider = {
  name: "Direct file",
  matches: (u) => PLAYABLE.test(u.pathname),
  resolve: async (input, u) => fromDirect(input, u),
};

/**
 * Sample "generic video container" provider: reads a public web page's DOM/meta data for
 * <video>/<source> tags, og:video, JSON-LD contentUrl, and .m3u8/.mp4 links, and licence info.
 */
const genericPageProvider: StreamProvider = {
  name: "Generic page",
  matches: () => true,
  resolve: (input, u) => fromPage(input, u),
};

/** Order matters: specific providers first. The generic page provider is the fallback in resolveLink. */
const PROVIDERS: StreamProvider[] = [youtubeProvider, archiveProvider, commonsProvider, directFileProvider];

export function registerProvider(p: StreamProvider): void {
  PROVIDERS.unshift(p);
}

const UA = "CineMirror/1.0 (media link importer)";
const PLAYABLE = /\.(m3u8|mp4|m4v|webm|mov)(\?|#|$)/i;

function blank(input: string, sourceName: string): Resolved {
  return {
    input, sourceName, pageUrl: input, streams: [], titleGuess: "", yearGuess: null,
    description: "", imageUrl: "", license: "", licenseOk: null,
  };
}

export async function resolveLink(raw: string): Promise<Resolved> {
  const input = raw.trim();
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ...blank(input, "Link"), error: "That isn't a valid link. Paste a full URL starting with https://" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ...blank(input, "Link"), error: "Only http(s) links are supported." };
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  try {
    // First provider that claims the URL wins; the generic page provider is the catch-all.
    const provider = PROVIDERS.find((p) => p.matches(url)) ?? genericPageProvider;
    return await provider.resolve(input, url);
  } catch (err) {
    const msg = err instanceof Error && err.message.startsWith("!") ? err.message.slice(1) : "Couldn't read that link (the site didn't respond or blocked the request).";
    return { ...blank(input, host || "Link"), error: msg };
  }
}

/* ───────────────────────────── title cleanup ───────────────────────────── */

const JUNK =
  /\b(2160p|1080p|720p|480p|360p|4k|uhd|hd|sd|full\s+movie|full\s+film|public\s+domain|restored|remastered|colori[sz]ed|x26[45]|h\.?26[45]|hevc|web-?dl|web-?rip|blu-?ray|brrip|dvd-?rip|hdrip|aac|mp4|official|trailer|teaser|free\s+download|watch\s+online)\b/gi;

/** "Nosferatu_(1922)_1080p.mp4" -> { title: "Nosferatu", year: 1922 } */
export function guessTitle(raw: string): { title: string; year: number | null } {
  let s = raw;
  try {
    s = decodeURIComponent(s);
  } catch {}
  s = s
    .replace(/^File:/i, "")
    .replace(/\.(mp4|m4v|m3u8|webm|ogv|ogg|mov|mkv|avi|mpe?g)$/i, "")
    .replace(/\s*[|–—-]\s*(Wikimedia Commons|Internet Archive|YouTube|Free Download.*|Borrow.*|Streaming.*)$/i, "")
    .replace(/[_.]+/g, " ");
  let year: number | null = null;
  const paren = s.match(/[([]\s*(18[89]\d|19\d\d|20[0-4]\d)\s*[)\]]/);
  const trailing = s.match(/\s(18[89]\d|19\d\d|20[0-4]\d)\s*$/);
  const hit = paren ?? trailing;
  if (hit) {
    year = Number(hit[1]);
    s = s.replace(hit[0], " ");
  }
  s = s.replace(JUNK, " ").replace(/[()[\]{}]/g, " ").replace(/\s+/g, " ").replace(/^[\s:–—-]+|[\s:–—-]+$/g, "").trim();
  return { title: s.slice(0, 150), year };
}

const stripHtml = (s: string) =>
  s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\n{3,}/g, "\n\n").trim();

const firstStr = (v: unknown): string => (Array.isArray(v) ? firstStr(v[0]) : typeof v === "string" ? v : "");

function yearFrom(v: string): number | null {
  const m = v.match(/\b(18[89]\d|19\d\d|20[0-4]\d)\b/);
  return m ? Number(m[1]) : null;
}

/* ───────────────────────────── fetching ───────────────────────────── */

export async function getJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/json" },
    next: { revalidate: 600 },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`!The source answered with an error (${res.status}).`);
  return (await res.json()) as Record<string, unknown>;
}

function privateIp(ip: string): boolean {
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
}

/** Refuse to fetch anything on this server's own network. */
async function assertPublic(url: URL): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) throw new Error("!That address is not allowed.");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => privateIp(a.address))) throw new Error("!That address is not allowed.");
}

/** Fetch a public web page's HTML (max 2 MB), following up to 4 redirects with the same checks. */
async function getPage(start: URL): Promise<{ html: string; url: URL }> {
  let url = start;
  for (let hop = 0; hop < 5; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url);
      continue;
    }
    if (!res.ok) throw new Error(`!The page answered with an error (${res.status}).`);
    const type = res.headers.get("content-type") ?? "";
    if (type.startsWith("video/") || type.includes("mpegurl")) {
      res.body?.cancel().catch(() => {});
      return { html: "", url };
    }
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
      if (size > 2_000_000) {
        reader.cancel().catch(() => {});
        break;
      }
    }
    return { html: Buffer.concat(chunks).toString("utf8"), url };
  }
  throw new Error("!Too many redirects.");
}

/* ───────────────────────────── direct file ───────────────────────────── */

function fromDirect(input: string, url: URL): Resolved {
  const name = url.pathname.split("/").pop() ?? "";
  const g = guessTitle(name);
  const type = detectSourceType(input);
  return {
    ...blank(input, url.hostname),
    streams: [{ url: input, type, label: type === "hls" ? "HLS stream" : "Video file" }],
    titleGuess: g.title,
    yearGuess: g.year,
  };
}

/* ───────────────────────────── YouTube ───────────────────────────── */

async function fromYouTube(input: string): Promise<Resolved> {
  const id = youtubeId(input);
  const watch = `https://www.youtube.com/watch?v=${id}`;
  const out: Resolved = {
    ...blank(input, "YouTube"),
    pageUrl: watch,
    streams: [{ url: watch, type: "youtube", label: "YouTube video (embedded player)" }],
    imageUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    license: "Embedded with YouTube's player",
  };
  try {
    const o = await getJson(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`);
    const g = guessTitle(String(o.title ?? ""));
    out.titleGuess = g.title;
    out.yearGuess = g.year;
  } catch {}
  return out;
}

/* ───────────────────────────── Internet Archive ───────────────────────────── */

export function archiveId(url: URL): string {
  const m = url.pathname.match(/^\/(?:details|download|embed|stream)\/([^/?#]+)/);
  return m && /^[\w.-]+$/.test(m[1]) ? m[1] : "";
}

async function fromArchive(input: string, id: string): Promise<Resolved> {
  const data = await getJson(`https://archive.org/metadata/${id}`);
  const meta = (data.metadata ?? {}) as Record<string, unknown>;
  if (!data.metadata) throw new Error("!archive.org has no item with that id.");
  const files = Array.isArray(data.files) ? (data.files as Record<string, unknown>[]) : [];

  const streams: FoundStream[] = [];
  for (const f of files) {
    const name = String(f.name ?? "");
    if (!PLAYABLE.test(name) || /\.(mov)$/i.test(name)) continue;
    const height = Number(f.height) || undefined;
    const sizeMb = Number(f.size) ? Math.round(Number(f.size) / 1e6) : 0;
    const fileUrl = `https://archive.org/download/${id}/${name.split("/").map(encodeURIComponent).join("/")}`;
    const parts = [String(f.format ?? "") || name.split(".").pop()?.toUpperCase(), height ? `${height}p` : "", sizeMb ? `${sizeMb} MB` : ""];
    streams.push({ url: fileUrl, type: detectSourceType(name) === "hls" ? "hls" : "mp4", label: `${name} — ${parts.filter(Boolean).join(" · ")}`, height });
  }
  // Best first: HLS, then tallest, then the "original" over derivatives.
  streams.sort((a, b) => (a.type === "hls" ? -1 : 0) - (b.type === "hls" ? -1 : 0) || (b.height ?? 0) - (a.height ?? 0));

  const title = firstStr(meta.title);
  const g = guessTitle(title || id);
  const licenseUrl = firstStr(meta.licenseurl);
  const rights = [firstStr(meta["possible-copyright-status"]), firstStr(meta.rights), licenseUrl].join(" ");
  const collections = (Array.isArray(meta.collection) ? meta.collection : [meta.collection]).map(String);
  const pd = /publicdomain|public domain|not_in_copyright|no known copyright/i.test(rights);
  const cc = /creativecommons/i.test(licenseUrl);

  return {
    input,
    sourceName: "Internet Archive",
    pageUrl: `https://archive.org/details/${id}`,
    streams,
    titleGuess: g.title,
    yearGuess: yearFrom(firstStr(meta.year)) ?? g.year ?? yearFrom(firstStr(meta.date)),
    description: stripHtml(firstStr(meta.description)).slice(0, 4000),
    imageUrl: `https://archive.org/services/img/${id}`,
    license: licenseUrl ? licenseName(licenseUrl) : pd ? "Public domain" : collections.includes("feature_films") ? "Archive.org Feature Films collection (licence not stated)" : "",
    licenseOk: pd || cc ? true : null,
    error: streams.length ? undefined : files.length ? "This item has no browser-playable video (only formats like AVI/MPEG/OGV)." : undefined,
  };
}

function licenseName(u: string): string {
  if (/publicdomain\/mark/i.test(u)) return "Public Domain Mark 1.0";
  if (/publicdomain\/zero/i.test(u)) return "CC0 (public domain)";
  const m = u.match(/licenses\/([a-z-]+)\/([\d.]+)/i);
  return m ? `CC ${m[1].toUpperCase()} ${m[2]}` : u;
}

/* ───────────────────────────── Wikimedia Commons ───────────────────────────── */

function commonsFile(url: URL): string {
  const fromPath = url.pathname.match(/^\/wiki\/(File:.+)$/)?.[1];
  const fromQuery = url.searchParams.get("title");
  const name = fromPath ?? (fromQuery?.startsWith("File:") ? fromQuery : "");
  try {
    return name ? decodeURIComponent(name).replace(/_/g, " ") : "";
  } catch {
    return "";
  }
}

async function fromCommons(input: string, file: string): Promise<Resolved> {
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  for (const [k, v] of Object.entries({
    action: "query", format: "json", formatversion: "2", titles: file, prop: "videoinfo",
    viprop: "url|derivatives|extmetadata", viurlwidth: "1280",
  })) api.searchParams.set(k, v);
  const data = await getJson(api.toString());
  const page = ((data.query as Record<string, unknown> | undefined)?.pages as Record<string, unknown>[] | undefined)?.[0];
  const info = (page?.videoinfo as Record<string, unknown>[] | undefined)?.[0];
  if (!page || page.missing || !info) throw new Error("!Wikimedia Commons has no file with that name.");

  const ext = (info.extmetadata ?? {}) as Record<string, { value?: string }>;
  const mv = (k: string) => stripHtml(String(ext[k]?.value ?? ""));
  const streams: FoundStream[] = [];
  const derivs = Array.isArray(info.derivatives) ? (info.derivatives as Record<string, unknown>[]) : [];
  for (const d of derivs) {
    const src = String(d.src ?? "");
    const type = String(d.type ?? "");
    if (!src) continue;
    const isHls = type.includes("mpegurl");
    if (!isHls && !/webm|mp4/.test(type)) continue; // Ogg Theora doesn't play in most browsers
    streams.push({ url: src, type: isHls ? "hls" : "mp4", label: String(d.title ?? d.shorttitle ?? type), height: Number(d.height) || undefined });
  }
  const original = String(info.url ?? "");
  if (!derivs.length && PLAYABLE.test(original)) streams.push({ url: original, type: "mp4", label: "Original file" });
  streams.sort((a, b) => (b.type === "hls" ? 1 : 0) - (a.type === "hls" ? 1 : 0) || (b.height ?? 0) - (a.height ?? 0));

  const g = guessTitle(mv("ObjectName") || file);
  return {
    input,
    sourceName: "Wikimedia Commons",
    pageUrl: String(info.descriptionurl ?? input),
    streams,
    titleGuess: g.title,
    yearGuess: g.year ?? yearFrom(mv("DateTimeOriginal")),
    description: mv("ImageDescription").slice(0, 4000),
    imageUrl: String(info.thumburl ?? ""),
    license: mv("LicenseShortName") || "Free licence (Wikimedia Commons)",
    licenseOk: true, // Commons only hosts public-domain / freely licensed media
    error: streams.length ? undefined : "This file has no browser-playable version.",
  };
}

/* ───────────────────────────── any other page ───────────────────────────── */

function metaContent(html: string, key: string): string {
  const re = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${key}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  return tag?.match(/content=["']([^"']*)["']/i)?.[1] ?? "";
}

async function fromPage(input: string, start: URL): Promise<Resolved> {
  const { html, url } = await getPage(start);
  if (!html) return fromDirect(url.toString(), url); // the link was a video after redirects

  const found = new Map<string, FoundStream>();
  const add = (raw: string, label: string) => {
    const cleaned = raw.trim().replace(/\\\//g, "/").replace(/&amp;/g, "&");
    if (!cleaned || cleaned.startsWith("blob:") || cleaned.startsWith("data:")) return;
    let abs: URL;
    try {
      abs = new URL(cleaned, url);
    } catch {
      return;
    }
    if (abs.protocol !== "https:" && abs.protocol !== "http:") return;
    const key = abs.toString();
    if (found.has(key)) return;
    const yt = youtubeId(key);
    if (yt) {
      found.set(key, { url: `https://www.youtube.com/watch?v=${yt}`, type: "youtube", label: `YouTube video — ${label}` });
      return;
    }
    if (!PLAYABLE.test(abs.pathname)) return;
    const type = detectSourceType(key) === "hls" ? "hls" : "mp4";
    found.set(key, { url: key, type, label: `${type === "hls" ? "HLS stream" : "Video file"} — ${label}` });
  };

  for (const k of ["og:video:secure_url", "og:video:url", "og:video", "twitter:player:stream", "contentUrl"]) {
    const v = metaContent(html, k);
    if (v) add(v, k);
  }
  for (const m of html.matchAll(/<(?:video|source)\b[^>]*\bsrc=["']([^"']+)["']/gi)) add(m[1], "<video> on page");
  for (const m of html.matchAll(/"contentUrl"\s*:\s*"([^"]+)"/g)) add(m[1], "page data");
  for (const m of html.matchAll(/["'(](https?:\\?\/\\?\/[^"'()\s<>]+?\.(?:m3u8|mp4|webm)(?:\?[^"'()\s<>]*)?)["')]/gi)) add(m[1], "link in page");
  for (const m of html.matchAll(/<iframe\b[^>]*\bsrc=["']([^"']*youtu[^"']*)["']/gi)) add(m[1], "embedded on page");

  // Real files before embedded YouTube players.
  const streams = [...found.values()].sort((a, b) => Number(a.type === "youtube") - Number(b.type === "youtube")).slice(0, 12);
  const rawTitle = metaContent(html, "og:title") || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || url.pathname.split("/").pop() || "";
  const g = guessTitle(stripHtml(rawTitle));
  const license = metaContent(html, "license") || html.match(/<a[^>]+rel=["']license["'][^>]+href=["']([^"']+)["']/i)?.[1] || "";

  return {
    input,
    sourceName: url.hostname.replace(/^www\./, ""),
    pageUrl: url.toString(),
    streams,
    titleGuess: g.title,
    yearGuess: g.year,
    description: stripHtml(metaContent(html, "og:description") || metaContent(html, "description")).slice(0, 4000),
    imageUrl: (() => {
      try {
        const img = metaContent(html, "og:image");
        return img ? new URL(img, url).toString() : "";
      } catch {
        return "";
      }
    })(),
    license: license ? licenseName(license) : "",
    licenseOk: /publicdomain|creativecommons/i.test(license) ? true : null,
    error: streams.length ? undefined : "No video stream was found on that page.",
  };
}
