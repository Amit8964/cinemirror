// Shared by server code and client components (no server-only imports here).

export type ReferrerPolicy = "origin" | "no-referrer" | "strict-origin-when-cross-origin" | "no-referrer-when-downgrade";

export const REFERRERS: { value: ReferrerPolicy; label: string }[] = [
  { value: "origin", label: "origin (what WeFlix sends — works with most servers)" },
  { value: "strict-origin-when-cross-origin", label: "strict-origin-when-cross-origin (browser default)" },
  { value: "no-referrer", label: "no-referrer (send nothing)" },
  { value: "no-referrer-when-downgrade", label: "no-referrer-when-downgrade" },
];

/** A server row as shown and edited in Admin -> Servers. */
export interface ServerRow {
  id: string;
  label: string;
  movie: string;
  tv: string;
  sandbox: boolean;
  referrer: ReferrerPolicy;
  enabled: boolean;
  position: number;
}
