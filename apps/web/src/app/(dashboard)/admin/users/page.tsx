"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, updateUserSchema, resetPasswordSchema } from "@ims/validation";
import type { User, Role } from "@ims/shared-types";
import { z } from "zod";
import { Eye, Pencil, Plus, KeyRound, UserX, UserCheck } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/loading";
import { formatDate } from "@/lib/utils";
import {
  ManagementPageShell,
  ManagementPageHeader,
  ManagementToolbar,
  ManagementToolbarRow,
  SearchField,
  FilterSelect,
  ActiveFilters,
  ManagementDataTable,
  RowActionMenu,
  FormDialog,
  FormDialogContent,
  FormDialogHeader,
  FormDialogBody,
  FormDialogFooter,
  AsyncSubmitButton,
  FormSection,
  FormGrid,
  FormField,
  FormLabel,
  FormError,
  StatusBadge,
  type ManagementColumn,
  type RowActionItem,
  type ActiveFilterChip,
} from "@/components/management";

type CreateForm = z.infer<typeof createUserSchema>;
type UpdateForm = z.infer<typeof updateUserSchema>;
type ResetForm = z.infer<typeof resetPasswordSchema>;

type StatusFilter = "all" | "active" | "inactive";
type RoleFilter = "all" | Role;

const ROLE_BADGE_VARIANTS: Record<Role, "default" | "secondary" | "warning"> = {
  admin: "default",
  manager: "warning",
  viewer: "secondary",
};

