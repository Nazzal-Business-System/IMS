import { Router } from "express";
import { unitSchema } from "@ims/validation";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { getParam } from "../lib/params.js";
import { logAudit } from "../lib/audit.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("units", "read"),
  asyncHandler(async (_req, res) => {
    const units = await prisma.unitOfMeasure.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    res.json(
      units.map((u) => ({
        id: u.id,
        name: u.name,
        symbol: u.symbol,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        productCount: u._count.products,
      }))
    );
  })
);

router.get(
  "/:id",
  authenticate,
  requirePermission("units", "read"),
  asyncHandler(async (req, res) => {
    const id = getParam(req, "id");
    const unit = await prisma.unitOfMeasure.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
        products: {
          select: {
            id: true,
            name: true,
            sku: true,
            quantity: true,
            status: true,
          },
          orderBy: { name: "asc" },
          take: 50,
        },
      },
    });
    if (!unit) {
      res.status(404).json({ error: "Unit not found" });
      return;
    }
    res.json({
      id: unit.id,
      name: unit.name,
      symbol: unit.symbol,
      createdAt: unit.createdAt.toISOString(),
      updatedAt: unit.updatedAt.toISOString(),
      productCount: unit._count.products,
      products: unit.products,
    });
  })
);

router.post(
  "/",
  authenticate,
  requirePermission("units", "write"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = unitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    try {
      const unit = await prisma.unitOfMeasure.create({ data: parsed.data });
      await logAudit(req.user!.userId, "CREATE", "UnitOfMeasure", unit.id);
      res.status(201).json({
        id: unit.id,
        name: unit.name,
        symbol: unit.symbol,
        createdAt: unit.createdAt.toISOString(),
        updatedAt: unit.updatedAt.toISOString(),
      });
    } catch {
      res.status(409).json({ error: "Unit name or symbol already exists" });
    }
  })
);

router.put(
  "/:id",
  authenticate,
  requirePermission("units", "write"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = unitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    try {
      const unit = await prisma.unitOfMeasure.update({
        where: { id: getParam(req, "id") },
        data: parsed.data,
      });
      await logAudit(req.user!.userId, "UPDATE", "UnitOfMeasure", unit.id);
      res.json({
        id: unit.id,
        name: unit.name,
        symbol: unit.symbol,
        createdAt: unit.createdAt.toISOString(),
        updatedAt: unit.updatedAt.toISOString(),
      });
    } catch {
      res.status(404).json({ error: "Unit not found" });
    }
  })
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("units", "write"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req, "id");
    const count = await prisma.product.count({ where: { unitId: id } });
    if (count > 0) {
      res.status(400).json({
        error: "Cannot delete unit used by products",
        suggestion: "Reassign products to another unit first.",
      });
      return;
    }
    try {
      await prisma.unitOfMeasure.delete({ where: { id } });
      await logAudit(req.user!.userId, "DELETE", "UnitOfMeasure", id);
      res.status(204).send();
    } catch {
      res.status(404).json({ error: "Unit not found" });
    }
  })
);

export default router;
