import { DataTable } from "@/components/DataTable";
import { Header } from "@/components/Header";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import { ScoreBadge } from "@/components/ScoreBadge";
import { demoProducts, demoScores, isDatabaseUnavailable } from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";

export default async function OpportunitiesPage() {
  let scores;
  let products;
  try {
    scores = await prisma.opportunityScore.findMany({ orderBy: { finalScore: "desc" }, take: 50 });
    products = await prisma.product.findMany({ where: { hsCode: { in: scores.map((score) => score.hsCode) } } });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    scores = demoScores;
    products = demoProducts;
  }
  const rows = scores.map((score) => ({ ...score, name: products.find((p) => p.hsCode === score.hsCode)?.name ?? score.hsCode }));
  return (
    <>
      <Header title="Classement des opportunités" />
      <DataTable
        rows={rows}
        columns={[
          { key: "hsCode", label: "Code SH" },
          { key: "name", label: "Produit" },
          { key: "year", label: "Année" },
          { key: "finalScore", label: "Score", render: (row) => <ScoreBadge score={row.finalScore as number} /> },
          { key: "recommendation", label: "Recommandation", render: (row) => <RecommendationBadge value={String(row.recommendation)} /> },
        ]}
      />
    </>
  );
}
