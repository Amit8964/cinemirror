import { revalidatePath } from "next/cache";
import { runBulkImport, type BulkSummary } from "./bulk-import";
import { query, run } from "./db";

// Background import of public, free-to-stream catalogues (archive.org collections, Wikimedia Commons
// categories). Plays in the native ad-free Player. Reuses the bulk importer, so a film is published only
// when the source confirms a free licence; anything else is saved as a hidden draft for review.
// Progress per source is remembered (meta table) so each run continues where the last one stopped.

const DEFAULT_SOURCES = ["https://archive.org/details/feature_films"];

export function publicSources(): string[] {
  const raw = process.env.PUBLIC_IMPORT_SOURCES?.trim();
  const list = raw ? raw.split(/[\s,]+/).filter(Boolean) : DEFAULT_SOURCES;
  return list.filter((u) => /^https:\/\//i.test(u));
}

export interface PublicSyncResult {
  ran: boolean;
  reason?: string;
  sources: { url: string; batch: number; summary: BulkSummary }[];
}

let running = false;

export async function syncPublicStreams(): Promise<PublicSyncResult> {
  if (running) return { ran: false, reason: "already running", sources: [] };
  running = true;
  const out: PublicSyncResult = { ran: true, sources: [] };
  try {
    const batchesPerRun = Math.min(Math.max(Number(process.env.PUBLIC_SYNC_BATCHES) || 1, 1), 10);
    for (const url of publicSources()) {
      const key = `public-import:${url}`;
      const saved = Number((await query<{ value: string }>("SELECT value FROM meta WHERE key = ?", [key]))[0]?.value) || 1;
      let batch = saved;
      for (let i = 0; i < batchesPerRun; i++) {
        const summary = await runBulkImport(url, batch);
        out.sources.push({ url, batch, summary });
        // Past the end (or an error) → start over next time; already-imported films are skipped as duplicates.
        if (summary.error || !summary.more) {
          batch = 1;
          break;
        }
        batch++;
      }
      await run("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, String(batch)]);
    }
    if (out.sources.some((s) => s.summary.published || s.summary.drafts)) {
      try {
        revalidatePath("/", "layout");
      } catch {
        // outside a Next request context (timer): pages refresh on their own cache schedule
      }
    }
  } finally {
    running = false;
  }
  return out;
}

/** Start the recurring public-stream import once per server process. */
export function startPublicSyncWorker(): void {
  const g = globalThis as unknown as { __publicSyncTimer?: ReturnType<typeof setInterval> };
  if (g.__publicSyncTimer || process.env.PUBLIC_SYNC === "off") return;
  const hours = Number(process.env.PUBLIC_SYNC_HOURS) || 12;
  const tick = () =>
    syncPublicStreams()
      .then((r) => console.log(`[public-sync] ${JSON.stringify(r.sources.map((s) => ({ url: s.url, batch: s.batch, ...s.summary })))}`))
      .catch((err) => console.error("[public-sync] failed:", err));
  setTimeout(tick, 45_000).unref?.();
  g.__publicSyncTimer = setInterval(tick, hours * 3600_000);
  g.__publicSyncTimer.unref?.();
}
