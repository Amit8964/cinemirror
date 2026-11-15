"use client";

import { useState } from "react";
import type { DailyPoint } from "@/lib/analytics";

// Series colours follow the entity (on-site vs partner embeds), never rank.
// Validated for the dark surface with the dataviz palette validator.
const SERIES = {
  direct: { label: "On this site", color: "#3987e5" },
  embed: { label: "Partner embeds", color: "#d95926" },
} as const;

function niceMax(n: number): number {
  if (n <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(n));
  for (const m of [1, 2, 4, 5, 10]) if (m * pow >= n) return m * pow;
  return 10 * pow;
}

const fmtDay = (day: string, long = false) =>
  new Date(day + "T00:00:00Z").toLocaleDateString("en", {
    month: "short", day: "numeric", timeZone: "UTC", ...(long ? { weekday: "short" } : {}),
  });

/** Plays per day, stacked by where they were watched. `only` hides the other series. */
export default function DailyChart({ data, only }: { data: DailyPoint[]; only?: "embed" }) {
  const [active, setActive] = useState<number | null>(null);
  const [table, setTable] = useState(false);

  const keys = only ? (["embed"] as const) : (["direct", "embed"] as const);
  const totals = data.map((d) => keys.reduce((s, k) => s + d[k], 0));
  const max = niceMax(Math.max(...totals, 0));
  const ticks = [max, max / 2, 0];
  const empty = totals.every((t) => t === 0);
  const labelEvery = Math.ceil(data.length / 7);
  const point = active !== null ? data[active] : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {keys.length > 1 &&
          keys.map((k) => (
            <span key={k} className="flex items-center gap-2 text-xs font-semibold text-muted">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[k].color }} />
              {SERIES[k].label}
            </span>
          ))}
        <button
          type="button"
          onClick={() => setTable((t) => !t)}
          className="ml-auto text-xs font-semibold text-muted underline-offset-2 hover:text-text hover:underline"
        >
          {table ? "Show chart" : "Show as table"}
        </button>
      </div>

      {table ? (
        <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-raised text-left text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Day (UTC)</th>
                {keys.map((k) => <th key={k} className="px-3 py-2 text-right font-semibold">{SERIES[k].label}</th>)}
                {keys.length > 1 && <th className="px-3 py-2 text-right font-semibold">Total</th>}
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.day} className="border-t border-line">
                  <td className="px-3 py-1.5">{fmtDay(d.day, true)}</td>
                  {keys.map((k) => <td key={k} className="px-3 py-1.5 text-right tabular-nums">{d[k]}</td>)}
                  {keys.length > 1 && <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{d.direct + d.embed}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative mt-4">
          <div className="flex">
            {/* y axis */}
            <div className="flex h-48 w-9 shrink-0 flex-col justify-between pr-2 text-right text-[11px] text-muted tabular-nums">
              {ticks.map((t) => <span key={t} className="leading-none">{t}</span>)}
            </div>
            <div className="relative h-48 min-w-0 flex-1" onPointerLeave={() => setActive(null)}>
              {/* gridlines */}
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                {ticks.map((t) => <div key={t} className="border-t border-line/70" />)}
              </div>
              {empty && (
                <p className="absolute inset-0 grid place-items-center text-sm text-muted">No plays in this period yet</p>
              )}
              {/* columns */}
              <div className="absolute inset-0 flex items-end" role="img" aria-label="Plays per day">
                {data.map((d, i) => (
                  <button
                    key={d.day}
                    type="button"
                    aria-label={`${fmtDay(d.day, true)}: ${totals[i]} plays`}
                    onPointerEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    className={`flex h-full min-w-0 flex-1 cursor-default flex-col items-center justify-end gap-[2px] rounded-sm px-[1px] outline-none ${active === i ? "bg-white/[0.06]" : ""}`}
                  >
                    {[...keys].reverse().map((k, idx) =>
                      d[k] > 0 ? (
                        <span
                          key={k}
                          className={`w-full max-w-6 ${idx === 0 || (keys.length > 1 && d.embed === 0) ? "rounded-t-[4px]" : ""}`}
                          style={{ height: `${(d[k] / max) * 100}%`, minHeight: 2, background: SERIES[k].color }}
                        />
                      ) : null,
                    )}
                  </button>
                ))}
              </div>
              {/* tooltip */}
              {point && active !== null && (
                <div
                  className="pointer-events-none absolute top-0 z-10 w-44 rounded-lg border border-line bg-ink/95 p-2.5 text-xs shadow-xl"
                  // Sit beside the hovered column, never on top of it.
                  style={
                    active >= data.length / 2
                      ? { right: `calc(${((data.length - active) / data.length) * 100}% + 6px)` }
                      : { left: `calc(${((active + 1) / data.length) * 100}% + 6px)` }
                  }
                >
                  <p className="font-semibold text-text">{fmtDay(point.day, true)}</p>
                  {keys.map((k) => (
                    <p key={k} className="mt-1 flex items-center gap-2 text-muted">
                      <span className="h-2 w-2 rounded-sm" style={{ background: SERIES[k].color }} />
                      <span className="flex-1">{SERIES[k].label}</span>
                      <span className="font-semibold text-text tabular-nums">{point[k]}</span>
                    </p>
                  ))}
                  {keys.length > 1 && (
                    <p className="mt-1 flex justify-between border-t border-line pt-1 text-muted">
                      Total <span className="font-semibold text-text tabular-nums">{point.direct + point.embed}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* x axis */}
          <div className="mt-1.5 ml-9 flex text-[11px] text-muted">
            {data.map((d, i) => (
              <span key={d.day} className="min-w-0 flex-1 text-center whitespace-nowrap">
                {(data.length - 1 - i) % labelEvery === 0 ? (
                  <span className="inline-block -translate-x-0">{fmtDay(d.day)}</span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
