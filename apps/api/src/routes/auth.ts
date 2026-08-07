import { Router } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import {
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  preferencesSchema,
} from "@ims/validation";
import { prisma } from "../lib/prisma.js";
import { serializeUser } from "../lib/serialize.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { getEffectivePermissions } from "../middleware/permissions.js";
import { logAudit } from "../lib/audit.js";
import { notifyUser } from "../lib/notifications.js";
import { signAuthToken } from "../lib/jwt.js";
import {
  loginRateLimiter,
  passwordChangeRateLimiter,
  avatarUploadRateLimiter,
} from "../lib/rate-limit.js";
import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  deleteStoredAvatar,
  storeAvatar,
} from "../lib/avatar-storage.js";

const router = Router();
const isDev = process.env.NODE_ENV !== "production";

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const mime = file.mimetype === "image/jpg" ? "image/jpeg" : file.mimetype;
    if (AVATAR_MIME_TYPES.has(mime)) {
      cb(null, true);
      return;
    }
    cb(new Error("INVALID_TYPE"));
  },
});

function avatarUploadMiddleware(
  req: AuthenticatedRequest,
  res: import("express").Response,
  next: import("express").NextFunction
) {
  avatarUpload.single("avatar")(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({
          error: `Image must be ${Math.floor(AVATAR_MAX_BYTES / (1024 * 1024))} MB or smaller`,
        });
        return;
      }
      res.status(400).json({ error: "Invalid upload" });
      return;
    }
    if (err instanceof Error && err.message === "INVALID_TYPE") {
      res.status(400).json({ error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." });
      return;
    }
    res.status(400).json({ error: "Invalid upload" });
  });
}

router.post(
  "/login",
  loginRateLimiter,
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid credentials", details: parsed.error.flatten() });
      return;
    }

    if (isDev) console.log(`[ims-api] Login attempt for: ${parsed.data.email}`);

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "Account is deactivated. Contact an administrator." });
      return;
    }

    const passwordValid = await bcrypt.compare(parsed.data.password, user.password);
    if (!passwordValid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const permissions = await getEffectivePermissions(user.id, user.role);
    await logAudit(user.id, "LOGIN", "User", user.id);
    await notifyUser(user.id, {
      title: "New sign-in",
      message: `You signed in to IMS at ${new Date().toLocaleString()}.`,
      type: "info",
      category: "system",
      metadata: { action: "login" },
    });

    if (isDev) {
      const granted = permissions.filter((p) => p.canRead || p.canWrite);
      console.log(
        `[ims-api] Login success: ${user.email} (${user.role}) — permissions:`,
        granted.map((p) => `${p.section}:R${p.canRead ? 1 : 0}/W${p.canWrite ? 1 : 0}`).join(", ")
      );
    } else {
      console.log(`[ims-api] Login success role=${user.role}`);
    }

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    res.json({
      token,
      user: serializeUser(updated!),
      permissions,
    });
  })
);

router.get("/me", authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const permissions = await getEffectivePermissions(user.id, user.role);
  res.json({ user: serializeUser(user), permissions });
}));

router.put(
  "/profile",
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { name: parsed.data.name },
    });
    await logAudit(req.user!.userId, "UPDATE_PROFILE", "User", user.id);
    res.json(serializeUser(user));
  })
);

router.post(
  "/change-password",
  authenticate,
  passwordChangeRateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (!(await bcrypt.compare(parsed.data.currentPassword, user.password))) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }
    if (await bcrypt.compare(parsed.data.newPassword, user.password)) {
      res.status(400).json({ error: "New password must be different from the current password" });
      return;
    }
    const hash = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hash } });
    await logAudit(user.id, "CHANGE_PASSWORD", "User", user.id);
    res.json({ success: true });
  })
);

router.put(
  "/preferences",
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = preferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    const merged = { ...(user?.preferences as object ?? {}), ...parsed.data };
    const updated = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { preferences: merged },
    });
    res.json(serializeUser(updated));
  })
);

/** Recent account/security audit events for the authenticated user only. */
router.get(
  "/activity",
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const accountActions = [
      "LOGIN",
      "UPDATE_PROFILE",
      "CHANGE_PASSWORD",
      "UPDATE_AVATAR",
      "REMOVE_AVATAR",
    ];
    const logs = await prisma.auditLog.findMany({
      where: {
        userId: req.user!.userId,
        OR: [{ action: { in: accountActions } }, { entity: "User" }],
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        createdAt: true,
      },
    });
    res.json(
      logs.map((l) => ({
        id: l.id,
        action: l.action,
        entity: l.entity,
        createdAt: l.createdAt.toISOString(),
      }))
    );
  })
);

/** Upload or replace the authenticated user's avatar (multipart field: avatar). */
router.post(
  "/avatar",
  authenticate,
  avatarUploadRateLimiter,
  avatarUploadMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const file = req.file;
    if (!file?.buffer?.length) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const userId = req.user!.userId;
    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (!current) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let stored;
    try {
      stored = await storeAvatar(userId, file.buffer, file.mimetype);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "INVALID_SIZE") {
        res.status(400).json({
          error: `Image must be ${Math.floor(AVATAR_MAX_BYTES / (1024 * 1024))} MB or smaller`,
        });
        return;
      }
      if (code === "INVALID_TYPE") {
        res.status(400).json({ error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." });
        return;
      }
      throw err;
    }

    const previousKey = current.avatarKey;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: stored.url,
        avatarKey: stored.key,
      },
    });

    // Delete previous file only after DB update succeeds
    if (previousKey && previousKey !== stored.key) {
      await deleteStoredAvatar(previousKey);
    }

    await logAudit(userId, "UPDATE_AVATAR", "User", userId);
    res.json(serializeUser(updated));
  })
);

/** Remove the authenticated user's avatar. */
router.delete(
  "/avatar",
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (!current) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const previousKey = current.avatarKey;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: null,
        avatarKey: null,
      },
    });

    await deleteStoredAvatar(previousKey);
    await logAudit(userId, "REMOVE_AVATAR", "User", userId);
    res.json(serializeUser(updated));
  })
);

export default router;
