import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSectorPdf } from "@/lib/reports/pdf";

async function recordSectorReport(sector: string) {
  return prisma.report.create({
    data: {
      title: `Rapport sectoriel - ${sector}`,
      type: "SECTOR",
      sector,
      description: "Rapport sectoriel PDF genere automatiquement par TradeIntel Maroc.",
      fileUrl: `/api/reports/generate-sector?sector=${encodeURIComponent(sector)}&record=false`,
    },
  });
}

async function respondWithSectorPdf(sector: string, shouldRecord = true) {
  const buffer = await generateSectorPdf(sector);
  if (shouldRecord) await recordSectorReport(sector);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=rapport-sectoriel-${sector.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
    },
  });
}

export async function GET(request: NextRequest) {
  return respondWithSectorPdf(request.nextUrl.searchParams.get("sector") ?? "General", request.nextUrl.searchParams.get("record") !== "false");
}

export async function POST(request: NextRequest) {
  const { sector } = await request.json().catch(() => ({ sector: "General" }));
  return respondWithSectorPdf(sector ?? "General");
}
