import { z } from "zod";

export const roleSchema = z.enum(["admin", "manager", "viewer"]);
export const productStatusSchema = z.enum(["active", "inactive", "discontinued", "archived"]);
export const movementTypeSchema = z.enum(["IN", "OUT", "TRANSFER", "ADJUSTMENT"]);
export const purchaseOrderStatusSchema = z.enum(["draft", "ordered", "received", "cancelled"]);

export const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
});

export const createUserSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name required").max(100),
  role: roleSchema,
  isActive: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  role: roleSchema.optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const permissionUpdateSchema = z.object({
  permissions: z.array(
    z.object({
      section: z.string().min(1),
      canRead: z.boolean(),
      canWrite: z.boolean(),
    })
  ),
});

export const unitSchema = z.object({
  name: z.string().min(1, "Name required").max(50),
  symbol: z.string().min(1, "Symbol required").max(10),
});

export const reorderRuleSchema = z.object({
  productId: z.string().min(1),
  minQuantity: z.coerce.number().int().min(0),
  maxQuantity: z.coerce.number().int().min(0).optional().nullable(),
  autoPo: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const productArchiveSchema = z.object({
  status: z.enum(["archived", "active"]),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  description: z.string().max(500).optional().nullable(),
});

export const supplierSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  contactPerson: z.string().max(100).optional().nullable(),
});

export const warehouseSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  location: z.string().max(200).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

export const productSchema = z.object({
  name: z.string().min(1, "Name required").max(200),
  sku: z.string().min(1, "SKU required").max(50),
  barcode: z.string().max(100).optional().nullable(),
  categoryId: z.string().min(1, "Category required"),
  supplierId: z.string().min(1, "Supplier required"),
  unitId: z.string().optional().nullable(),
  costPrice: z.coerce.number().min(0, "Cost price must be positive"),
  sellingPrice: z.coerce.number().min(0, "Selling price must be positive"),
  quantity: z.coerce.number().int().min(0),
  reorderLevel: z.coerce.number().int().min(0),
  warehouseId: z.string().min(1, "Warehouse required"),
  status: productStatusSchema,
});

/**
 * Normalize optional text fields for create/update payloads.
 * - `undefined` → omit / unchanged
 * - `null` → explicit clear
 * - blank/whitespace → `emptyAs` (`omit` for updates, `null` for creates)
 * - non-empty string → trimmed value
 */
export function normalizeOptionalText(
  value: unknown,
  emptyAs: "omit" | "null" = "omit"
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return emptyAs === "null" ? null : undefined;
  return trimmed;
}

/** Build Prisma-friendly optional string update: skip when unchanged. */
export function applyOptionalTextUpdate<T extends Record<string, unknown>>(
  target: T,
  key: keyof T & string,
  value: unknown
): void {
  const normalized = normalizeOptionalText(value, "omit");
  if (normalized !== undefined) {
    (target as Record<string, unknown>)[key] = normalized;
  }
}

export const stockMovementSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  type: movementTypeSchema,
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  reference: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  fromWarehouseId: z.string().optional().nullable(),
  toWarehouseId: z.string().optional().nullable(),
});

export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().min(0),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Supplier required"),
  status: purchaseOrderStatusSchema,
  items: z.array(purchaseOrderItemSchema).min(1, "At least one item required"),
});

export const purchaseOrderUpdateSchema = z.object({
  supplierId: z.string().min(1).optional(),
  status: purchaseOrderStatusSchema.optional(),
  items: z.array(purchaseOrderItemSchema).optional(),
});

export const receivePurchaseOrderSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string().min(1),
      receivedQuantity: z.coerce.number().int().min(0),
    })
  ).min(1),
});

export const preferencesSchema = z.object({
  theme: z.enum(["dark", "light", "system"]).optional(),
  accent: z.string().optional(),
  density: z.enum(["comfortable", "compact"]).optional(),
  language: z.enum(["en", "ar"]).optional(),
  chartPreferences: z.record(z.string()).optional(),
});

export const productImportRowSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().optional().nullable(),
  category: z.string().min(1),
  supplier: z.string().min(1),
  warehouse: z.string().min(1),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(0),
  reorderLevel: z.coerce.number().int().min(0),
  status: productStatusSchema.default("active"),
});

export const productImportRequestSchema = z.object({
  rows: z.array(productImportRowSchema).min(1).max(500),
  commit: z.boolean().default(false),
});
