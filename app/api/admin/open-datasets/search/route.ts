import { NextRequest, NextResponse } from "next/server";
import { packageSearch } from "@/lib/connectors/ckan";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "commerce exterieur";
  const endpoint = request.nextUrl.searchParams.get("endpoint") ?? undefined;
  return NextResponse.json({ items: await packageSearch(q, endpoint) });
}
