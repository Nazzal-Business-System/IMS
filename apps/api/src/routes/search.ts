import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { checkUserPermission } from "../lib/effective-permissions.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

router.get("/", authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const q = String(req.query.q ?? "").trim().toLowerCase();
  if (!q || q.length < 2) {
    res.json({ results: [] });
    return;
  }

  const user = req.user!;
  const results: Array<{
    id: string;
    type: string;
    label: string;
    sublabel?: string;
    href: string;
    group: string;
  }> = [];

  const can = async (section: string, action: "read" | "write" = "read") =>
    checkUserPermission(user.userId, user.role, section, action);

  if (await can("products")) {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { barcode: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
    });
    for (const p of products) {
      results.push({
        id: p.id,
        type: "product",
        label: p.name,
        sublabel: p.sku,
        href: "/products",
        group: "Products",
      });
    }
  }

  if (await can("categories")) {
    const categories = await prisma.category.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 5,
    });
    for (const c of categories) {
      results.push({
        id: c.id,
        type: "category",
        label: c.name,
        href: "/categories",
        group: "Categories",
      });
    }
  }

  if (await can("warehouses")) {
    const warehouses = await prisma.warehouse.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 5,
    });
    for (const w of warehouses) {
      results.push({
        id: w.id,
        type: "warehouse",
        label: w.name,
        href: "/warehouses",
        group: "Warehouses",
      });
    }
  }

  if (await can("suppliers")) {
    const suppliers = await prisma.supplier.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 5,
    });
    for (const s of suppliers) {
      results.push({
        id: s.id,
        type: "supplier",
        label: s.name,
        href: "/suppliers",
        group: "Suppliers",
      });
    }
  }

  if (await can("purchase_orders")) {
    const orders = await prisma.purchaseOrder.findMany({
      include: { supplier: true },
      take: 20,
    });
    for (const o of orders) {
      const label = o.supplier?.name ?? `PO ${o.id.slice(0, 8)}`;
      if (label.toLowerCase().includes(q) || o.id.toLowerCase().includes(q)) {
        results.push({
          id: o.id,
          type: "purchase_order",
          label,
          sublabel: o.status,
          href: "/purchase-orders",
          group: "Purchase Orders",
        });
      }
    }
  }

  if (user.role === "admin") {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
    });
    for (const u of users) {
      results.push({
        id: u.id,
        type: "user",
        label: u.name,
        sublabel: u.email,
        href: "/admin/users",
        group: "Users",
      });
    }
  }

  const navItems = [
    { label: "Dashboard", href: "/dashboard", section: "dashboard", group: "Navigation" },
    { label: "Products", href: "/products", section: "products", group: "Navigation" },
    { label: "Categories", href: "/categories", section: "categories", group: "Navigation" },
    { label: "Warehouses", href: "/warehouses", section: "warehouses", group: "Navigation" },
    { label: "Suppliers", href: "/suppliers", section: "suppliers", group: "Navigation" },
    { label: "Stock Movements", href: "/stock-movements", section: "stock_movements", group: "Navigation" },
    { label: "Purchase Orders", href: "/purchase-orders", section: "purchase_orders", group: "Navigation" },
    { label: "Reports", href: "/reports", section: "reports", group: "Navigation" },
    { label: "Reorder Rules", href: "/reorder-rules", section: "reorder_rules", group: "Navigation" },
    { label: "Units", href: "/units", section: "units", group: "Navigation" },
    { label: "Audit Log", href: "/audit-log", section: "audit_log", group: "Navigation" },
    { label: "Import / Export", href: "/import-export", section: "import_export", group: "Navigation" },
    { label: "Settings", href: "/settings/appearance", section: "settings", group: "Navigation" },
    { label: "Profile", href: "/profile", section: "dashboard", group: "Navigation" },
    { label: "Admin", href: "/admin", section: "admin", group: "Navigation" },
    { label: "Users", href: "/admin/users", section: "admin_users", group: "Navigation" },
    { label: "Permissions", href: "/admin/permissions", section: "admin_permissions", group: "Navigation" },
  ];

  for (const item of navItems) {
    if (item.label.toLowerCase().includes(q) && await can(item.section)) {
      results.push({
        id: item.href,
        type: "nav",
        label: item.label,
        href: item.href,
        group: item.group,
      });
    }
  }

  res.json({ results: results.slice(0, 20) });
}));

export default router;
