import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { syncPublicStreams } from "@/lib/public-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Manual / external-cron trigger for the public-catalogue import. Admin session or `Authorization: Bearer $CRON_SECRET`.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const okCron = !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
  if (!okCron && !(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await syncPublicStreams());
}
