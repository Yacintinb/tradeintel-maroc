import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

export async function exportWorkbook(type: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TradeIntel Maroc";
  workbook.created = new Date();

  if (type === "opportunities") {
    const sheet = workbook.addWorksheet("Top opportunites");
    sheet.columns = [
      { header: "Code SH", key: "hsCode", width: 14 },
      { header: "Annee", key: "year", width: 10 },
      { header: "Score", key: "finalScore", width: 10 },
      { header: "Recommendation", key: "recommendation", width: 24 },
    ];
    const rows = await prisma.opportunityScore.findMany({ orderBy: { finalScore: "desc" }, take: 200 });
    rows.forEach((row) => sheet.addRow(row));
  } else if (type === "sources") {
    const sheet = workbook.addWorksheet("Sources");
    sheet.columns = [
      { header: "Nom", key: "name", width: 28 },
      { header: "Type", key: "type", width: 14 },
      { header: "Statut", key: "status", width: 14 },
      { header: "Licence", key: "license", width: 18 },
    ];
    const rows = await prisma.dataSource.findMany({ orderBy: { updatedAt: "desc" } });
    rows.forEach((row) => sheet.addRow(row));
  } else {
    const sheet = workbook.addWorksheet("TradeFlow");
    sheet.columns = [
      { header: "Annee", key: "year", width: 10 },
      { header: "Mois", key: "month", width: 10 },
      { header: "Flux", key: "flowType", width: 12 },
      { header: "Code SH", key: "hsCode", width: 14 },
      { header: "Produit", key: "productLabel", width: 34 },
      { header: "Pays", key: "country", width: 20 },
      { header: "Valeur MAD", key: "valueMad", width: 18 },
      { header: "Quantite", key: "quantity", width: 14 },
      { header: "Unite", key: "unit", width: 10 },
    ];
    const rows = await prisma.tradeFlow.findMany({ orderBy: [{ year: "desc" }], take: 5000 });
    rows.forEach((row) => sheet.addRow({ ...row, valueMad: Number(row.valueMad), quantity: row.quantity ? Number(row.quantity) : null }));
  }

  workbook.eachSheet((sheet) => {
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
