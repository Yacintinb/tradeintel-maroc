import { DataTable } from "@/components/DataTable";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const reports = await prisma.report.findMany({ orderBy: { createdAt: "desc" }, include: { createdBy: true } });
  return (
    <>
      <Header title="Rapports generes" />
      <div className="mb-4 rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-3">
          <a href="/api/reports/generate-sector?sector=General">
            <Button type="button">Generer rapport sectoriel PDF</Button>
          </a>
          <a href="/api/exports/excel?type=tradeflows">
            <Button type="button" variant="outline">Export TradeFlow</Button>
          </a>
          <a href="/api/exports/excel?type=opportunities">
            <Button type="button" variant="outline">Export opportunites</Button>
          </a>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Les rapports PDF sont enregistres automatiquement et restent telechargeables depuis l'historique.
        </p>
      </div>
      <DataTable
        rows={reports}
        columns={[
          { key: "title", label: "Titre" },
          { key: "type", label: "Type" },
          { key: "sector", label: "Secteur" },
          { key: "hsCode", label: "Code SH" },
          { key: "createdAt", label: "Date", render: (row) => new Date(row.createdAt as Date).toLocaleDateString("fr-MA") },
          {
            key: "fileUrl",
            label: "Telechargement",
            render: (row) =>
              row.fileUrl ? (
                <a className="font-medium text-teal-700 hover:underline" href={String(row.fileUrl)}>
                  PDF
                </a>
              ) : (
                "Non disponible"
              ),
          },
        ]}
      />
    </>
  );
}
