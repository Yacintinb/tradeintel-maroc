import PDFDocument from "pdfkit";
import { FlowType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMad } from "@/lib/utils";
import { recommendationLabel } from "@/lib/scoring/opportunity-score";

function collectPdf(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function title(doc: PDFKit.PDFDocument, value: string, subtitle?: string) {
  doc.fillColor("#0f172a").fontSize(22).text(value);
  if (subtitle) doc.moveDown(0.2).fillColor("#475569").fontSize(10).text(subtitle);
  doc.moveDown(0.9);
}

function section(doc: PDFKit.PDFDocument, value: string) {
  doc.moveDown(0.7).fillColor("#0f172a").fontSize(13).text(value, { underline: true });
  doc.moveDown(0.35);
}

function keyValue(doc: PDFKit.PDFDocument, label: string, value: string | number) {
  doc.fillColor("#334155").fontSize(10).text(label, { continued: true });
  doc.fillColor("#0f172a").text(` ${value}`);
}

function bullet(doc: PDFKit.PDFDocument, value: string) {
  doc.fillColor("#334155").fontSize(10).text(`- ${value}`);
}

function topBy<T>(items: T[], value: (item: T) => number, limit = 10) {
  return [...items].sort((a, b) => value(b) - value(a)).slice(0, limit);
}

export async function generateProductPdf(hsCode: string) {
  const [product, flows, score] = await Promise.all([
    prisma.product.findUnique({ where: { hsCode } }),
    prisma.tradeFlow.findMany({ where: { hsCode }, orderBy: [{ year: "asc" }, { country: "asc" }] }),
    prisma.opportunityScore.findFirst({ where: { hsCode }, orderBy: { year: "desc" } }),
  ]);

  const total = flows.reduce((sum, flow) => sum + Number(flow.valueMad), 0);
  const imports = flows.filter((flow) => flow.flowType === FlowType.IMPORT);
  const byYear = new Map<number, number>();
  const byCountry = new Map<string, number>();
  for (const flow of imports) {
    byYear.set(flow.year, (byYear.get(flow.year) ?? 0) + Number(flow.valueMad));
    byCountry.set(flow.country, (byCountry.get(flow.country) ?? 0) + Number(flow.valueMad));
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  const latestYear = years.at(-1);
  const previousYear = latestYear ? years[years.length - 2] : undefined;
  const latestValue = latestYear ? byYear.get(latestYear) ?? 0 : 0;
  const previousValue = previousYear ? byYear.get(previousYear) ?? 0 : 0;
  const growth = previousValue > 0 ? ((latestValue - previousValue) / previousValue) * 100 : null;
  const topCountries = topBy([...byCountry.entries()], ([, value]) => value, 8);
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const done = collectPdf(doc);

  title(doc, `TradeIntel Maroc - Rapport produit`, `${product?.name ?? flows[0]?.productLabel ?? hsCode} | Code SH ${hsCode} | ${new Date().toLocaleDateString("fr-MA")}`);
  section(doc, "Resume executif");
  keyValue(doc, "Designation:", product?.name ?? flows[0]?.productLabel ?? "Non renseignee");
  keyValue(doc, "Valeur totale observee:", formatMad(total));
  keyValue(doc, "Derniere annee disponible:", latestYear ?? "Non disponible");
  keyValue(doc, "Croissance vs annee precedente:", growth === null ? "Non calculable" : `${growth.toFixed(1)}%`);
  keyValue(doc, "Score d'opportunite:", `${Math.round(score?.finalScore ?? 50)}/100`);
  keyValue(doc, "Recommandation:", recommendationLabel(score?.recommendation ?? "A_SURVEILLER"));

  section(doc, "Lecture commerciale");
  bullet(doc, score?.explanation ?? "Score neutre faute de donnees suffisantes.");
  bullet(doc, topCountries.length > 0 ? `Pays fournisseurs majeurs: ${topCountries.map(([country]) => country).join(", ")}.` : "Pays fournisseurs insuffisamment documentes.");
  bullet(doc, growth !== null && growth > 20 ? "Signal de croissance fort a qualifier par marge, reglementation et sourcing." : "Signal a surveiller avec davantage d'historique.");

  section(doc, "Top pays fournisseurs");
  if (topCountries.length === 0) bullet(doc, "Donnees insuffisantes.");
  for (const [country, value] of topCountries) bullet(doc, `${country}: ${formatMad(value)}`);

  section(doc, "Historique annuel");
  for (const year of years.slice(-6)) bullet(doc, `${year}: ${formatMad(byYear.get(year) ?? 0)}`);

  section(doc, "Risques et limites");
  bullet(doc, "Les resultats dependent de la disponibilite des exports publics Office des Changes et des imports realises.");
  bullet(doc, "Le score ne remplace pas une validation terrain des marges, fournisseurs, delais et exigences douanieres.");
  section(doc, "Sources utilisees");
  bullet(doc, "Office des Changes Maroc, imports CSV/XLSX, nomenclature douaniere et donnees d'enrichissement disponibles dans TradeIntel Maroc.");
  doc.end();
  return done;
}

export async function generateSectorPdf(sector: string) {
  const [flows, scores] = await Promise.all([
    prisma.tradeFlow.findMany({ where: { flowType: FlowType.IMPORT }, orderBy: [{ year: "desc" }], take: 5000 }),
    prisma.opportunityScore.findMany({ orderBy: { finalScore: "desc" }, take: 50 }),
  ]);

  const byProduct = new Map<string, { label: string; value: number }>();
  const byCountry = new Map<string, number>();
  const byYearProduct = new Map<string, Map<number, number>>();
  for (const flow of flows) {
    const current = byProduct.get(flow.hsCode) ?? { label: flow.productLabel, value: 0 };
    current.value += Number(flow.valueMad);
    byProduct.set(flow.hsCode, current);
    byCountry.set(flow.country, (byCountry.get(flow.country) ?? 0) + Number(flow.valueMad));
    const yearly = byYearProduct.get(flow.hsCode) ?? new Map<number, number>();
    yearly.set(flow.year, (yearly.get(flow.year) ?? 0) + Number(flow.valueMad));
    byYearProduct.set(flow.hsCode, yearly);
  }
  const topProducts = topBy([...byProduct.entries()], ([, item]) => item.value, 10);
  const topCountries = topBy([...byCountry.entries()], ([, value]) => value, 10);
  const growthProducts = topBy(
    [...byYearProduct.entries()].map(([hsCode, yearly]) => {
      const years = [...yearly.keys()].sort((a, b) => a - b);
      const last = years.at(-1);
      const previous = years[years.length - 2];
      const lastValue = last ? yearly.get(last) ?? 0 : 0;
      const previousValue = previous ? yearly.get(previous) ?? 0 : 0;
      return { hsCode, growth: previousValue > 0 ? ((lastValue - previousValue) / previousValue) * 100 : 0, lastValue };
    }),
    (item) => item.growth,
    10,
  );
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const done = collectPdf(doc);
  title(doc, `TradeIntel Maroc - Rapport sectoriel`, `${sector || "General"} | ${new Date().toLocaleDateString("fr-MA")}`);
  section(doc, "Synthese");
  bullet(doc, `Perimetre analyse: ${flows.length} lignes import Office des Changes / TradeFlow.`);
  bullet(doc, `Top opportunites calculees: ${scores.length}.`);

  section(doc, "Top produits importes");
  for (const [hsCode, item] of topProducts) bullet(doc, `${hsCode} - ${item.label}: ${formatMad(item.value)}`);

  section(doc, "Top produits en croissance");
  for (const item of growthProducts) bullet(doc, `${item.hsCode}: ${item.growth.toFixed(1)}% | derniere valeur ${formatMad(item.lastValue)}`);

  section(doc, "Top pays fournisseurs");
  for (const [country, value] of topCountries) bullet(doc, `${country}: ${formatMad(value)}`);

  section(doc, "Top opportunites");
  for (const score of scores.slice(0, 10)) bullet(doc, `${score.hsCode}: ${Math.round(score.finalScore)}/100 - ${recommendationLabel(score.recommendation)}`);

  section(doc, "Recommandations commerciales");
  bullet(doc, "Prioriser les codes SH combinant taille de marche, croissance et diversification fournisseurs.");
  bullet(doc, "Comparer les pays fournisseurs dominants pour detecter risques de dependance et alternatives d'approvisionnement.");
  bullet(doc, "Produire une fiche produit detaillee pour les codes SH retenus avant prospection client.");

  section(doc, "Limites des donnees");
  bullet(doc, "Les donnees refletent les exports disponibles/importes dans TradeIntel Maroc.");
  bullet(doc, "Les decisions finales doivent integrer marge, reglementation, logistique et validation fournisseur.");
  doc.end();
  return done;
}
