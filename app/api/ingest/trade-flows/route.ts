import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guessColumnMapping, mapTradeRows, parseImportBuffer } from "@/lib/connectors/manual-import";
import { recalculateOpportunityScoresForYears } from "@/lib/scoring/opportunity-score";

function isAuthorized(request: NextRequest) {
  const secret = process.env.INGEST_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

  const sourceName = String(form.get("sourceName") ?? "Office des Changes - scraping");
  const sourceUrl = String(form.get("sourceUrl") ?? "https://services.oc.gov.ma/DataBase/CommerceExterieur/");
  const replaceSource = String(form.get("replaceSource") ?? "true") === "true";

  const source = await prisma.dataSource.upsert({
    where: { id: "office-des-changes-scraper" },
    create: {
      id: "office-des-changes-scraper",
      name: sourceName,
      type: file.name.toLowerCase().endsWith(".xlsx") ? "XLSX" : "CSV",
      url: sourceUrl,
      license: "Export public Office des Changes",
      refreshFrequency: "Automatique",
      status: "ACTIVE",
      notes: "Alimente par worker Playwright controle.",
    },
    update: {
      name: sourceName,
      url: sourceUrl,
      status: "ACTIVE",
      notes: `Dernier upload scraper: ${new Date().toISOString()}`,
    },
  });

  const job = await prisma.dataIngestionJob.create({
    data: {
      dataSourceId: source.id,
      status: "RUNNING",
      fileName: file.name,
      fileType: file.name.split(".").pop() ?? "csv",
    },
  });

  try {
    const parsed = parseImportBuffer(file.name, Buffer.from(await file.arrayBuffer()));
    const mapping = form.get("mapping") ? JSON.parse(String(form.get("mapping"))) : guessColumnMapping(parsed.headers);
    const mapped = mapTradeRows(parsed.rows, mapping);
    const years = [...new Set(mapped.valid.map((row) => row.year))];

    await prisma.$transaction([
      ...(replaceSource && years.length > 0 ? [prisma.tradeFlow.deleteMany({ where: { dataSourceId: source.id, year: { in: years } } })] : []),
      prisma.tradeFlow.createMany({
        data: mapped.valid.map((row) => ({
          ...row,
          dataSourceId: source.id,
          sourceFile: file.name,
        })),
      }),
      prisma.dataIngestionJob.update({
        where: { id: job.id },
        data: {
          status: mapped.errors.length ? "FAILED" : "SUCCESS",
          finishedAt: new Date(),
          rowsImported: mapped.valid.length,
          errorMessage: mapped.errors.slice(0, 50).map((error) => `Ligne ${error.row}: ${error.message}`).join("\n") || null,
        },
      }),
    ]);
    const scores =
      mapped.errors.length === 0 && mapped.valid.length > 0
        ? await recalculateOpportunityScoresForYears(years)
        : [];

    return NextResponse.json({
      sourceId: source.id,
      imported: mapped.valid.length,
      errors: mapped.errors,
      scores,
    });
  } catch (error) {
    await prisma.dataIngestionJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Erreur inconnue",
      },
    });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import echoue" }, { status: 500 });
  }
}
