"use client";

import { useState } from "react";
import { hueFor } from "@/lib/util";

/** Poster image with generated fallback art when there is no image or it fails to load. */
export default function Poster({
  title, src, className = "", ratio = "aspect-[2/3]",
}: { title: string; src?: string; className?: string; ratio?: string }) {
  const [failed, setFailed] = useState(false);
  const hue = hueFor(title);
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-raised ${ratio} ${className}`}
      style={{
        backgroundImage: `linear-gradient(155deg, hsl(${hue} 55% 30%), hsl(${(hue + 50) % 360} 60% 12%) 70%)`,
      }}
    >
      <div className="absolute inset-0 flex flex-col justify-end p-3">
        <span className="font-display text-2xl leading-[0.95] tracking-wide text-white/95 [text-wrap:balance]">
          {title}
        </span>
      </div>
      {src && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}
