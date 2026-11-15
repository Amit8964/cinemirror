// Demo catalogue inserted on first start (disable with SEED_DEMO=false).
// Every entry is either an openly licensed Blender Foundation film (CC BY) or a
// film in the US public domain, streamed from its public host. Replace these
// with your own / licensed content from the admin panel.

import type { SourceType } from "./types";

interface DemoTitle {
  slug: string;
  title: string;
  description: string;
  year: number;
  durationMin: number;
  genres: string[];
  rating: string;
  language: string;
  posterUrl: string;
  backdropUrl: string;
  sourceUrl: string;
  sourceType: SourceType;
  credit: string;
  featured?: boolean;
}

const archiveImg = (id: string) => `https://archive.org/services/img/${id}`;

export const DEMO_TITLES: DemoTitle[] = [
  {
    slug: "tears-of-steel",
    title: "Tears of Steel",
    description:
      "In a near-future Amsterdam, a band of warriors and scientists gather at the Oude Kerk to stage a moment from the past — a last attempt to save the world from destructive robots.",
    year: 2012,
    durationMin: 12,
    genres: ["Sci-Fi", "Action", "Short"],
    rating: "PG-13",
    language: "English",
    posterUrl: "",
    backdropUrl: "",
    sourceUrl:
      "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
    sourceType: "hls",
    credit: "© Blender Foundation | mango.blender.org — CC BY 3.0",
    featured: true,
  },
  {
    slug: "big-buck-bunny",
    title: "Big Buck Bunny",
    description:
      "A gentle giant of a rabbit finds his morning ruined by three bullying rodents — and plots a wonderfully over-engineered revenge.",
    year: 2008,
    durationMin: 10,
    genres: ["Animation", "Comedy", "Family", "Short"],
    rating: "G",
    language: "No dialogue",
    posterUrl: archiveImg("BigBuckBunny_124"),
    backdropUrl: "",
    sourceUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    sourceType: "hls",
    credit: "© Blender Foundation | peach.blender.org — CC BY 3.0",
    featured: true,
  },
  {
    slug: "sintel",
    title: "Sintel",
    description:
      "A lonely young woman nurses an injured baby dragon back to health. When he is taken from her, she sets out on a quest across a harsh world to find him.",
    year: 2010,
    durationMin: 15,
    genres: ["Animation", "Fantasy", "Adventure", "Short"],
    rating: "PG",
    language: "English",
    posterUrl: archiveImg("Sintel"),
    backdropUrl: "",
    sourceUrl: "https://archive.org/download/Sintel/sintel-2048-stereo_512kb.mp4",
    sourceType: "mp4",
    credit: "© Blender Foundation | durian.blender.org — CC BY 3.0",
    featured: true,
  },
  {
    slug: "elephants-dream",
    title: "Elephants Dream",
    description:
      "Two men wander an infinite, surreal machine. The elder insists on showing the younger its wonders — but they do not see the same world.",
    year: 2006,
    durationMin: 11,
    genres: ["Animation", "Sci-Fi", "Short"],
    rating: "PG",
    language: "English",
    posterUrl: archiveImg("ElephantsDream"),
    backdropUrl: "",
    sourceUrl: "https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4",
    sourceType: "mp4",
    credit: "© Blender Foundation | orange.blender.org — CC BY 2.5",
  },
  {
    slug: "night-of-the-living-dead",
    title: "Night of the Living Dead",
    description:
      "Seven strangers barricade themselves in a Pennsylvania farmhouse as the recently dead rise and close in. George A. Romero's genre-defining classic.",
    year: 1968,
    durationMin: 96,
    genres: ["Horror", "Thriller", "Classic"],
    rating: "NR",
    language: "English",
    posterUrl: archiveImg("night_of_the_living_dead"),
    backdropUrl: "",
    sourceUrl:
      "https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead_512kb.mp4",
    sourceType: "mp4",
    credit: "Public domain (US) — via the Internet Archive",
  },
  {
    slug: "his-girl-friday",
    title: "His Girl Friday",
    description:
      "A newspaper editor uses every trick he knows to keep his ace reporter — and ex-wife — from remarrying. Howard Hawks' rapid-fire screwball comedy.",
    year: 1940,
    durationMin: 92,
    genres: ["Comedy", "Romance", "Classic"],
    rating: "NR",
    language: "English",
    posterUrl: archiveImg("his_girl_friday"),
    backdropUrl: "",
    sourceUrl: "https://archive.org/download/his_girl_friday/his_girl_friday_512kb.mp4",
    sourceType: "mp4",
    credit: "Public domain (US) — via the Internet Archive",
  },
  {
    slug: "plan-9-from-outer-space",
    title: "Plan 9 from Outer Space",
    description:
      "Aliens resurrect the dead to stop humanity from building a doomsday weapon. Ed Wood's gloriously strange cult favourite.",
    year: 1959,
    durationMin: 79,
    genres: ["Sci-Fi", "Horror", "Classic"],
    rating: "NR",
    language: "English",
    posterUrl: archiveImg("Plan_9_from_Outer_Space_1959"),
    backdropUrl: "",
    sourceUrl:
      "https://archive.org/download/Plan_9_from_Outer_Space_1959/Plan_9_from_Outer_Space_1959_512kb.mp4",
    sourceType: "mp4",
    credit: "Public domain (US) — via the Internet Archive",
  },
];
