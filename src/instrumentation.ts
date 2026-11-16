export async function register() {
  // Node server only (not the edge runtime). Starts the recurring background syncs.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const [{ startStreamSyncWorker }, { startPublicSyncWorker }] = await Promise.all([
      import("./lib/stream-sync"),
      import("./lib/public-sync"),
    ]);
    // In development the background syncs are opt-in (STREAM_SYNC=on / PUBLIC_SYNC=on): they fire hundreds of requests
    // right after boot, which is too heavy for a laptop already running a dev server. Pages still check unseen titles on demand.
    const dev = process.env.NODE_ENV !== "production";
    if (!dev || process.env.STREAM_SYNC === "on") startStreamSyncWorker();
    if (!dev || process.env.PUBLIC_SYNC === "on") startPublicSyncWorker();
  }
}
