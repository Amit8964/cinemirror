/** "youtube" = an embedded YouTube video (used for trailer-only titles). */
export type SourceType = "hls" | "mp4" | "youtube";

export interface Subtitle {
  label: string;
  lang: string;
  url: string;
}

/** Another language / quality of the same film: its own stream, chosen from the player's Language menu. */
export interface AudioVersion {
  /** Shown in the menu, e.g. "Hindi 1080p". */
  label: string;
  /** Language code, e.g. "hi", "en", "ta". */
  lang: string;
  src: string;
  type: "hls" | "mp4";
}

export interface Title {
  id: string;
  slug: string;
  title: string;
  description: string;
  year: number | null;
  durationMin: number | null;
  genres: string[];
  rating: string;
  language: string;
  posterUrl: string;
  backdropUrl: string;
  sourceUrl: string;
  sourceType: SourceType;
  subtitles: Subtitle[];
  /** Extra language / quality versions (the main source above is the default one). */
  versions: AudioVersion[];
  credit: string;
  featured: boolean;
  published: boolean;
  embeddable: boolean;
  createdAt: number;
}

export interface Partner {
  id: string;
  name: string;
  contactEmail: string;
  apiKey: string;
  allowedDomains: string[];
  active: boolean;
  notes: string;
  createdAt: number;
}

/** What the browser needs to render a card. Safe to persist in localStorage. */
export interface TitleCardData {
  slug: string;
  title: string;
  year: number | null;
  posterUrl: string;
  genres: string[];
  durationMin: number | null;
}
