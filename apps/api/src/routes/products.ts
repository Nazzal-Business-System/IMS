import { Router } from "express";
import {
  productSchema,
  productArchiveSchema,
  normalizeOptionalText,
  applyOptionalTextUpdate,
} from "@ims/validation";
import { prisma } from "../lib/prisma.js";
import { getParam } from "../lib/params.js";
import { serializeProduct, serializeStockMovement } from "../lib/serialize.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { logAudit } from "../lib/audit.js";
import { notifyAdmins, notifyRole, checkLowStockAlert } from "../lib/notifications.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("products", "read"),
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      include: { category: true, supplier: true, warehouse: true, unit: true },
      orderBy: { name: "asc" },
    });
    res.json(products.map(serializeProduct));
  })
);

router.get(
  "/:id",
  authenticate,
  requirePermission("products", "read"),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: getParam(req, "id") },
      include: {
        category: true,
        supplier: true,
        warehouse: true,
        unit: true,
        reorderRule: true,
        stockMovements: {
          include: {
            warehouse: true,
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 15,
        },
      },
    });
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const { stockMovements, reorderRule, ...rest } = product;
    res.json({
      ...serializeProduct(rest),
      reorderRule: reorderRule
        ? {
            id: reorderRule.id,
            productId: reorderRule.productId,
            minQuantity: reorderRule.minQuantity,
            maxQuantity: reorderRule.maxQuantity,
            autoPo: reorderRule.autoPo,
            isActive: reorderRule.isActive,
            createdAt: reorderRule.createdAt.toISOString(),
            updatedAt: reorderRule.updatedAt.toISOString(),
          }
        : null,
      recentMovements: stockMovements.map(serializeStockMovement),
    });
  })
);

router.post(
  "/",
  authenticate,
  requirePermission("products", "write"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    try {
      const barcode =
        normalizeOptionalText(parsed.data.barcode, "null") ?? null;
      const unitId = normalizeOptionalText(parsed.data.unitId, "null") ?? null;

      const product = await prisma.product.create({
        data: {
          name: parsed.data.name,
          sku: parsed.data.sku,
          barcode,
          categoryId: parsed.data.categoryId,
          supplierId: parsed.data.supplierId,
          unitId,
          costPrice: parsed.data.costPrice,
          sellingPrice: parsed.data.sellingPrice,
          quantity: parsed.data.quantity,
          reorderLevel: parsed.data.reorderLevel,
          warehouseId: parsed.data.warehouseId,
          status: parsed.data.status,
        },
        include: { category: true, supplier: true, warehouse: true, unit: true },
      });
      await logAudit(req.user!.userId, "CREATE", "Product", product.id, { sku: product.sku });
      await notifyRole("manager", {
        title: "Product created",
        message: `Product "${product.name}" was created.`,
        type: "success",
        category: "inventory",
        metadata: { productId: product.id, action: "create" },
      });
      if (product.quantity <= product.reorderLevel) {
        await checkLowStockAlert(product.id);
      }
      res.status(201).json(serializeProduct(product));
    } catch {
      res.status(409).json({ error: "SKU already exists" });
    }
  })
);

router.put(
  "/:id",
  authenticate,
  requirePermission("products", "write"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req, "id");
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    try {
      const data: Record<string, unknown> = {
        name: parsed.data.name,
        sku: parsed.data.sku,
        categoryId: parsed.data.categoryId,
        supplierId: parsed.data.supplierId,
        costPrice: parsed.data.costPrice,
        sellingPrice: parsed.data.sellingPrice,
        quantity: parsed.data.quantity,
        reorderLevel: parsed.data.reorderLevel,
        warehouseId: parsed.data.warehouseId,
        status: parsed.data.status,
      };

      // Barcode / unitId: omitted or blank → leave unchanged; null → clear; string → set
      const body = req.body as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(body, "barcode")) {
        applyOptionalTextUpdate(data, "barcode", body.barcode);
      }
      if (Object.prototype.hasOwnProperty.call(body, "unitId")) {
        applyOptionalTextUpdate(data, "unitId", body.unitId);
      }

      const product = await prisma.product.update({
        where: { id },
        data,
        include: { category: true, supplier: true, warehouse: true, unit: true },
      });
      await logAudit(req.user!.userId, "UPDATE", "Product", product.id);
      await notifyRole("manager", {
        title: "Product updated",
        message: `Product "${product.name}" was updated.`,
        type: "info",
        category: "inventory",
        metadata: { productId: product.id, action: "update" },
      });
      if (product.quantity <= product.reorderLevel) {
        await checkLowStockAlert(product.id);
      }
      res.json(serializeProduct(product));
    } catch {
      res.status(404).json({ error: "Product not found" });
    }
  })
);

router.patch(
  "/:id/archive",
  authenticate,
  requirePermission("products", "write"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = productArchiveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const id = getParam(req, "id");
    try {
      const product = await prisma.product.update({
        where: { id },
        data: { status: parsed.data.status },
        include: { category: true, supplier: true, warehouse: true },
      });
      await logAudit(req.user!.userId, parsed.data.status === "archived" ? "ARCHIVE" : "RESTORE", "Product", id);
      const actionLabel = parsed.data.status === "archived" ? "archived" : "restored";
      await notifyRole("manager", {
        title: `Product ${actionLabel}`,
        message: `Product "${product.name}" was ${actionLabel}.`,
        type: "info",
        category: "inventory",
        metadata: { productId: product.id, action: actionLabel, status: parsed.data.status },
      });
      res.json(serializeProduct(product));
    } catch {
      res.status(404).json({ error: "Product not found" });
    }
  })
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("products", "write"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req, "id");
    try {
      const product = await prisma.product.findUnique({ where: { id } });
      await prisma.product.delete({ where: { id } });
      await logAudit(req.user!.userId, "DELETE", "Product", id);
      if (product) {
        await notifyAdmins({
          title: "Product deleted",
          message: `Product "${product.name}" was deleted.`,
          type: "warning",
          category: "inventory",
          metadata: { productId: id, action: "delete" },
        });
      }
      res.status(204).send();
    } catch {
      res.status(404).json({ error: "Product not found" });
    }
  })
);

export default router;
