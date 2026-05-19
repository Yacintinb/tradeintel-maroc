import { NextRequest, NextResponse } from "next/server";
import { parseImportFile } from "@/lib/connectors/manual-import";
import { parseLocaleNumber } from "@/lib/normalization/numbers";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  const parsed = await parseImportFile(file);
  let imported = 0;
  for (const row of parsed.rows) {
    const date = new Date(String(row["Date"] ?? row["date"] ?? ""));
    const currency = String(row["Devise"] ?? row["currency"] ?? "").trim().toUpperCase();
    const rateMad = parseLocaleNumber(row["Valeur MAD"] ?? row["rateMad"]);
    if (Number.isNaN(date.getTime()) || !currency || rateMad === null) continue;
    await prisma.exchangeRate.upsert({
      where: { date_currency_source: { date, currency, source: "Import manuel" } },
      create: { date, currency, rateMad, source: "Import manuel" },
      update: { rateMad },
    });
    imported += 1;
  }
  return NextResponse.json({ imported });
}
