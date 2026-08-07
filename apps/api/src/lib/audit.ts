import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function logAudit(
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  details?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details: details ? (details as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch {
    // Audit failures should not break main operations
  }
}
