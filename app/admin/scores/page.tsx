import { DataTable } from "@/components/DataTable";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export default async function ScoresPage() {
  const scores = await prisma.opportunityScore.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <Header title="Calcul des scores" />
      <div className="mb-5 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Formule: taille marché 20%, croissance 25%, stabilité 15%, diversité fournisseurs 10%, marge 10%, réglementaire 5%, douane 5%, change 5%, qualité données 5%.
        <form className="mt-4" action="/api/admin/scores/recalculate" method="post"><Button type="submit">Recalculer tous les scores</Button></form>
      </div>
      <DataTable rows={scores} columns={[{ key: "hsCode", label: "Code SH" }, { key: "year", label: "Année" }, { key: "finalScore", label: "Score" }, { key: "recommendation", label: "Recommandation" }, { key: "explanation", label: "Explication" }]} />
    </>
  );
}
