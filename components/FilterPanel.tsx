import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function FilterPanel({ categories = [] }: { categories?: string[] }) {
  return (
    <form className="mb-5 grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-4">
      <Input name="q" placeholder="Mot-clé ou code SH" />
      <Select name="category"><option value="">Toutes catégories</option>{categories.map((category) => <option key={category}>{category}</option>)}</Select>
      <Input name="country" placeholder="Pays" />
      <Input name="year" placeholder="Année" />
    </form>
  );
}

export function DateRangeFilter() {
  return <div className="grid gap-3 md:grid-cols-2"><Input name="from" type="date" /><Input name="to" type="date" /></div>;
}

export function HsCodeSearch() {
  return <Input name="hsCode" placeholder="Rechercher un code SH" />;
}

export function SourceStatusBadge({ status }: { status: string }) {
  const className = status === "ACTIVE" ? "text-emerald-700" : status === "ERROR" ? "text-red-700" : "text-slate-600";
  return <span className={className}>{status}</span>;
}
