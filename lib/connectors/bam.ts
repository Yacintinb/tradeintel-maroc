import { prisma } from "@/lib/prisma";

export async function syncBankAlMaghribRates() {
  const apiUrl = process.env.BAM_API_URL;
  const apiKey = process.env.BAM_API_KEY;
  if (!apiUrl || !apiKey) {
    return { configured: false, imported: 0, message: "API Bank Al-Maghrib non configuree. Utilisez l'import manuel CSV/XLSX." };
  }

  const response = await fetch(apiUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!response.ok) throw new Error(`Bank Al-Maghrib API error: ${response.status}`);
  const payload = (await response.json()) as { rates?: { date: string; currency: string; rateMad: number }[] };
  const rates = payload.rates ?? [];
  for (const rate of rates) {
    await prisma.exchangeRate.upsert({
      where: { date_currency_source: { date: new Date(rate.date), currency: rate.currency, source: "Bank Al-Maghrib API" } },
      create: { date: new Date(rate.date), currency: rate.currency, rateMad: rate.rateMad, source: "Bank Al-Maghrib API" },
      update: { rateMad: rate.rateMad },
    });
  }
  return { configured: true, imported: rates.length, message: "Synchronisation terminee." };
}
