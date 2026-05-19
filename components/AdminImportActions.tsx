"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActionState = {
  loading: "sync" | "cleanup" | null;
  message: string | null;
  error: string | null;
};

export function AdminImportActions({ defaultYears }: { defaultYears: string }) {
  const router = useRouter();
  const [years, setYears] = useState(defaultYears);
  const [state, setState] = useState<ActionState>({ loading: null, message: null, error: null });

  async function runAction(kind: "sync" | "cleanup") {
    setState({ loading: kind, message: null, error: null });
    const response =
      kind === "sync"
        ? await fetch("/api/admin/office-changes/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ years }),
          })
        : await fetch("/api/admin/imports?status=FAILED", { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setState({ loading: null, message: null, error: payload.error ?? "Action impossible." });
      return;
    }

    setState({ loading: null, message: payload.message ?? "Action lancee.", error: null });
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm text-slate-600">
          Années Office des Changes
          <input
            value={years}
            onChange={(event) => setYears(event.target.value)}
            placeholder="2025 ou 2023,2024,2025"
            className="h-10 min-w-[220px] rounded-md border border-slate-300 px-3 text-slate-900"
          />
        </label>
        <Button type="button" onClick={() => runAction("sync")} disabled={state.loading !== null}>
          <RefreshCw className="h-4 w-4" />
          {state.loading === "sync" ? "Synchronisation..." : "Synchroniser Office des Changes"}
        </Button>
        <Button type="button" variant="danger" onClick={() => runAction("cleanup")} disabled={state.loading !== null}>
          <Trash2 className="h-4 w-4" />
          {state.loading === "cleanup" ? "Nettoyage..." : "Nettoyer les imports échoués"}
        </Button>
      </div>
      {state.message ? <p className="mt-3 text-sm text-teal-700">{state.message}</p> : null}
      {state.error ? <p className="mt-3 text-sm text-red-700">{state.error}</p> : null}
    </div>
  );
}
