"use client";

import { useState } from "react";
import Player from "@/components/Player";
import YouTubeFrame from "@/components/YouTubeFrame";
import type { SourceType, Subtitle } from "@/lib/types";
import { detectSourceType } from "@/lib/util";

const label = "block text-sm font-semibold";
const hint = "mt-1 text-xs font-normal text-muted";

const isType = (f: string): f is SourceType => f === "hls" || f === "mp4" || f === "youtube";

const SAMPLE = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

/**
 * Video source URL + format fields with a live player: paste an HLS (.m3u8)
 * or MP4 link and press Play to check it streams before saving.
 */
export default function SourcePreview({
  defaultUrl, defaultType, title, poster, subtitles,
}: {
  defaultUrl: string;
  defaultType: string;
  title: string;
  poster?: string;
  subtitles?: Subtitle[];
}) {
  const [url, setUrl] = useState(defaultUrl);
  const [format, setFormat] = useState(defaultType);
  const [playing, setPlaying] = useState<{ src: string; type: SourceType } | null>(null);

  const clean = url.trim();
  const resolved: SourceType = isType(format) ? format : detectSourceType(clean);
  const valid = /^(https?:\/\/|\/)/i.test(clean);

  const play = () => {
    if (valid) setPlaying({ src: clean, type: resolved });
  };

  return (
    <>
      <div className={`${label} sm:col-span-2`}>
        <label htmlFor="sourceUrl">Video source URL *</label>
        <div className="mt-1 flex gap-2">
          <input
            id="sourceUrl"
            name="sourceUrl"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text").trim();
              if (/^https?:\/\//i.test(pasted)) {
                const type = isType(format) ? format : detectSourceType(pasted);
                setTimeout(() => setPlaying({ src: pasted, type }), 0);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                play();
              }
            }}
            placeholder="https://cdn.example.com/film/master.m3u8"
            className="field font-mono !text-xs"
          />
          <button type="button" onClick={play} disabled={!valid} className="btn btn-primary shrink-0">
            ▶ Play
          </button>
        </div>
        <p className={hint}>
          Paste an HLS playlist (.m3u8), MP4 or YouTube link — it starts playing below so you can check it works. Files in{" "}
          <code>public/media</code> can be used as <code>/media/film.mp4</code>.{" "}
          {!clean && (
            <button type="button" className="font-semibold text-accent hover:underline" onClick={() => { setUrl(SAMPLE); setPlaying({ src: SAMPLE, type: "hls" }); }}>
              Try a sample stream
            </button>
          )}
        </p>
      </div>

      <label className={label}>
        Format
        <select name="sourceType" value={format} onChange={(e) => setFormat(e.target.value)} className="field mt-1">
          <option value="auto">Detect from URL</option>
          <option value="hls">HLS (.m3u8)</option>
          <option value="mp4">MP4 / WebM file</option>
        </select>
        {format === "auto" && clean && <p className={hint}>Detected: {resolved === "hls" ? "HLS stream" : resolved === "youtube" ? "YouTube video" : "video file"}</p>}
      </label>

      <div className="sm:col-span-2">
        {playing ? (
          <div className="overflow-hidden rounded-lg border border-line bg-black">
            <div className="flex items-center justify-between gap-3 border-b border-line bg-surface px-3 py-2 text-xs">
              <span className="min-w-0 truncate font-mono text-muted">
                <b className="mr-2 rounded bg-accent/15 px-1.5 py-0.5 font-sans text-accent uppercase">{playing.type}</b>
                {playing.src}
              </span>
              <button type="button" onClick={() => setPlaying(null)} className="shrink-0 font-semibold text-muted hover:text-text">
                Close
              </button>
            </div>
            <div className="aspect-video">
              {playing.type === "youtube" ? (
                <YouTubeFrame url={playing.src} title={title || "Preview"} autoPlay />
              ) : (
              <Player
                key={`${playing.type}:${playing.src}`}
                src={playing.src}
                type={playing.type}
                title={title || "Preview"}
                poster={poster}
                subtitles={subtitles}
                card={{ slug: "__admin-preview", title: title || "Preview", year: null, posterUrl: "", genres: [], durationMin: null }}
                noProgress
                autoPlay
              />
              )}
            </div>
          </div>
        ) : (
          <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-line text-center text-sm text-muted">
            <div>
              <div className="text-3xl">▶</div>
              <p className="mt-2">Paste a stream URL above to preview it here.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
