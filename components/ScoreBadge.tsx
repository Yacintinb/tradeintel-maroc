import { Badge } from "@/components/ui/badge";

export function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-100 text-emerald-800" : score >= 65 ? "bg-teal-100 text-teal-800" : score >= 50 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
  return <Badge className={color}>{Math.round(score)}/100</Badge>;
}
