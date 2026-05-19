import { DataSource, DataSourceType } from "@prisma/client";
import { packageSearch, saveOpenDataset } from "@/lib/connectors/ckan";
import { syncBankAlMaghribRates } from "@/lib/connectors/bam";
import { guessColumnMapping, mapTradeRows, parseImportBuffer } from "@/lib/connectors/manual-import";
import { prisma } from "@/lib/prisma";
import { recalculateAllOpportunityScores } from "@/lib/scoring/opportunity-score";

function fileNameFromUrl(url: string, fallback: string) {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split("/").filter(Boolean).pop();
    return name || fallback;
  } catch {
    return fallback;
  }
}

function inferFileType(fileName: string, contentType: string | null) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "XLSX";
  if (lower.endsWith(".csv")) return "CSV";
  if (contentType?.includes("spreadsheet") || contentType?.includes("excel")) return "XLSX";
  return "CSV";
}

export async function syncRemoteTradeSource(source: DataSource) {
  if (!source.url) throw new Error(`La source ${source.name} n'a pas d'URL.`);
  if (source.type !== DataSourceType.CSV && source.type !== DataSourceType.XLSX) {
    throw new Error(`La source ${source.name} n'est pas un fichier CSV/XLSX synchronisable.`);
  }

  const startedAt = new Date();
  const fileName = fileNameFromUrl(source.url, `${source.name}.${source.type.toLowerCase()}`);
  const job = await prisma.dataIngestionJob.create({
    data: {
      dataSourceId: source.id,
      status: "RUNNING",
      startedAt,
      fileName,
      fileType: source.type,
    },
  });

  try {
    const response = await fetch(source.url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Telechargement impossible: HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const effectiveName = fileName.includes(".") ? fileName : `${fileName}.${inferFileType(fileName, response.headers.get("content-type")).toLowerCase()}`;
    const parsed = parseImportBuffer(effectiveName, buffer);
    const mapping = guessColumnMapping(parsed.headers);
    const mapped = mapTradeRows(parsed.rows, mapping);

    await prisma.$transaction([
      prisma.tradeFlow.deleteMany({ where: { dataSourceId: source.id } }),
      prisma.tradeFlow.createMany({
        data: mapped.valid.map((row) => ({
          ...row,
          sourceFile: effectiveName,
          dataSourceId: source.id,
        })),
      }),
      prisma.dataIngestionJob.update({
        where: { id: job.id },
        data: {
          status: mapped.errors.length ? "FAILED" : "SUCCESS",
          finishedAt: new Date(),
          rowsImported: mapped.valid.length,
          errorMessage: mapped.errors.slice(0, 30).map((error) => `Ligne ${error.row}: ${error.message}`).join("\n") || null,
        },
      }),
      prisma.dataSource.update({
        where: { id: source.id },
        data: { status: mapped.errors.length ? "ERROR" : "ACTIVE", notes: `Derniere synchro automatique: ${new Date().toISOString()}` },
      }),
    ]);

    return { source: source.name, imported: mapped.valid.length, errors: mapped.errors.length };
  } catch (error) {
    await prisma.dataIngestionJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Erreur inconnue",
      },
    });
    await prisma.dataSource.update({ where: { id: source.id }, data: { status: "ERROR" } });
    throw error;
  }
}

export async function syncCkanMetadata() {
  const queries = (process.env.CKAN_AUTO_QUERIES ?? "commerce exterieur,douane,import export")
    .split(",")
    .map((query) => query.trim())
    .filter(Boolean);

  let saved = 0;
  for (const query of queries) {
    const datasets = await packageSearch(query);
    for (const dataset of datasets.slice(0, 5)) {
      await saveOpenDataset(dataset);
      saved += 1;
    }
  }
  return { saved, queries };
}

export async function syncAllAutomaticSources() {
  const sources = await prisma.dataSource.findMany({
    where: {
      status: "ACTIVE",
      url: { not: null },
      type: { in: [DataSourceType.CSV, DataSourceType.XLSX] },
    },
  });

  const results: { source: string; imported: number; errors: number }[] = [];
  const failures: { source: string; error: string }[] = [];

  for (const source of sources) {
    try {
      results.push(await syncRemoteTradeSource(source));
    } catch (error) {
      failures.push({ source: source.name, error: error instanceof Error ? error.message : "Erreur inconnue" });
    }
  }

  const ckan = await syncCkanMetadata().catch((error) => ({ saved: 0, error: error instanceof Error ? error.message : "Erreur CKAN" }));
  const bam = await syncBankAlMaghribRates().catch((error) => ({ configured: false, imported: 0, message: error instanceof Error ? error.message : "Erreur BAM" }));
  const scores = await recalculateAllOpportunityScores(new Date().getFullYear()).catch((error) => ({ count: 0, error: error instanceof Error ? error.message : "Erreur scores" }));

  return { files: results, failures, ckan, bam, scores };
}
