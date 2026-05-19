export function parseLocaleNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value)
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "")
    .replace(/,(?=\d{1,2}$)/, ".")
    .replace(/,/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

export function parseYear(value: unknown) {
  const year = Number(String(value ?? "").match(/\d{4}/)?.[0]);
  return year >= 1990 && year <= 2100 ? year : null;
}

export function parseMonth(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const month = Number(String(value).replace(/\D/g, ""));
  return month >= 1 && month <= 12 ? month : null;
}
