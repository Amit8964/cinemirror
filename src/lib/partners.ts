import { randomBytes } from "node:crypto";
import { query, run, newId, nowSec, type Row } from "./db";
import type { Partner } from "./types";

function toPartner(r: Row): Partner {
  let domains: string[] = [];
  try {
    domains = JSON.parse(String(r.allowed_domains ?? "[]")) ?? [];
  } catch {}
  return {
    id: String(r.id),
    name: String(r.name),
    contactEmail: String(r.contact_email ?? ""),
    apiKey: String(r.api_key),
    allowedDomains: domains,
    active: Number(r.active) === 1,
    notes: String(r.notes ?? ""),
    createdAt: Number(r.created_at),
  };
}

function newKey(): string {
  return "pk_" + randomBytes(18).toString("base64url");
}

export async function listPartners(): Promise<Partner[]> {
  return (await query("SELECT * FROM partners ORDER BY created_at DESC")).map(toPartner);
}

export async function getPartner(id: string): Promise<Partner | null> {
  const rows = await query("SELECT * FROM partners WHERE id = ?", [id]);
  return rows[0] ? toPartner(rows[0]) : null;
}

// The proxy looks a key up on every /embed request, so keep a short-lived cache.
const g = globalThis as unknown as { __mhKeyCache?: Map<string, { at: number; partner: Partner | null }> };
const keyCache = (g.__mhKeyCache ??= new Map());
const KEY_TTL_MS = 15_000;

export async function getPartnerByKey(key: string): Promise<Partner | null> {
  if (!/^pk_[A-Za-z0-9_-]{10,60}$/.test(key)) return null;
  const hit = keyCache.get(key);
  if (hit && Date.now() - hit.at < KEY_TTL_MS) return hit.partner;
  const rows = await query("SELECT * FROM partners WHERE api_key = ?", [key]);
  const partner = rows[0] ? toPartner(rows[0]) : null;
  if (keyCache.size > 5000) keyCache.clear();
  keyCache.set(key, { at: Date.now(), partner });
  return partner;
}

export interface PartnerInput {
  name: string;
  contactEmail: string;
  allowedDomains: string[];
  active: boolean;
  notes: string;
}

export async function createPartner(input: PartnerInput): Promise<string> {
  const id = newId();
  await run(
    `INSERT INTO partners (id, name, contact_email, api_key, allowed_domains, active, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.contactEmail, newKey(), JSON.stringify(input.allowedDomains),
      input.active ? 1 : 0, input.notes, nowSec()],
  );
  return id;
}

export async function updatePartner(id: string, input: PartnerInput): Promise<void> {
  await run(
    `UPDATE partners SET name = ?, contact_email = ?, allowed_domains = ?, active = ?, notes = ? WHERE id = ?`,
    [input.name, input.contactEmail, JSON.stringify(input.allowedDomains), input.active ? 1 : 0, input.notes, id],
  );
  keyCache.clear();
}

export async function rotatePartnerKey(id: string): Promise<void> {
  await run("UPDATE partners SET api_key = ? WHERE id = ?", [newKey(), id]);
  keyCache.clear();
}

export async function deletePartner(id: string): Promise<void> {
  await run("DELETE FROM partners WHERE id = ?", [id]);
  keyCache.clear();
}
