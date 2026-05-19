import Papa from "papaparse";
import * as XLSX from "xlsx";
import { z } from "zod";
import { FlowType } from "@prisma/client";
import { normalizeHsCode } from "@/lib/normalization/hs-code";
import { parseLocaleNumber, parseMonth, parseYear } from "@/lib/normalization/numbers";

export type ParsedTable = {
  headers: string[];
  rows: Record<string, unknown>[];
};

export type ColumnMapping = Partial<Record<keyof ImportTradeFlowInput, string>>;

export const importTradeFlowSchema = z.object({
  year: z.number().int().min(1990).max(2100),
  month: z.number().int().min(1).max(12).nullable().optional(),
  flowType: z.nativeEnum(FlowType),
  hsCode: z.string().min(4).max(10),
  productLabel: z.string().min(1),
  country: z.string().min(1),
  valueMad: z.number().nonnegative(),
  quantity: z.number().nonnegative().nullable().optional(),
  unit: z.string().nullable().optional(),
});

export type ImportTradeFlowInput = z.infer<typeof importTradeFlowSchema>;

const aliases: Record<keyof ImportTradeFlowInput, string[]> = {
  year: ["annee", "année", "year"],
  month: ["mois", "month"],
  flowType: ["flux", "import/export", "type flux", "flowtype"],
  hsCode: ["code sh", "code hs", "position tarifaire", "sh", "hs code"],
  productLabel: ["designation", "désignation", "produit", "product", "libelle"],
  country: ["pays", "pays d'origine", "pays de destination", "country"],
  valueMad: ["valeur mad", "montant", "valeur", "value mad"],
  quantity: ["quantite", "quantité", "quantity"],
  unit: ["unite", "unité", "unit"],
};

function key(value: string) {
  return value.trim().toLowerCase();
}

export function guessColumnMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map((header) => ({ header, k: key(header) }));
  return Object.fromEntries(
    Object.entries(aliases).map(([field, names]) => [
      field,
      normalized.find((item) => names.some((name) => item.k.includes(name)))?.header,
    ]),
  ) as ColumnMapping;
}

export async function parseImportFile(file: File): Promise<ParsedTable> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return parseImportBuffer(file.name, buffer);
}

export function parseImportBuffer(fileName: string, buffer: Buffer): ParsedTable {
  if (fileName.toLowerCase().endsWith(".csv")) {
    const result = Papa.parse<Record<string, unknown>>(buffer.toString("utf8"), {
      header: true,
      skipEmptyLines: true,
    });
    const headers = result.meta.fields ?? Object.keys(result.data[0] ?? {});
    return { headers, rows: result.data };
  }
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return { headers: Object.keys(rows[0] ?? {}), rows };
}

export function mapTradeRows(rows: Record<string, unknown>[], mapping: ColumnMapping) {
  const errors: { row: number; message: string }[] = [];
  const valid: ImportTradeFlowInput[] = [];

  rows.forEach((row, index) => {
    const rawFlow = String(row[mapping.flowType ?? ""] ?? "IMPORT").toUpperCase();
    const candidate = {
      year: parseYear(row[mapping.year ?? ""]),
      month: parseMonth(row[mapping.month ?? ""]),
      flowType: rawFlow.includes("EXP") ? FlowType.EXPORT : FlowType.IMPORT,
      hsCode: normalizeHsCode(row[mapping.hsCode ?? ""], 6),
      productLabel: String(row[mapping.productLabel ?? ""] ?? "").trim(),
      country: String(row[mapping.country ?? ""] ?? "").trim(),
      valueMad: parseLocaleNumber(row[mapping.valueMad ?? ""]),
      quantity: parseLocaleNumber(row[mapping.quantity ?? ""]),
      unit: String(row[mapping.unit ?? ""] ?? "").trim() || null,
    };
    const parsed = importTradeFlowSchema.safeParse(candidate);
    if (parsed.success) valid.push(parsed.data);
    else errors.push({ row: index + 2, message: parsed.error.issues.map((issue) => issue.message).join(", ") });
  });

  return { valid, errors };
}
