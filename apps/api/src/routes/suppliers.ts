import { Router } from "express";
import { supplierSchema } from "@ims/validation";
import { prisma } from "../lib/prisma.js";
import { getParam } from "../lib/params.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { notifyRole } from "../lib/notifications.js";

const router = Router();

function normalizeSupplier(data: {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  contactPerson?: string | null;
}) {
  return {
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    address: data.address || null,
    contactPerson: data.contactPerson || null,
  };
}

router.get(
  "/",
  authenticate,
  requirePermission("suppliers", "read"),
  asyncHandler(async (_req, res) => {
    const suppliers = await prisma.supplier.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    res.json(
      suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        address: s.address,
        contactPerson: s.contactPerson,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        productCount: s._count.products,
      }))
    );
  })
);

router.get(
  "/:id",
  authenticate,
  requirePermission("suppliers", "read"),
  asyncHandler(async (req, res) => {
    const id = getParam(req, "id");
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, purchaseOrders: true } },
        products: {
          select: { id: true, name: true, sku: true, quantity: true, status: true },
          orderBy: { name: "asc" },
          take: 30,
        },
        purchaseOrders: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
    if (!supplier) {
      res.status(404).json({ error: "Supplier not found" });
      return;
    }
    res.json({
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      contactPerson: supplier.contactPerson,
      createdAt: supplier.createdAt.toISOString(),
      updatedAt: supplier.updatedAt.toISOString(),
      productCount: supplier._count.products,
      purchaseOrderCount: supplier._count.purchaseOrders,
      products: supplier.products,
      purchaseOrders: supplier.purchaseOrders.map((po) => ({
        id: po.id,
        status: po.status,
        totalAmount: Number(po.totalAmount),
        createdAt: po.createdAt.toISOString(),
      })),
    });
  })
);

router.post(
  "/",
  authenticate,
  requirePermission("suppliers", "write"),
  asyncHandler(async (req, res) => {
    const parsed = supplierSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const supplier = await prisma.supplier.create({ data: normalizeSupplier(parsed.data) });
    await notifyRole("manager", {
      title: "Supplier created",
      message: `Supplier "${supplier.name}" was created.`,
      type: "info",
      category: "inventory",
      metadata: { supplierId: supplier.id, action: "create" },
    });
    res.status(201).json({
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      contactPerson: supplier.contactPerson,
      createdAt: supplier.createdAt.toISOString(),
      updatedAt: supplier.updatedAt.toISOString(),
    });
  })
);

router.put(
  "/:id",
  authenticate,
  requirePermission("suppliers", "write"),
  asyncHandler(async (req, res) => {
    const id = getParam(req, "id");
    const parsed = supplierSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    try {
      const supplier = await prisma.supplier.update({
        where: { id },
        data: normalizeSupplier(parsed.data),
      });
      await notifyRole("manager", {
        title: "Supplier updated",
        message: `Supplier "${supplier.name}" was updated.`,
        type: "info",
        category: "inventory",
        metadata: { supplierId: supplier.id, action: "update" },
      });
      res.json({
        id: supplier.id,
        name: supplier.name,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        contactPerson: supplier.contactPerson,
        createdAt: supplier.createdAt.toISOString(),
        updatedAt: supplier.updatedAt.toISOString(),
      });
    } catch {
      res.status(404).json({ error: "Supplier not found" });
    }
  })
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("suppliers", "write"),
  asyncHandler(async (req, res) => {
    const id = getParam(req, "id");
    const productCount = await prisma.product.count({ where: { supplierId: id } });
    if (productCount > 0) {
      res.status(400).json({ error: "Cannot delete supplier with associated products" });
      return;
    }
    try {
      const supplier = await prisma.supplier.findUnique({ where: { id } });
      await prisma.supplier.delete({ where: { id } });
      if (supplier) {
        await notifyRole("manager", {
          title: "Supplier deleted",
          message: `Supplier "${supplier.name}" was deleted.`,
          type: "warning",
          category: "inventory",
          metadata: { supplierId: id, action: "delete" },
        });
      }
      res.status(204).send();
    } catch {
      res.status(404).json({ error: "Supplier not found" });
    }
  })
);

export default router;
