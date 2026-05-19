export function DataTable<T extends Record<string, unknown>>({ rows, columns }: { rows: T[]; columns: { key: keyof T; label: string; render?: (row: T) => React.ReactNode }[] }) {
  if (!rows.length) return <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Aucune donnée disponible.</div>;
  return (
    <div className="table-wrap rounded-md border border-slate-200 bg-white">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>{columns.map((column) => <th key={String(column.key)} className="px-4 py-3 font-semibold">{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-slate-100">
              {columns.map((column) => <td key={String(column.key)} className="px-4 py-3 text-slate-800">{column.render ? column.render(row) : String(row[column.key] ?? "")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
