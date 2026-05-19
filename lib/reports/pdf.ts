import PDFDocument from "pdfkit";
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

export async function generateProductPdf(hsCode: string) {
  const [product, flows, score] = await Promise.all([
    prisma.product.findUnique({ where: { hsCode } }),
    prisma.tradeFlow.findMany({ where: { hsCode }, orderBy: [{ year: "asc" }, { country: "asc" }] }),
    prisma.opportunityScore.findFirst({ where: { hsCode }, orderBy: { year: "desc" } }),
  ]);

  const total = flows.reduce((sum, flow) => sum + Number(flow.valueMad), 0);
  const countries = Array.from(new Set(flows.map((flow) => flow.country))).slice(0, 8).join(", ");
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const done = collectPdf(doc);

  doc.fontSize(20).text(`Rapport produit - ${product?.name ?? hsCode}`);
  doc.moveDown().fontSize(10).fillColor("#475467").text(`Genere le ${new Date().toLocaleDateString("fr-MA")}`);
  doc.moveDown().fillColor("#111827").fontSize(13).text("Resume executif", { underline: true });
  doc.moveDown(0.4).fontSize(11).text(`Code SH: ${hsCode}`);
  doc.text(`Designation: ${product?.name ?? flows[0]?.productLabel ?? "Non renseignee"}`);
  doc.text(`Valeur totale import/export observee: ${formatMad(total)}`);
  doc.text(`Top pays fournisseurs: ${countries || "Donnees insuffisantes"}`);
  doc.moveDown().text(`Score d'opportunite: ${Math.round(score?.finalScore ?? 50)}/100`);
  doc.text(`Recommendation: ${recommendationLabel(score?.recommendation ?? "A_SURVEILLER")}`);
  doc.moveDown().text(score?.explanation ?? "Score neutre faute de donnees suffisantes.");
  doc.moveDown().fontSize(13).text("Risques et limites", { underline: true });
  doc.moveDown(0.4).fontSize(11).text("Les resultats dependent des fichiers importes manuellement, des nomenclatures disponibles et de la qualite du mapping colonnes.");
  doc.moveDown().fontSize(13).text("Sources utilisees", { underline: true });
  doc.moveDown(0.4).fontSize(11).text("Office des Changes Maroc, Data.gov.ma/CKAN, ADIL/Douane, Bank Al-Maghrib, HCP selon disponibilite.");
  doc.end();
  return done;
}

export async function generateSectorPdf(sector: string) {
  const products = await prisma.product.findMany({ where: { category: sector }, take: 20 });
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const done = collectPdf(doc);
  doc.fontSize(20).text(`Rapport sectoriel - ${sector}`);
  doc.moveDown().fontSize(11).text("Top produits importes, opportunites et recommandations commerciales.");
  for (const product of products) {
    doc.moveDown(0.6).text(`${product.hsCode} - ${product.name}`);
  }
  doc.moveDown().text("Annexes Excel disponibles via l'export dedie.");
  doc.end();
  return done;
}
