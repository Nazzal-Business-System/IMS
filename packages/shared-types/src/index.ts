export type Role = "admin" | "manager" | "viewer";

export type ProductStatus = "active" | "inactive" | "discontinued" | "archived";

export type MovementType = "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT";

export type PurchaseOrderStatus = "draft" | "ordered" | "received" | "cancelled";

export type PermissionSection =
  | "dashboard"
  | "products"
  | "categories"
  | "warehouses"
  | "suppliers"
  | "stock_movements"
  | "purchase_orders"
  | "reports"
  | "settings"
  | "admin"
  | "admin_users"
  | "admin_permissions"
  | "reorder_rules"
  | "audit_log"
  | "import_export"
  | "units"
  | "notifications";

export interface UserPreferences {
  theme?: "dark" | "light" | "system";
  accent?: string;
  density?: "comfortable" | "compact";
  language?: "en" | "ar";
  chartPreferences?: Record<string, string>;
  sidebarCollapsed?: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  preferences: UserPreferences | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermission {
  section: string;
  canRead: boolean;
  canWrite: boolean;
}

export interface UnitOfMeasure {
  id: string;
  name: string;
  symbol: string;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
}

export interface ReorderRule {
  id: string;
  productId: string;
  minQuantity: number;
  maxQuantity: number | null;
  autoPo: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  product?: Product;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  user?: Pick<User, "id" | "name" | "email">;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
}

export interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactPerson: string | null;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
  totalStock?: number;
  stockValue?: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  categoryId: string;
  supplierId: string;
  unitId: string | null;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  reorderLevel: number;
  warehouseId: string;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  supplier?: Supplier;
  warehouse?: Warehouse;
  unit?: UnitOfMeasure;
}

export interface StockMovement {
  id: string;
  productId: string;
  warehouseId: string;
  type: MovementType;
  quantity: number;
  reference: string | null;
  notes: string | null;
  fromWarehouseId: string | null;
  toWarehouseId: string | null;
  createdById: string | null;
  createdAt: string;
  product?: Product;
  warehouse?: Warehouse;
  createdBy?: Pick<User, "id" | "name">;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  receivedQuantity: number;
  product?: Product;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
  createdBy?: Pick<User, "id" | "name">;
}

export interface DashboardStats {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  lowStockProducts: Product[];
  recentMovements: StockMovement[];
  purchaseOrderSummary: {
    draft: number;
    ordered: number;
    received: number;
    cancelled: number;
  };
}

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  rolesSummary: Record<Role, number>;
}

export interface UserGrowthMonth {
  key: string;
  label: string;
  total: number;
  active: number;
  disabled: number;
  byRole: Record<Role, number>;
  cumulativeTotal: number;
  cumulativeActive: number;
  cumulativeDisabled: number;
}

export interface UserGrowthData {
  months: UserGrowthMonth[];
  users: Array<Pick<User, "id" | "name" | "email" | "role" | "isActive" | "createdAt" | "updatedAt">>;
}

export interface UserPermissionsResponse {
  userId: string;
  role: Role;
  rolePermissions?: RolePermission[];
  overrides: RolePermission[];
  effective: RolePermission[];
  hasOverrides: boolean;
}

export interface SearchResult {
  id: string;
  type: string;
  label: string;
  sublabel?: string;
  href: string;
  group: string;
}

export interface InventoryValueReport {
  totalValue: number;
  byCategory: Array<{ categoryName: string; value: number; count: number }>;
  byWarehouse: Array<{ warehouseName: string; value: number; count: number }>;
}

export interface LowStockReport {
  products: Product[];
}

export interface SupplierSummaryReport {
  suppliers: Array<{
    id: string;
    name: string;
    productCount: number;
    totalStockValue: number;
  }>;
}

export interface StockMovementsReport {
  movements: StockMovement[];
  summary: {
    totalIn: number;
    totalOut: number;
    totalTransfer: number;
    totalAdjustment: number;
  };
}

export interface ChartReportData {
  inventoryByCategory: Array<{ name: string; value: number; count: number }>;
  inventoryByWarehouse: Array<{ name: string; value: number; count: number }>;
  movementTrend: Array<{ date: string; in: number; out: number }>;
  movementTypeDistribution: Array<{ type: string; value: number }>;
  topProducts: Array<{ name: string; quantity: number; value: number }>;
  supplierContribution: Array<{ name: string; value: number }>;
}

export interface AuthResponse {
  token: string;
  user: User;
  permissions: RolePermission[];
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export type NotificationType = "info" | "success" | "warning" | "error";

export type NotificationCategory =
  | "inventory"
  | "stock"
  | "purchase_order"
  | "user"
  | "permission"
  | "system";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  userId: string | null;
  role: Role | null;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
}

export interface ProductImportRowResult {
  row: number;
  sku: string;
  name: string;
  valid: boolean;
  error?: string;
}

export interface ProductImportResponse {
  preview: boolean;
  total: number;
  validCount: number;
  errorCount: number;
  results: ProductImportRowResult[];
  importedCount?: number;
}

export interface GenerateDraftPosResponse {
  created: number;
  skipped: number;
  purchaseOrderIds: string[];
  skippedSkus: string[];
}

export interface UnreadCountResponse {
  count: number;
}
