import { BarChartCard, LineChartCard } from "@/components/Charts";
import { DataTable } from "@/components/DataTable";
import { Header } from "@/components/Header";
import { KpiCard } from "@/components/KpiCard";
import { formatMad } from "@/lib/utils";
import { getDashboardKpis } from "@/lib/services/dashboard";

export default async function DashboardPage() {
  const data = await getDashboardKpis();
  const yearly = Object.values(
    data.yearly.reduce<Record<string, { year: number; imports: number; exports: number }>>((acc, row) => {
      acc[row.year] ??= { year: row.year, imports: 0, exports: 0 };
      if (row.flowType === "IMPORT") acc[row.year].imports = row.value;
      else acc[row.year].exports = row.value;
      return acc;
    }, {}),
  );

  return (
    <>
      <Header title="Dashboard import/export" />
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard title="Importations" value={formatMad(data.totals.imports)} />
        <KpiCard title="Exportations" value={formatMad(data.totals.exports)} />
        <KpiCard title="Codes SH" value={data.totals.hsCodes} />
        <KpiCard title="Pays" value={data.totals.countries} />
        <KpiCard title="Produits" value={data.totals.products} />
        <KpiCard title="Qualité données" value={`${data.totals.dataQuality}%`} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <LineChartCard title="Evolution annuelle import/export" data={yearly} />
        <BarChartCard title="Top pays fournisseurs" data={data.topCountries.map((item) => ({ name: item.country, value: item.value }))} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <DataTable rows={data.topProducts} columns={[{ key: "hsCode", label: "Code SH" }, { key: "productLabel", label: "Produit" }, { key: "value", label: "Valeur", render: (row) => formatMad(row.value as number) }]} />
        <DataTable rows={data.jobs.map((job) => ({ fileName: job.fileName ?? "Preview", status: job.status, rowsImported: job.rowsImported }))} columns={[{ key: "fileName", label: "Fichier" }, { key: "status", label: "Statut" }, { key: "rowsImported", label: "Lignes" }]} />
      </div>
    </>
  );
}
