import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";

const isDev = process.env.NODE_ENV !== "production";

function logDev(message: string) {
  if (isDev) console.error(`[ims-api] ${message}`);
}

export function mapErrorToResponse(err: unknown): { status: number; error: string } {
  if (err instanceof Prisma.PrismaClientInitializationError) {
    logDev(`Database connection failed: ${err.message}`);
    return {
      status: 503,
      error: "Database connection failed. Check DATABASE_URL and ensure migrations are applied.",
    };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logDev(`Prisma error ${err.code}: ${err.message}`);
    if (err.code === "P2021" || err.code === "P2022") {
      return {
        status: 503,
        error: "Database schema is not ready. Run: npx prisma migrate deploy && npx prisma db seed",
      };
    }
    return { status: 400, error: "Database request failed" };
  }

  if (err instanceof Error) {
    logDev(err.message);
    return { status: 500, error: isDev ? err.message : "Internal server error" };
  }

  return { status: 500, error: "Internal server error" };
}

export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const { status, error } = mapErrorToResponse(err);
  res.status(status).json({ error });
};
