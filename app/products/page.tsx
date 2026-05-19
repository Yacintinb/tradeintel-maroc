import Link from "next/link";
import { DataTable } from "@/components/DataTable";
import { FilterPanel } from "@/components/FilterPanel";
import { Header } from "@/components/Header";
import { demoProducts, isDatabaseUnavailable } from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const q = params.q ?? "";
  let products;
  let categories: string[];
  try {
    products = await prisma.product.findMany({
      where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { hsCode: { contains: q } }] } : {},
      orderBy: { name: "asc" },
      take: 50,
    });
    categories = [...new Set((await prisma.product.findMany({ select: { category: true } })).map((p) => p.category).filter(Boolean) as string[])];
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    products = demoProducts.filter((product) => !q || product.name.toLowerCase().includes(q.toLowerCase()) || product.hsCode.includes(q));
    categories = [...new Set(demoProducts.map((product) => product.category).filter(Boolean))];
  }
  return (
    <>
      <Header title="Recherche produits" />
      <FilterPanel categories={categories} />
      <DataTable
        rows={products}
        columns={[
          { key: "hsCode", label: "Code SH", render: (row) => <Link className="font-medium text-teal-700" href={`/products/${row.hsCode}`}>{String(row.hsCode)}</Link> },
          { key: "name", label: "Produit" },
          { key: "category", label: "Catégorie" },
          { key: "regulatoryRisk", label: "Risque" },
          { key: "marginPotential", label: "Marge" },
        ]}
      />
    </>
  );
}
