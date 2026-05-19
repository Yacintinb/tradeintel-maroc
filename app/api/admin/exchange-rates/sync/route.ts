import { NextResponse } from "next/server";
import { syncBankAlMaghribRates } from "@/lib/connectors/bam";

export async function POST() {
  return NextResponse.json(await syncBankAlMaghribRates());
}
