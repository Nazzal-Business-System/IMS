import { Router } from "express";
import cors from "cors";
import { getCorsConfig } from "./lib/cors.js";
import { apiRateLimiter } from "./lib/rate-limit.js";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import categoryRoutes from "./routes/categories.js";
import supplierRoutes from "./routes/suppliers.js";
import warehouseRoutes from "./routes/warehouses.js";
import productRoutes from "./routes/products.js";
import stockMovementRoutes from "./routes/stock-movements.js";
import purchaseOrderRoutes from "./routes/purchase-orders.js";
import reportRoutes from "./routes/reports.js";
import adminRoutes from "./routes/admin.js";
import userRoutes from "./routes/users.js";
import permissionRoutes from "./routes/permissions.js";
import auditLogRoutes from "./routes/audit-logs.js";
import unitRoutes from "./routes/units.js";
import reorderRuleRoutes from "./routes/reorder-rules.js";
import importExportRoutes from "./routes/import-export.js";
import searchRoutes from "./routes/search.js";
import notificationRoutes from "./routes/notifications.js";
import { errorHandler } from "./middleware/error-handler.js";

export function createApp() {
  const router = Router();

  router.use(cors(getCorsConfig(process.env.CORS_ORIGIN)));
  router.use(apiRateLimiter);

  router.use("/auth", authRoutes);
  router.use("/admin", adminRoutes);
  router.use("/users", userRoutes);
  router.use("/permissions", permissionRoutes);
  router.use("/audit-logs", auditLogRoutes);
  router.use("/units", unitRoutes);
  router.use("/reorder-rules", reorderRuleRoutes);
  router.use("/search", searchRoutes);
  router.use("/notifications", notificationRoutes);
  router.use("/import-export", importExportRoutes);
  router.use("/dashboard", dashboardRoutes);
  router.use("/categories", categoryRoutes);
  router.use("/suppliers", supplierRoutes);
  router.use("/warehouses", warehouseRoutes);
  router.use("/products", productRoutes);
  router.use("/stock-movements", stockMovementRoutes);
  router.use("/purchase-orders", purchaseOrderRoutes);
  router.use("/reports", reportRoutes);
  router.use(errorHandler);

  return router;
}

export default Router();
