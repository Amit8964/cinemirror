import Link from "next/link";
import { youtubeId } from "@/lib/util";
import { ArrowLeftIcon } from "./icons";

/** Plays a YouTube video (e.g. an official trailer) full-size, for titles with no full stream. */
export default function YouTubeFrame({
  url, title, backHref, autoPlay, start,
}: {
  url: string;
  title: string;
  backHref?: string;
  autoPlay?: boolean;
  start?: number;
}) {
  const id = youtubeId(url);
  const params = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1" });
  if (autoPlay) params.set("autoplay", "1");
  if (start && start > 0) params.set("start", String(Math.floor(start)));

  return (
    <div className="relative h-full w-full bg-black">
      {id ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?${params}`}
          title={title}
          className="h-full w-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="grid h-full place-items-center text-sm text-white/60">This video could not be loaded.</div>
      )}
      {backHref && (
        <Link
          href={backHref}
          aria-label="Back"
          className="absolute top-3 left-3 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-[1.35rem] text-white/90 hover:bg-black/80"
        >
          <ArrowLeftIcon />
        </Link>
      )}
    </div>
  );
}
