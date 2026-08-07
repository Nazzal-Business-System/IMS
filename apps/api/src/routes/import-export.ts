import { Router } from "express";
import { productImportRequestSchema } from "@ims/validation";
import { prisma } from "../lib/prisma.js";
import { decimalToNumber, serializeProduct } from "../lib/serialize.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { logAudit } from "../lib/audit.js";

const router = Router();

router.get(
  "/products",
  authenticate,
  requirePermission("import_export", "read"),
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      include: { category: true, supplier: true, warehouse: true },
    });
    const header =
      "name,sku,barcode,category,supplier,warehouse,costPrice,sellingPrice,quantity,reorderLevel,status";
    const rows = products.map((p) =>
      [
        csvEscape(p.name),
        p.sku,
        p.barcode ?? "",
        csvEscape(p.category.name),
        csvEscape(p.supplier.name),
        csvEscape(p.warehouse.name),
        decimalToNumber(p.costPrice),
        decimalToNumber(p.sellingPrice),
        p.quantity,
        p.reorderLevel,
        p.status,
      ].join(",")
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=products-export.csv");
    res.send([header, ...rows].join("\n"));
  })
);

router.get(
  "/products/json",
  authenticate,
  requirePermission("import_export", "read"),
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      include: { category: true, supplier: true, warehouse: true },
    });
    res.json(products.map(serializeProduct));
  })
);

router.post(
  "/products/import",
  authenticate,
  requirePermission("import_export", "write"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = productImportRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    const { rows, commit } = parsed.data;
    const [categories, suppliers, warehouses, existingSkus] = await Promise.all([
      prisma.category.findMany(),
      prisma.supplier.findMany(),
      prisma.warehouse.findMany(),
      prisma.product.findMany({ select: { sku: true } }),
    ]);

    const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    const supplierByName = new Map(suppliers.map((s) => [s.name.toLowerCase(), s.id]));
    const warehouseByName = new Map(warehouses.map((w) => [w.name.toLowerCase(), w.id]));
    const skuSet = new Set(existingSkus.map((p) => p.sku.toLowerCase()));
    const batchSkus = new Set<string>();

    const results: Array<{
      row: number;
      sku: string;
      name: string;
      valid: boolean;
      error?: string;
      data?: (typeof rows)[0] & {
        categoryId: string;
        supplierId: string;
        warehouseId: string;
      };
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;
      const skuKey = row.sku.toLowerCase();

      if (skuSet.has(skuKey)) {
        results.push({
          row: rowNum,
          sku: row.sku,
          name: row.name,
          valid: false,
          error: "SKU already exists",
        });
        continue;
      }
      if (batchSkus.has(skuKey)) {
        results.push({
          row: rowNum,
          sku: row.sku,
          name: row.name,
          valid: false,
          error: "Duplicate SKU in import file",
        });
        continue;
      }

      const categoryId = categoryByName.get(row.category.toLowerCase());
      if (!categoryId) {
        results.push({
          row: rowNum,
          sku: row.sku,
          name: row.name,
          valid: false,
          error: `Category not found: ${row.category}`,
        });
        continue;
      }

      const supplierId = supplierByName.get(row.supplier.toLowerCase());
      if (!supplierId) {
        results.push({
          row: rowNum,
          sku: row.sku,
          name: row.name,
          valid: false,
          error: `Supplier not found: ${row.supplier}`,
        });
        continue;
      }

      const warehouseId = warehouseByName.get(row.warehouse.toLowerCase());
      if (!warehouseId) {
        results.push({
          row: rowNum,
          sku: row.sku,
          name: row.name,
          valid: false,
          error: `Warehouse not found: ${row.warehouse}`,
        });
        continue;
      }

      batchSkus.add(skuKey);
      results.push({
        row: rowNum,
        sku: row.sku,
        name: row.name,
        valid: true,
        data: {
          ...row,
          categoryId,
          supplierId,
          warehouseId,
        },
      });
    }

    const validRows = results.filter((r) => r.valid && r.data);
    const errorCount = results.length - validRows.length;

    if (!commit) {
      res.json({
        preview: true,
        total: rows.length,
        validCount: validRows.length,
        errorCount,
        results: results.map(({ row, sku, name, valid, error }) => ({
          row,
          sku,
          name,
          valid,
          error,
        })),
      });
      return;
    }

    let importedCount = 0;
    for (const item of validRows) {
      const d = item.data!;
      try {
        const product = await prisma.product.create({
          data: {
            name: d.name,
            sku: d.sku,
            barcode: d.barcode ?? null,
            categoryId: d.categoryId,
            supplierId: d.supplierId,
            warehouseId: d.warehouseId,
            costPrice: d.costPrice,
            sellingPrice: d.sellingPrice,
            quantity: d.quantity,
            reorderLevel: d.reorderLevel,
            status: d.status,
          },
        });
        skuSet.add(d.sku.toLowerCase());
        importedCount++;
        await logAudit(req.user!.userId, "IMPORT", "Product", product.id, { sku: product.sku });
      } catch {
        item.valid = false;
        item.error = "Failed to create product";
      }
    }

    await logAudit(req.user!.userId, "IMPORT_BATCH", "Product", undefined, {
      total: rows.length,
      imported: importedCount,
      errors: errorCount,
    });

    res.json({
      preview: false,
      total: rows.length,
      validCount: validRows.length,
      errorCount,
      importedCount,
      results: results.map(({ row, sku, name, valid, error }) => ({
        row,
        sku,
        name,
        valid,
        error,
      })),
    });
  })
);

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default router;
