import type { Product, PurchaseOrder, PurchaseOrderItem, StockMovement, User, Notification } from "@prisma/client";

export function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    preferences: user.preferences ?? null,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function decimalToNumber(value: { toString(): string } | number): number {
  return typeof value === "number" ? value : parseFloat(value.toString());
}

export function serializeProduct(
  product: Product & {
    category?: { id: string; name: string; description: string | null; createdAt: Date; updatedAt: Date };
    supplier?: { id: string; name: string; email: string | null; phone: string | null; address: string | null; contactPerson: string | null; createdAt: Date; updatedAt: Date };
    warehouse?: { id: string; name: string; location: string | null; description: string | null; createdAt: Date; updatedAt: Date };
    unit?: { id: string; name: string; symbol: string; createdAt: Date; updatedAt: Date } | null;
  }
) {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode?.trim() ? product.barcode.trim() : null,
    categoryId: product.categoryId,
    supplierId: product.supplierId,
    unitId: product.unitId ?? null,
    costPrice: decimalToNumber(product.costPrice),
    sellingPrice: decimalToNumber(product.sellingPrice),
    quantity: product.quantity,
    reorderLevel: product.reorderLevel,
    warehouseId: product.warehouseId,
    status: product.status,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    category: product.category
      ? {
          id: product.category.id,
          name: product.category.name,
          description: product.category.description,
          createdAt: product.category.createdAt.toISOString(),
          updatedAt: product.category.updatedAt.toISOString(),
        }
      : undefined,
    supplier: product.supplier
      ? {
          id: product.supplier.id,
          name: product.supplier.name,
          email: product.supplier.email,
          phone: product.supplier.phone,
          address: product.supplier.address,
          contactPerson: product.supplier.contactPerson,
          createdAt: product.supplier.createdAt.toISOString(),
          updatedAt: product.supplier.updatedAt.toISOString(),
        }
      : undefined,
    warehouse: product.warehouse
      ? {
          id: product.warehouse.id,
          name: product.warehouse.name,
          location: product.warehouse.location,
          description: product.warehouse.description,
          createdAt: product.warehouse.createdAt.toISOString(),
          updatedAt: product.warehouse.updatedAt.toISOString(),
        }
      : undefined,
    unit: product.unit
      ? {
          id: product.unit.id,
          name: product.unit.name,
          symbol: product.unit.symbol,
          createdAt: product.unit.createdAt.toISOString(),
          updatedAt: product.unit.updatedAt.toISOString(),
        }
      : undefined,
  };
}

export function serializeStockMovement(
  movement: StockMovement & {
    product?: Product;
    warehouse?: { id: string; name: string; location: string | null; description: string | null; createdAt: Date; updatedAt: Date };
    createdBy?: { id: string; name: string } | null;
  }
) {
  return {
    id: movement.id,
    productId: movement.productId,
    warehouseId: movement.warehouseId,
    type: movement.type,
    quantity: movement.quantity,
    reference: movement.reference,
    notes: movement.notes,
    fromWarehouseId: movement.fromWarehouseId,
    toWarehouseId: movement.toWarehouseId,
    createdById: movement.createdById,
    createdAt: movement.createdAt.toISOString(),
    product: movement.product ? serializeProduct(movement.product) : undefined,
    warehouse: movement.warehouse
      ? {
          id: movement.warehouse.id,
          name: movement.warehouse.name,
          location: movement.warehouse.location,
          description: movement.warehouse.description,
          createdAt: movement.warehouse.createdAt.toISOString(),
          updatedAt: movement.warehouse.updatedAt.toISOString(),
        }
      : undefined,
    createdBy: movement.createdBy ?? undefined,
  };
}

export function serializePurchaseOrderItem(
  item: PurchaseOrderItem & { product?: Product }
) {
  return {
    id: item.id,
    purchaseOrderId: item.purchaseOrderId,
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: decimalToNumber(item.unitPrice),
    receivedQuantity: item.receivedQuantity,
    product: item.product ? serializeProduct(item.product) : undefined,
  };
}

export function serializePurchaseOrder(
  order: PurchaseOrder & {
    supplier?: { id: string; name: string; email: string | null; phone: string | null; address: string | null; contactPerson: string | null; createdAt: Date; updatedAt: Date };
    items?: (PurchaseOrderItem & { product?: Product })[];
    createdBy?: { id: string; name: string } | null;
  }
) {
  return {
    id: order.id,
    supplierId: order.supplierId,
    status: order.status,
    totalAmount: decimalToNumber(order.totalAmount),
    createdById: order.createdById,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    supplier: order.supplier
      ? {
          id: order.supplier.id,
          name: order.supplier.name,
          email: order.supplier.email,
          phone: order.supplier.phone,
          address: order.supplier.address,
          contactPerson: order.supplier.contactPerson,
          createdAt: order.supplier.createdAt.toISOString(),
          updatedAt: order.supplier.updatedAt.toISOString(),
        }
      : undefined,
    items: order.items?.map(serializePurchaseOrderItem),
    createdBy: order.createdBy ?? undefined,
  };
}

export function serializeNotification(notification: Notification) {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    category: notification.category,
    userId: notification.userId ?? null,
    role: notification.role ?? null,
    isRead: notification.isRead,
    metadata: notification.metadata ?? null,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt?.toISOString() ?? null,
  };
}
