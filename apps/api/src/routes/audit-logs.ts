import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { getParam } from "../lib/params.js";
import { clampLimit } from "../lib/pagination.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

function serializeAuditLog(l: {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: unknown;
  createdAt: Date;
  user?: { id: string; name: string; email: string } | null;
}) {
  return {
    id: l.id,
    userId: l.userId,
    action: l.action,
    entity: l.entity,
    entityId: l.entityId,
    details: l.details,
    createdAt: l.createdAt.toISOString(),
    user: l.user ?? null,
  };
}

router.get(
  "/",
  authenticate,
  requirePermission("audit_log", "read"),
  asyncHandler(async (req, res) => {
    const limit = clampLimit(req.query.limit, 50, 200);
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    res.json(logs.map(serializeAuditLog));
  })
);

router.get(
  "/:id",
  authenticate,
  requirePermission("audit_log", "read"),
  asyncHandler(async (req, res) => {
    const id = getParam(req, "id");
    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!log) {
      res.status(404).json({ error: "Audit log entry not found" });
      return;
    }
    res.json(serializeAuditLog(log));
  })
);

export default router;
