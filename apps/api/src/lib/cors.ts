/**
 * Parse CORS_ORIGIN into an allowlist.
 * Supports a single origin or a comma-separated list (Vercel preview + production).
 * Never use `*` with credentials.
 */
export function parseCorsOrigins(raw?: string | null): string[] {
  const value = (raw ?? "http://localhost:3002").trim();
  if (!value || value === "*") {
    return ["http://localhost:3002"];
  }
  return value
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function createCorsOriginChecker(raw?: string | null) {
  const allowed = new Set(parseCorsOrigins(raw));

  return function corsOrigin(
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    // Non-browser clients (curl, health checks) often omit Origin
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowed.has(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  };
}

export function getCorsConfig(raw?: string | null) {
  return {
    origin: createCorsOriginChecker(raw ?? process.env.CORS_ORIGIN),
    credentials: true,
  };
}
