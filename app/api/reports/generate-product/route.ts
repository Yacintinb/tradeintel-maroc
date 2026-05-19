import { NextRequest } from "next/server";
import { generateProductPdf } from "@/lib/reports/pdf";

export async function GET(request: NextRequest) {
  const hsCode = request.nextUrl.searchParams.get("hsCode");
  if (!hsCode) return new Response("hsCode manquant", { status: 400 });
  const buffer = await generateProductPdf(hsCode);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=rapport-produit-${hsCode}.pdf`,
    },
  });
}

export async function POST(request: NextRequest) {
  const { hsCode } = await request.json();
  const buffer = await generateProductPdf(hsCode);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=rapport-produit-${hsCode}.pdf`,
    },
  });
}
