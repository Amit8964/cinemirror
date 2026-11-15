// Shared helpers with no server-only imports — safe for client components.

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Accepts absolute http(s) URLs and root-relative paths. Returns "" for anything else. */
export function safeUrl(input: string | null | undefined): string {
  const v = (input ?? "").trim();
  if (!v) return "";
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}

export function detectSourceType(url: string): "hls" | "mp4" {
  return /\.m3u8(\?|#|$)/i.test(url) ? "hls" : "mp4";
}

/** "https://Sub.Example.com:8080/path" -> "sub.example.com:8080" */
export function normalizeDomain(input: string): string {
  let v = input.trim().toLowerCase();
  if (!v) return "";
  v = v.replace(/^[a-z]+:\/\//, "").replace(/^\*\./, "");
  v = v.split("/")[0].split("?")[0];
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/.test(v)) return "";
  return v;
}

export function hostFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host.toLowerCase() || null;
  } catch {
    return null;
  }
}

/** True when `host` is one of `allowed` or a subdomain of one. Ports must match if the rule has one. */
export function domainAllowed(host: string, allowed: string[]): boolean {
  const h = host.toLowerCase();
  const bare = h.replace(/:\d+$/, "");
  return allowed.some((rule) => {
    const target = rule.includes(":") ? h : bare;
    return target === rule || target.endsWith("." + rule);
  });
}

/** CSP frame-ancestors source list for a set of allowed domains. */
export function frameAncestorsFor(allowed: string[]): string {
  const out: string[] = ["'self'"];
  for (const d of allowed) {
    const bare = d.replace(/:\d+$/, "");
    const local = bare === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(bare);
    if (local) {
      out.push(`http://${d.includes(":") ? d : d + ":*"}`, `https://${d.includes(":") ? d : d + ":*"}`);
    } else {
      out.push(`https://${d}`, `https://*.${d}`, `http://${d}`, `http://*.${d}`);
    }
  }
  return out.join(" ");
}

export function formatDuration(min: number | null): string {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m ? `${m}m` : ""}`.trim() : `${m}m`;
}

export function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Watch time for dashboards: "42s", "12m", "3.4h" */
export function formatWatchTime(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  const h = sec / 3600;
  return `${h >= 100 ? Math.round(h).toLocaleString("en") : h.toFixed(1)}h`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("en");
}

/** Deterministic hue from a string, for generated poster art. */
export function hueFor(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h % 360;
}
