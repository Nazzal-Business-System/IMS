import { normalizeOptionalText } from "@ims/validation";
import type { z } from "zod";
import type { productSchema } from "@ims/validation";

type ProductFormValues = z.infer<typeof productSchema>;

/**
 * Build create/update product payloads with safe optional-field semantics.
 * - create: blank optional strings → null
 * - update: blank optional strings are omitted (leave unchanged)
 * - update + clearBarcode: barcode → null
 */
export function buildProductWritePayload(
  values: ProductFormValues,
  mode: "create" | "update",
  options?: { clearBarcode?: boolean }
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: values.name.trim(),
    sku: values.sku.trim(),
    categoryId: values.categoryId,
    supplierId: values.supplierId,
    costPrice: values.costPrice,
    sellingPrice: values.sellingPrice,
    quantity: values.quantity,
    reorderLevel: values.reorderLevel,
    warehouseId: values.warehouseId,
    status: values.status,
  };

  if (mode === "update" && options?.clearBarcode) {
    payload.barcode = null;
  } else {
    const barcode = normalizeOptionalText(
      values.barcode,
      mode === "create" ? "null" : "omit"
    );
    if (barcode !== undefined) {
      payload.barcode = barcode;
    }
  }

  if (Object.prototype.hasOwnProperty.call(values, "unitId")) {
    const unitId = normalizeOptionalText(
      values.unitId,
      mode === "create" ? "null" : "omit"
    );
    if (unitId !== undefined) {
      payload.unitId = unitId;
    }
  }

  return payload;
}

/** Display optional product text (barcode, etc.) — never an empty cell. */
export function displayOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
