"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RolePermission, Role, User, UserPermissionsResponse } from "@ims/shared-types";
import { KeyRound, Shield, User as UserIcon, RotateCcw, AlertCircle } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { EmptyState, PageLoading } from "@/components/ui/loading";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUnsavedGuard } from "@/lib/unsaved-guard";
import { cn } from "@/lib/utils";
const EDITABLE_ROLES: Role[] = ["manager", "viewer"];

const SECTION_GROUPS: { titleKey: string; descriptionKey: string; sections: string[] }[] = [
  { titleKey: "permissions.group.core", descriptionKey: "permissions.group.coreDescription", sections: ["dashboard", "settings", "notifications"] },
  { titleKey: "permissions.group.inventory", descriptionKey: "permissions.group.inventoryDescription", sections: ["products", "categories", "warehouses", "units", "suppliers"] },
  { titleKey: "permissions.group.operations", descriptionKey: "permissions.group.operationsDescription", sections: ["stock_movements", "purchase_orders", "reorder_rules", "import_export"] },
  { titleKey: "permissions.group.reports", descriptionKey: "permissions.group.reportsDescription", sections: ["reports"] },
  { titleKey: "permissions.group.administration", descriptionKey: "permissions.group.administrationDescription", sections: ["admin", "admin_users", "admin_permissions", "audit_log"] },
];

function permsEqual(a: RolePermission[], b: RolePermission[]) {
  const norm = (list: RolePermission[]) =>
    [...list]
      .sort((x, y) => x.section.localeCompare(y.section))
      .map((p) => `${p.section}:${p.canRead}:${p.canWrite}`)
      .join("|");
  return norm(a) === norm(b);
}

function PermissionRow({
  label,
  perm,
  canEdit,
  onToggle,
  t,
}: {
  label: string;
  perm: RolePermission;
  canEdit: boolean;
  onToggle: (field: "canRead" | "canWrite") => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-[var(--muted-bg)]/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex items-center gap-6">
        <label className={cn("flex cursor-pointer items-center gap-2 text-sm text-muted select-none", !canEdit && "cursor-default opacity-60")}>
          <Switch
            checked={perm.canRead}
            disabled={!canEdit}
            onCheckedChange={() => onToggle("canRead")}
            aria-label={t("permissions.readAria", { section: label })}
          />
          <span>{t("permissions.read")}</span>
        </label>
        <label className={cn("flex cursor-pointer items-center gap-2 text-sm text-muted select-none", (!canEdit || !perm.canRead) && "cursor-default opacity-60")}>
          <Switch
            checked={perm.canWrite}
            disabled={!canEdit || !perm.canRead}
            onCheckedChange={() => onToggle("canWrite")}
            aria-label={t("permissions.writeAria", { section: label })}
          />
          <span>{t("permissions.write")}</span>
        </label>
      </div>
    </div>
  );
}

type EditorMode = "role" | "user";

