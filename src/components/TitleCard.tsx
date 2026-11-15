import Link from "next/link";
import type { TitleCardData } from "@/lib/types";
import { formatDuration } from "@/lib/util";
import { PlayIcon, StarIcon } from "./icons";
import Poster from "./Poster";

export default function TitleCard({
  card, progress, href, rating,
}: { card: TitleCardData; progress?: number; href?: string; rating?: number }) {
  const meta = [card.year, formatDuration(card.durationMin), card.genres[0]].filter(Boolean).join(" · ");
  return (
    <Link href={href ?? `/title/${card.slug}`} className="group block">
      <div className="relative transition duration-300 group-hover:-translate-y-1 group-hover:scale-[1.03]">
        <Poster
          title={card.title}
          src={card.posterUrl}
          className="ring-1 ring-white/5 transition group-hover:ring-2 group-hover:ring-accent/70"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 transition group-hover:opacity-100">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-xl text-accent-ink shadow-lg">
            <PlayIcon />
          </span>
        </div>
        {rating ? (
          <span className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-accent backdrop-blur">
            <StarIcon /> {rating.toFixed(1)}
          </span>
        ) : null}
        {progress !== undefined && (
          <div className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-black/60">
            <div className="h-full bg-accent" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-text">{card.title}</p>
      {meta && <p className="truncate text-xs text-muted">{meta}</p>}
    </Link>
  );
}
