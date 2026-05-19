import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const year = params.get("year") ? Number(params.get("year")) : undefined;
  const minScore = params.get("minScore") ? Number(params.get("minScore")) : undefined;
  const scores = await prisma.opportunityScore.findMany({
    where: {
      ...(year ? { year } : {}),
      ...(minScore ? { finalScore: { gte: minScore } } : {}),
    },
    orderBy: { finalScore: "desc" },
    take: 50,
  });
  const products = await prisma.product.findMany({ where: { hsCode: { in: scores.map((score) => score.hsCode) } } });
  return NextResponse.json({ items: scores.map((score) => ({ ...score, product: products.find((p) => p.hsCode === score.hsCode) })) });
}
