import { NextRequest } from "next/server";
import { generateSectorPdf } from "@/lib/reports/pdf";

export async function POST(request: NextRequest) {
  const { sector } = await request.json();
  const buffer = await generateSectorPdf(sector ?? "General");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=rapport-sectoriel.pdf`,
    },
  });
}
