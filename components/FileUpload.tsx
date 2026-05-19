"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FileUpload({ action, label = "Importer fichier" }: { action: string; label?: string }) {
  return (
    <form action={action} method="post" encType="multipart/form-data" className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white p-4">
      <input name="file" type="file" accept=".csv,.xlsx,.xls" className="text-sm" />
      <input name="mode" type="hidden" value="import" />
      <Button type="submit"><Upload className="h-4 w-4" />{label}</Button>
    </form>
  );
}
