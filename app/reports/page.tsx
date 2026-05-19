import { DataTable } from "@/components/DataTable";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const reports = await prisma.report.findMany({ orderBy: { createdAt: "desc" }, include: { createdBy: true } });
  return (
    <>
      <Header title="Rapports générés" />
      <div className="mb-4 flex gap-3">
        <a href="/api/exports/excel?type=tradeflows"><Button type="button">Export TradeFlow</Button></a>
        <a href="/api/exports/excel?type=opportunities"><Button type="button" variant="outline">Export opportunités</Button></a>
      </div>
      <DataTable rows={reports} columns={[{ key: "title", label: "Titre" }, { key: "type", label: "Type" }, { key: "sector", label: "Secteur" }, { key: "hsCode", label: "Code SH" }, { key: "createdAt", label: "Date", render: (row) => new Date(row.createdAt as Date).toLocaleDateString("fr-MA") }]} />
    </>
  );
}
