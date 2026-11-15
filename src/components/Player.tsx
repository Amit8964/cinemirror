"use client";

import type Hls from "hls.js";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { SourceType, Subtitle, TitleCardData } from "@/lib/types";
import { clearProgress, getProgress, getViewerId, saveProgress } from "@/lib/storage";
import { formatClock } from "@/lib/util";
import {
  ArrowLeftIcon, Back10Icon, CaptionsIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon,
  ExitFullscreenIcon, FullscreenIcon, Fwd10Icon, MuteIcon, PauseIcon, PipIcon, PlayIcon,
  SettingsIcon, VolumeIcon, VolumeLowIcon,
} from "./icons";

export interface PlayerProps {
  src: string;
  type: SourceType;
  title: string;
  card: TitleCardData;
  poster?: string;
  subtitles?: Subtitle[];
  /** Signed grant from the server; without it nothing is tracked (e.g. admin preview). */
  grant?: string | null;
  /** Rendered inside a partner's iframe. */
  embed?: boolean;
  backHref?: string;
  /** Embed only: link back to the title on this site. */
  brandHref?: string;
  autoPlay?: boolean;
  startAt?: number;
}

interface Level {
  index: number;
  height: number;
  bitrate: number;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const HEARTBEAT_SEC = 15;
const HIDE_CONTROLS_MS = 2800;

type Menu = null | "main" | "quality" | "speed" | "subs";

const noopSubscribe = () => () => {};

export default function Player({
  src, type, title, card, poster, subtitles = [], grant, embed, backHref, brandHref, autoPlay, startAt,
}: PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [levels, setLevels] = useState<Level[]>([]);
  const [chosenLevel, setChosenLevel] = useState(-1); // -1 = auto
  const [activeLevel, setActiveLevel] = useState(-1);
  const [tracks, setTracks] = useState<(Subtitle & { blobUrl: string })[]>([]);
  const [activeSub, setActiveSub] = useState(-1);
  const [fullscreen, setFullscreen] = useState(false);
  const canPip = useSyncExternalStore(noopSubscribe, () => document.pictureInPictureEnabled === true, () => false);
  const [controls, setControls] = useState(true);
  const [menu, setMenu] = useState<Menu>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // ---- analytics --------------------------------------------------------------
  const tracking = useRef({
    play: null as string | null,
    starting: false,
    acc: 0,
    lastTime: -1,
    lastTick: 0,
    sinceBeat: 0,
    sinceSave: 0,
  });

  const flushBeat = useCallback((opts: { ended?: boolean; beacon?: boolean } = {}) => {
    const t = tracking.current;
    const video = videoRef.current;
    if (!t.play || !video) return;
    const delta = Math.round(t.acc);
    if (delta < 1 && !opts.ended) return;
    t.acc -= delta;
    t.sinceBeat = 0;
    const body = JSON.stringify({
      play: t.play,
      delta,
      pos: Math.round(video.currentTime || 0),
      dur: Number.isFinite(video.duration) ? Math.round(video.duration) : 0,
      ended: opts.ended === true,
    });
    if (opts.beacon && navigator.sendBeacon) {
      navigator.sendBeacon("/api/track/beat", body);
    } else {
      fetch("/api/track/beat", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
    }
  }, []);

  const startTracking = useCallback(() => {
    const t = tracking.current;
    if (!grant || t.play || t.starting) return;
    t.starting = true;
    let ref: string | undefined;
    if (embed) {
      try {
        ref = window.location.ancestorOrigins?.[0] || document.referrer || undefined;
      } catch {
        ref = document.referrer || undefined;
      }
    }
    fetch("/api/track/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: grant, vid: getViewerId(), ref }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.play) t.play = data.play;
        else t.starting = false;
      })
      .catch(() => {
        t.starting = false;
      });
  }, [grant, embed]);

  // One-second ticker: measures real watch time, sends heartbeats, saves progress.
  useEffect(() => {
    const id = setInterval(() => {
      const video = videoRef.current;
      const t = tracking.current;
      if (!video) return;
      const now = performance.now();
      const advanced = !video.paused && video.currentTime !== t.lastTime;
      if (advanced && t.lastTick) t.acc += Math.min(2, (now - t.lastTick) / 1000);
      t.lastTime = video.currentTime;
      t.lastTick = now;
      if (!advanced) return;

      if (++t.sinceBeat >= HEARTBEAT_SEC) flushBeat();
      if (++t.sinceSave >= 5) {
        t.sinceSave = 0;
        const d = video.duration;
        if (Number.isFinite(d) && d > 60) saveProgress(card, video.currentTime, d);
      }
    }, 1000);
    const onHide = () => {
      if (document.visibilityState === "hidden") flushBeat({ beacon: true });
    };
    const onLeave = () => flushBeat({ beacon: true });
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onLeave);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onLeave);
      flushBeat({ beacon: true });
    };
  }, [card, flushBeat]);

  // ---- source loading -----------------------------------------------------------
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let hls: Hls | null = null;
    let networkRetries = 0;

    if (type === "hls") {
      import("hls.js")
        .then(({ default: HlsLib }) => {
          if (cancelled) return;
          if (HlsLib.isSupported()) {
            hls = new HlsLib({ capLevelToPlayerSize: true, maxBufferLength: 30 });
            hlsRef.current = hls;
            hls.on(HlsLib.Events.MANIFEST_PARSED, (_e, data) => {
              const seen = new Set<number>();
              const list: Level[] = [];
              data.levels.forEach((l, index) => {
                if (l.height && !seen.has(l.height)) {
                  seen.add(l.height);
                  list.push({ index, height: l.height, bitrate: l.bitrate });
                }
              });
              setLevels(list.sort((a, b) => b.height - a.height));
            });
            hls.on(HlsLib.Events.LEVEL_SWITCHED, (_e, data) => setActiveLevel(data.level));
            hls.on(HlsLib.Events.ERROR, (_e, data) => {
              if (!data.fatal || !hls) return;
              if (data.type === HlsLib.ErrorTypes.MEDIA_ERROR) {
                hls.recoverMediaError();
              } else if (data.type === HlsLib.ErrorTypes.NETWORK_ERROR && networkRetries < 2) {
                networkRetries++;
                hls.startLoad();
              } else {
                setError("This stream could not be loaded.");
                hls.destroy();
              }
            });
            hls.loadSource(src);
            hls.attachMedia(video);
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = src; // Safari / iOS play HLS natively
          } else {
            setError("This browser cannot play this stream.");
          }
        })
        .catch(() => setError("The player failed to load."));
    } else {
      video.src = src;
    }

    return () => {
      cancelled = true;
      hls?.destroy();
      hlsRef.current = null;
      video.removeAttribute("src");
      video.load();
    };
  }, [src, type, reloadKey]);

  // Subtitles are fetched and attached as blob URLs so the <video> element does
  // not need crossOrigin (which would break media hosts without CORS headers).
  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    Promise.all(
      subtitles.map(async (s) => {
        try {
          const res = await fetch(s.url);
          if (!res.ok) return null;
          let text = await res.text();
          if (!text.trimStart().startsWith("WEBVTT")) {
            // minimal SRT -> VTT
            text = "WEBVTT\n\n" + text.replace(/\r/g, "").replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, "$1.$2");
          }
          const blobUrl = URL.createObjectURL(new Blob([text], { type: "text/vtt" }));
          urls.push(blobUrl);
          return { ...s, blobUrl };
        } catch {
          return null;
        }
      }),
    ).then((list) => {
      if (!cancelled) setTracks(list.filter((x): x is Subtitle & { blobUrl: string } => x !== null));
    });
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(subtitles)]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const active = activeSub >= 0 ? tracks[activeSub] : null;
    for (const tt of Array.from(video.textTracks)) {
      tt.mode = active && tt.label === active.label && tt.language === active.lang ? "showing" : "disabled";
    }
  }, [activeSub, tracks]);

  // ---- helpers ------------------------------------------------------------------
  const showFlash = useCallback((text: string) => {
    setFlash(text);
    setTimeout(() => setFlash((f) => (f === text ? null : f)), 600);
  }, []);

  const wake = useCallback(() => {
    setControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), HIDE_CONTROLS_MS);
  }, []);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || error) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }, [error]);

  const seekBy = useCallback((sec: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.min(video.duration, Math.max(0, video.currentTime + sec));
    setTime(video.currentTime);
    showFlash(`${sec > 0 ? "+" : "−"}${Math.abs(sec)}s`);
  }, [showFlash]);

  const changeVolume = useCallback((v: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = Math.min(1, Math.max(0, v));
    video.muted = video.volume === 0;
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) video.volume = 0.5;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if (video?.webkitEnterFullscreen) {
      video.webkitEnterFullscreen(); // iPhone
    }
  }, []);

  const togglePip = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    else video.requestPictureInPicture?.().catch(() => {});
  }, []);

  const pickLevel = (index: number) => {
    setChosenLevel(index);
    if (hlsRef.current) hlsRef.current.currentLevel = index;
    setMenu(null);
  };

  const pickSpeed = (s: number) => {
    if (videoRef.current) videoRef.current.playbackRate = s;
    setMenu(null);
  };

  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const video = videoRef.current;
      if (!video) return;
      let handled = true;
      switch (e.key) {
        case " ":
        case "k":
          // let focused buttons handle their own Space press
          if (e.key === " " && tag === "BUTTON") return;
          togglePlay();
          break;
        case "ArrowLeft": seekBy(-5); break;
        case "ArrowRight": seekBy(5); break;
        case "j": seekBy(-10); break;
        case "l": seekBy(10); break;
        case "ArrowUp": changeVolume(video.volume + 0.05); break;
        case "ArrowDown": changeVolume(video.volume - 0.05); break;
        case "m": toggleMute(); break;
        case "f": toggleFullscreen(); break;
        case "c": setActiveSub((s) => (tracks.length ? (s >= 0 ? -1 : 0) : -1)); break;
        case "Escape": setMenu(null); break;
        default:
          if (/^[0-9]$/.test(e.key) && Number.isFinite(video.duration)) {
            video.currentTime = (Number(e.key) / 10) * video.duration;
          } else {
            handled = false;
          }
      }
      if (handled) {
        e.preventDefault();
        wake();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekBy, changeVolume, toggleMute, toggleFullscreen, wake, tracks.length]);

  // ---- seek bar -------------------------------------------------------------------
  const barRef = useRef<HTMLDivElement>(null);
  const ratioAt = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };
  const onBarDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setScrubbing(true);
    const r = ratioAt(e.clientX);
    setTime(r * duration);
    setHover({ x: r, t: r * duration });
  };
  const onBarMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    const r = ratioAt(e.clientX);
    setHover({ x: r, t: r * duration });
    if (scrubbing) setTime(r * duration);
    wake();
  };
  const onBarUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbing) return;
    setScrubbing(false);
    if (e.pointerType !== "mouse") setHover(null);
    const video = videoRef.current;
    if (video && duration) video.currentTime = ratioAt(e.clientX) * duration;
  };

  // ---- video events -----------------------------------------------------------------
  const onLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    const saved = getProgress(card.slug);
    const resume = startAt && startAt > 0 ? startAt : saved?.time;
    if (resume && Number.isFinite(video.duration) && resume > 5 && resume < video.duration - 20) {
      video.currentTime = resume;
    }
    if (autoPlay) {
      video.play().catch(() => {
        // Browsers block unmuted autoplay inside iframes: retry muted.
        if (embed) {
          video.muted = true;
          video.play().catch(() => {});
        }
      });
    }
  };

  const onProgress = () => {
    const video = videoRef.current;
    if (!video || !video.buffered.length) return;
    let end = 0;
    for (let i = 0; i < video.buffered.length; i++) {
      if (video.buffered.start(i) <= video.currentTime + 1) end = Math.max(end, video.buffered.end(i));
    }
    setBuffered(end);
  };

  const onVideoError = () => {
    // hls.js reports its own errors; this covers plain MP4 and native HLS.
    if (hlsRef.current) return;
    if (videoRef.current?.getAttribute("src")) setError("This video could not be loaded.");
  };

  const surfaceClick = (e: React.PointerEvent) => {
    if (menu) {
      setMenu(null);
      return;
    }
    if (e.pointerType === "mouse") {
      togglePlay();
      wake();
    } else if (controls && playing) {
      setControls(false);
    } else {
      wake();
    }
  };

  const uiVisible = controls || !playing || menu !== null || scrubbing;
  const playedPct = duration ? (time / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;
  const activeHeight = levels.find((l) => l.index === activeLevel)?.height;
  const qualityLabel =
    chosenLevel === -1 ? `Auto${activeHeight ? ` (${activeHeight}p)` : ""}` : `${levels.find((l) => l.index === chosenLevel)?.height ?? ""}p`;
  const VolIcon = muted || volume === 0 ? MuteIcon : volume < 0.5 ? VolumeLowIcon : VolumeIcon;

  const ctl =
    "grid h-10 w-10 shrink-0 place-items-center rounded-full text-[1.35rem] text-white/90 transition hover:bg-white/15 hover:text-white";

  return (
    <div
      ref={containerRef}
      className={`group/player relative h-full w-full overflow-hidden bg-black text-white select-none ${uiVisible ? "" : "cursor-none"}`}
      onPointerMove={(e) => e.pointerType === "mouse" && wake()}
      onPointerLeave={(e) => e.pointerType === "mouse" && playing && !menu && setControls(false)}
    >
      <video
        key={reloadKey}
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-contain"
        poster={poster || undefined}
        playsInline
        preload="metadata"
        onPlay={() => { setPlaying(true); setStarted(true); wake(); }}
        onPlaying={() => { setWaiting(false); startTracking(); }}
        onPause={() => { setPlaying(false); flushBeat(); }}
        onWaiting={() => setWaiting(true)}
        onCanPlay={() => setWaiting(false)}
        onSeeked={() => setWaiting(false)}
        onTimeUpdate={(e) => !scrubbing && setTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
        onLoadedMetadata={onLoadedMetadata}
        onProgress={onProgress}
        onVolumeChange={(e) => { setVolume(e.currentTarget.volume); setMuted(e.currentTarget.muted); }}
        onRateChange={(e) => setRate(e.currentTarget.playbackRate)}
        onEnded={() => { setPlaying(false); flushBeat({ ended: true }); clearProgress(card.slug); }}
        onError={onVideoError}
      >
        {tracks.map((t) => (
          <track key={t.blobUrl} kind="subtitles" src={t.blobUrl} label={t.label} srcLang={t.lang} />
        ))}
      </video>

      {/* click / tap surface */}
      <div
        className="absolute inset-0"
        onPointerUp={surfaceClick}
        onDoubleClick={toggleFullscreen}
        aria-hidden="true"
      />

      {/* centre state */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        {error ? (
          <div className="pointer-events-auto mx-6 max-w-sm rounded-xl border border-white/10 bg-black/80 p-6 text-center">
            <p className="text-base font-semibold">{error}</p>
            <p className="mt-1 text-sm text-white/60">Check your connection and try again.</p>
            <button
              className="btn btn-primary mt-4"
              onClick={() => { setError(null); setLevels([]); setReloadKey((k) => k + 1); }}
            >
              Retry
            </button>
          </div>
        ) : waiting && started ? (
          <div className="spinner" role="status" aria-label="Buffering" />
        ) : flash ? (
          <div className="rounded-full bg-black/60 px-4 py-2 text-lg font-bold tabular-nums">{flash}</div>
        ) : !playing ? (
          <button
            onClick={togglePlay}
            aria-label="Play"
            className="pointer-events-auto grid h-20 w-20 place-items-center rounded-full bg-accent text-4xl text-accent-ink shadow-2xl shadow-black/60 transition hover:scale-105"
          >
            <PlayIcon className="translate-x-0.5" />
          </button>
        ) : null}
      </div>

      {/* top bar */}
      <div
        className={`absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent px-3 pt-3 pb-10 transition-opacity duration-200 sm:px-5 ${uiVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {backHref && (
          <Link href={backHref} aria-label="Back" className={ctl}>
            <ArrowLeftIcon />
          </Link>
        )}
        <p className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">{title}</p>
        {embed && brandHref && (
          <a
            href={brandHref}
            target="_blank"
            rel="noopener"
            className="shrink-0 rounded-md bg-black/40 px-2.5 py-1 font-display text-lg leading-none tracking-wide text-white/90 hover:text-white"
          >
            MOVIE<span className="text-accent">HUB</span>
          </a>
        )}
      </div>

      {/* bottom controls */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pt-12 pb-2 transition-opacity duration-200 sm:px-5 sm:pb-3 ${uiVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {/* seek bar */}
        <div
          ref={barRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${formatClock(time)} of ${formatClock(duration)}`}
          className="group/bar relative flex h-5 cursor-pointer touch-none items-center"
          onPointerDown={onBarDown}
          onPointerMove={onBarMove}
          onPointerUp={onBarUp}
          onPointerCancel={() => { setScrubbing(false); setHover(null); }}
          onPointerLeave={() => !scrubbing && setHover(null)}
        >
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/25 transition-[height] group-hover/bar:h-1.5">
            <div className="absolute inset-y-0 left-0 bg-white/35" style={{ width: `${bufferedPct}%` }} />
            <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${playedPct}%` }} />
          </div>
          <div
            className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow transition-transform ${scrubbing || hover ? "scale-100" : "scale-0 group-hover/bar:scale-100"}`}
            style={{ left: `${playedPct}%` }}
          />
          {hover && duration > 0 && (
            <div
              className="pointer-events-none absolute bottom-6 -translate-x-1/2 rounded bg-black/90 px-2 py-1 text-xs font-semibold tabular-nums"
              style={{ left: `${Math.min(96, Math.max(4, hover.x * 100))}%` }}
            >
              {formatClock(hover.t)}
            </div>
          )}
        </div>

        <div className="mt-0.5 flex items-center gap-0.5 sm:gap-1">
          <button className={ctl} onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button className={ctl} onClick={() => seekBy(-10)} aria-label="Back 10 seconds">
            <Back10Icon />
          </button>
          <button className={ctl} onClick={() => seekBy(10)} aria-label="Forward 10 seconds">
            <Fwd10Icon />
          </button>

          <div className="group/vol flex items-center">
            <button className={ctl} onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
              <VolIcon />
            </button>
            <input
              type="range" min={0} max={1} step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label="Volume"
              className="hidden h-1 w-0 cursor-pointer accent-[var(--color-accent)] opacity-0 transition-all group-focus-within/vol:w-20 group-focus-within/vol:opacity-100 group-hover/vol:w-20 group-hover/vol:opacity-100 sm:block"
            />
          </div>

          <span className="ml-1 text-xs font-medium whitespace-nowrap text-white/85 tabular-nums sm:text-sm">
            {formatClock(time)} <span className="text-white/50">/ {formatClock(duration)}</span>
          </span>

          <div className="flex-1" />

          {tracks.length > 0 && (
            <button
              className={`${ctl} ${activeSub >= 0 ? "text-accent" : ""}`}
              onClick={() => setActiveSub((s) => (s >= 0 ? -1 : 0))}
              aria-label="Subtitles"
              aria-pressed={activeSub >= 0}
            >
              <CaptionsIcon />
            </button>
          )}
          <button
            className={ctl}
            onClick={() => setMenu((m) => (m ? null : "main"))}
            aria-label="Settings"
            aria-expanded={menu !== null}
          >
            <SettingsIcon />
          </button>
          {canPip && (
            <button className={`${ctl} hidden sm:grid`} onClick={togglePip} aria-label="Picture in picture">
              <PipIcon />
            </button>
          )}
          <button className={ctl} onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          </button>
        </div>
      </div>

      {/* settings menu */}
      {menu && (
        <div className="absolute right-3 bottom-20 max-h-[70%] w-60 overflow-y-auto rounded-xl border border-white/10 bg-[#10131a]/95 p-1.5 text-sm shadow-2xl backdrop-blur sm:right-5">
          {menu === "main" && (
            <>
              {levels.length > 1 && <MenuRow label="Quality" value={qualityLabel} onClick={() => setMenu("quality")} />}
              <MenuRow label="Speed" value={rate === 1 ? "Normal" : `${rate}×`} onClick={() => setMenu("speed")} />
              {tracks.length > 0 && (
                <MenuRow label="Subtitles" value={activeSub >= 0 ? tracks[activeSub].label : "Off"} onClick={() => setMenu("subs")} />
              )}
            </>
          )}
          {menu === "quality" && (
            <>
              <MenuBack label="Quality" onClick={() => setMenu("main")} />
              <MenuOption label="Auto" selected={chosenLevel === -1} onClick={() => pickLevel(-1)} />
              {levels.map((l) => (
                <MenuOption key={l.index} label={`${l.height}p`} selected={chosenLevel === l.index} onClick={() => pickLevel(l.index)} />
              ))}
            </>
          )}
          {menu === "speed" && (
            <>
              <MenuBack label="Speed" onClick={() => setMenu("main")} />
              {SPEEDS.map((s) => (
                <MenuOption key={s} label={s === 1 ? "Normal" : `${s}×`} selected={rate === s} onClick={() => pickSpeed(s)} />
              ))}
            </>
          )}
          {menu === "subs" && (
            <>
              <MenuBack label="Subtitles" onClick={() => setMenu("main")} />
              <MenuOption label="Off" selected={activeSub === -1} onClick={() => { setActiveSub(-1); setMenu(null); }} />
              {tracks.map((t, i) => (
                <MenuOption key={t.blobUrl} label={t.label} selected={activeSub === i} onClick={() => { setActiveSub(i); setMenu(null); }} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const rowCls = "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-white/10";

function MenuRow({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button className={rowCls} onClick={onClick}>
      <span className="flex-1 font-semibold">{label}</span>
      <span className="text-white/60">{value}</span>
      <ChevronRightIcon className="text-white/50" />
    </button>
  );
}

function MenuBack({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className={`${rowCls} mb-1 border-b border-white/10 font-semibold`} onClick={onClick}>
      <ChevronLeftIcon className="text-white/60" />
      {label}
    </button>
  );
}

function MenuOption({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button className={rowCls} onClick={onClick} role="menuitemradio" aria-checked={selected}>
      <span className="grid w-5 place-items-center text-accent">{selected && <CheckIcon />}</span>
      <span className={selected ? "font-semibold" : "text-white/80"}>{label}</span>
    </button>
  );
}
