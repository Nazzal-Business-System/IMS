import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

router.use(authenticate);

router.get("/dashboard", requirePermission("admin", "read"), asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany();
  const rolesSummary = { admin: 0, manager: 0, viewer: 0 } as Record<string, number>;
  let activeUsers = 0;
  let disabledUsers = 0;
  for (const u of users) {
    rolesSummary[u.role]++;
    if (u.isActive) activeUsers++;
    else disabledUsers++;
  }
  res.json({
    totalUsers: users.length,
    activeUsers,
    disabledUsers,
    rolesSummary,
  });
}));

router.get("/user-growth", requirePermission("admin", "read"), asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const now = new Date();
  const months: Array<{
    key: string;
    label: string;
    total: number;
    active: number;
    disabled: number;
    byRole: Record<string, number>;
  }> = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
    const monthUsers = users.filter((u) => {
      const c = new Date(u.createdAt);
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
    });
    const byRole: Record<string, number> = { admin: 0, manager: 0, viewer: 0 };
    let active = 0;
    let disabled = 0;
    for (const u of monthUsers) {
      byRole[u.role]++;
      if (u.isActive) active++;
      else disabled++;
    }
    months.push({
      key,
      label,
      total: monthUsers.length,
      active,
      disabled,
      byRole,
    });
  }

  const cumulative = months.map((m, idx) => {
    const upTo = users.filter((u) => {
      const c = new Date(u.createdAt);
      const end = new Date(now.getFullYear(), now.getMonth() - (11 - idx) + 1, 0);
      return c <= end;
    });
    return {
      ...m,
      cumulativeTotal: upTo.length,
      cumulativeActive: upTo.filter((u) => u.isActive).length,
      cumulativeDisabled: upTo.filter((u) => !u.isActive).length,
    };
  });

  res.json({
    months: cumulative,
    users: users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    })),
  });
}));

export default router;
