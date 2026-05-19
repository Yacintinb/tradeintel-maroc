import { FlowType, MarginPotential, Recommendation, RegulatoryRisk } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const weights = {
  marketSizeScore: 0.2,
  growthScore: 0.25,
  stabilityScore: 0.15,
  supplierDiversityScore: 0.1,
  marginScore: 0.1,
  regulatoryScore: 0.05,
  customsRiskScore: 0.05,
  fxRiskScore: 0.05,
  dataQualityScore: 0.05,
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function recommendationFromScore(score: number): Recommendation {
  if (score >= 80) return Recommendation.TRES_INTERESSANT;
  if (score >= 65) return Recommendation.INTERESSANT;
  if (score >= 50) return Recommendation.A_SURVEILLER;
  if (score >= 35) return Recommendation.FAIBLE_POTENTIEL;
  return Recommendation.RISQUE;
}

export function recommendationLabel(value: Recommendation | string) {
  return {
    TRES_INTERESSANT: "Très intéressant",
    INTERESSANT: "Intéressant",
    A_SURVEILLER: "À surveiller",
    FAIBLE_POTENTIEL: "Faible potentiel",
    RISQUE: "Risqué",
  }[value] ?? String(value);
}

function marginScore(value?: MarginPotential | null) {
  return { HIGH: 100, MEDIUM: 60, LOW: 30, UNKNOWN: 50 }[value ?? "UNKNOWN"];
}

function regulatoryScore(value?: RegulatoryRisk | null) {
  return { LOW: 100, MEDIUM: 60, HIGH: 30, UNKNOWN: 50 }[value ?? "UNKNOWN"];
}

function growthScore(current: number, previous: number | null) {
  if (!previous || previous <= 0) return 50;
  const growth = (current - previous) / previous;
  return clamp(50 + growth * 120);
}

function stabilityScore(values: number[]) {
  if (values.length < 2) return 50;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (!mean) return 50;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  const cv = Math.sqrt(variance) / mean;
  return clamp(100 - cv * 90);
}

function customsScore(dutyRate?: number | null, vatRate?: number | null) {
  if (dutyRate === null && vatRate === null) return 50;
  return clamp(100 - (Number(dutyRate ?? 0) + Number(vatRate ?? 0)) * 1.5);
}

export async function calculateOpportunityScore(hsCode: string, year: number) {
  const flows = await prisma.tradeFlow.findMany({
    where: { hsCode, flowType: FlowType.IMPORT, year: { lte: year, gte: year - 5 } },
  });
  const product = await prisma.product.findUnique({ where: { hsCode } });
  const tariff = await prisma.customsTariff.findFirst({ where: { hsCode6: hsCode.slice(0, 6) } });

  const byYear = new Map<number, number>();
  for (const flow of flows) {
    byYear.set(flow.year, (byYear.get(flow.year) ?? 0) + Number(flow.valueMad));
  }

  const current = byYear.get(year) ?? 0;
  const max = Math.max(...Array.from(byYear.values()), current, 1);
  const previous3 = byYear.get(year - 3) ?? byYear.get(year - 1) ?? null;
  const countries = new Set(flows.filter((flow) => flow.year === year).map((flow) => flow.country));
  const monthlyOrYearly = Array.from(byYear.values());
  const completeRows = flows.filter((flow) => flow.productLabel && flow.country && Number(flow.valueMad) > 0).length;

  const scoreParts = {
    marketSizeScore: clamp((current / max) * 100),
    growthScore: growthScore(current, previous3),
    stabilityScore: stabilityScore(monthlyOrYearly),
    supplierDiversityScore: clamp(countries.size * 12),
    marginScore: marginScore(product?.marginPotential),
    regulatoryScore: regulatoryScore(product?.regulatoryRisk),
    customsRiskScore: customsScore(tariff?.dutyRate, tariff?.vatRate),
    fxRiskScore: 50,
    dataQualityScore: clamp(new Set(flows.map((flow) => flow.year)).size * 14 + completeRows),
  };

  const finalScore = clamp(
    Object.entries(scoreParts).reduce((sum, [key, value]) => sum + value * weights[key as keyof typeof weights], 0),
  );

  return {
    ...scoreParts,
    finalScore,
    recommendation: recommendationFromScore(finalScore),
    explanation: `Score calcule sur taille du marche, croissance, stabilite, diversification fournisseurs, marge, risque reglementaire, droits de douane, change et qualite des donnees. Donnees manquantes neutralisees a 50/100.`,
  };
}

export async function recalculateAllOpportunityScores(year = new Date().getFullYear()) {
  const hsCodes = await prisma.tradeFlow.findMany({
    where: { year, flowType: FlowType.IMPORT },
    distinct: ["hsCode"],
    select: { hsCode: true },
  });

  let count = 0;
  for (const item of hsCodes) {
    const score = await calculateOpportunityScore(item.hsCode, year);
    await prisma.opportunityScore.upsert({
      where: { hsCode_year: { hsCode: item.hsCode, year } },
      create: { hsCode: item.hsCode, year, ...score },
      update: score,
    });
    count += 1;
  }
  return { count, year };
}

export async function recalculateOpportunityScoresForYears(years: number[]) {
  const uniqueYears = [...new Set(years)].filter((year) => Number.isInteger(year)).sort((a, b) => a - b);
  const results = [];
  for (const year of uniqueYears) {
    results.push(await recalculateAllOpportunityScores(year));
  }
  return results;
}
