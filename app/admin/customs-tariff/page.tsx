import { DataTable } from "@/components/DataTable";
import { FileUpload } from "@/components/FileUpload";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";

export default async function CustomsTariffPage() {
  const tariffs = await prisma.customsTariff.findMany({ orderBy: { hsCode10: "asc" }, take: 100 });
  return (
    <>
      <Header title="Tarifs douaniers ADIL / Douane" />
      <FileUpload action="/api/admin/customs-tariff/import" label="Importer tarifs" />
      <div className="mt-5">
        <DataTable rows={tariffs} columns={[{ key: "hsCode10", label: "Code SH 10" }, { key: "description", label: "Désignation" }, { key: "dutyRate", label: "Droit" }, { key: "vatRate", label: "TVA" }, { key: "source", label: "Source" }]} />
      </div>
    </>
  );
}
