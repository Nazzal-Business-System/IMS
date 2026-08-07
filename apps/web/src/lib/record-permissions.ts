"use client";

import type { PermissionSection } from "@ims/shared-types";
import { useAuth } from "@/lib/auth";

/**
 * Semantic permission helpers. Backend remains authoritative —
 * these only drive UI visibility/disablement.
 */
export function useRecordPermissions(section: PermissionSection | string) {
  const { canRead, canWrite, user, isAdmin } = useAuth();
  const view = canRead(section);
  const write = canWrite(section);

  return {
    canView: view,
    canCreate: write,
    canEdit: write,
    canDelete: write,
    canDeactivate: write,
    canArchive: write,
    canReceive: write && section === "purchase_orders",
    canCancel: write && section === "purchase_orders",
    canSubmit: write && section === "purchase_orders",
    canAdjustStock: canWrite("stock_movements"),
    canManageUsers: canWrite("admin_users"),
    canWrite: write,
    canRead: view,
    user,
    isAdmin,
  };
}

export function usePermissionGate(section: PermissionSection | string, mode: "read" | "write" = "read") {
  const { canRead, canWrite, loading } = useAuth();
  const allowed = mode === "write" ? canWrite(section) : canRead(section);
  return { allowed, loading };
}
