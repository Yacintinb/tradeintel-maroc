import { MarginPotential, Recommendation, RegulatoryRisk } from "@prisma/client";

export const demoProducts = [
  { id: "demo-850440", hsCode: "850440", name: "Onduleurs UPS", category: "Energie", subCategory: "Protection electrique", keywords: ["onduleurs ups"], regulatoryRisk: RegulatoryRisk.LOW, marginPotential: MarginPotential.HIGH, notes: null, createdAt: new Date(), updatedAt: new Date() },
  { id: "demo-850760", hsCode: "850760", name: "Batteries lithium", category: "Energie", subCategory: "Stockage", keywords: ["batteries lithium"], regulatoryRisk: RegulatoryRisk.MEDIUM, marginPotential: MarginPotential.HIGH, notes: null, createdAt: new Date(), updatedAt: new Date() },
  { id: "demo-854140", hsCode: "854140", name: "Panneaux solaires", category: "Energie", subCategory: "Solaire", keywords: ["panneaux solaires"], regulatoryRisk: RegulatoryRisk.MEDIUM, marginPotential: MarginPotential.HIGH, notes: null, createdAt: new Date(), updatedAt: new Date() },
  { id: "demo-853620", hsCode: "853620", name: "Disjoncteurs", category: "Electricite", subCategory: "Protection", keywords: ["disjoncteurs"], regulatoryRisk: RegulatoryRisk.LOW, marginPotential: MarginPotential.MEDIUM, notes: null, createdAt: new Date(), updatedAt: new Date() },
  { id: "demo-841370", hsCode: "841370", name: "Pompes industrielles", category: "Industrie", subCategory: "Equipements", keywords: ["pompes industrielles"], regulatoryRisk: RegulatoryRisk.LOW, marginPotential: MarginPotential.MEDIUM, notes: null, createdAt: new Date(), updatedAt: new Date() },
  { id: "demo-852580", hsCode: "852580", name: "Cameras de surveillance", category: "Securite", subCategory: "Video", keywords: ["cameras"], regulatoryRisk: RegulatoryRisk.MEDIUM, marginPotential: MarginPotential.HIGH, notes: null, createdAt: new Date(), updatedAt: new Date() },
];

export const demoScores = demoProducts.map((product, index) => ({
  id: `score-${product.hsCode}`,
  hsCode: product.hsCode,
  year: 2025,
  marketSizeScore: 76 - index * 2,
  growthScore: 84 - index,
  stabilityScore: 70,
  supplierDiversityScore: 86 - index * 3,
  marginScore: product.marginPotential === "HIGH" ? 100 : 60,
  regulatoryScore: product.regulatoryRisk === "LOW" ? 100 : 60,
  customsRiskScore: 68,
  fxRiskScore: 50,
  dataQualityScore: 82,
  finalScore: 86 - index * 4,
  recommendation: index < 2 ? Recommendation.TRES_INTERESSANT : index < 4 ? Recommendation.INTERESSANT : Recommendation.A_SURVEILLER,
  explanation: "Donnees de demonstration utilisees car PostgreSQL n'est pas encore disponible en local.",
  createdAt: new Date(),
}));

export function demoDashboardKpis() {
  return {
    totals: {
      imports: 482_500_000,
      exports: 126_800_000,
      hsCodes: 12,
      countries: 8,
      products: demoProducts.length,
      dataQuality: 86,
    },
    yearly: [2020, 2021, 2022, 2023, 2024, 2025].flatMap((year, index) => [
      { year, flowType: "IMPORT", value: 52_000_000 + index * 9_400_000 },
      { year, flowType: "EXPORT", value: 13_000_000 + index * 2_100_000 },
    ]),
    topProducts: demoProducts.map((product, index) => ({
      hsCode: product.hsCode,
      productLabel: product.name,
      value: 92_000_000 - index * 8_500_000,
    })),
    topCountries: ["Chine", "France", "Espagne", "Allemagne", "Turquie", "Italie"].map((country, index) => ({
      country,
      value: 128_000_000 - index * 12_000_000,
    })),
    topScores: demoScores,
    jobs: [
      {
        id: "demo-job",
        dataSourceId: null,
        status: "SUCCESS",
        startedAt: new Date(),
        finishedAt: new Date(),
        rowsImported: 576,
        errorMessage: null,
        fileName: "seed-demo-office-des-changes.csv",
        fileType: "CSV",
        createdAt: new Date(),
      },
    ],
  };
}

export function isDatabaseUnavailable(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /Can't reach database server|P1001|P1000|P2021|ECONNREFUSED|Environment variable not found|Invalid `.*prisma.*` invocation|Invalid `.*Prisma.*` invocation|does not exist|connection|database/i.test(
    error.message,
  );
}
