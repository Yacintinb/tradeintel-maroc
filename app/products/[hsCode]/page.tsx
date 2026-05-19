import { Header } from "@/components/Header";
import { KpiCard } from "@/components/KpiCard";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import { ScoreBadge } from "@/components/ScoreBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { demoProducts, demoScores, isDatabaseUnavailable } from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";
import { formatMad, formatNumber } from "@/lib/utils";

export default async function ProductDetailPage({ params }: { params: Promise<{ hsCode: string }> }) {
  const { hsCode } = await params;
  let product;
  let flows;
  let score;
  let tariff;
  try {
    [product, flows, score, tariff] = await Promise.all([
      prisma.product.findUnique({ where: { hsCode } }),
      prisma.tradeFlow.findMany({ where: { hsCode }, orderBy: [{ year: "asc" }] }),
      prisma.opportunityScore.findFirst({ where: { hsCode }, orderBy: { year: "desc" } }),
      prisma.customsTariff.findFirst({ where: { hsCode6: hsCode.slice(0, 6) } }),
    ]);
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    product = demoProducts.find((item) => item.hsCode === hsCode) ?? null;
    score = demoScores.find((item) => item.hsCode === hsCode) ?? null;
    tariff = null;
    flows = ["Chine", "France", "Espagne", "Allemagne"].map((country, index) => ({
      country,
      valueMad: 18_000_000 - index * 2_000_000,
      quantity: 1200 - index * 140,
    }));
  }
  const total = flows.reduce((sum, flow) => sum + Number(flow.valueMad), 0);
  const quantity = flows.reduce((sum, flow) => sum + Number(flow.quantity ?? 0), 0);
  const countries = Array.from(new Set(flows.map((flow) => flow.country))).slice(0, 10);
  return (
    <>
      <Header title={`${product?.name ?? "Produit"} · ${hsCode}`} />
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard title="Valeur totale" value={formatMad(total)} />
        <KpiCard title="Quantité totale" value={formatNumber(quantity)} />
        <KpiCard title="Pays fournisseurs" value={countries.length} />
        <KpiCard title="Score" value={score ? `${Math.round(score.finalScore)}/100` : "50/100"} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-3 flex items-center gap-3">
            {score ? <ScoreBadge score={score.finalScore} /> : null}
            {score ? <RecommendationBadge value={score.recommendation} /> : null}
          </div>
          <h2 className="font-semibold">Recommandation automatique</h2>
          <p className="mt-2 text-sm text-slate-600">{score?.explanation ?? "Importez davantage de donnees pour enrichir la recommandation."}</p>
          <a className="mt-5 inline-flex" href={`/api/reports/generate-product?hsCode=${hsCode}`}>
            <Button type="button">Generer rapport PDF premium</Button>
          </a>
        </Card>
        <Card>
          <h2 className="font-semibold">Risques douaniers</h2>
          <p className="mt-2 text-sm text-slate-600">{tariff?.description ?? "Tarif non disponible dans le MVP tant qu'il n'est pas importe."}</p>
          <p className="mt-3 text-sm">Droit: {tariff?.dutyRate ?? 0}% · TVA: {tariff?.vatRate ?? 0}%</p>
        </Card>
      </div>
      <Card className="mt-5">
        <h2 className="font-semibold">Pays fournisseurs</h2>
        <div className="mt-3 flex flex-wrap gap-2">{countries.map((country) => <span key={country} className="rounded-md bg-slate-100 px-2 py-1 text-sm">{country}</span>)}</div>
      </Card>
    </>
  );
}
