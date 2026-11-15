import { NextResponse } from "next/server";
import { recordBeat } from "@/lib/analytics";
import { readBody } from "@/lib/request";
import { verifyPlayGrant } from "@/lib/tokens";

export const dynamic = "force-dynamic";

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

// Heartbeat: seconds actually played since the last beat + current position.
export async function POST(request: Request) {
  const body = await readBody(request);
  const grant = await verifyPlayGrant(body.play);
  if (!grant?.pl) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const position = Math.max(0, Math.round(num(body.pos)));
  const duration = num(body.dur);
  const delta = Math.min(60, Math.max(0, Math.round(num(body.delta))));
  const completed = body.ended === true || (duration > 0 && position / duration >= 0.9);

  await recordBeat(grant.pl, { delta, position, completed });
  return new NextResponse(null, { status: 204 });
}
