import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const getCssVariableAsRGB = (variable: string) => {
  const hsl = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return hslToRgb(hsl);
};

export const hslToRgb = (hsl: string) => {
  const match = hsl.match(/(\d+),?\s*(\d+)%?,?\s*(\d+)%?/);
  if (!match) return "rgb(0, 0, 0)";

  let [h, s, l] = match.slice(1, 4).map(Number);
  s /= 100;
  l /= 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  return `rgb(${ Math.round(f(0) * 255) }, ${ Math.round(f(8) * 255) }, ${ Math.round(f(4) * 255) })`;
};


export function extractErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null) {
    return (error as any).message || JSON.stringify(error);
  }
  return "Unknown error";
}