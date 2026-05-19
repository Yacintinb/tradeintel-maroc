import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guessColumnMapping, mapTradeRows, parseImportFile } from "@/lib/connectors/manual-import";
import { recalculateOpportunityScoresForYears } from "@/lib/scoring/opportunity-score";

export async function GET() {
  const jobs = await prisma.dataIngestionJob.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { dataSource: true } });
  return NextResponse.json({ items: jobs });
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  const mode = String(form.get("mode") ?? "preview");
  const parsed = await parseImportFile(file);
  const mapping = form.get("mapping") ? JSON.parse(String(form.get("mapping"))) : guessColumnMapping(parsed.headers);

  if (mode === "preview") {
    return NextResponse.json({ headers: parsed.headers, rows: parsed.rows.slice(0, 20), mapping });
  }

  const job = await prisma.dataIngestionJob.create({
    data: { status: "RUNNING", fileName: file.name, fileType: file.name.split(".").pop() ?? "" },
  });
  try {
    const mapped = mapTradeRows(parsed.rows, mapping);
    await prisma.tradeFlow.createMany({
      data: mapped.valid.map((row) => ({ ...row, sourceFile: file.name })),
      skipDuplicates: false,
    });
    await prisma.dataIngestionJob.update({
      where: { id: job.id },
      data: {
        status: mapped.errors.length ? "FAILED" : "SUCCESS",
        finishedAt: new Date(),
        rowsImported: mapped.valid.length,
        errorMessage: mapped.errors.slice(0, 20).map((error) => `Ligne ${error.row}: ${error.message}`).join("\n") || null,
      },
    });
    const scores =
      mapped.errors.length === 0 && mapped.valid.length > 0
        ? await recalculateOpportunityScoresForYears([...new Set(mapped.valid.map((row) => row.year))])
        : [];
    return NextResponse.json({ imported: mapped.valid.length, errors: mapped.errors, scores });
  } catch (error) {
    await prisma.dataIngestionJob.update({
      where: { id: job.id },
      data: { status: "FAILED", finishedAt: new Date(), errorMessage: error instanceof Error ? error.message : "Erreur inconnue" },
    });
    return NextResponse.json({ error: "Import echoue" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");
  if (status !== "FAILED") return NextResponse.json({ error: "Seul le nettoyage des imports FAILED est autorise." }, { status: 400 });

  const result = await prisma.dataIngestionJob.deleteMany({ where: { status: "FAILED" } });
  return NextResponse.json({
    deleted: result.count,
    message: `${result.count} import(s) echoue(s) supprime(s).`,
  });
}
