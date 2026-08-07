const isDev = process.env.NODE_ENV !== "production";
const isProd = process.env.NODE_ENV === "production";

function logDev(message: string) {
  if (isDev) console.log(`[ims-api] ${message}`);
}

function logDevError(message: string) {
  if (isDev) console.error(`[ims-api] ${message}`);
}

function logAlways(message: string) {
  console.log(`[ims-api] ${message}`);
}

export function validateEnv(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!process.env.DATABASE_URL?.trim()) missing.push("DATABASE_URL");
  if (!process.env.JWT_SECRET?.trim()) missing.push("JWT_SECRET");

  if (missing.length > 0) {
    const msg = `Missing required environment variables: ${missing.join(", ")}. See docs/DEPLOYMENT.md`;
    logDevError(msg);
    throw new Error(msg);
  }

  const jwtSecret = process.env.JWT_SECRET!.trim();
  if (jwtSecret.length < 32) {
    const msg =
      "JWT_SECRET must be at least 32 characters. Generate with: openssl rand -base64 48";
    if (isProd) throw new Error(msg);
    warnings.push(msg);
  }

  if (
    isProd &&
    (jwtSecret === "change-this-to-a-secure-random-string-in-production" ||
      jwtSecret.toLowerCase().includes("change-this"))
  ) {
    throw new Error("JWT_SECRET must be changed from the placeholder value in production");
  }

  if (!process.env.DIRECT_URL?.trim()) {
    const msg =
      "DIRECT_URL is not set. Prisma migrations on Neon require the direct (non-pooler) connection string.";
    if (isProd) warnings.push(msg);
    else warnings.push(msg);
  }

  if (isProd && !process.env.CORS_ORIGIN?.trim()) {
    throw new Error(
      "CORS_ORIGIN is required in production (comma-separated list of allowed web origins, e.g. https://your-app.vercel.app)"
    );
  }

  if (process.env.CORS_ORIGIN?.trim() === "*") {
    throw new Error("CORS_ORIGIN cannot be '*' when using credentialed requests");
  }

  const dbUrl = process.env.DATABASE_URL!;
  if (isProd && !dbUrl.includes("sslmode=")) {
    warnings.push("DATABASE_URL should include sslmode=require for Neon");
  }

  for (const w of warnings) {
    console.warn(`[ims-api] Warning: ${w}`);
  }

  logDev("Environment variables OK");
  if (isProd) {
    logAlways("Production environment validated");
  }
}

export async function checkDatabaseConnection(): Promise<void> {
  const { prisma } = await import("./prisma.js");

  try {
    await prisma.$queryRaw`SELECT 1`;
    logDev("Database connection OK");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logDevError(`Database connection failed: ${message}`);
    throw new Error(
      "Cannot connect to database. Verify DATABASE_URL (Neon pooled URL) and network access."
    );
  }
}

export async function isDatabaseReady(): Promise<boolean> {
  try {
    const { prisma } = await import("./prisma.js");
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function logAuthDebugChecklist(): Promise<void> {
  if (!isDev) return;

  const { prisma } = await import("./prisma.js");

  logDev("Auth debug checklist:");
  logDev(`  CORS_ORIGIN: ${process.env.CORS_ORIGIN ?? "http://localhost:3002 (default)"}`);
  logDev(`  JWT_SECRET: configured (${process.env.JWT_SECRET!.length} chars)`);
  logDev(`  JWT_EXPIRES_IN: ${process.env.JWT_EXPIRES_IN ?? "7d (default)"}`);
  logDev(`  DATABASE_URL: configured`);
  logDev(`  DIRECT_URL: ${process.env.DIRECT_URL?.trim() ? "configured" : "MISSING"}`);

  try {
    const userCount = await prisma.user.count();
    logDev(`  Users in database: ${userCount}`);
    if (userCount === 0) {
      logDevError("  No users found — run: ALLOW_DEMO_SEED=true npm run db:seed");
    }
  } catch {
    logDevError("  Could not count users — migrations may not be applied");
  }
}
