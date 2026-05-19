import { NextRequest, NextResponse } from "next/server";
import { parseImportFile } from "@/lib/connectors/manual-import";
import { normalizeMacroRow } from "@/lib/connectors/hcp";
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
      await prisma.macroIndicator.create({ data: normalizeMacroRow(row) });
      imported += 1;
    } catch (error) {
      errors.push(`Ligne ${index + 2}: ${error instanceof Error ? error.message : "Erreur"}`);
    }
  }
  return NextResponse.json({ imported, errors });
}
