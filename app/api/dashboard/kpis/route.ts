import { NextResponse } from "next/server";
import { getDashboardKpis } from "@/lib/services/dashboard";

export async function GET() {
  return NextResponse.json(await getDashboardKpis());
}
