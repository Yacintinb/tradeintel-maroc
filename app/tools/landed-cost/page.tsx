import { Header } from "@/components/Header";
import { LandedCostCalculator } from "@/components/LandedCostCalculator";
import { prisma } from "@/lib/prisma";

export default async function LandedCostPage() {
  const [tariffs, exchangeRates] = await Promise.all([
    prisma.customsTariff.findMany({ orderBy: [{ hsCode6: "asc" }], take: 200 }),
    prisma.exchangeRate.findMany({ orderBy: [{ date: "desc" }], take: 50 }),
  ]);

  const tariffOptions = tariffs.length
    ? tariffs.map((item) => ({
        hsCode: item.hsCode10,
        description: item.description,
        dutyRate: item.dutyRate ?? 0,
        vatRate: item.vatRate ?? 20,
        parafiscalTax: item.parafiscalTax ?? 0,
      }))
    : [
        { hsCode: "850211", description: "Groupes electrogenes", dutyRate: 2.5, vatRate: 20, parafiscalTax: 0.25 },
        { hsCode: "85044090", description: "Variateurs et convertisseurs", dutyRate: 2.5, vatRate: 20, parafiscalTax: 0.25 },
        { hsCode: "854449", description: "Cables electriques", dutyRate: 17.5, vatRate: 20, parafiscalTax: 0.25 },
      ];

  const latestByCurrency = new Map<string, number>();
  for (const rate of exchangeRates) {
    if (!latestByCurrency.has(rate.currency)) latestByCurrency.set(rate.currency, Number(rate.rateMad));
  }
  const exchangeOptions = latestByCurrency.size
    ? [...latestByCurrency.entries()].map(([currency, rateMad]) => ({ currency, rateMad }))
    : [
        { currency: "EUR", rateMad: 10.9 },
        { currency: "USD", rateMad: 10.1 },
        { currency: "CNY", rateMad: 1.4 },
        { currency: "MAD", rateMad: 1 },
      ];

  return (
    <>
      <Header title="Calculateur coût total débarqué" subtitle="Estimez le coût réel rendu Maroc à partir des droits, TVA, fret, assurance et taux de change." />
      <LandedCostCalculator tariffs={tariffOptions} exchangeRates={exchangeOptions} />
    </>
  );
}
