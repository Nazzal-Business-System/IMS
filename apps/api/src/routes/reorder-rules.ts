import { Router } from "express";
import { reorderRuleSchema } from "@ims/validation";
import { prisma } from "../lib/prisma.js";
import { serializeProduct } from "../lib/serialize.js";
import { decimalToNumber } from "../lib/serialize.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { getParam } from "../lib/params.js";
import { logAudit } from "../lib/audit.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

async function generateDraftPosForRules(
  rules: Array<{
    id: string;
    minQuantity: number;
    maxQuantity: number | null;
    product: {
      id: string;
      sku: string;
      quantity: number;
      supplierId: string;
      costPrice: { toString(): string };
    };
  }>,
  userId: string
) {
  const purchaseOrderIds: string[] = [];
  const skippedSkus: string[] = [];

  for (const rule of rules) {
    const product = rule.product;
    if (product.quantity > rule.minQuantity) continue;

    const existingDraft = await prisma.purchaseOrder.findFirst({
      where: {
        status: "draft",
        supplierId: product.supplierId,
        items: { some: { productId: product.id } },
      },
    });
    if (existingDraft) {
      skippedSkus.push(product.sku);
      continue;
    }

    const orderQty =
      rule.maxQuantity != null
        ? Math.max(rule.maxQuantity - product.quantity, 1)
        : Math.max(rule.minQuantity * 2 - product.quantity, rule.minQuantity);
    const unitPrice = decimalToNumber(product.costPrice);
    const totalAmount = orderQty * unitPrice;

    const po = await prisma.purchaseOrder.create({
      data: {
        supplierId: product.supplierId,
        status: "draft",
        totalAmount,
        createdById: userId,
        items: {
          create: [{ productId: product.id, quantity: orderQty, unitPrice }],
        },
      },
    });

    purchaseOrderIds.push(po.id);
    await logAudit(userId, "AUTO_PO_DRAFT", "PurchaseOrder", po.id, {
      productSku: product.sku,
      reorderRuleId: rule.id,
      quantity: orderQty,
    });
  }

  return { created: purchaseOrderIds.length, skipped: skippedSkus.length, purchaseOrderIds, skippedSkus };
}

router.get(
  "/",
  authenticate,
  requirePermission("reorder_rules", "read"),
  asyncHandler(async (_req, res) => {
    const rules = await prisma.reorderRule.findMany({
      include: { product: { include: { category: true, supplier: true, warehouse: true } } },
      orderBy: { updatedAt: "desc" },
    });
    res.json(
      rules.map((r) => ({
        id: r.id,
        productId: r.productId,
        minQuantity: r.minQuantity,
        maxQuantity: r.maxQuantity,
        autoPo: r.autoPo,
        isActive: r.isActive,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        product: r.product ? serializeProduct(r.product) : undefined,
      }))
    );
  })
);

router.get(
  "/alerts",
  authenticate,
  requirePermission("reorder_rules", "read"),
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      where: { status: "active" },
      include: { category: true, supplier: true, warehouse: true },
    });
    const alerts = products.filter((p) => p.quantity <= p.reorderLevel);
    res.json({ products: alerts.map((p) => serializeProduct(p)) });
  })
);

router.post(
  "/generate-draft-pos",
  authenticate,
  requirePermission("purchase_orders", "write"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rules = await prisma.reorderRule.findMany({
      where: { isActive: true, autoPo: true },
      include: { product: true },
    });
    const result = await generateDraftPosForRules(rules, req.user!.userId);
    if (result.created > 0) {
      await logAudit(req.user!.userId, "AUTO_PO_BATCH", "PurchaseOrder", undefined, {
        created: result.created,
        skipped: result.skipped,
      });
    }
    res.json(result);
  })
);

router.get(
  "/:id",
  authenticate,
  requirePermission("reorder_rules", "read"),
  asyncHandler(async (req, res) => {
    const id = getParam(req, "id");
    const rule = await prisma.reorderRule.findUnique({
      where: { id },
      include: {
        product: { include: { category: true, supplier: true, warehouse: true, unit: true } },
      },
    });
    if (!rule) {
      res.status(404).json({ error: "Reorder rule not found" });
      return;
    }
    res.json({
      id: rule.id,
      productId: rule.productId,
      minQuantity: rule.minQuantity,
      maxQuantity: rule.maxQuantity,
      autoPo: rule.autoPo,
      isActive: rule.isActive,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
      product: rule.product ? serializeProduct(rule.product) : undefined,
    });
  })
);

router.post(
  "/",
  authenticate,
  requirePermission("reorder_rules", "write"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = reorderRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    try {
      const rule = await prisma.reorderRule.create({
        data: {
          productId: parsed.data.productId,
          minQuantity: parsed.data.minQuantity,
          maxQuantity: parsed.data.maxQuantity ?? null,
          autoPo: parsed.data.autoPo ?? false,
          isActive: parsed.data.isActive ?? true,
        },
        include: { product: true },
      });
      await logAudit(req.user!.userId, "CREATE", "ReorderRule", rule.id);
      res.status(201).json(rule);
    } catch {
      res.status(409).json({ error: "Reorder rule already exists for this product" });
    }
  })
);

router.put(
  "/:id",
  authenticate,
  requirePermission("reorder_rules", "write"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = reorderRuleSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    try {
      const rule = await prisma.reorderRule.update({
        where: { id: getParam(req, "id") },
        data: parsed.data,
        include: { product: true },
      });
      await logAudit(req.user!.userId, "UPDATE", "ReorderRule", rule.id);
      res.json(rule);
    } catch {
      res.status(404).json({ error: "Reorder rule not found" });
    }
  })
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("reorder_rules", "write"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req, "id");
    try {
      await prisma.reorderRule.delete({ where: { id } });
      await logAudit(req.user!.userId, "DELETE", "ReorderRule", id);
      res.status(204).send();
    } catch {
      res.status(404).json({ error: "Reorder rule not found" });
    }
  })
);

export default router;