export default function AdminPermissionsPage() {
  const { canRead, canWrite } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canManage = canRead("admin_permissions");
  const canEditPerms = canWrite("admin_permissions");

  const { register: registerUnsavedGuard } = useUnsavedGuard();

  const [mode, setMode] = useState<EditorMode>("role");
  const [selectedRole, setSelectedRole] = useState<Role>("manager");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [currentPerms, setCurrentPerms] = useState<RolePermission[]>([]);
  const originalRef = useRef<RolePermission[]>([]);
  const [pendingNav, setPendingNav] = useState<{ type: "role" | "user" | "mode"; value: string } | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const isDirty = useMemo(
    () => currentPerms.length > 0 && !permsEqual(currentPerms, originalRef.current),
    [currentPerms]
  );

  const sectionLabel = (section: string) => {
    const key = `permissions.section.${section}`;
    const translated = t(key);
    return translated === key ? section : translated;
  };

  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ["permissions-role", selectedRole],
    queryFn: () => apiFetch<RolePermission[]>(`/permissions/role/${selectedRole}`),
    enabled: canManage && mode === "role",
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<User[]>("/users"),
    enabled: canManage && mode === "user" && canRead("admin_users"),
  });

  const { data: userPermData, isLoading: userLoading } = useQuery({
    queryKey: ["permissions-user", selectedUserId],
    queryFn: () => apiFetch<UserPermissionsResponse>(`/permissions/user/${selectedUserId}`),
    enabled: canManage && mode === "user" && !!selectedUserId,
  });

  useEffect(() => {
    if (mode === "role" && roleData) {
      setCurrentPerms(roleData);
      originalRef.current = roleData;
    }
  }, [mode, roleData, selectedRole]);

  useEffect(() => {
    if (mode === "user" && userPermData) {
      setCurrentPerms(userPermData.effective);
      originalRef.current = userPermData.effective;
    }
  }, [mode, userPermData, selectedUserId]);

  useEffect(() => {
    if (mode === "user" && users?.length && !selectedUserId) {
      const first = users.find((u) => u.role !== "admin");
      if (first) setSelectedUserId(first.id);
    }
  }, [mode, users, selectedUserId]);

  const saveMutation = useMutation({
    mutationFn: async (permissions: RolePermission[]) => {
      if (mode === "role") {
        return apiFetch<RolePermission[]>(`/permissions/role/${selectedRole}`, {
          method: "PUT",
          body: JSON.stringify({ permissions }),
        });
      }
      const res = await apiFetch<UserPermissionsResponse>(`/permissions/user/${selectedUserId}`, {
        method: "PUT",
        body: JSON.stringify({ permissions }),
      });
      return res.effective;
    },
    onSuccess: (perms) => {
      setCurrentPerms(perms);
      originalRef.current = perms;
      queryClient.invalidateQueries({ queryKey: ["permissions-role"] });
      queryClient.invalidateQueries({ queryKey: ["permissions-user"] });
      toast({ title: t("toast.permissionsSaved") });
    },
    onError: (err: Error) => {
      toast({
        title: t("toast.error"),
        description: err instanceof ApiClientError ? err.message : err.message,
        variant: "destructive",
      });
    },
  });

  const clearOverridesMutation = useMutation({
    mutationFn: () => apiFetch<UserPermissionsResponse>(`/permissions/user/${selectedUserId}`, { method: "DELETE" }),
    onSuccess: (data) => {
      setCurrentPerms(data.effective);
      originalRef.current = data.effective;
      queryClient.invalidateQueries({ queryKey: ["permissions-user"] });
      toast({ title: t("toast.overridesCleared") });
    },
    onError: (err: Error) => {
      toast({
        title: t("toast.error"),
        description: err instanceof ApiClientError ? err.message : err.message,
        variant: "destructive",
      });
    },
  });

  const discardChanges = useCallback(() => {
    setCurrentPerms(originalRef.current);
  }, []);

  const saveMutationRef = useRef(saveMutation);
  saveMutationRef.current = saveMutation;
  const currentPermsRef = useRef(currentPerms);
  currentPermsRef.current = currentPerms;

  useEffect(() => {
    if (!isDirty || !canEditPerms) {
      registerUnsavedGuard(null);
      return;
    }
    registerUnsavedGuard({
      isDirty: true,
      save: async () => {
        await saveMutationRef.current.mutateAsync(currentPermsRef.current);
      },
      discard: discardChanges,
    });
    return () => registerUnsavedGuard(null);
  }, [isDirty, canEditPerms, registerUnsavedGuard, discardChanges]);

  const applyPending = useCallback(() => {
    if (!pendingNav) return;
    if (pendingNav.type === "mode") setMode(pendingNav.value as EditorMode);
    if (pendingNav.type === "role") setSelectedRole(pendingNav.value as Role);
    if (pendingNav.type === "user") setSelectedUserId(pendingNav.value);
    setPendingNav(null);
    setLeaveOpen(false);
  }, [pendingNav]);

  const requestSwitch = (type: "role" | "user" | "mode", value: string) => {
    if (isDirty) {
      setPendingNav({ type, value });
      setLeaveOpen(true);
      return;
    }
    if (type === "mode") setMode(value as EditorMode);
    if (type === "role") setSelectedRole(value as Role);
    if (type === "user") setSelectedUserId(value);
  };

  if (!canManage) {
    return <EmptyState title={t("access.denied")} description={t("access.adminRequired")} />;
  }

  const togglePerm = (section: string, field: "canRead" | "canWrite") => {
    setCurrentPerms((prev) =>
      prev.map((p) => {
        if (p.section !== section) return p;
        const updated = { ...p, [field]: !p[field] };
        if (field === "canRead" && !updated.canRead) updated.canWrite = false;
        if (field === "canWrite" && updated.canWrite) updated.canRead = true;
        return updated;
      })
    );
  };

  const loading = mode === "role" ? roleLoading : userLoading;
  const displayPerms = currentPerms;

  return (
    <>
    <div className="space-y-6 pb-24">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-2 text-accent">
            <KeyRound className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">{t("permissions.accessControl")}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">{t("permissions.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t("permissions.subtitle")}</p>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => requestSwitch("mode", "role")}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                mode === "role" ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:bg-[var(--hover-bg)]"
              )}
            >
              {t("permissions.rolePermissions")}
            </button>
            <button
              type="button"
              onClick={() => requestSwitch("mode", "user")}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                mode === "user" ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:bg-[var(--hover-bg)]"
              )}
            >
              {t("permissions.userOverrides")}
            </button>
          </div>

          {mode === "role" ? (
            <div className="flex flex-wrap gap-2">
              {EDITABLE_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => requestSwitch("role", role)}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm font-semibold capitalize",
                    selectedRole === role ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:bg-[var(--hover-bg)]"
                  )}
                >
                  {t(`role.${role}`)}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <UserIcon className="h-4 w-4 text-muted" />
              <Select
                value={selectedUserId}
                onChange={(e) => requestSwitch("user", e.target.value)}
                className="min-w-[220px]"
              >
                {users
                  ?.filter((u) => u.role !== "admin")
                  .map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({t(`role.${u.role}`)})</option>
                  ))}
              </Select>
              {userPermData?.hasOverrides && canEditPerms && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => clearOverridesMutation.mutate()}
                  disabled={clearOverridesMutation.isPending}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t("permissions.clearOverrides")}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <PageLoading />
      ) : !displayPerms.length ? (
        <EmptyState title={t("permissions.empty")} />
      ) : (
        
        <div className="space-y-6">
          {SECTION_GROUPS.map((group) => {
            const groupPerms = group.sections
              .map((s) => displayPerms.find((p) => p.section === s))
              .filter((p): p is RolePermission => Boolean(p));
            if (!groupPerms.length) return null;
            return (
              <Card key={group.titleKey} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t(group.titleKey)}</CardTitle>
                  <p className="text-sm text-muted">{t(group.descriptionKey)}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {groupPerms.map((perm) => (
                    <PermissionRow
                      key={perm.section}
                      label={sectionLabel(perm.section)}
                      perm={perm}
                      canEdit={canEditPerms}
                      onToggle={(field) => togglePerm(perm.section, field)}
                      t={t}
                    />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
        
      )}

      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-sm text-muted">
        <Shield className="h-4 w-4 text-accent shrink-0" />
        <span>{t("permissions.footer")}</span>
      </div>

      {isDirty && canEditPerms && (
        <div
          className="fixed bottom-6 inset-x-4 z-50 mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-accent/30 bg-card/95 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-md"
          role="status"
          aria-live="polite"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-accent" />
          <p className="min-w-0 flex-1 text-sm font-medium text-foreground">
            {t("permissions.unsaved.title")}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={discardChanges}
              disabled={saveMutation.isPending}
            >
              {t("action.discardChanges")}
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate(displayPerms)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? t("loading.saving") : t("action.saveChanges")}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("permissions.unsaved.title")}</DialogTitle>
            <DialogDescription>{t("permissions.unsaved.description")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setLeaveOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                applyPending();
                discardChanges();
              }}
            >
              {t("action.discardChanges")}
            </Button>
            <Button
              onClick={() => {
                saveMutation.mutate(displayPerms, { onSuccess: () => applyPending() });
              }}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? t("loading.saving") : t("action.saveChanges")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
