import type { Metadata } from "next";
import StatsView, { parseDays, RangeTabs } from "@/components/admin/StatsView";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverview({ searchParams }: PageProps<"/admin">) {
  const days = parseDays((await searchParams).days);
  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Overview</h1>
          <p className="text-sm text-muted">Every play on this site and through partner embeds.</p>
        </div>
        <RangeTabs days={days} basePath="/admin" />
      </div>
      <StatsView filter={{ days }} />
    </>
  );
}
