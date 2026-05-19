import { ColumnMapper } from "@/components/ColumnMapper";
import { AdminImportActions } from "@/components/AdminImportActions";
import { DataTable } from "@/components/DataTable";
import { FileUpload } from "@/components/FileUpload";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";

export default async function ImportsPage() {
  const jobs = await prisma.dataIngestionJob.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
  const defaultYears = String(new Date().getFullYear() - 1);
  return (
    <>
      <Header title="Import CSV/XLSX Office des Changes" />
      <AdminImportActions defaultYears={defaultYears} />
      <FileUpload action="/api/admin/imports" label="Importer TradeFlow" />
      <div className="mt-4"><ColumnMapper /></div>
      <div className="mt-5">
        <DataTable rows={jobs} columns={[{ key: "fileName", label: "Fichier" }, { key: "fileType", label: "Type" }, { key: "status", label: "Statut" }, { key: "rowsImported", label: "Lignes" }, { key: "errorMessage", label: "Erreurs" }]} />
      </div>
    </>
  );
}
