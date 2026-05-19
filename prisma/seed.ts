import bcrypt from "bcryptjs";
import { FlowType, MarginPotential, RegulatoryRisk } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { calculateOpportunityScore } from "../lib/scoring/opportunity-score";

const products = [
  ["850440", "Onduleurs UPS", "Energie", "Protection electrique", MarginPotential.HIGH, RegulatoryRisk.LOW],
  ["850760", "Batteries lithium", "Energie", "Stockage", MarginPotential.HIGH, RegulatoryRisk.MEDIUM],
  ["85044010", "Convertisseurs statiques", "Energie", "Conversion", MarginPotential.MEDIUM, RegulatoryRisk.LOW],
  ["854140", "Panneaux solaires", "Energie", "Solaire", MarginPotential.HIGH, RegulatoryRisk.MEDIUM],
  ["853620", "Disjoncteurs", "Electricite", "Protection", MarginPotential.MEDIUM, RegulatoryRisk.LOW],
  ["854449", "Câbles électriques", "Electricite", "Cablage", MarginPotential.MEDIUM, RegulatoryRisk.LOW],
  ["841370", "Pompes industrielles", "Industrie", "Equipements", MarginPotential.MEDIUM, RegulatoryRisk.LOW],
  ["852580", "Caméras de surveillance", "Securite", "Video", MarginPotential.HIGH, RegulatoryRisk.MEDIUM],
  ["860800", "Barrières automatiques", "Securite", "Controle acces", MarginPotential.MEDIUM, RegulatoryRisk.LOW],
  ["903180", "Capteurs industriels", "Industrie", "Instrumentation", MarginPotential.HIGH, RegulatoryRisk.LOW],
  ["85044090", "Variateurs de vitesse", "Industrie", "Automatisation", MarginPotential.HIGH, RegulatoryRisk.LOW],
  ["850211", "Groupes électrogènes", "Energie", "Secours", MarginPotential.MEDIUM, RegulatoryRisk.MEDIUM],
] as const;

const countries = ["Chine", "France", "Espagne", "Allemagne", "Turquie", "Italie", "Inde", "États-Unis"];

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@tradeintel.ma" },
    update: {},
    create: { name: "Admin TradeIntel", email: "admin@tradeintel.ma", passwordHash, role: "ADMIN" },
  });
  const client = await prisma.user.upsert({
    where: { email: "client@tradeintel.ma" },
    update: {},
    create: { name: "Client Demo", email: "client@tradeintel.ma", passwordHash: await bcrypt.hash("client123", 10), role: "CLIENT" },
  });

  const plan = await prisma.subscriptionPlan.upsert({
    where: { name: "Business" },
    update: {},
    create: { name: "Business", priceMonthly: 1490, maxReports: 25, canExportExcel: true, canExportPdf: true, canAccessApi: false },
  });
  await prisma.clientSubscription.create({ data: { userId: client.id, planId: plan.id, status: "TRIAL" } }).catch(() => null);

  const source = await prisma.dataSource.upsert({
    where: { id: "demo-office-des-changes" },
    update: {},
    create: {
      id: "demo-office-des-changes",
      name: "Office des Changes - import manuel demo",
      type: "CSV",
      license: "Open data / fichier public exporte",
      refreshFrequency: "Mensuelle",
      status: "ACTIVE",
      notes: "Seed fictif pour MVP local.",
    },
  });

  await prisma.product.createMany({
    data: products.map(([hsCode, name, category, subCategory, marginPotential, regulatoryRisk]) => ({
      hsCode,
      name,
      category,
      subCategory,
      marginPotential,
      regulatoryRisk,
      keywords: [name.toLowerCase(), category.toLowerCase()],
    })),
    skipDuplicates: true,
  });

  await prisma.tradeFlow.deleteMany({ where: { dataSourceId: source.id } });
  const flows = [];
  for (const [productIndex, product] of products.entries()) {
    for (const year of [2020, 2021, 2022, 2023, 2024, 2025]) {
      for (const [countryIndex, country] of countries.entries()) {
        const base = 700000 + productIndex * 210000 + countryIndex * 65000;
        const growth = Math.pow(1.08 + productIndex * 0.006, year - 2020);
        const value = Math.round(base * growth * (countryIndex === 0 ? 2.2 : 1));
        flows.push({
          year,
          month: (countryIndex % 12) + 1,
          flowType: FlowType.IMPORT,
          hsCode: product[0],
          productLabel: product[1],
          country,
          valueMad: value,
          quantity: Math.round(value / 120),
          unit: "u",
          sourceFile: "seed-demo-office-des-changes.csv",
          dataSourceId: source.id,
        });
      }
    }
  }
  await prisma.tradeFlow.createMany({ data: flows });
  await prisma.dataIngestionJob.create({ data: { dataSourceId: source.id, status: "SUCCESS", finishedAt: new Date(), rowsImported: flows.length, fileName: "seed-demo-office-des-changes.csv", fileType: "CSV" } });

  await prisma.customsTariff.createMany({
    data: products.map(([hsCode, name], index) => ({
      hsCode10: hsCode.padEnd(10, "0").slice(0, 10),
      hsCode6: hsCode.slice(0, 6),
      description: name,
      chapter: hsCode.slice(0, 2),
      section: "Demo",
      dutyRate: [2.5, 5, 10, 17.5][index % 4],
      vatRate: 20,
      parafiscalTax: 0.25,
      source: "ADIL/Douane manuel demo",
      effectiveDate: new Date("2025-01-01"),
    })),
    skipDuplicates: true,
  });

  await prisma.exchangeRate.createMany({
    data: [
      { date: new Date("2025-12-31"), currency: "EUR", rateMad: 10.85, source: "Bank Al-Maghrib demo" },
      { date: new Date("2025-12-31"), currency: "USD", rateMad: 9.95, source: "Bank Al-Maghrib demo" },
      { date: new Date("2025-12-31"), currency: "CNY", rateMad: 1.38, source: "Bank Al-Maghrib demo" },
    ],
    skipDuplicates: true,
  });

  await prisma.macroIndicator.createMany({
    data: [
      { indicatorName: "Indice commerce exterieur", period: "2025", value: 112.4, unit: "base 100", source: "HCP demo" },
      { indicatorName: "Croissance import biens equipement", period: "2025", value: 8.7, unit: "%", source: "HCP demo" },
    ],
  });

  for (const [hsCode] of products) {
    const score = await calculateOpportunityScore(hsCode, 2025);
    await prisma.opportunityScore.upsert({
      where: { hsCode_year: { hsCode, year: 2025 } },
      create: { hsCode, year: 2025, ...score },
      update: score,
    });
  }

  await prisma.report.create({
    data: {
      title: "Rapport demo - Opportunites Energie 2025",
      type: "SECTOR",
      sector: "Energie",
      description: "Rapport sectoriel genere par le seed.",
      createdById: admin.id,
    },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
