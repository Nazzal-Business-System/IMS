import { Router } from "express";
import { warehouseSchema } from "@ims/validation";
import { prisma } from "../lib/prisma.js";
import { getParam } from "../lib/params.js";
import { decimalToNumber } from "../lib/serialize.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { notifyRole } from "../lib/notifications.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("warehouses", "read"),
  asyncHandler(async (_req, res) => {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        products: { select: { quantity: true, costPrice: true } },
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json(
      warehouses.map((w) => {
        const totalStock = w.products.reduce((sum, p) => sum + p.quantity, 0);
        const stockValue = w.products.reduce(
          (sum, p) => sum + decimalToNumber(p.costPrice) * p.quantity,
          0
        );
        return {
          id: w.id,
          name: w.name,
          location: w.location,
          description: w.description,
          createdAt: w.createdAt.toISOString(),
          updatedAt: w.updatedAt.toISOString(),
          productCount: w._count.products,
          totalStock,
          stockValue,
        };
      })
    );
  })
);

router.get(
  "/:id",
  authenticate,
  requirePermission("warehouses", "read"),
  asyncHandler(async (req, res) => {
    const id = getParam(req, "id");
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        products: {
          include: { category: true, supplier: true },
          orderBy: { name: "asc" },
        },
        _count: { select: { products: true } },
      },
    });
    if (!warehouse) {
      res.status(404).json({ error: "Warehouse not found" });
      return;
    }
    const totalStock = warehouse.products.reduce((sum, p) => sum + p.quantity, 0);
    const stockValue = warehouse.products.reduce(
      (sum, p) => sum + decimalToNumber(p.costPrice) * p.quantity,
      0
    );
    res.json({
      id: warehouse.id,
      name: warehouse.name,
      location: warehouse.location,
      description: warehouse.description,
      createdAt: warehouse.createdAt.toISOString(),
      updatedAt: warehouse.updatedAt.toISOString(),
      productCount: warehouse._count.products,
      totalStock,
      stockValue,
      products: warehouse.products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        quantity: p.quantity,
        costPrice: decimalToNumber(p.costPrice),
        category: p.category.name,
        supplier: p.supplier.name,
      })),
    });
  })
);

router.post(
  "/",
  authenticate,
  requirePermission("warehouses", "write"),
  asyncHandler(async (req, res) => {
    const parsed = warehouseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const warehouse = await prisma.warehouse.create({ data: parsed.data });
    await notifyRole("manager", {
      title: "Warehouse created",
      message: `Warehouse "${warehouse.name}" was created.`,
      type: "info",
      category: "inventory",
      metadata: { warehouseId: warehouse.id, action: "create" },
    });
    res.status(201).json({
      id: warehouse.id,
      name: warehouse.name,
      location: warehouse.location,
      description: warehouse.description,
      createdAt: warehouse.createdAt.toISOString(),
      updatedAt: warehouse.updatedAt.toISOString(),
    });
  })
);

router.put(
  "/:id",
  authenticate,
  requirePermission("warehouses", "write"),
  asyncHandler(async (req, res) => {
    const id = getParam(req, "id");
    const parsed = warehouseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    try {
      const warehouse = await prisma.warehouse.update({
        where: { id },
        data: parsed.data,
      });
      await notifyRole("manager", {
        title: "Warehouse updated",
        message: `Warehouse "${warehouse.name}" was updated.`,
        type: "info",
        category: "inventory",
        metadata: { warehouseId: warehouse.id, action: "update" },
      });
      res.json({
        id: warehouse.id,
        name: warehouse.name,
        location: warehouse.location,
        description: warehouse.description,
        createdAt: warehouse.createdAt.toISOString(),
        updatedAt: warehouse.updatedAt.toISOString(),
      });
    } catch {
      res.status(404).json({ error: "Warehouse not found" });
    }
  })
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("warehouses", "write"),
  asyncHandler(async (req, res) => {
    const id = getParam(req, "id");
    const productCount = await prisma.product.count({ where: { warehouseId: id } });
    if (productCount > 0) {
      res.status(400).json({ error: "Cannot delete warehouse with associated products" });
      return;
    }
    try {
      const warehouse = await prisma.warehouse.findUnique({ where: { id } });
      await prisma.warehouse.delete({ where: { id } });
      if (warehouse) {
        await notifyRole("manager", {
          title: "Warehouse deleted",
          message: `Warehouse "${warehouse.name}" was deleted.`,
          type: "warning",
          category: "inventory",
          metadata: { warehouseId: id, action: "delete" },
        });
      }
      res.status(204).send();
    } catch {
      res.status(404).json({ error: "Warehouse not found" });
    }
  })
);

export default router;
