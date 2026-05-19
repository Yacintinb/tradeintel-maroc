import Link from "next/link";
import {
  BarChart3,
  Calculator,
  Database,
  FileSpreadsheet,
  Gauge,
  Home,
  PackageSearch,
  Settings,
  Upload,
  WalletCards,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/products", label: "Produits", icon: PackageSearch },
  { href: "/opportunities", label: "Opportunites", icon: Gauge },
  { href: "/reports", label: "Rapports", icon: FileSpreadsheet },
  { href: "/tools/landed-cost", label: "Calculateur cout", icon: Calculator },
  { href: "/admin/imports", label: "Imports", icon: Upload },
  { href: "/admin/data-sources", label: "Sources", icon: Database },
  { href: "/admin/open-datasets", label: "Open datasets", icon: BarChart3 },
  { href: "/admin/customs-tariff", label: "Tarifs douaniers", icon: WalletCards },
  { href: "/admin/exchange-rates", label: "Taux de change", icon: WalletCards },
  { href: "/admin/macro-indicators", label: "Macro HCP", icon: BarChart3 },
  { href: "/admin/scores", label: "Scores", icon: Gauge },
  { href: "/admin/settings", label: "Parametres", icon: Settings },
];

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-68 border-r border-slate-200 bg-white px-4 py-5 lg:block">
      <Link href="/dashboard" className="mb-7 block">
        <div className="text-lg font-bold text-slate-950">TradeIntel Maroc</div>
        <div className="text-xs text-slate-500">Import/Export Intelligence</div>
      </Link>
      <nav className="space-y-1">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
