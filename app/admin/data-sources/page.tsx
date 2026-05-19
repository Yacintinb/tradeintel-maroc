import { DataTable } from "@/components/DataTable";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { prisma } from "@/lib/prisma";

export default async function DataSourcesPage() {
  const sources = await prisma.dataSource.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <>
      <Header title="Gestion des sources de données" />
      <form action="/api/admin/data-sources" method="post" className="mb-5 grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-5">
        <Input name="name" placeholder="Nom source" />
        <Select name="type"><option>CSV</option><option>XLSX</option><option>REST_API</option><option>CKAN_API</option><option>MANUAL</option></Select>
        <Input name="url" placeholder="URL" />
        <Input name="license" placeholder="Licence" />
        <Button type="submit">Créer</Button>
      </form>
      <DataTable rows={sources} columns={[{ key: "name", label: "Nom" }, { key: "type", label: "Type" }, { key: "url", label: "URL" }, { key: "license", label: "Licence" }, { key: "status", label: "Statut" }, { key: "refreshFrequency", label: "Fréquence" }]} />
    </>
  );
}
