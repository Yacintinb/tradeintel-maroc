import { NextRequest, NextResponse } from "next/server";
import { syncAllAutomaticSources } from "@/lib/services/automated-sync";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await syncAllAutomaticSources());
}

export async function POST(request: NextRequest) {
  return GET(request);
}
