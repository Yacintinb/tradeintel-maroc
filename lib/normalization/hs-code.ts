export function normalizeHsCode(value: unknown, length = 6) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length >= length) return digits.slice(0, Math.max(length, Math.min(digits.length, 10)));
  return digits.padStart(length, "0");
}

export function hsCode6(value: unknown) {
  return normalizeHsCode(value, 6).slice(0, 6);
}
