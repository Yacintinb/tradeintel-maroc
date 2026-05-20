import { NextRequest } from "next/server";
import { z } from "zod";
import { generateLandedCostPdf } from "@/lib/reports/pdf";

const schema = z.object({
  hsCode: z.string().min(2).default("NON_RENSEIGNE"),
  description: z.string().default("Produit"),
  currency: z.string().min(3).max(3).default("EUR"),
  exchangeRate: z.coerce.number().positive().default(1),
  goodsValue: z.coerce.number().nonnegative().default(0),
  quantity: z.coerce.number().positive().default(1),
  freight: z.coerce.number().nonnegative().default(0),
  insurance: z.coerce.number().nonnegative().default(0),
  otherFeesMad: z.coerce.number().nonnegative().default(0),
  dutyRate: z.coerce.number().nonnegative().default(0),
  vatRate: z.coerce.number().nonnegative().default(20),
  parafiscalTax: z.coerce.number().nonnegative().default(0),
  targetMargin: z.coerce.number().min(0).max(95).default(25),
});

export async function GET(request: NextRequest) {
  const input = schema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  const buffer = await generateLandedCostPdf(input);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=tradeintel-cout-debarque-${input.hsCode}.pdf`,
    },
  });
}
