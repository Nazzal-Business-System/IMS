/** Clamp list/report query limits to a safe production range. */
export function clampLimit(
  raw: unknown,
  fallback = 50,
  max = 200
): number {
  const n = typeof raw === "string" || typeof raw === "number" ? parseInt(String(raw), 10) : NaN;
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}
