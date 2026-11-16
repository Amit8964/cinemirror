"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { buildStreamSrc } from "@/lib/stream";
import { AlertIcon } from "./icons";

/** After this long without a load event, offer a retry (cross-origin iframes never report errors). */
const SLOW_MS = 12_000;

export interface ExternalStreamPlayerProps {
  /** TMDB id of the movie. */
  resourceId: number | string;
  /** Base URL pattern with an {id} placeholder — see src/lib/stream.ts. */
  pattern: string;
  /** Accessible name for the iframe. */
  title?: string;
  /** Backdrop shown behind the loading indicator. */
  poster?: string;
  /**
   * Sandbox the frame: scripts and fullscreen work, but it cannot open pop-ups or redirect the page.
   * Turn off only for a player you trust that refuses to run sandboxed.
   */
  sandboxed?: boolean;
  className?: string;
}

/**
 * Full-width 16:9 iframe player for a video hosted elsewhere.
 * Memoised (props are primitives), and the frame's loading state lives in a keyed child so a new
 * id or a retry resets it without extra effects or re-renders of the parent page.
 */
function ExternalStreamPlayer({
  resourceId, pattern, title = "Video player", poster, sandboxed = true, className = "",
}: ExternalStreamPlayerProps) {
  const src = useMemo(() => buildStreamSrc(pattern, resourceId), [pattern, resourceId]);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return (
    <div className={`relative aspect-video w-full overflow-hidden rounded-xl border border-line bg-black ${className}`}>
      {src ? (
        <Frame key={`${src}#${attempt}`} src={src} title={title} poster={poster} sandboxed={sandboxed} onRetry={retry} />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">
          <p className="flex items-center gap-2"><AlertIcon className="text-accent" /> The player isn&apos;t available for this title.</p>
        </div>
      )}
    </div>
  );
}

type Status = "loading" | "slow" | "ready";

const Frame = memo(function Frame({
  src, title, poster, sandboxed, onRetry,
}: { src: string; title: string; poster?: string; sandboxed: boolean; onRetry: () => void }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<Status>("loading");

  // An empty frame fires a load event for about:blank — only count the real page.
  const onLoad = useCallback((e: SyntheticEvent<HTMLIFrameElement>) => {
    if (e.currentTarget.getAttribute("src")) setStatus("ready");
  }, []);

  // The src is set here rather than in the markup, once the player is near the viewport:
  //  - the page never downloads a player nobody scrolls to (lazy loading),
  //  - the load event can't fire before React is listening (hydration race),
  //  - the "taking longer than usual" timer starts only when loading really starts.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      if (el.getAttribute("src") !== src) el.src = src;
      timer = setTimeout(() => setStatus((s) => (s === "loading" ? "slow" : s)), SLOW_MS);
    };
    if (typeof IntersectionObserver === "undefined") {
      start();
      return () => clearTimeout(timer);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          io.disconnect();
          start();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, [src]);

  return (
    <>
      <iframe
        ref={ref}
        title={title}
        onLoad={onLoad}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox={sandboxed ? "allow-scripts allow-same-origin allow-presentation allow-forms" : undefined}
        className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-500 ${status === "ready" ? "opacity-100" : "opacity-0"}`}
      />

      {status !== "ready" && (
        <div role="status" aria-live="polite" className="absolute inset-0 grid place-items-center">
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" decoding="async" className="absolute inset-0 h-full w-full scale-105 object-cover opacity-30 blur-sm" />
          )}
          <div className="relative flex flex-col items-center gap-3 px-6 text-center">
            {status === "loading" ? (
              <>
                <span className="spinner" />
                <p className="text-sm font-semibold text-text/85">Loading player…</p>
              </>
            ) : (
              <>
                <AlertIcon className="text-3xl text-accent" />
                <p className="text-sm font-semibold text-text/90">This is taking longer than usual.</p>
                <button type="button" onClick={onRetry} className="btn btn-primary !py-2 !text-xs">Try again</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
});

export default memo(ExternalStreamPlayer);
