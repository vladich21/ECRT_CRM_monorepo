export function formatSwStatusLabel(label: string | undefined, fallback: string): string {
  const raw = (label ?? fallback).trim();
  return raw ? raw.charAt(0).toLowerCase() + raw.slice(1) : fallback;
}
