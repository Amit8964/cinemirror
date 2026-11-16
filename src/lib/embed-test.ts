// "Test URL" in Admin -> Servers: fetches a pattern with a well-known TMDB id and says whether it can work
// as an embed here. Admin-only; only public https hosts are fetched.

import { isValidStreamPattern, isValidTvStreamPattern } from "./stream";

export interface EmbedTest {
  url: string;
  status: number | null;
  /** Can a page on this site show it in an <iframe>? null = couldn't tell. */
  embeddable: boolean | null;
  framing: string;
  /** Does an unknown id answer 404? Then the background sync can tell which titles the server lacks. */
  checkable: boolean | null;
  notes: string[];
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** Only public https hosts: no localhost, private ranges or bare IPs (this is a server-side fetch of an admin-typed URL). */
export function isPublicHttpsUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h.includes(":")) return false;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return false;
    return h.includes(".");
  } catch {
    return false;
  }
}

async function get(url: string): Promise<{ status: number | null; headers: Headers | null }> {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" }, redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(12_000) });
    await res.body?.cancel();
    return { status: res.status, headers: res.headers };
  } catch {
    return { status: null, headers: null };
  }
}

function framing(h: Headers | null): { embeddable: boolean | null; text: string } {
  if (!h) return { embeddable: null, text: "no response" };
  const xfo = (h.get("x-frame-options") ?? "").toLowerCase();
  const csp = h.get("content-security-policy") ?? "";
  const fa = /frame-ancestors\s+([^;]+)/i.exec(csp)?.[1]?.trim() ?? "";
  if (xfo.includes("deny") || xfo.includes("sameorigin")) return { embeddable: false, text: `X-Frame-Options: ${xfo.toUpperCase()}` };
  if (fa && fa !== "*" && !fa.includes("*")) return { embeddable: false, text: `CSP frame-ancestors ${fa.slice(0, 60)}` };
  return { embeddable: true, text: xfo || fa ? `allows framing (${xfo || "frame-ancestors " + fa})` : "no framing restriction" };
}

export async function testEmbedPattern(pattern: string, kind: "movie" | "tv"): Promise<EmbedTest> {
  const valid = kind === "movie" ? isValidStreamPattern(pattern) : isValidTvStreamPattern(pattern);
  const fill = (id: number) => pattern.replaceAll("{id}", String(id)).replaceAll("{season}", "1").replaceAll("{episode}", "1");
  const url = fill(kind === "movie" ? 550 : 1399); // Fight Club / Game of Thrones
  const out: EmbedTest = { url, status: null, embeddable: null, framing: "", checkable: null, notes: [] };
  if (!valid) return { ...out, notes: ["The URL is not in the right format (https, with {id}; series also {season} and {episode})."] };
  if (!isPublicHttpsUrl(url)) return { ...out, notes: ["Only public https addresses can be tested."] };

  const [good, bad] = await Promise.all([get(url), get(fill(999_999_999))]);
  out.status = good.status;
  const f = framing(good.headers);
  out.embeddable = f.embeddable;
  out.framing = f.text;

  if (good.status == null) out.notes.push("The site did not answer (timeout or blocked from here).");
  else if (good.status === 403 || good.status === 401) out.notes.push("The site refuses automatic checks (HTTP " + good.status + "). It may still work in a browser; try it with the “Server” buttons on a movie page.");
  else if (good.status >= 400) out.notes.push(`Answered HTTP ${good.status} for a very popular title — the URL is probably wrong.`);
  else out.notes.push(`Answered HTTP ${good.status} for a popular title.`);

  if (out.embeddable === false) out.notes.push("This site forbids being shown inside other sites' pages, so it can NOT be used as an embed here.");

  if (good.status && good.status < 400 && bad.status != null) {
    out.checkable = bad.status === 404 || bad.status === 410;
    out.notes.push(out.checkable
      ? "An unknown id answers 404, so the sync can tell which titles this server has and hide it where it has nothing."
      : `An unknown id answers HTTP ${bad.status}, so the sync can't tell what it has — its button is always shown.`);
  }
  return out;
}
