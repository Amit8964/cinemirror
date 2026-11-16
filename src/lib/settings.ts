import { query, run } from "./db";

// Small key/value settings kept in the `meta` table, editable from the admin panel.

export async function getSetting(key: string): Promise<string> {
  try {
    return (await query<{ value: string }>("SELECT value FROM meta WHERE key = ?", [key]))[0]?.value ?? "";
  } catch {
    return "";
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (!value) {
    await run("DELETE FROM meta WHERE key = ?", [key]);
    return;
  }
  await run("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value]);
}
