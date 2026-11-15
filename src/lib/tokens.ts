import { SignJWT, jwtVerify, type JWTPayload } from "jose";

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set (16+ characters) in production.");
  }
  return new TextEncoder().encode("moviehub-dev-only-insecure-secret");
}

export async function sign(payload: JWTPayload, audience: string, ttl: string): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(secret());
}

export async function verify<T extends JWTPayload>(token: unknown, audience: string): Promise<T | null> {
  if (typeof token !== "string" || token.length > 2000) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { audience, algorithms: ["HS256"] });
    return payload as T;
  } catch {
    return null;
  }
}

/** Issued by the watch/embed page; proves which title + partner a player was rendered for. */
export interface PlayerGrant extends JWTPayload {
  t: string; // title id
  p: string | null; // partner id (null = on-site)
  d: string | null; // embedding host seen by the server, if any
}

/** Issued when playback starts; authorises heartbeats for one play row. */
export interface PlayGrant extends JWTPayload {
  pl: string; // play id
}

export const signPlayerGrant = (g: Pick<PlayerGrant, "t" | "p" | "d">) => sign(g, "player", "12h");
export const verifyPlayerGrant = (t: unknown) => verify<PlayerGrant>(t, "player");
export const signPlayGrant = (playId: string) => sign({ pl: playId }, "play", "12h");
export const verifyPlayGrant = (t: unknown) => verify<PlayGrant>(t, "play");
