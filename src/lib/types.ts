/** "youtube" = an embedded YouTube video (used for trailer-only titles). */
export type SourceType = "hls" | "mp4" | "youtube";

export interface Subtitle {
  label: string;
  lang: string;
  url: string;
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
