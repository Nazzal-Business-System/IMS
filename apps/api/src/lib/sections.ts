export const PERMISSION_SECTIONS = [
  "dashboard",
  "products",
  "categories",
  "warehouses",
  "suppliers",
  "stock_movements",
  "purchase_orders",
  "reports",
  "settings",
  "admin",
  "admin_users",
  "admin_permissions",
  "reorder_rules",
  "audit_log",
  "import_export",
  "units",
  "notifications",
] as const;

export type PermissionSection = (typeof PERMISSION_SECTIONS)[number];

export const DEFAULT_PERMISSIONS: Record<
  string,
  Array<{ section: string; canRead: boolean; canWrite: boolean }>
> = {
  admin: PERMISSION_SECTIONS.map((section) => ({
    section,
    canRead: true,
    canWrite: true,
  })),
  manager: [
    { section: "dashboard", canRead: true, canWrite: false },
    { section: "products", canRead: true, canWrite: true },
    { section: "categories", canRead: true, canWrite: true },
    { section: "warehouses", canRead: true, canWrite: true },
    { section: "suppliers", canRead: true, canWrite: true },
    { section: "stock_movements", canRead: true, canWrite: true },
    { section: "purchase_orders", canRead: true, canWrite: true },
    { section: "reports", canRead: true, canWrite: false },
    { section: "settings", canRead: true, canWrite: true },
    { section: "notifications", canRead: true, canWrite: false },
    { section: "reorder_rules", canRead: true, canWrite: true },
    { section: "audit_log", canRead: true, canWrite: false },
    { section: "import_export", canRead: true, canWrite: true },
    { section: "units", canRead: true, canWrite: true },
  ],
  viewer: [
    { section: "dashboard", canRead: true, canWrite: false },
    { section: "products", canRead: true, canWrite: false },
    { section: "categories", canRead: true, canWrite: false },
    { section: "warehouses", canRead: true, canWrite: false },
    { section: "suppliers", canRead: true, canWrite: false },
    { section: "stock_movements", canRead: true, canWrite: false },
    { section: "purchase_orders", canRead: true, canWrite: false },
    { section: "reports", canRead: true, canWrite: false },
    { section: "settings", canRead: true, canWrite: false },
    { section: "notifications", canRead: true, canWrite: false },
  ],
};
