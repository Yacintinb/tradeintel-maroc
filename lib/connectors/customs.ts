import { z } from "zod";
import { hsCode6, normalizeHsCode } from "@/lib/normalization/hs-code";
import { parseLocaleNumber } from "@/lib/normalization/numbers";

export const customsTariffSchema = z.object({
  hsCode10: z.string().min(6).max(10),
  hsCode6: z.string().min(6).max(6),
  description: z.string().min(1),
  chapter: z.string().nullable().optional(),
  section: z.string().nullable().optional(),
  dutyRate: z.number().nullable().optional(),
  vatRate: z.number().nullable().optional(),
  parafiscalTax: z.number().nullable().optional(),
  source: z.string().nullable().optional(),
  effectiveDate: z.date().nullable().optional(),
});

export function normalizeCustomsRow(row: Record<string, unknown>) {
  const code = normalizeHsCode(row["Code SH"] ?? row["Position tarifaire"] ?? row["hsCode10"], 10);
  return customsTariffSchema.parse({
    hsCode10: code,
    hsCode6: hsCode6(code),
    description: String(row["Designation"] ?? row["Désignation"] ?? row["description"] ?? "").trim(),
    chapter: String(row["Chapitre"] ?? row["chapter"] ?? "").trim() || null,
    section: String(row["Section"] ?? row["section"] ?? "").trim() || null,
    dutyRate: parseLocaleNumber(row["Droit"] ?? row["dutyRate"]),
    vatRate: parseLocaleNumber(row["TVA"] ?? row["vatRate"]),
    parafiscalTax: parseLocaleNumber(row["Taxe parafiscale"] ?? row["parafiscalTax"]),
    source: String(row["Source"] ?? "ADIL/Douane manuel"),
    effectiveDate: null,
  });
}
