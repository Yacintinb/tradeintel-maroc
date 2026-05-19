export function EmptyState({ title = "Aucune donnée", description = "Importez des fichiers ou ajustez vos filtres." }) {
  return <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center"><div className="font-medium">{title}</div><p className="mt-1 text-sm text-slate-500">{description}</p></div>;
}

export function LoadingState() {
  return <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-500">Chargement...</div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-md border border-red-200 bg-red-50 p-6 text-sm text-red-700">{message}</div>;
}
