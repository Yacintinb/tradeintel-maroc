import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeIntel Maroc",
  description: "Plateforme B2B d'intelligence import/export basee sur les donnees ouvertes.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
