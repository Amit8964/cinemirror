"use client";
// Per-browser state: watch progress, My List and the anonymous viewer id.
// Everything is wrapped in try/catch — storage can be blocked (private mode,
// third-party iframes) and the site must keep working without it.

import type { TitleCardData } from "./types";

const PROGRESS = "mh_progress";
const LIST = "mh_list";
const VID = "mh_vid";
const EVENT = "mh-storage";

export interface ProgressEntry {
  card: TitleCardData;
  time: number;
  duration: number;
  updatedAt: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

export function onStorageChange(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function getAllProgress(): Record<string, ProgressEntry> {
  return read<Record<string, ProgressEntry>>(PROGRESS, {});
}

export function getProgress(slug: string): ProgressEntry | null {
  return getAllProgress()[slug] ?? null;
}

export function saveProgress(card: TitleCardData, time: number, duration: number): void {
  const all = getAllProgress();
  all[card.slug] = { card, time, duration, updatedAt: Date.now() };
  // keep the 30 most recent
  const keep = Object.entries(all).sort((a, b) => b[1].updatedAt - a[1].updatedAt).slice(0, 30);
  write(PROGRESS, Object.fromEntries(keep));
}

export function clearProgress(slug: string): void {
  const all = getAllProgress();
  if (all[slug]) {
    delete all[slug];
    write(PROGRESS, all);
  }
}

export function getList(): TitleCardData[] {
  return read<TitleCardData[]>(LIST, []);
}

export function toggleList(card: TitleCardData): boolean {
  const list = getList();
  const exists = list.some((c) => c.slug === card.slug);
  write(LIST, exists ? list.filter((c) => c.slug !== card.slug) : [card, ...list]);
  return !exists;
}

export function getViewerId(): string | undefined {
  try {
    let id = localStorage.getItem(VID);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VID, id);
    }
    return id;
  } catch {
    return undefined;
  }
}
