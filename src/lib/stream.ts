// URL pattern for ExternalStreamPlayer: a base URL with an {id} placeholder for the TMDB id,
// e.g. https://player.your-domain.com/embed/movie/{id}
// Point it at your own player or one you are licensed to embed. Pure helpers, safe in client components.

/** https only (plain http is allowed for localhost during development), and it must contain {id}. */
export function isValidStreamPattern(pattern: string): boolean {
  if (!pattern.includes("{id}")) return false;
  try {
    const u = new URL(pattern.replaceAll("{id}", "1"));
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

/** The iframe src for a TMDB id, or null when the id or pattern is not valid. */
export function buildStreamSrc(pattern: string, resourceId: number | string): string | null {
  const id = String(resourceId).trim();
  if (!/^[1-9]\d{0,9}$/.test(id)) return null; // TMDB ids are positive integers
  return isValidStreamPattern(pattern) ? pattern.replaceAll("{id}", id) : null;
}

/**
 * The configured pattern (STREAM_EMBED_URL), read on the server at request time so it can change
 * without a rebuild. Null when unset or invalid — pages then hide the player.
 */
export function getStreamPattern(): string | null {
  const raw = process.env.STREAM_EMBED_URL?.trim();
  return raw && isValidStreamPattern(raw) ? raw : null;
}

// ---- TV episodes ---------------------------------------------------------------------------
// Same idea with three placeholders, e.g. https://player.your-domain.com/embed/tv/{id}/{season}/{episode}

export function isValidTvStreamPattern(pattern: string): boolean {
  if (!["{id}", "{season}", "{episode}"].every((p) => pattern.includes(p))) return false;
  return isValidStreamPattern(pattern.replaceAll("{season}", "1").replaceAll("{episode}", "1"));
}

/** The iframe src for one episode, or null when an id, season or episode is not valid. */
export function buildTvStreamSrc(
  pattern: string, resourceId: number | string, season: number | string, episode: number | string,
): string | null {
  const s = String(season).trim();
  const e = String(episode).trim();
  if (!/^\d{1,3}$/.test(s) || !/^[1-9]\d{0,4}$/.test(e)) return null;
  if (!isValidTvStreamPattern(pattern)) return null;
  return buildStreamSrc(pattern.replaceAll("{season}", s).replaceAll("{episode}", e), resourceId);
}

/** The configured TV pattern (STREAM_EMBED_TV_URL), read at request time. Null when unset or invalid. */
export function getTvStreamPattern(): string | null {
  const raw = process.env.STREAM_EMBED_TV_URL?.trim();
  return raw && isValidTvStreamPattern(raw) ? raw : null;
}
