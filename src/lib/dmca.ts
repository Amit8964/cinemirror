import { newId, nowSec, query, run, type Row } from "./db";
import { getTitleBySlug } from "./titles";

// Copyright (DMCA) notices sent through /dmca. The table is created on first use.

export type DmcaStatus = "new" | "reviewing" | "removed" | "rejected";
export type DmcaRole = "owner" | "agent";

export const DMCA_STATUSES: Record<DmcaStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-accent/15 text-accent" },
  reviewing: { label: "Reviewing", className: "bg-sky-400/15 text-sky-300" },
  removed: { label: "Content removed", className: "bg-ok/15 text-ok" },
  rejected: { label: "Rejected", className: "bg-white/10 text-muted" },
};

export const isDmcaStatus = (v: string): v is DmcaStatus => v in DMCA_STATUSES;

export interface DmcaReport {
  id: string;
  ref: string;
  status: DmcaStatus;
  name: string;
  email: string;
  phone: string;
  organization: string;
  role: DmcaRole;
  work: string;
  urls: string[];
  /** Library titles the reported links point to (matched from /title, /watch or /embed paths). */
  titleIds: string[];
  originalUrl: string;
  details: string;
  signature: string;
  ip: string;
  userAgent: string;
  adminNotes: string;
  createdAt: number;
  updatedAt: number;
}

export type DmcaInput = Omit<DmcaReport, "id" | "ref" | "status" | "titleIds" | "adminNotes" | "createdAt" | "updatedAt">;

const g = globalThis as unknown as { __mhDmca?: Promise<void> };

function ensureTable(): Promise<void> {
  g.__mhDmca ??= (async () => {
    await run(`CREATE TABLE IF NOT EXISTS dmca_reports (
      id TEXT PRIMARY KEY,
      ref TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'new',
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      organization TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'owner',
      work TEXT NOT NULL,
      urls TEXT NOT NULL DEFAULT '[]',
      title_ids TEXT NOT NULL DEFAULT '[]',
      original_url TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '',
      signature TEXT NOT NULL,
      ip TEXT NOT NULL DEFAULT '',
      user_agent TEXT NOT NULL DEFAULT '',
      admin_notes TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`);
    await run("CREATE INDEX IF NOT EXISTS dmca_status ON dmca_reports(status, created_at)");
  })().catch((err) => {
    g.__mhDmca = undefined;
    throw err;
  });
  return g.__mhDmca;
}

const list = (v: unknown): string[] => {
  try {
    const a = JSON.parse(String(v ?? "[]"));
    return Array.isArray(a) ? a.map(String) : [];
  } catch {
    return [];
  }
};

function toReport(r: Row): DmcaReport {
  const status = String(r.status);
  return {
    id: String(r.id),
    ref: String(r.ref),
    status: isDmcaStatus(status) ? status : "new",
    name: String(r.name),
    email: String(r.email),
    phone: String(r.phone ?? ""),
    organization: String(r.organization ?? ""),
    role: r.role === "agent" ? "agent" : "owner",
    work: String(r.work),
    urls: list(r.urls),
    titleIds: list(r.title_ids),
    originalUrl: String(r.original_url ?? ""),
    details: String(r.details ?? ""),
    signature: String(r.signature),
    ip: String(r.ip ?? ""),
    userAgent: String(r.user_agent ?? ""),
    adminNotes: String(r.admin_notes ?? ""),
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

/** Library title ids that the reported links point to, e.g. https://site/watch/big-buck-bunny. */
async function matchTitles(urls: string[]): Promise<string[]> {
  const slugs = new Set<string>();
  for (const u of urls) {
    let path = u;
    try {
      if (!u.startsWith("/")) path = new URL(u).pathname;
    } catch {
      continue;
    }
    const m = /^\/(?:title|watch|embed)\/([a-z0-9-]{1,80})\/?$/.exec(path.split(/[?#]/)[0]);
    if (m) slugs.add(m[1]);
  }
  const titles = await Promise.all([...slugs].map((s) => getTitleBySlug(s)));
  return [...new Set(titles.filter((t) => t !== null).map((t) => t.id))];
}

const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newRef(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `DMCA-${[...bytes].map((b) => REF_CHARS[b % REF_CHARS.length]).join("")}`;
}

export async function createDmcaReport(input: DmcaInput): Promise<{ id: string; ref: string }> {
  await ensureTable();
  const id = newId();
  const ref = newRef();
  const titleIds = await matchTitles(input.urls);
  const now = nowSec();
  await run(
    `INSERT INTO dmca_reports (id, ref, status, name, email, phone, organization, role, work, urls, title_ids,
       original_url, details, signature, ip, user_agent, created_at, updated_at)
     VALUES (?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, ref, input.name, input.email, input.phone, input.organization, input.role, input.work,
      JSON.stringify(input.urls), JSON.stringify(titleIds), input.originalUrl, input.details, input.signature,
      input.ip, input.userAgent, now, now,
    ],
  );
  return { id, ref };
}

export async function listDmcaReports(status?: DmcaStatus): Promise<DmcaReport[]> {
  await ensureTable();
  const rows = status
    ? await query("SELECT * FROM dmca_reports WHERE status = ? ORDER BY created_at DESC LIMIT 300", [status])
    : await query("SELECT * FROM dmca_reports ORDER BY created_at DESC LIMIT 300");
  return rows.map(toReport);
}

export async function getDmcaReport(id: string): Promise<DmcaReport | null> {
  await ensureTable();
  const rows = await query("SELECT * FROM dmca_reports WHERE id = ?", [id]);
  return rows[0] ? toReport(rows[0]) : null;
}

export async function dmcaCounts(): Promise<Record<DmcaStatus, number> & { all: number }> {
  await ensureTable();
  const rows = await query<{ status: string; n: number }>("SELECT status, COUNT(*) AS n FROM dmca_reports GROUP BY status");
  const out = { new: 0, reviewing: 0, removed: 0, rejected: 0, all: 0 };
  for (const r of rows) {
    if (isDmcaStatus(r.status)) out[r.status] = Number(r.n);
    out.all += Number(r.n);
  }
  return out;
}

export async function updateDmcaReport(id: string, patch: { status?: DmcaStatus; adminNotes?: string }): Promise<void> {
  await ensureTable();
  const report = await getDmcaReport(id);
  if (!report) return;
  await run("UPDATE dmca_reports SET status = ?, admin_notes = ?, updated_at = ? WHERE id = ?", [
    patch.status ?? report.status,
    (patch.adminNotes ?? report.adminNotes).slice(0, 5000),
    nowSec(),
    id,
  ]);
}

/** Permanently remove a notice (e.g. spam). */
export async function deleteDmcaReport(id: string): Promise<void> {
  await ensureTable();
  await run("DELETE FROM dmca_reports WHERE id = ?", [id]);
}

/** Adds a timestamped line to the report's internal notes (used to log takedown actions). */
export async function logDmcaAction(id: string, line: string, status?: DmcaStatus): Promise<void> {
  const report = await getDmcaReport(id);
  if (!report) return;
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const notes = [report.adminNotes.trim(), `[${stamp} UTC] ${line}`].filter(Boolean).join("\n");
  await updateDmcaReport(id, { status, adminNotes: notes });
}
