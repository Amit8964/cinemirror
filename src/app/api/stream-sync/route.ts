import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { syncStreamLinks } from "@/lib/stream-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Manual / external-cron trigger for the stream sync. Allowed for a signed-in admin, or with
// `Authorization: Bearer $CRON_SECRET` (for platforms where the in-process worker can't live).
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const bearer = req.headers.get("authorization");
  const okCron = !!secret && bearer === `Bearer ${secret}`;
  if (!okCron && !(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await syncStreamLinks());
}
