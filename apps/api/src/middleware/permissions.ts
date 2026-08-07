import type { Response, NextFunction } from "express";
import { checkUserPermission } from "../lib/effective-permissions.js";
import type { AuthenticatedRequest } from "./auth.js";

export function requirePermission(section: string, action: "read" | "write") {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const allowed = await checkUserPermission(
      req.user.userId,
      req.user.role,
      section,
      action
    );

    if (!allowed) {
      res.status(403).json({
        error: action === "read" ? "Read access denied" : "Write access denied",
      });
      return;
    }

    next();
  };
}

export {
  getPermissionsForRole,
  getEffectivePermissions,
  getRolePermissionsMerged,
  getUserPermissionOverrides,
  userHasPermissionOverrides,
} from "../lib/effective-permissions.js";
