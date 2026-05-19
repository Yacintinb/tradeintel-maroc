import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateProductPdf } from "@/lib/reports/pdf";

async function recordProductReport(hsCode: string) {
  const product = await prisma.product.findUnique({ where: { hsCode } }).catch(() => null);
  const title = `Rapport produit - ${product?.name ?? hsCode}`;
  return prisma.report.create({
    data: {
      title,
      type: "PRODUCT",
      hsCode,
      description: "Rapport PDF produit genere automatiquement par TradeIntel Maroc.",
      fileUrl: `/api/reports/generate-product?hsCode=${encodeURIComponent(hsCode)}&record=false`,
    },
  });
}

export async function GET(request: NextRequest) {
  const hsCode = request.nextUrl.searchParams.get("hsCode");
  if (!hsCode) return new Response("hsCode manquant", { status: 400 });
  const buffer = await generateProductPdf(hsCode);
  if (request.nextUrl.searchParams.get("record") !== "false") await recordProductReport(hsCode);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=rapport-produit-${hsCode}.pdf`,
    },
  });
}

export async function POST(request: NextRequest) {
  const { hsCode } = await request.json();
  if (!hsCode) return new Response("hsCode manquant", { status: 400 });
  const buffer = await generateProductPdf(hsCode);
  await recordProductReport(hsCode);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=rapport-produit-${hsCode}.pdf`,
    },
  });
}
