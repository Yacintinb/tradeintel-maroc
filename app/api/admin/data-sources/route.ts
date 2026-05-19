import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["CSV", "XLSX", "REST_API", "CKAN_API", "MANUAL"]),
  url: z.string().optional().nullable(),
  license: z.string().optional().nullable(),
  refreshFrequency: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "ERROR", "DRAFT"]).default("DRAFT"),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const sources = await prisma.dataSource.findMany({ orderBy: { updatedAt: "desc" }, include: { ingestionJobs: { take: 1, orderBy: { createdAt: "desc" } } } });
  return NextResponse.json({ items: sources });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries((await request.formData()).entries());
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const item = await prisma.dataSource.create({ data: parsed.data });
  return NextResponse.json(item, { status: 201 });
}
