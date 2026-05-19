import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  return (
    <>
      <Header title="Paramètres" />
      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Input defaultValue="MAD" aria-label="Devise par défaut" />
          <Input defaultValue="https://data.gov.ma/api/3/action" aria-label="Configuration CKAN" />
          <Input placeholder="BAM_API_URL" />
          <Input placeholder="BAM_API_KEY" />
        </div>
        <p className="mt-4 text-sm text-slate-500">Les pondérations et seuils sont centralisés dans le module de scoring et prêts à être exposés en base dans une prochaine itération.</p>
      </Card>
    </>
  );
}
