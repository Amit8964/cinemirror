// Small in-memory fixed-window limiter. Per-process: good enough for a single
// Node server; put a shared store behind it if you scale horizontally.

const g = globalThis as unknown as { __mhRate?: Map<string, { count: number; reset: number }> };
const buckets = (g.__mhRate ??= new Map());

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    if (buckets.size > 20_000) {
      for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    }
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count++;
  return b.count <= limit;
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