export default function AdminUsersPage() {
  const { canRead, canWrite } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);
  const [activateTarget, setActivateTarget] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<User[]>("/users"),
    enabled: canRead("admin_users"),
  });

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: "", password: "", name: "", role: "viewer", isActive: true },
  });

  const editForm = useForm<UpdateForm>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { email: "", name: "", role: "viewer", isActive: true },
  });

  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "" },
  });

  const saveMutation = useMutation({
    mutationFn: (values: CreateForm | UpdateForm) =>
      editing
        ? apiFetch<User>(`/users/${editing.id}`, { method: "PUT", body: JSON.stringify(values) })
        : apiFetch<User>("/users", { method: "POST", body: JSON.stringify(values as CreateForm) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({ title: editing ? t("toast.userUpdated") : t("toast.userCreated") });
      setModalOpen(false);
      setEditing(null);
      createForm.reset();
      editForm.reset();
    },
    onError: (err: Error) => {
      toast({ title: t("toast.error"), description: err instanceof ApiClientError ? err.message : err.message, variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      apiFetch(`/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ password }) }),
    onSuccess: () => {
      toast({ title: t("toast.passwordReset") });
      setResetTarget(null);
      resetForm.reset();
      setActionUserId(null);
    },
    onError: (err: Error) => {
      toast({ title: t("toast.error"), description: err instanceof ApiClientError ? err.message : err.message, variant: "destructive" });
      setActionUserId(null);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({ title: t("toast.userDeactivated") });
      setDeactivateTarget(null);
      setActionUserId(null);
    },
    onError: (err: Error) => {
      toast({ title: t("toast.error"), description: err instanceof ApiClientError ? err.message : err.message, variant: "destructive" });
      setActionUserId(null);
    },
  });

  const activateMutation = useMutation({
    mutationFn: (user: User) =>
      apiFetch<User>(`/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: true,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({ title: t("toast.userActivated") });
      setActivateTarget(null);
      setActionUserId(null);
    },
    onError: (err: Error) => {
      toast({ title: t("toast.error"), description: err instanceof ApiClientError ? err.message : err.message, variant: "destructive" });
      setActionUserId(null);
    },
  });

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter === "active" && !u.isActive) return false;
      if (statusFilter === "inactive" && u.isActive) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [data, search, roleFilter, statusFilter]);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || !data) return;
    const record = data.find((u) => u.id === editId);
    if (record) {
      setEditing(record);
      editForm.reset({
        email: record.email,
        name: record.name,
        role: record.role,
        isActive: record.isActive,
      });
      setModalOpen(true);
    }
    router.replace("/admin/users", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!canRead("admin_users")) {
    return <EmptyState title={t("access.denied")} description={t("access.adminRequired")} />;
  }

  const openCreate = () => {
    setEditing(null);
    createForm.reset({ email: "", password: "", name: "", role: "viewer", isActive: true });
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    editForm.reset({
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    });
    setModalOpen(true);
  };

  const isRowBusy = (id: string) =>
    actionUserId === id &&
    (resetMutation.isPending || deactivateMutation.isPending || activateMutation.isPending);

  const activeChips: ActiveFilterChip[] = [
    ...(roleFilter !== "all" ? [{ key: "role", label: `${t("filter.role")}: ${t(`role.${roleFilter}`)}` }] : []),
    ...(statusFilter !== "all"
      ? [{ key: "status", label: `${t("filter.status")}: ${statusFilter === "active" ? t("status.active") : t("status.inactive")}` }]
      : []),
  ];

  const columns: ManagementColumn<User>[] = [
    {
      key: "name",
      header: t("table.name"),
      cell: (u) => (
        <div>
          <p className="font-medium text-foreground">{u.name}</p>
          <p className="text-xs text-muted">{u.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: t("table.role"),
      cell: (u) => (
        <Badge variant={ROLE_BADGE_VARIANTS[u.role]} className="capitalize">
          {t(`role.${u.role}`)}
        </Badge>
      ),
    },
    {
      key: "status",
      header: t("table.status"),
      cell: (u) => (
        <StatusBadge status={u.isActive ? "active" : "inactive"} label={u.isActive ? t("status.active") : t("status.inactive")} />
      ),
    },
    {
      key: "lastLogin",
      header: t("table.lastLogin"),
      align: "end",
      hideBelow: "md",
      cell: (u) => (
        <span className="text-sm text-muted">
          {u.lastLoginAt ? formatDate(u.lastLoginAt) : t("admin.users.never")}
        </span>
      ),
    },
  ];

  const rowActions = (u: User): RowActionItem[] => [
    {
      key: "view",
      label: t("action.view"),
      icon: <Eye className="h-4 w-4" />,
      onSelect: () => router.push(`/admin/users/${u.id}`),
    },
    {
      key: "edit",
      label: t("admin.users.editUser"),
      icon: <Pencil className="h-4 w-4" />,
      disabled: isRowBusy(u.id),
      hidden: !canWrite("admin_users"),
      onSelect: () => openEdit(u),
    },
    {
      key: "reset",
      label: t("admin.users.resetPasswordAction"),
      icon: <KeyRound className="h-4 w-4" />,
      disabled: isRowBusy(u.id),
      hidden: !canWrite("admin_users"),
      onSelect: () => {
        setResetTarget(u);
        resetForm.reset();
      },
    },
    {
      key: "toggle-active",
      label: u.isActive ? t("admin.users.deactivateUser") : t("admin.users.activateUser"),
      icon: u.isActive ? (
        <UserX className="h-4 w-4 text-red-400" />
      ) : (
        <UserCheck className="h-4 w-4 text-emerald-500" />
      ),
      destructive: u.isActive,
      disabled: isRowBusy(u.id),
      hidden: !canWrite("admin_users"),
      onSelect: () => (u.isActive ? setDeactivateTarget(u) : setActivateTarget(u)),
    },
  ];

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title={t("admin.users.title")}
        description={t("admin.users.subtitle")}
        meta={
          !isLoading && data
            ? filteredUsers.length === 1
              ? t("admin.users.count", { count: String(filteredUsers.length) })
              : t("admin.users.countPlural", { count: String(filteredUsers.length) })
            : undefined
        }
        actions={
          canWrite("admin_users") ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("admin.addUser")}
            </Button>
          ) : undefined
        }
      />

      <ManagementToolbar>
        <ManagementToolbarRow>
          <SearchField value={search} onChange={setSearch} placeholder={t("admin.users.search")} />
          <FilterSelect label={t("filter.role")} value={roleFilter} onChange={(v) => setRoleFilter(v as RoleFilter)}>
            <option value="all">{t("filter.allRoles")}</option>
            <option value="admin">{t("role.admin")}</option>
            <option value="manager">{t("role.manager")}</option>
            <option value="viewer">{t("role.viewer")}</option>
          </FilterSelect>
          <FilterSelect label={t("filter.status")} value={statusFilter} onChange={(v) => setStatusFilter(v as StatusFilter)}>
            <option value="all">{t("filter.allStatus")}</option>
            <option value="active">{t("status.active")}</option>
            <option value="inactive">{t("status.inactive")}</option>
          </FilterSelect>
        </ManagementToolbarRow>
        <ActiveFilters
          chips={activeChips}
          onRemove={(key) => {
            if (key === "role") setRoleFilter("all");
            if (key === "status") setStatusFilter("all");
          }}
          onClearAll={activeChips.length ? () => {
            setRoleFilter("all");
            setStatusFilter("all");
          } : undefined}
        />
      </ManagementToolbar>

      <ManagementDataTable
        loading={isLoading}
        data={filteredUsers}
        emptyTitle={t("admin.users.empty")}
        columns={columns}
        actions={(u) => <RowActionMenu actions={rowActions(u)} />}
        getRowHref={(u) => `/admin/users/${u.id}`}
        getRowLabel={(u) => u.name || u.email}
        mobileCard={{
          title: (u) => u.name,
          subtitle: (u) => u.email,
          badges: (u) => (
            <>
              <Badge variant={ROLE_BADGE_VARIANTS[u.role]} className="capitalize">
                {t(`role.${u.role}`)}
              </Badge>
              <StatusBadge status={u.isActive ? "active" : "inactive"} label={u.isActive ? t("status.active") : t("status.inactive")} />
            </>
          ),
          fields: [
            {
              label: t("table.lastLogin"),
              value: (u) => (u.lastLoginAt ? formatDate(u.lastLoginAt) : t("admin.users.never")),
            },
          ],
        }}
      />

      <FormDialog open={modalOpen} onOpenChange={setModalOpen}>
        <FormDialogContent size="md">
          <FormDialogHeader
            title={editing ? t("admin.users.edit") : t("admin.users.new")}
            description={editing ? t("admin.users.editDescription") : t("admin.users.createDescription")}
          />
          {editing ? (
            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={editForm.handleSubmit((v) => saveMutation.mutate(v))}
            >
              <FormDialogBody className="space-y-6">
                <FormSection>
                  <FormGrid cols={2}>
                    <FormField>
                      <FormLabel required>{t("table.name")}</FormLabel>
                      <Input {...editForm.register("name")} />
                      <FormError>{editForm.formState.errors.name?.message}</FormError>
                    </FormField>
                    <FormField>
                      <FormLabel required>{t("table.email")}</FormLabel>
                      <Input type="email" {...editForm.register("email")} />
                      <FormError>{editForm.formState.errors.email?.message}</FormError>
                    </FormField>
                    <FormField>
                      <FormLabel required>{t("table.role")}</FormLabel>
                      <Select {...editForm.register("role")}>
                        <option value="admin">{t("role.admin")}</option>
                        <option value="manager">{t("role.manager")}</option>
                        <option value="viewer">{t("role.viewer")}</option>
                      </Select>
                    </FormField>
                  </FormGrid>
                  <FormField>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        {...editForm.register("isActive")}
                        className="cursor-pointer rounded border-border accent-[var(--accent)]"
                      />
                      {t("admin.users.activeAccount")}
                    </label>
                  </FormField>
                </FormSection>
              </FormDialogBody>
              <FormDialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={saveMutation.isPending}
                >
                  {t("action.cancel")}
                </Button>
                <AsyncSubmitButton loading={saveMutation.isPending} loadingLabel={t("loading.saving")}>
                  {t("action.saveChanges")}
                </AsyncSubmitButton>
              </FormDialogFooter>
            </form>
          ) : (
            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={createForm.handleSubmit((v) => saveMutation.mutate(v))}
            >
              <FormDialogBody className="space-y-6">
                <FormSection>
                  <FormGrid cols={2}>
                    <FormField>
                      <FormLabel required>{t("table.name")}</FormLabel>
                      <Input {...createForm.register("name")} />
                      <FormError>{createForm.formState.errors.name?.message}</FormError>
                    </FormField>
                    <FormField>
                      <FormLabel required>{t("table.email")}</FormLabel>
                      <Input type="email" {...createForm.register("email")} />
                      <FormError>{createForm.formState.errors.email?.message}</FormError>
                    </FormField>
                    <FormField>
                      <FormLabel required>{t("login.password")}</FormLabel>
                      <Input type="password" {...createForm.register("password")} />
                      <FormError>{createForm.formState.errors.password?.message}</FormError>
                    </FormField>
                    <FormField>
                      <FormLabel required>{t("table.role")}</FormLabel>
                      <Select {...createForm.register("role")}>
                        <option value="admin">{t("role.admin")}</option>
                        <option value="manager">{t("role.manager")}</option>
                        <option value="viewer">{t("role.viewer")}</option>
                      </Select>
                    </FormField>
                  </FormGrid>
                </FormSection>
              </FormDialogBody>
              <FormDialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={saveMutation.isPending}
                >
                  {t("action.cancel")}
                </Button>
                <AsyncSubmitButton loading={saveMutation.isPending} loadingLabel={t("admin.users.creating")}>
                  {t("admin.users.createUser")}
                </AsyncSubmitButton>
              </FormDialogFooter>
            </form>
          )}
        </FormDialogContent>
      </FormDialog>

      <FormDialog
        open={!!resetTarget}
        onOpenChange={(open) => {
          if (!open) setResetTarget(null);
        }}
      >
        <FormDialogContent size="sm">
          <FormDialogHeader
            title={t("admin.users.resetPassword")}
            description={resetTarget ? t("admin.users.resetPasswordFor", { name: resetTarget.name }) : undefined}
          />
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={resetForm.handleSubmit((v) => {
              if (!resetTarget) return;
              setActionUserId(resetTarget.id);
              resetMutation.mutate({ id: resetTarget.id, password: v.password });
            })}
          >
            <FormDialogBody className="space-y-4">
              <FormField>
                <FormLabel required htmlFor="reset-password">
                  {t("settings.newPassword")}
                </FormLabel>
                <Input id="reset-password" type="password" {...resetForm.register("password")} />
                <FormError>{resetForm.formState.errors.password?.message}</FormError>
              </FormField>
            </FormDialogBody>
            <FormDialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setResetTarget(null)}
                disabled={resetMutation.isPending}
              >
                {t("action.cancel")}
              </Button>
              <AsyncSubmitButton loading={resetMutation.isPending} loadingLabel={t("admin.users.resetting")}>
                {t("admin.users.resetPassword")}
              </AsyncSubmitButton>
            </FormDialogFooter>
          </form>
        </FormDialogContent>
      </FormDialog>

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(o) => !o && setDeactivateTarget(null)}
        title={t("admin.users.deactivate.title")}
        description={
          deactivateTarget
            ? t("admin.users.deactivate.description", { name: deactivateTarget.name })
            : undefined
        }
        confirmLabel={t("action.deactivate")}
        loading={deactivateMutation.isPending}
        onConfirm={() => {
          if (deactivateTarget) {
            setActionUserId(deactivateTarget.id);
            deactivateMutation.mutate(deactivateTarget.id);
          }
        }}
      />

      <ConfirmDialog
        open={!!activateTarget}
        onOpenChange={(o) => !o && setActivateTarget(null)}
        title={t("admin.users.activate.title")}
        description={
          activateTarget ? t("admin.users.activate.description", { name: activateTarget.name }) : undefined
        }
        confirmLabel={t("action.activate")}
        variant="default"
        loading={activateMutation.isPending}
        onConfirm={() => {
          if (activateTarget) {
            setActionUserId(activateTarget.id);
            activateMutation.mutate(activateTarget);
          }
        }}
      />
    </ManagementPageShell>
  );
}
