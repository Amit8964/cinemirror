import fs from "node:fs";
import path from "node:path";
import { createClient, type Client, type InValue } from "@libsql/client";
import { DEMO_TITLES } from "./seed";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS titles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  year INTEGER,
  duration_min INTEGER,
  genres TEXT NOT NULL DEFAULT '[]',
  rating TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT '',
  poster_url TEXT NOT NULL DEFAULT '',
  backdrop_url TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'mp4',
  subtitles TEXT NOT NULL DEFAULT '[]',
  audio_versions TEXT NOT NULL DEFAULT '[]',
  credit TEXT NOT NULL DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  embeddable INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL UNIQUE,
  allowed_domains TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

-- One row per playback session. partner_id NULL = watched on this site.
CREATE TABLE IF NOT EXISTS plays (
  id TEXT PRIMARY KEY,
  title_id TEXT NOT NULL,
  partner_id TEXT,
  viewer_id TEXT NOT NULL,
  domain TEXT,
  country TEXT,
  device TEXT NOT NULL DEFAULT 'desktop',
  started_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  watch_seconds INTEGER NOT NULL DEFAULT 0,
  max_position INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS plays_started ON plays(started_at);
CREATE INDEX IF NOT EXISTS plays_partner ON plays(partner_id, started_at);
CREATE INDEX IF NOT EXISTS plays_title ON plays(title_id, started_at);
CREATE INDEX IF NOT EXISTS plays_seen ON plays(last_seen_at);

-- Which TMDB titles the linked stream provider (Nxsha) can play; filled by the background sync.
CREATE TABLE IF NOT EXISTS stream_links (
  kind TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  available INTEGER NOT NULL DEFAULT 0,
  checked_at INTEGER NOT NULL,
  PRIMARY KEY (kind, tmdb_id)
);

-- Same, per extra embed server (local-only servers, see local-servers.ts). The default server uses stream_links.
CREATE TABLE IF NOT EXISTS server_links (
  server_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  available INTEGER NOT NULL DEFAULT 0,
  checked_at INTEGER NOT NULL,
  PRIMARY KEY (server_id, kind, tmdb_id)
);

-- Extra embed servers, managed in Admin -> Servers (shown only while local extras are enabled).
CREATE TABLE IF NOT EXISTS embed_servers (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  movie_url TEXT NOT NULL DEFAULT '',
  tv_url TEXT NOT NULL DEFAULT '',
  sandbox INTEGER NOT NULL DEFAULT 1,
  referrer TEXT NOT NULL DEFAULT 'origin',
  enabled INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

const g = globalThis as unknown as { __mhClient?: Client; __mhReady?: Promise<void> };

function getClient(): Client {
  if (!g.__mhClient) {
    const url = process.env.DATABASE_URL || "file:./data/cinemirror.db";
    if (url.startsWith("file:")) {
      const file = url.slice("file:".length);
      fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    }
    g.__mhClient = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
  }
  return g.__mhClient;
}

async function init(client: Client): Promise<void> {
  await client.executeMultiple(SCHEMA);
  // Databases created before language versions existed: add the column once.
  const cols = await client.execute("PRAGMA table_info(titles)");
  if (!cols.rows.some((c) => c.name === "audio_versions")) {
    await client.execute("ALTER TABLE titles ADD COLUMN audio_versions TEXT NOT NULL DEFAULT '[]'");
  }
  if (process.env.SEED_DEMO === "false") return;
  const seeded = await client.execute("SELECT value FROM meta WHERE key = 'seeded'");
  if (seeded.rows.length) return;
  const now = Math.floor(Date.now() / 1000);
  await client.batch(
    [
      ...DEMO_TITLES.map((t, i) => ({
        sql: `INSERT OR IGNORE INTO titles
          (id, slug, title, description, year, duration_min, genres, rating, language, poster_url,
           backdrop_url, source_url, source_type, credit, featured, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          newId(), t.slug, t.title, t.description, t.year, t.durationMin, JSON.stringify(t.genres),
          t.rating, t.language, t.posterUrl, t.backdropUrl, t.sourceUrl, t.sourceType, t.credit,
          t.featured ? 1 : 0, now - i * 3600,
        ] as InValue[],
      })),
      { sql: "INSERT OR IGNORE INTO meta (key, value) VALUES ('seeded', '1')", args: [] },
    ],
    "write",
  );
}

async function ready(): Promise<Client> {
  const client = getClient();
  if (!g.__mhReady) {
    g.__mhReady = init(client).catch((err) => {
      g.__mhReady = undefined;
      throw err;
    });
  }
  await g.__mhReady;
  return client;
}

export type Row = Record<string, string | number | null>;

export async function query<T = Row>(sql: string, args: InValue[] = []): Promise<T[]> {
  const client = await ready();
  const rs = await client.execute({ sql, args });
  return rs.rows.map((row) => {
    const out: Record<string, unknown> = {};
    rs.columns.forEach((col, i) => {
      const v = row[i];
      out[col] = typeof v === "bigint" ? Number(v) : v;
    });
    return out as T;
  });
}

export async function run(sql: string, args: InValue[] = []): Promise<number> {
  const client = await ready();
  const rs = await client.execute({ sql, args });
  return rs.rowsAffected;
}

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}
