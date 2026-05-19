import { NextRequest, NextResponse } from "next/server";
import { recalculateAllOpportunityScores } from "@/lib/scoring/opportunity-score";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(await recalculateAllOpportunityScores(Number(body.year ?? new Date().getFullYear())));
}
