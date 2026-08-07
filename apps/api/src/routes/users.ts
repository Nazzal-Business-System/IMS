import { Router } from "express";
import bcrypt from "bcryptjs";
import { createUserSchema, updateUserSchema, resetPasswordSchema } from "@ims/validation";
import { prisma } from "../lib/prisma.js";
import { serializeUser } from "../lib/serialize.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { getParam } from "../lib/params.js";
import { logAudit } from "../lib/audit.js";
import { notifyAdmins } from "../lib/notifications.js";

const router = Router();

router.use(authenticate);

router.get("/", requirePermission("admin_users", "read"), asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  res.json(users.map(serializeUser));
}));

router.get("/:id", requirePermission("admin_users", "read"), asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: getParam(req, "id") } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(serializeUser(user));
}));

router.post("/", requirePermission("admin_users", "write"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const hash = await bcrypt.hash(parsed.data.password, 10);
  try {
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        password: hash,
        name: parsed.data.name,
        role: parsed.data.role,
        isActive: parsed.data.isActive ?? true,
      },
    });
    await logAudit(req.user!.userId, "CREATE", "User", user.id, { email: user.email, role: user.role });
    await notifyAdmins({
      title: "User created",
      message: `User "${user.name}" (${user.email}) was created with ${user.role} role.`,
      type: "info",
      category: "user",
      metadata: { userId: user.id, action: "create" },
    });
    res.status(201).json(serializeUser(user));
  } catch {
    res.status(409).json({ error: "Email already exists" });
  }
}));

router.put("/:id", requirePermission("admin_users", "write"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = getParam(req, "id");
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  if (id === req.user!.userId && parsed.data.isActive === false) {
    res.status(400).json({ error: "Cannot deactivate your own account" });
    return;
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const wouldDeactivateAdmin =
    target.role === "admin" &&
    target.isActive &&
    (parsed.data.isActive === false || (parsed.data.role != null && parsed.data.role !== "admin"));
  if (wouldDeactivateAdmin) {
    const adminCount = await prisma.user.count({ where: { role: "admin", isActive: true } });
    if (adminCount <= 1) {
      res.status(400).json({ error: "Cannot deactivate or demote the last active admin" });
      return;
    }
  }

  try {
    const user = await prisma.user.update({ where: { id }, data: parsed.data });
    await logAudit(req.user!.userId, "UPDATE", "User", user.id);
    if (parsed.data.isActive === false) {
      await notifyAdmins({
        title: "User deactivated",
        message: `User "${user.name}" was deactivated.`,
        type: "warning",
        category: "user",
        metadata: { userId: user.id, action: "deactivate" },
      });
    }
    res.json(serializeUser(user));
  } catch {
    res.status(404).json({ error: "User not found" });
  }
}));

router.post("/:id/reset-password", requirePermission("admin_users", "write"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = getParam(req, "id");
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const hash = await bcrypt.hash(parsed.data.password, 10);
  try {
    await prisma.user.update({ where: { id }, data: { password: hash } });
    await logAudit(req.user!.userId, "RESET_PASSWORD", "User", id);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: "User not found" });
  }
}));

router.delete("/:id", requirePermission("admin_users", "write"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = getParam(req, "id");
  if (id === req.user!.userId) {
    res.status(400).json({ error: "Cannot deactivate your own account" });
    return;
  }
  const adminCount = await prisma.user.count({ where: { role: "admin", isActive: true } });
  const target = await prisma.user.findUnique({ where: { id } });
  if (target?.role === "admin" && adminCount <= 1) {
    res.status(400).json({ error: "Cannot delete the last active admin. Deactivate instead." });
    return;
  }
  try {
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    await logAudit(req.user!.userId, "DEACTIVATE", "User", id);
    if (target) {
      await notifyAdmins({
        title: "User deactivated",
        message: `User "${target.name}" was deactivated.`,
        type: "warning",
        category: "user",
        metadata: { userId: id, action: "deactivate" },
      });
    }
    res.json({ success: true, deactivated: true });
  } catch {
    res.status(404).json({ error: "User not found" });
  }
}));

export default router;
