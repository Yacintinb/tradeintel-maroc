import { NextRequest } from "next/server";
import { exportWorkbook } from "@/lib/reports/excel";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") ?? "tradeflows";
  const buffer = await exportWorkbook(type);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=tradeintel-${type}.xlsx`,
    },
  });
}
