import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guessColumnMapping, mapTradeRows, parseImportFile } from "@/lib/connectors/manual-import";

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
    return NextResponse.json({ imported: mapped.valid.length, errors: mapped.errors });
  } catch (error) {
    await prisma.dataIngestionJob.update({
      where: { id: job.id },
      data: { status: "FAILED", finishedAt: new Date(), errorMessage: error instanceof Error ? error.message : "Erreur inconnue" },
    });
    return NextResponse.json({ error: "Import echoue" }, { status: 500 });
  }
}
