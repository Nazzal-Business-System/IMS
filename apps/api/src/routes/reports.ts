import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { clampLimit } from "../lib/pagination.js";
import { decimalToNumber, serializeProduct, serializeStockMovement } from "../lib/serialize.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

router.get(
  "/inventory-value",
  authenticate,
  requirePermission("reports", "read"),
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      include: { category: true, warehouse: true },
    });

    const totalValue = products.reduce(
      (sum, p) => sum + decimalToNumber(p.costPrice) * p.quantity,
      0
    );

    const categoryMap = new Map<string, { value: number; count: number }>();
    const warehouseMap = new Map<string, { value: number; count: number }>();

    for (const p of products) {
      const value = decimalToNumber(p.costPrice) * p.quantity;
      const cat = categoryMap.get(p.category.name) ?? { value: 0, count: 0 };
      cat.value += value;
      cat.count += 1;
      categoryMap.set(p.category.name, cat);

      const wh = warehouseMap.get(p.warehouse.name) ?? { value: 0, count: 0 };
      wh.value += value;
      wh.count += 1;
      warehouseMap.set(p.warehouse.name, wh);
    }

    res.json({
      totalValue,
      byCategory: Array.from(categoryMap.entries()).map(([name, data]) => ({
        categoryName: name,
        value: data.value,
        count: data.count,
      })),
      byWarehouse: Array.from(warehouseMap.entries()).map(([name, data]) => ({
        warehouseName: name,
        value: data.value,
        count: data.count,
      })),
    });
  })
);

router.get(
  "/low-stock",
  authenticate,
  requirePermission("reports", "read"),
  asyncHandler(async (_req, res) => {
    const products = await prisma.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM "Product" WHERE quantity <= "reorderLevel" ORDER BY quantity ASC`;
    const ids = products.map((p) => p.id);
    const low =
      ids.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: ids } },
            include: { category: true, supplier: true, warehouse: true },
          })
        : [];
    const order = new Map(ids.map((id, i) => [id, i]));
    low.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    res.json({ products: low.map(serializeProduct) });
  })
);

router.get(
  "/supplier-summary",
  authenticate,
  requirePermission("reports", "read"),
  asyncHandler(async (_req, res) => {
    const suppliers = await prisma.supplier.findMany({
      include: { products: true },
      orderBy: { name: "asc" },
    });
    res.json({
      suppliers: suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        productCount: s.products.length,
        totalStockValue: s.products.reduce(
          (sum, p) => sum + decimalToNumber(p.costPrice) * p.quantity,
          0
        ),
      })),
    });
  })
);

router.get(
  "/stock-movements",
  authenticate,
  requirePermission("reports", "read"),
  asyncHandler(async (req, res) => {
    const limit = clampLimit(req.query.limit, 100, 200);
    const movements = await prisma.stockMovement.findMany({
      include: {
        product: true,
        warehouse: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const summary = { totalIn: 0, totalOut: 0, totalTransfer: 0, totalAdjustment: 0 };
    for (const m of movements) {
      if (m.type === "IN") summary.totalIn += m.quantity;
      if (m.type === "OUT") summary.totalOut += m.quantity;
      if (m.type === "TRANSFER") summary.totalTransfer += m.quantity;
      if (m.type === "ADJUSTMENT") summary.totalAdjustment += m.quantity;
    }

    res.json({
      movements: movements.map(serializeStockMovement),
      summary,
    });
  })
);

router.get(
  "/charts",
  authenticate,
  requirePermission("reports", "read"),
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      include: { category: true, warehouse: true, supplier: true },
    });
    const movements = await prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const categoryMap = new Map<string, { value: number; count: number }>();
    const warehouseMap = new Map<string, { value: number; count: number }>();
    const supplierMap = new Map<string, number>();
    const typeMap = new Map<string, number>();
    const trendMap = new Map<string, { in: number; out: number }>();

    for (const p of products) {
      const value = decimalToNumber(p.costPrice) * p.quantity;
      const cat = categoryMap.get(p.category.name) ?? { value: 0, count: 0 };
      cat.value += value;
      cat.count += 1;
      categoryMap.set(p.category.name, cat);

      const wh = warehouseMap.get(p.warehouse.name) ?? { value: 0, count: 0 };
      wh.value += value;
      wh.count += 1;
      warehouseMap.set(p.warehouse.name, wh);

      const supVal = supplierMap.get(p.supplier.name) ?? 0;
      supplierMap.set(p.supplier.name, supVal + value);
    }

    for (const m of movements) {
      typeMap.set(m.type, (typeMap.get(m.type) ?? 0) + m.quantity);
      const day = m.createdAt.toISOString().slice(0, 10);
      const trend = trendMap.get(day) ?? { in: 0, out: 0 };
      if (m.type === "IN") trend.in += m.quantity;
      if (m.type === "OUT") trend.out += m.quantity;
      trendMap.set(day, trend);
    }

    const topProducts = [...products]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
      .map((p) => ({
        name: p.name,
        quantity: p.quantity,
        value: decimalToNumber(p.costPrice) * p.quantity,
      }));

    res.json({
      inventoryByCategory: Array.from(categoryMap.entries()).map(([name, d]) => ({
        name,
        value: d.value,
        count: d.count,
      })),
      inventoryByWarehouse: Array.from(warehouseMap.entries()).map(([name, d]) => ({
        name,
        value: d.value,
        count: d.count,
      })),
      movementTrend: Array.from(trendMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, d]) => ({ date, in: d.in, out: d.out })),
      movementTypeDistribution: Array.from(typeMap.entries()).map(([type, value]) => ({
        type,
        value,
      })),
      topProducts,
      supplierContribution: Array.from(supplierMap.entries()).map(([name, value]) => ({
        name,
        value,
      })),
    });
  })
);

export default router;
