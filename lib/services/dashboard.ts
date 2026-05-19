import { FlowType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { demoDashboardKpis, isDatabaseUnavailable } from "@/lib/demo-data";

export async function getDashboardKpis() {
  try {
    const [imports, exportsValue, hsCodes, countries, products, scores, jobs] = await Promise.all([
    prisma.tradeFlow.aggregate({ where: { flowType: FlowType.IMPORT }, _sum: { valueMad: true } }),
    prisma.tradeFlow.aggregate({ where: { flowType: FlowType.EXPORT }, _sum: { valueMad: true } }),
    prisma.tradeFlow.findMany({ distinct: ["hsCode"], select: { hsCode: true } }),
    prisma.tradeFlow.findMany({ distinct: ["country"], select: { country: true } }),
    prisma.product.count(),
    prisma.opportunityScore.findMany({ orderBy: { finalScore: "desc" }, take: 10 }),
    prisma.dataIngestionJob.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const yearlyRaw = await prisma.tradeFlow.groupBy({
    by: ["year", "flowType"],
    _sum: { valueMad: true },
    orderBy: { year: "asc" },
  });
  const productRaw = await prisma.tradeFlow.groupBy({
    by: ["hsCode", "productLabel"],
    where: { flowType: FlowType.IMPORT },
    _sum: { valueMad: true },
    orderBy: { _sum: { valueMad: "desc" } },
    take: 10,
  });
  const countriesRaw = await prisma.tradeFlow.groupBy({
    by: ["country"],
    where: { flowType: FlowType.IMPORT },
    _sum: { valueMad: true },
    orderBy: { _sum: { valueMad: "desc" } },
    take: 10,
  });

  return {
    totals: {
      imports: Number(imports._sum.valueMad ?? 0),
      exports: Number(exportsValue._sum.valueMad ?? 0),
      hsCodes: hsCodes.length,
      countries: countries.length,
      products,
      dataQuality: jobs.some((job) => job.status === "FAILED") ? 78 : 92,
    },
    yearly: yearlyRaw.map((item) => ({ year: item.year, flowType: item.flowType, value: Number(item._sum.valueMad ?? 0) })),
    topProducts: productRaw.map((item) => ({ hsCode: item.hsCode, productLabel: item.productLabel, value: Number(item._sum.valueMad ?? 0) })),
    topCountries: countriesRaw.map((item) => ({ country: item.country, value: Number(item._sum.valueMad ?? 0) })),
    topScores: scores,
    jobs,
  };
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    return demoDashboardKpis();
  }
}
