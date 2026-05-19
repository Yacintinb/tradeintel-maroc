import { Card } from "@/components/ui/card";

export function KpiCard({ title, value, hint }: { title: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </Card>
  );
}
