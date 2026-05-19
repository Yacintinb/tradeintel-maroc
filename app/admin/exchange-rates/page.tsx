import { DataTable } from "@/components/DataTable";
import { FileUpload } from "@/components/FileUpload";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export default async function ExchangeRatesPage() {
  const rates = await prisma.exchangeRate.findMany({ orderBy: { date: "desc" }, take: 100 });
  return (
    <>
      <Header title="Taux de change Bank Al-Maghrib" />
      <div className="mb-4 flex flex-wrap gap-3">
        <FileUpload action="/api/admin/exchange-rates/import" label="Import manuel" />
        <form action="/api/admin/exchange-rates/sync" method="post"><Button type="submit">Synchroniser API</Button></form>
      </div>
      <DataTable rows={rates} columns={[{ key: "date", label: "Date", render: (row) => new Date(row.date as Date).toLocaleDateString("fr-MA") }, { key: "currency", label: "Devise" }, { key: "rateMad", label: "Valeur MAD" }, { key: "source", label: "Source" }]} />
    </>
  );
}
