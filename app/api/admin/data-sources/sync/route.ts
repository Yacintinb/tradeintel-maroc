import { NextResponse } from "next/server";
import { syncAllAutomaticSources } from "@/lib/services/automated-sync";

export async function POST() {
  return NextResponse.json(await syncAllAutomaticSources());
}

export async function GET() {
  return NextResponse.json(await syncAllAutomaticSources());
}
