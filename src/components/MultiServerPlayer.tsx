"use client";

import { useState, useSyncExternalStore } from "react";
import ExternalStreamPlayer from "./ExternalStreamPlayer";
import type { StreamServer } from "@/lib/local-servers";

// Per-server ad-block preference in localStorage, read through useSyncExternalStore so the server
// render (no storage) and the client agree, and other tabs' changes are picked up.
const prefKey = (server: string) => `cm_adblock_${server}`;
const CHANGE = "cm-adblock-change";

function readPref(id: string): "on" | "off" | null {
  try {
    const v = localStorage.getItem(prefKey(id));
    return v === "on" || v === "off" ? v : null;
  } catch {
    return null; // storage blocked — use the server's default
  }
}

function writePref(id: string, on: boolean) {
  try {
    localStorage.setItem(prefKey(id), on ? "on" : "off");
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(CHANGE));
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(CHANGE, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(CHANGE, cb);
  };
}

export interface MultiServerPlayerProps {
  servers: StreamServer[];
  resourceId: number | string;
  season?: number;
  episode?: number;
  title?: string;
  poster?: string;
  className?: string;
}

/**
 * ExternalStreamPlayer with a server switcher and a per-server "Ad Block" (sandbox) toggle.
 * With a single server and nothing to switch, it renders just like ExternalStreamPlayer plus the toggle.
 */
export default function MultiServerPlayer({ servers, resourceId, season, episode, title, poster, className = "" }: MultiServerPlayerProps) {
  const [idx, setIdx] = useState(0);
  const server = servers[Math.min(idx, servers.length - 1)];
  const serverId = server?.id ?? "";
  const stored = useSyncExternalStore(subscribe, () => readPref(serverId), () => null);

  if (!server) return null;

  const sandboxed = stored ? stored === "on" : server.sandboxDefault;
  const toggle = () => writePref(server.id, !sandboxed);

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {servers.length > 1 && <span className="mr-1 text-xs font-semibold tracking-wider text-muted uppercase">Server</span>}
        {servers.length > 1 && servers.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setIdx(i)}
            aria-pressed={s.id === server.id}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              s.id === server.id ? "bg-accent text-ink" : "border border-line text-muted hover:text-text"
            }`}
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          onClick={toggle}
          aria-pressed={sandboxed}
          title={sandboxed
            ? "Pop-up and redirect ads are blocked. If this server says “disable sandbox”, turn this off."
            : "Ad blocking is off for this server — pop-ups may appear."}
          className={`ml-auto rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            sandboxed ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-400" : "border border-line text-muted hover:text-text"
          }`}
        >
          Ad Block: {sandboxed ? "ON" : "OFF"}
        </button>
      </div>
      <ExternalStreamPlayer
        // A sandbox change only takes effect on a fresh iframe, so remount on server or sandbox change.
        key={`${server.id}:${sandboxed ? 1 : 0}`}
        resourceId={resourceId}
        pattern={server.pattern}
        season={season}
        episode={episode}
        title={title}
        poster={poster}
        sandboxed={sandboxed}
        referrerPolicy={server.referrerPolicy}
      />
    </div>
  );
}
