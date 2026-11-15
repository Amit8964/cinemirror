import Link from "next/link";
import type { TitleCardData } from "@/lib/types";
import { formatDuration } from "@/lib/util";
import Poster from "./Poster";

export default function TitleCard({
  card, progress, href,
}: { card: TitleCardData; progress?: number; href?: string }) {
  const meta = [card.year, formatDuration(card.durationMin), card.genres[0]].filter(Boolean).join(" · ");
  return (
    <Link href={href ?? `/title/${card.slug}`} className="group block">
      <div className="relative transition duration-200 group-hover:-translate-y-1">
        <Poster
          title={card.title}
          src={card.posterUrl}
          className="ring-1 ring-white/5 transition group-hover:ring-2 group-hover:ring-accent/70"
        />
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
