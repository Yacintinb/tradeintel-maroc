import { Badge } from "@/components/ui/badge";
import { recommendationLabel } from "@/lib/scoring/opportunity-score";

export function RecommendationBadge({ value }: { value: string }) {
  const label = recommendationLabel(value);
  const color =
    value === "TRES_INTERESSANT"
      ? "bg-emerald-100 text-emerald-800"
      : value === "INTERESSANT"
        ? "bg-teal-100 text-teal-800"
        : value === "A_SURVEILLER"
          ? "bg-amber-100 text-amber-800"
          : value === "FAIBLE_POTENTIEL"
            ? "bg-slate-100 text-slate-700"
            : "bg-red-100 text-red-800";
  return <Badge className={color}>{label}</Badge>;
}
