import { z } from "zod";
import { parseLocaleNumber } from "@/lib/normalization/numbers";

export const macroIndicatorSchema = z.object({
  indicatorName: z.string().min(1),
  period: z.string().min(1),
  value: z.number(),
  unit: z.string().nullable().optional(),
  source: z.string().default("HCP manuel"),
});

export function normalizeMacroRow(row: Record<string, unknown>) {
  return macroIndicatorSchema.parse({
    indicatorName: String(row["Indicateur"] ?? row["indicatorName"] ?? "").trim(),
    period: String(row["Periode"] ?? row["Période"] ?? row["period"] ?? "").trim(),
    value: parseLocaleNumber(row["Valeur"] ?? row["value"]) ?? 0,
    unit: String(row["Unite"] ?? row["Unité"] ?? row["unit"] ?? "").trim() || null,
    source: String(row["Source"] ?? "HCP manuel"),
  });
}
