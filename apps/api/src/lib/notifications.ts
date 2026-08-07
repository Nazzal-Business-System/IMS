import type {
  Notification,
  NotificationCategory,
  NotificationType,
  Prisma,
  Role,
} from "@prisma/client";
import { prisma } from "./prisma.js";
import { getIO } from "./socket.js";
import { serializeNotification } from "./serialize.js";

export interface CreateNotificationInput {
  title: string;
  message: string;
  type?: NotificationType;
  category?: NotificationCategory;
  userId?: string | null;
  role?: Role | null;
  metadata?: Record<string, unknown> | null;
}

export function getNotificationVisibilityFilter(
  userId: string,
  role: Role
): Prisma.NotificationWhereInput {
  const or: Prisma.NotificationWhereInput[] = [
    { userId },
    { role },
    { userId: null, role: null },
  ];
  if (role === "admin") {
    or.push({ category: "system" });
  }
  return { OR: or };
}

function emitNotification(notification: Notification) {
  const socketServer = getIO();
  if (!socketServer) return;

  const payload = serializeNotification(notification);
  if (notification.userId) {
    socketServer.to(`user:${notification.userId}`).emit("notification:new", payload);
  } else if (notification.role) {
    socketServer.to(`role:${notification.role}`).emit("notification:new", payload);
  } else {
    socketServer.to("global").emit("notification:new", payload);
  }
}

export async function createNotification(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      title: input.title,
      message: input.message,
      type: input.type ?? "info",
      category: input.category ?? "system",
      userId: input.userId ?? null,
      role: input.role ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
  emitNotification(notification);
  return notification;
}

type NotifyPayload = Omit<CreateNotificationInput, "userId" | "role">;

export async function notifyUser(userId: string, payload: NotifyPayload) {
  return createNotification({ ...payload, userId, role: null });
}

export async function notifyRole(role: Role, payload: NotifyPayload) {
  return createNotification({ ...payload, userId: null, role });
}

export async function notifyAdmins(payload: NotifyPayload) {
  return notifyRole("admin", payload);
}

export async function notifyAll(payload: NotifyPayload) {
  return createNotification({ ...payload, userId: null, role: null });
}

export async function markAsRead(notificationId: string, userId: string, role: Role) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, ...getNotificationVisibilityFilter(userId, role) },
  });
  if (!notification) return null;
  if (notification.isRead) return notification;

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllAsRead(userId: string, role: Role) {
  const result = await prisma.notification.updateMany({
    where: { AND: [{ isRead: false }, getNotificationVisibilityFilter(userId, role)] },
    data: { isRead: true, readAt: new Date() },
  });
  return result.count;
}

export async function checkLowStockAlert(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.quantity > product.reorderLevel) return;

  const payload: NotifyPayload = {
    title: "Low stock alert",
    message: `Low stock alert: ${product.name} has only ${product.quantity} units left.`,
    type: "warning",
    category: "inventory",
    metadata: { productId: product.id, productName: product.name, quantity: product.quantity },
  };

  await notifyRole("manager", payload);
  await notifyAdmins(payload);
}
