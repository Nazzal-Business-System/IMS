import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { serializeProduct, serializeStockMovement } from "../lib/serialize.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("dashboard", "read"),
  asyncHandler(async (_req, res) => {
    const [totals, lowStockCountRow, lowStockIds, recentMovements, poCounts] =
      await Promise.all([
        prisma.$queryRaw<Array<{ total_products: number; total_stock_value: Prisma.Decimal | number }>>`
          SELECT
            COUNT(*)::int AS total_products,
            COALESCE(SUM("costPrice" * quantity), 0) AS total_stock_value
          FROM "Product"
        `,
        prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*)::int AS count
          FROM "Product"
          WHERE quantity <= "reorderLevel"
        `,
        prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM "Product"
          WHERE quantity <= "reorderLevel"
          ORDER BY quantity ASC
          LIMIT 10
        `,
        prisma.stockMovement.findMany({
          include: {
            product: true,
            warehouse: true,
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        prisma.purchaseOrder.groupBy({
          by: ["status"],
          _count: { status: true },
        }),
      ]);

    const lowStockProducts =
      lowStockIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: lowStockIds.map((r) => r.id) } },
          })
        : [];

    // Preserve ascending quantity order from the raw query
    const order = new Map(lowStockIds.map((r, i) => [r.id, i]));
    lowStockProducts.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    const totalProducts = totals[0]?.total_products ?? 0;
    const totalStockValue = Number(totals[0]?.total_stock_value ?? 0);
    const lowStockCount = lowStockCountRow[0]?.count ?? 0;

    const summary = { draft: 0, ordered: 0, received: 0, cancelled: 0 };
    for (const row of poCounts) {
      summary[row.status] = row._count.status;
    }

    res.json({
      totalProducts,
      totalStockValue,
      lowStockCount,
      lowStockProducts: lowStockProducts.map((p) => serializeProduct(p)),
      recentMovements: recentMovements.map(serializeStockMovement),
      purchaseOrderSummary: summary,
    });
  })
);

export default router;
