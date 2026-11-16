// Search public, free-to-stream catalogues so an admin can pick a film instead of pasting a link.
// Results carry the page URL of the item; the existing link importer (resolve.ts) then finds the
// actual streams and checks the licence.

export type PublicSource = "archive" | "commons";

export interface PublicResult {
  source: PublicSource;
  /** Page URL, fed to the importer as the `link`. */
  url: string;
  title: string;
  year: number | null;
  thumb: string;
  /** Licence text when the search result already tells us. */
  license: string;
}

export const PUBLIC_SOURCES: { id: PublicSource; label: string; hint: string }[] = [
  { id: "archive", label: "Internet Archive", hint: "Feature Films collection (public-domain classics)" },
  { id: "commons", label: "Wikimedia Commons", hint: "Freely licensed videos" },
];

/** Page URL for a Commons file title like "File:Nosferatu (1922).webm". The "File:" prefix must stay unescaped for the importer. */
export function commonsFileUrl(title: string): string {
  const m = title.match(/^(File):(.*)$/i);
  const rest = (m ? m[2] : title).trim().replace(/ /g, "_");
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(rest)}`;
}

const UA = "CineMirror/1.0 (public stream search)";
const PAGE_SIZE = 24;

async function getJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/json" },
    next: { revalidate: 600 },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`The source answered with an error (${res.status}).`);
  return (await res.json()) as Record<string, unknown>;
}

const str = (v: unknown): string => (Array.isArray(v) ? str(v[0]) : typeof v === "string" ? v : "");
const yearOf = (v: string): number | null => {
  const m = v.match(/\b(18[89]\d|19\d\d|20[0-4]\d)\b/);
  return m ? Number(m[1]) : null;
};
/** Strip characters that have meaning in Lucene queries so user input can't change the query shape. */
const clean = (q: string) => q.replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80);

export async function searchPublicStreams(
  source: PublicSource,
  rawQuery: string,
  page = 1,
): Promise<{ results: PublicResult[]; error?: string }> {
  const q = clean(rawQuery);
  const p = Math.min(Math.max(1, Math.floor(page) || 1), 50);
  try {
    return { results: source === "commons" ? await searchCommons(q, p) : await searchArchive(q, p) };
  } catch (err) {
    return { results: [], error: err instanceof Error ? err.message : "Search failed." };
  }
}

async function searchArchive(q: string, page: number): Promise<PublicResult[]> {
  const api = new URL("https://archive.org/advancedsearch.php");
  const query = `mediatype:movies AND collection:feature_films${q ? ` AND title:(${q})` : ""}`;
  api.searchParams.set("q", query);
  for (const f of ["identifier", "title", "year", "licenseurl", "possible-copyright-status"]) api.searchParams.append("fl[]", f);
  api.searchParams.append("sort[]", "downloads desc");
  api.searchParams.set("rows", String(PAGE_SIZE));
  api.searchParams.set("page", String(page));
  api.searchParams.set("output", "json");

  const data = await getJson(api.toString());
  const docs = ((data.response as Record<string, unknown> | undefined)?.docs ?? []) as Record<string, unknown>[];
  return docs
    .filter((d) => /^[\w.-]+$/.test(str(d.identifier)))
    .map((d) => {
      const id = str(d.identifier);
      const rights = `${str(d["possible-copyright-status"])} ${str(d.licenseurl)}`;
      return {
        source: "archive" as const,
        url: `https://archive.org/details/${id}`,
        title: str(d.title) || id,
        year: yearOf(str(d.year)),
        thumb: `https://archive.org/services/img/${id}`,
        license: /publicdomain|public domain|not_in_copyright|no known copyright/i.test(rights) ? "Public domain" : "",
      };
    });
}

async function searchCommons(q: string, page: number): Promise<PublicResult[]> {
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  const params: Record<string, string> = {
    action: "query", format: "json", formatversion: "2", generator: "search",
    gsrsearch: `filetype:video ${q || "feature film"}`, gsrnamespace: "6", gsrlimit: String(PAGE_SIZE),
    gsroffset: String((page - 1) * PAGE_SIZE), prop: "imageinfo", iiprop: "url", iiurlwidth: "320",
  };
  for (const [k, v] of Object.entries(params)) api.searchParams.set(k, v);

  const data = await getJson(api.toString());
  const pages = ((data.query as Record<string, unknown> | undefined)?.pages ?? []) as Record<string, unknown>[];
  return pages
    .sort((a, b) => Number(a.index ?? 0) - Number(b.index ?? 0))
    .map((pg) => {
      const name = str(pg.title); // "File:Something (1922).webm"
      const info = (pg.imageinfo as Record<string, unknown>[] | undefined)?.[0];
      const bare = name.replace(/^File:/i, "").replace(/\.[a-z0-9]+$/i, "");
      return {
        source: "commons" as const,
        url: commonsFileUrl(name),
        title: bare,
        year: yearOf(bare),
        thumb: str(info?.thumburl),
        license: "Free licence (Wikimedia Commons)",
      };
    })
    .filter((r) => r.title);
}
