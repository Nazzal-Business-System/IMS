import { Router } from "express";
import type { NotificationCategory, NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { getParam } from "../lib/params.js";
import { serializeNotification } from "../lib/serialize.js";
import {
  getNotificationVisibilityFilter,
  markAsRead,
  markAllAsRead,
} from "../lib/notifications.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

router.use(authenticate, requirePermission("notifications", "read"));

router.get(
  "/unread-count",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const count = await prisma.notification.count({
      where: { AND: [{ isRead: false }, getNotificationVisibilityFilter(userId, role)] },
    });
    res.json({ count });
  })
);

router.patch(
  "/read-all",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const count = await markAllAsRead(req.user!.userId, req.user!.role);
    res.json({ count });
  })
);

router.delete(
  "/clear-read",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const result = await prisma.notification.deleteMany({
      where: { AND: [{ isRead: true }, getNotificationVisibilityFilter(userId, role)] },
    });
    res.json({ count: result.count });
  })
);

router.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const visibility = getNotificationVisibilityFilter(userId, role);

    const unreadOnly = req.query.unread === "true";
    const readOnly = req.query.read === "true";
    const category = parseCategory(req.query.category as string | undefined);
    const type = parseType(req.query.type as string | undefined);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const from = parseDate(req.query.from as string | undefined);
    const to = parseDate(req.query.to as string | undefined);
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 200);
    const offset = Math.max(parseInt(String(req.query.offset ?? "0"), 10) || 0, 0);

    const filters: Prisma.NotificationWhereInput[] = [visibility];
    if (unreadOnly) filters.push({ isRead: false });
    if (readOnly) filters.push({ isRead: true });
    if (category) filters.push({ category });
    if (type) filters.push({ type });
    if (from || to) {
      filters.push({
        createdAt: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      });
    }
    if (search) {
      filters.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { message: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    const where: Prisma.NotificationWhereInput = { AND: filters };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where }),
    ]);

    res.json({
      notifications: notifications.map(serializeNotification),
      total,
    });
  })
);

router.patch(
  "/:id/read",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req, "id");
    const notification = await markAsRead(id, req.user!.userId, req.user!.role);
    if (!notification) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.json(serializeNotification(notification));
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = getParam(req, "id");
    const userId = req.user!.userId;
    const role = req.user!.role;
    const existing = await prisma.notification.findFirst({
      where: { id, ...getNotificationVisibilityFilter(userId, role) },
    });
    if (!existing) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    await prisma.notification.delete({ where: { id } });
    res.status(204).send();
  })
);

function parseCategory(value: string | undefined): NotificationCategory | null {
  const categories: NotificationCategory[] = [
    "inventory",
    "stock",
    "purchase_order",
    "user",
    "permission",
    "system",
  ];
  return categories.includes(value as NotificationCategory)
    ? (value as NotificationCategory)
    : null;
}

function parseType(value: string | undefined): NotificationType | null {
  const types: NotificationType[] = ["info", "success", "warning", "error"];
  return types.includes(value as NotificationType) ? (value as NotificationType) : null;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default router;
