import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { stockMovementSchema } from "@ims/validation";
import { prisma } from "../lib/prisma.js";
import { getParam } from "../lib/params.js";
import { clampLimit } from "../lib/pagination.js";
import { serializeStockMovement } from "../lib/serialize.js";
import { checkLowStockAlert, notifyRole } from "../lib/notifications.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

async function applyMovementInTx(
  tx: Prisma.TransactionClient,
  type: string,
  productId: string,
  warehouseId: string,
  quantity: number,
  fromWarehouseId?: string | null,
  toWarehouseId?: string | null
) {
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Product not found");

  if (type === "IN") {
    await tx.product.update({
      where: { id: productId },
      data: { quantity: { increment: quantity } },
    });
  } else if (type === "OUT") {
    if (product.quantity < quantity) throw new Error("Insufficient stock");
    await tx.product.update({
      where: { id: productId },
      data: { quantity: { decrement: quantity } },
    });
  } else if (type === "ADJUSTMENT") {
    await tx.product.update({
      where: { id: productId },
      data: { quantity },
    });
  } else if (type === "TRANSFER") {
    if (!fromWarehouseId || !toWarehouseId) {
      throw new Error("Transfer requires from and to warehouses");
    }
    if (fromWarehouseId === toWarehouseId) {
      throw new Error("Transfer requires different source and destination warehouses");
    }

    const source = await tx.product.findFirst({
      where: { id: productId, warehouseId: fromWarehouseId },
    });
    if (!source || source.quantity < quantity) {
      throw new Error("Insufficient stock at source warehouse");
    }

    const dest = await tx.product.findFirst({
      where: { sku: source.sku, warehouseId: toWarehouseId },
    });
    if (!dest) {
      throw new Error(
        "No matching product SKU exists at the destination warehouse. Create the product there before transferring."
      );
    }

    await tx.product.update({
      where: { id: source.id },
      data: { quantity: { decrement: quantity } },
    });
    await tx.product.update({
      where: { id: dest.id },
      data: { quantity: { increment: quantity } },
    });
  } else {
    throw new Error("Unsupported movement type");
  }
}

router.get("/", authenticate, requirePermission("stock_movements", "read"), asyncHandler(async (req, res) => {
  const limit = clampLimit(req.query.limit, 50, 200);
  const productId = typeof req.query.productId === "string" ? req.query.productId : undefined;
  const warehouseId = typeof req.query.warehouseId === "string" ? req.query.warehouseId : undefined;
  const movements = await prisma.stockMovement.findMany({
    where: {
      ...(productId ? { productId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
    },
    include: {
      product: true,
      warehouse: true,
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  res.json(movements.map(serializeStockMovement));
}));

router.get("/:id", authenticate, requirePermission("stock_movements", "read"), asyncHandler(async (req, res) => {
  const id = getParam(req, "id");
  const movement = await prisma.stockMovement.findUnique({
    where: { id },
    include: {
      product: { include: { category: true, supplier: true, warehouse: true, unit: true } },
      warehouse: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!movement) {
    res.status(404).json({ error: "Stock movement not found" });
    return;
  }
  res.json(serializeStockMovement(movement));
}));

router.post("/", authenticate, requirePermission("stock_movements", "write"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = stockMovementSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const { type, productId, warehouseId, quantity, reference, notes, fromWarehouseId, toWarehouseId } =
    parsed.data;

  if (type === "TRANSFER" && (!fromWarehouseId || !toWarehouseId)) {
    res.status(400).json({ error: "Transfer requires fromWarehouseId and toWarehouseId" });
    return;
  }

  try {
    const movement = await prisma.$transaction(async (tx) => {
      await applyMovementInTx(
        tx,
        type,
        productId,
        warehouseId,
        quantity,
        fromWarehouseId,
        toWarehouseId
      );

      return tx.stockMovement.create({
        data: {
          productId,
          warehouseId,
          type,
          quantity,
          reference: reference ?? null,
          notes: notes ?? null,
          fromWarehouseId: fromWarehouseId ?? null,
          toWarehouseId: toWarehouseId ?? null,
          createdById: req.user!.userId,
        },
        include: {
          product: true,
          warehouse: true,
          createdBy: { select: { id: true, name: true } },
        },
      });
    });

    await notifyRole("manager", {
      title: "Stock movement recorded",
      message: `${type} movement of ${quantity} units recorded for ${movement.product.name}.`,
      type: "info",
      category: "stock",
      metadata: { movementId: movement.id, productId: movement.productId, type },
    });
    await checkLowStockAlert(productId);
    res.status(201).json(serializeStockMovement(movement));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create movement";
    res.status(400).json({ error: message });
  }
}));

export default router;
