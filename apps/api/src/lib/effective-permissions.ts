import type { Role } from "@prisma/client";
import { prisma } from "./prisma.js";
import { PERMISSION_SECTIONS, DEFAULT_PERMISSIONS } from "./sections.js";

const isDev = process.env.NODE_ENV !== "production";

export interface PermissionRow {
  section: string;
  canRead: boolean;
  canWrite: boolean;
}

export function mergeRolePermissions(role: Role, dbPerms: PermissionRow[]): PermissionRow[] {
  const defaults = DEFAULT_PERMISSIONS[role] ?? [];
  return PERMISSION_SECTIONS.map((section) => {
    const db = dbPerms.find((p) => p.section === section);
    const def = defaults.find((p) => p.section === section);
    return {
      section,
      canRead: db?.canRead ?? def?.canRead ?? false,
      canWrite: db?.canWrite ?? def?.canWrite ?? false,
    };
  });
}

export async function getRolePermissionsMerged(role: Role): Promise<PermissionRow[]> {
  const dbPerms = await prisma.rolePermission.findMany({ where: { role } });
  return mergeRolePermissions(role, dbPerms);
}

export async function getEffectivePermissions(userId: string, role: Role): Promise<PermissionRow[]> {
  if (role === "admin") {
    return PERMISSION_SECTIONS.map((section) => ({
      section,
      canRead: true,
      canWrite: true,
    }));
  }

  const rolePerms = await getRolePermissionsMerged(role);
  const overrides = await prisma.userPermission.findMany({ where: { userId } });

  if (!overrides.length) return rolePerms;

  const effective = rolePerms.map((perm) => {
    const override = overrides.find((o) => o.section === perm.section);
    if (!override) return perm;
    return {
      section: perm.section,
      canRead: override.canRead,
      canWrite: override.canWrite,
    };
  });

  if (isDev) {
    const changed = effective.filter((p) => {
      const role = rolePerms.find((r) => r.section === p.section);
      return role && (role.canRead !== p.canRead || role.canWrite !== p.canWrite);
    });
    console.log(
      `[ims-api] Effective permissions for user ${userId} (${role}):`,
      changed.map((p) => `${p.section}:R${p.canRead ? 1 : 0}/W${p.canWrite ? 1 : 0}`).join(", ")
    );
  }

  return effective;
}

export async function getUserPermissionOverrides(userId: string): Promise<PermissionRow[]> {
  const overrides = await prisma.userPermission.findMany({ where: { userId } });
  return overrides.map((o) => ({
    section: o.section,
    canRead: o.canRead,
    canWrite: o.canWrite,
  }));
}

export async function userHasPermissionOverrides(userId: string): Promise<boolean> {
  const count = await prisma.userPermission.count({ where: { userId } });
  return count > 0;
}

export async function checkUserPermission(
  userId: string,
  role: Role,
  section: string,
  action: "read" | "write"
): Promise<boolean> {
  if (role === "admin") return true;
  const perms = await getEffectivePermissions(userId, role);
  const perm = perms.find((p) => p.section === section);
  if (!perm) {
    if (isDev) console.log(`[ims-api] Permission denied: ${userId} (${role}) — section ${section} not found`);
    return false;
  }
  const allowed = action === "read" ? perm.canRead : perm.canWrite;
  if (isDev && !allowed) {
    console.log(
      `[ims-api] Permission denied: ${userId} (${role}) — ${section} ${action} (R${perm.canRead ? 1 : 0}/W${perm.canWrite ? 1 : 0})`
    );
  }
  return allowed;
}

// Legacy export used by some routes
export async function getPermissionsForRole(role: Role) {
  return getRolePermissionsMerged(role);
}
