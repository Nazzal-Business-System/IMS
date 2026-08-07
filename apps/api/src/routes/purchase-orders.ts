import { Router } from "express";
import {
  purchaseOrderSchema,
  purchaseOrderUpdateSchema,
  receivePurchaseOrderSchema,
} from "@ims/validation";
import { prisma } from "../lib/prisma.js";
import { getParam } from "../lib/params.js";
import { serializePurchaseOrder } from "../lib/serialize.js";
import { notifyRole } from "../lib/notifications.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

function calcTotal(items: { quantity: number; unitPrice: number }[]) {
  return items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
}

router.get("/", authenticate, requirePermission("purchase_orders", "read"), asyncHandler(async (_req, res) => {
  const orders = await prisma.purchaseOrder.findMany({
    include: {
      supplier: true,
      items: { include: { product: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders.map(serializePurchaseOrder));
}));

router.get("/:id", authenticate, requirePermission("purchase_orders", "read"), asyncHandler(async (req, res) => {
  const id = getParam(req, "id");
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: { include: { product: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!order) {
    res.status(404).json({ error: "Purchase order not found" });
    return;
  }
  res.json(serializePurchaseOrder(order));
}));

router.post("/", authenticate, requirePermission("purchase_orders", "write"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = purchaseOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const totalAmount = calcTotal(parsed.data.items);
  const order = await prisma.purchaseOrder.create({
    data: {
      supplierId: parsed.data.supplierId,
      status: parsed.data.status,
      totalAmount,
      createdById: req.user!.userId,
      items: {
        create: parsed.data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
    },
    include: {
      supplier: true,
      items: { include: { product: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  await notifyRole("manager", {
    title: "Purchase order created",
    message: `Purchase order created for ${order.supplier.name}.`,
    type: "success",
    category: "purchase_order",
    metadata: { purchaseOrderId: order.id, supplierId: order.supplierId },
  });
  res.status(201).json(serializePurchaseOrder(order));
}));

router.put("/:id", authenticate, requirePermission("purchase_orders", "write"), asyncHandler(async (req, res) => {
  const id = getParam(req, "id");
  const parsed = purchaseOrderUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!existing) {
    res.status(404).json({ error: "Purchase order not found" });
    return;
  }
  if (existing.status === "received" || existing.status === "cancelled") {
    res.status(400).json({ error: "Cannot modify received or cancelled orders" });
    return;
  }

  const totalAmount = parsed.data.items ? calcTotal(parsed.data.items) : undefined;

  if (parsed.data.items) {
    await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
  }

  const order = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      supplierId: parsed.data.supplierId,
      status: parsed.data.status,
      totalAmount,
      items: parsed.data.items
        ? {
            create: parsed.data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          }
        : undefined,
    },
    include: {
      supplier: true,
      items: { include: { product: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  res.json(serializePurchaseOrder(order));
}));

router.post(
  "/:id/receive",
  authenticate,
  requirePermission("purchase_orders", "write"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req, "id");
    const parsed = receivePurchaseOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, supplier: true },
    });
    if (!order) {
      res.status(404).json({ error: "Purchase order not found" });
      return;
    }
    if (order.status === "received") {
      res.status(400).json({ error: "Order already received" });
      return;
    }
    if (order.status === "cancelled") {
      res.status(400).json({ error: "Cannot receive cancelled order" });
      return;
    }
    if (order.status !== "ordered") {
      res.status(400).json({ error: "Only ordered purchase orders can be received" });
      return;
    }

    let updated;
    try {
      updated = await prisma.$transaction(async (tx) => {
        for (const receiveItem of parsed.data.items) {
          const line = order.items.find((i) => i.id === receiveItem.itemId);
          if (!line) continue;
          const qty = receiveItem.receivedQuantity;
          if (qty <= 0) continue;
          if (qty > line.quantity) {
            throw new Error(`Received quantity exceeds ordered quantity for ${line.product.name}`);
          }

          await tx.purchaseOrderItem.update({
            where: { id: line.id },
            data: { receivedQuantity: qty },
          });

          const product = line.product;
          await tx.product.update({
            where: { id: product.id },
            data: { quantity: product.quantity + qty },
          });

          await tx.stockMovement.create({
            data: {
              productId: product.id,
              warehouseId: product.warehouseId,
              type: "IN",
              quantity: qty,
              reference: `PO-${order.id.slice(-8)}`,
              notes: "Purchase order received",
              createdById: req.user!.userId,
            },
          });
        }

        return tx.purchaseOrder.update({
          where: { id },
          data: { status: "received" },
          include: {
            supplier: true,
            items: { include: { product: true } },
            createdBy: { select: { id: true, name: true } },
          },
        });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to receive purchase order";
      res.status(400).json({ error: message });
      return;
    }

    await notifyRole("manager", {
      title: "Purchase order received",
      message: `Purchase order received from ${updated.supplier.name}.`,
      type: "success",
      category: "purchase_order",
      metadata: { purchaseOrderId: updated.id, supplierId: updated.supplierId },
    });
    res.json(serializePurchaseOrder(updated));
  })
);

router.post(
  "/:id/cancel",
  authenticate,
  requirePermission("purchase_orders", "write"),
  asyncHandler(async (req, res) => {
    const id = getParam(req, "id");
    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Purchase order not found" });
      return;
    }
    if (existing.status === "received") {
      res.status(400).json({ error: "Cannot cancel received orders" });
      return;
    }
    if (existing.status === "cancelled") {
      res.status(400).json({ error: "Order already cancelled" });
      return;
    }
    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: "cancelled" },
      include: {
        supplier: true,
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    res.json(serializePurchaseOrder(order));
  })
);

router.post(
  "/:id/submit",
  authenticate,
  requirePermission("purchase_orders", "write"),
  asyncHandler(async (req, res) => {
    const id = getParam(req, "id");
    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) {
      res.status(404).json({ error: "Purchase order not found" });
      return;
    }
    if (existing.status !== "draft") {
      res.status(400).json({ error: "Only draft purchase orders can be submitted" });
      return;
    }
    if (!existing.items.length) {
      res.status(400).json({ error: "Purchase order has no line items" });
      return;
    }
    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: "ordered" },
      include: {
        supplier: true,
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    res.json(serializePurchaseOrder(order));
  })
);

router.delete("/:id", authenticate, requirePermission("purchase_orders", "write"), asyncHandler(async (req, res) => {
  const id = getParam(req, "id");
  const order = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!order) {
    res.status(404).json({ error: "Purchase order not found" });
    return;
  }
  if (order.status === "received") {
    res.status(400).json({ error: "Cannot delete received orders" });
    return;
  }
  await prisma.purchaseOrder.delete({ where: { id } });
  res.status(204).send();
}));

export default router;
