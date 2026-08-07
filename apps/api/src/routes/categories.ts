import { Router } from "express";
import { categorySchema } from "@ims/validation";
import { prisma } from "../lib/prisma.js";
import { getParam } from "../lib/params.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { notifyRole } from "../lib/notifications.js";

const router = Router();

router.get("/", authenticate, requirePermission("categories", "read"), asyncHandler(async (_req, res) => {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  res.json(
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      productCount: c._count.products,
    }))
  );
}));

router.get("/:id", authenticate, requirePermission("categories", "read"), asyncHandler(async (req, res) => {
  const id = getParam(req, "id");
  const category = await prisma.category.findUnique({
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
          sellingPrice: true,
        },
        orderBy: { name: "asc" },
        take: 50,
      },
    },
  });
  if (!category) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.json({
    id: category.id,
    name: category.name,
    description: category.description,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
    productCount: category._count.products,
    products: category.products.map((p) => ({
      ...p,
      sellingPrice: Number(p.sellingPrice),
    })),
  });
}));

router.post("/", authenticate, requirePermission("categories", "write"), asyncHandler(async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  try {
    const category = await prisma.category.create({ data: parsed.data });
    await notifyRole("manager", {
      title: "Category created",
      message: `Category "${category.name}" was created.`,
      type: "info",
      category: "inventory",
      metadata: { categoryId: category.id, action: "create" },
    });
    res.status(201).json({
      id: category.id,
      name: category.name,
      description: category.description,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    });
  } catch {
    res.status(409).json({ error: "Category name already exists" });
  }
}));

router.put("/:id", authenticate, requirePermission("categories", "write"), asyncHandler(async (req, res) => {
  const id = getParam(req, "id");
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  try {
    const category = await prisma.category.update({
      where: { id },
      data: parsed.data,
    });
    await notifyRole("manager", {
      title: "Category updated",
      message: `Category "${category.name}" was updated.`,
      type: "info",
      category: "inventory",
      metadata: { categoryId: category.id, action: "update" },
    });
    res.json({
      id: category.id,
      name: category.name,
      description: category.description,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    });
  } catch {
    res.status(404).json({ error: "Category not found" });
  }
}));

router.delete("/:id", authenticate, requirePermission("categories", "write"), asyncHandler(async (req, res) => {
  const id = getParam(req, "id");
  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    res.status(400).json({
      error: "Cannot delete category with associated products",
      suggestion: "Remove or reassign products first, or archive products instead.",
    });
    return;
  }
  try {
    const category = await prisma.category.findUnique({ where: { id } });
    await prisma.category.delete({ where: { id } });
    if (category) {
      await notifyRole("manager", {
        title: "Category deleted",
        message: `Category "${category.name}" was deleted.`,
        type: "warning",
        category: "inventory",
        metadata: { categoryId: id, action: "delete" },
      });
    }
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Category not found" });
  }
}));

export default router;
