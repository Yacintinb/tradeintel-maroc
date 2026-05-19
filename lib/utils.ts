import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMad(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 1 }).format(Number(value ?? 0));
}
