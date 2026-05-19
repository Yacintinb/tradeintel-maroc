import { DataTable } from "@/components/DataTable";
import { FileUpload } from "@/components/FileUpload";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";

export default async function MacroIndicatorsPage() {
  const indicators = await prisma.macroIndicator.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <Header title="Indicateurs macro HCP" />
      <FileUpload action="/api/admin/macro-indicators/import" label="Importer HCP" />
      <div className="mt-5">
        <DataTable rows={indicators} columns={[{ key: "indicatorName", label: "Indicateur" }, { key: "period", label: "Période" }, { key: "value", label: "Valeur" }, { key: "unit", label: "Unité" }, { key: "source", label: "Source" }]} />
      </div>
    </>
  );
}
