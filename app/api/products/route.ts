import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? undefined;
  const page = Math.max(Number(params.get("page") ?? 1), 1);
  const take = 20;
  const where = {
    AND: [
      q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { hsCode: { contains: q } },
              { keywords: { has: q } },
            ],
          }
        : {},
      category ? { category } : {},
    ],
  };
  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * take, take }),
    prisma.product.count({ where }),
  ]);
  return NextResponse.json({ items, total, page, pages: Math.ceil(total / take) });
}
