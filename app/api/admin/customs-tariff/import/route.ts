import { NextRequest, NextResponse } from "next/server";
import { parseImportFile } from "@/lib/connectors/manual-import";
import { normalizeCustomsRow } from "@/lib/connectors/customs";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  const parsed = await parseImportFile(file);
  let imported = 0;
  const errors: string[] = [];
  for (const [index, row] of parsed.rows.entries()) {
    try {
      const data = normalizeCustomsRow(row);
      await prisma.customsTariff.upsert({ where: { hsCode10: data.hsCode10 }, create: data, update: data });
      imported += 1;
    } catch (error) {
      errors.push(`Ligne ${index + 2}: ${error instanceof Error ? error.message : "Erreur"}`);
    }
  }
  return NextResponse.json({ imported, errors });
}
