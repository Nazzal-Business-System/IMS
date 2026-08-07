import { Router } from "express";
import { permissionUpdateSchema } from "@ims/validation";
import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import {
  requirePermission,
  getRolePermissionsMerged,
  getEffectivePermissions,
  getUserPermissionOverrides,
  userHasPermissionOverrides,
} from "../middleware/permissions.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { logAudit } from "../lib/audit.js";
import { notifyAdmins, notifyUser } from "../lib/notifications.js";
import { getParam } from "../lib/params.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { PERMISSION_SECTIONS } from "../lib/sections.js";

const router = Router();

router.get("/me", authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const permissions = await getEffectivePermissions(req.user!.userId, req.user!.role);
  res.json(permissions);
}));

router.get("/role/:role", authenticate, requirePermission("admin_permissions", "read"), asyncHandler(async (req, res) => {
  const role = getParamRole(req.params.role);
  if (!role || role === "admin") {
    res.status(400).json({ error: "Invalid role" });
    return;
  }
  const permissions = await getRolePermissionsMerged(role);
  res.json(permissions);
}));

router.put("/role/:role", authenticate, requirePermission("admin_permissions", "write"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const role = getParamRole(req.params.role);
  if (!role || role === "admin") {
    res.status(400).json({ error: "Invalid role" });
    return;
  }
  const parsed = permissionUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const sections = new Set(parsed.data.permissions.map((p) => p.section));
  for (const section of PERMISSION_SECTIONS) {
    if (!sections.has(section)) {
      res.status(400).json({ error: `Missing permission for section: ${section}` });
      return;
    }
  }
  await prisma.rolePermission.deleteMany({ where: { role } });
  await prisma.rolePermission.createMany({
    data: parsed.data.permissions.map((p) => ({
      role,
      section: p.section,
      canRead: p.canRead,
      canWrite: p.canWrite,
    })),
  });
  await logAudit(req.user!.userId, "UPDATE_PERMISSIONS", "RolePermission", role);
  await notifyAdmins({
    title: "Permissions updated",
    message: `Permissions updated for ${role} role.`,
    type: "info",
    category: "permission",
    metadata: { role, action: "update_role_permissions" },
  });
  const permissions = await getRolePermissionsMerged(role);
  res.json(permissions);
}));

router.get("/user/:userId", authenticate, requirePermission("admin_permissions", "read"), asyncHandler(async (req, res) => {
  const userId = getParam(req, "userId");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.role === "admin") {
    res.status(400).json({ error: "Admin user permissions cannot be customized" });
    return;
  }
  const rolePermissions = await getRolePermissionsMerged(user.role);
  const overrides = await getUserPermissionOverrides(userId);
  const effective = await getEffectivePermissions(userId, user.role);
  const hasOverrides = await userHasPermissionOverrides(userId);
  res.json({
    userId,
    role: user.role,
    rolePermissions,
    overrides,
    effective,
    hasOverrides,
  });
}));

router.put("/user/:userId", authenticate, requirePermission("admin_permissions", "write"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = getParam(req, "userId");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.role === "admin") {
    res.status(400).json({ error: "Admin user permissions cannot be customized" });
    return;
  }
  const parsed = permissionUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const rolePerms = await getRolePermissionsMerged(user.role);
  const overrides = parsed.data.permissions.filter((p) => {
    const role = rolePerms.find((r) => r.section === p.section);
    return !role || role.canRead !== p.canRead || role.canWrite !== p.canWrite;
  });
  await prisma.userPermission.deleteMany({ where: { userId } });
  if (overrides.length) {
    await prisma.userPermission.createMany({
      data: overrides.map((p) => ({
        userId,
        section: p.section,
        canRead: p.canRead,
        canWrite: p.canWrite,
      })),
    });
  }
  await logAudit(req.user!.userId, "UPDATE_USER_PERMISSIONS", "UserPermission", userId);
  await notifyUser(userId, {
    title: "Your permissions changed",
    message: "Your account permissions were updated by an administrator.",
    type: "info",
    category: "permission",
    metadata: { action: "update_user_permissions" },
  });
  await notifyAdmins({
    title: "User permissions updated",
    message: `Permissions updated for user "${user.name}".`,
    type: "info",
    category: "permission",
    metadata: { userId, action: "update_user_permissions" },
  });
  const effective = await getEffectivePermissions(userId, user.role);
  const overrideRows = await getUserPermissionOverrides(userId);
  res.json({
    userId,
    role: user.role,
    overrides: overrideRows,
    effective,
    hasOverrides: overrideRows.length > 0,
  });
}));

router.delete("/user/:userId", authenticate, requirePermission("admin_permissions", "write"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = getParam(req, "userId");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  await prisma.userPermission.deleteMany({ where: { userId } });
  await logAudit(req.user!.userId, "CLEAR_USER_PERMISSIONS", "UserPermission", userId);
  const rolePermissions = await getRolePermissionsMerged(user.role);
  const effective = await getEffectivePermissions(userId, user.role);
  res.json({
    userId,
    role: user.role,
    rolePermissions,
    overrides: [],
    effective,
    hasOverrides: false,
  });
}));

function getParamRole(value: string | string[]): Role | null {
  const v = Array.isArray(value) ? value[0] : value;
  if (v === "admin" || v === "manager" || v === "viewer") return v;
  return null;
}

export default router;
