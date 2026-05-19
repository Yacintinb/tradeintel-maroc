import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

export async function Header({ title }: { title: string }) {
  const session = await getServerSession(authOptions);
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="text-sm text-slate-500">Données ouvertes, fichiers publics et protocoles ouverts.</p>
      </div>
      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
        {session?.user?.name ?? "Utilisateur"} · {session?.user?.role ?? "CLIENT"}
      </div>
    </header>
  );
}
