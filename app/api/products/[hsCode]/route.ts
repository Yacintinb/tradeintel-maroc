import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ hsCode: string }> }) {
  const { hsCode } = await params;
  const [product, flows, score, tariff, rates] = await Promise.all([
    prisma.product.findUnique({ where: { hsCode } }),
    prisma.tradeFlow.findMany({ where: { hsCode }, orderBy: [{ year: "asc" }, { month: "asc" }] }),
    prisma.opportunityScore.findFirst({ where: { hsCode }, orderBy: { year: "desc" } }),
    prisma.customsTariff.findFirst({ where: { hsCode6: hsCode.slice(0, 6) } }),
    prisma.exchangeRate.findMany({ orderBy: { date: "desc" }, take: 10 }),
  ]);
  if (!product && flows.length === 0) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  return NextResponse.json({ product, flows, score, tariff, rates });
}
