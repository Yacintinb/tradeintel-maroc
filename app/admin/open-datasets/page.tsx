import { DataTable } from "@/components/DataTable";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export default async function OpenDatasetsPage() {
  const datasets = await prisma.openDataset.findMany({ orderBy: { importedAt: "desc" } });
  return (
    <>
      <Header title="Data.gov.ma / CKAN" />
      <form className="mb-5 flex gap-3 rounded-md border border-slate-200 bg-white p-4">
        <Input name="q" placeholder="Recherche CKAN: commerce extérieur, douane..." />
        <Button type="submit">Rechercher</Button>
      </form>
      <DataTable rows={datasets} columns={[{ key: "title", label: "Titre" }, { key: "organization", label: "Organisation" }, { key: "format", label: "Formats" }, { key: "url", label: "URL" }, { key: "source", label: "Source" }]} />
    </>
  );
}
