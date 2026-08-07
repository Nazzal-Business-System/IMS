"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserSchema } from "@ims/validation";
import type { User } from "@ims/shared-types";
import { z } from "zod";
import { Pencil } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { useRecordPermissions } from "@/lib/record-permissions";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  StatusBadge,
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
} from "@/components/management";
import {
  PermissionGuard,
  RecordDetailsShell,
  DetailsHeader,
  DetailsSection,
  MetadataList,
  RecordLoadingState,
  RecordNotFoundState,
  RecordErrorState,
} from "@/components/records";

type UpdateForm = z.infer<typeof updateUserSchema>;

const ROLE_BADGE_VARIANTS: Record<string, "default" | "secondary" | "warning"> = {
  admin: "default",
  manager: "warning",
  viewer: "secondary",
};

export default function AdminUserDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const perms = useRecordPermissions("admin_users");
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["users", id],
    queryFn: () => apiFetch<User>(`/users/${id}`),
    enabled: Boolean(id) && perms.canView,
  });

  const form = useForm<UpdateForm>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { email: "", name: "", role: "viewer", isActive: true },
  });

  const saveMutation = useMutation({
    mutationFn: (values: UpdateForm) =>
      apiFetch<User>(`/users/${id}`, { method: "PUT", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({ title: t("toast.userUpdated") });
      setEditOpen(false);
    },
    onError: (err: Error) => {
      toast({
        title: t("toast.error"),
        description: err instanceof ApiClientError ? err.message : err.message,
        variant: "destructive",
      });
    },
  });

  const openEdit = () => {
    if (!data) return;
    form.reset({
      email: data.email,
      name: data.name,
      role: data.role,
      isActive: data.isActive,
    });
    setEditOpen(true);
  };

  return (
    <PermissionGuard allowed={perms.canView} message={t("record.forbidden")}>
      {isLoading ? (
        <RecordLoadingState />
      ) : isError ? (
        (error instanceof ApiClientError && error.status === 404) ||
        (error instanceof Error && /not found/i.test(error.message)) ? (
          <RecordNotFoundState backHref="/admin/users" />
        ) : (
          <RecordErrorState
            onRetry={() => refetch()}
            message={error instanceof Error ? error.message : undefined}
          />
        )
      ) : !data ? (
        <RecordNotFoundState backHref="/admin/users" />
      ) : (
        <RecordDetailsShell>
          <DetailsHeader
            backHref="/admin/users"
            title={data.name}
            subtitle={
              <span dir="ltr">{data.email}</span>
            }
            status={data.isActive ? "active" : "inactive"}
            statusLabel={data.isActive ? t("status.active") : t("status.inactive")}
            meta={
              <>
                {t("record.createdAt")}: {formatDate(data.createdAt)} · {t("record.updatedAt")}:{" "}
                {formatDate(data.updatedAt)}
              </>
            }
            actions={
              perms.canManageUsers ? (
                <Button type="button" variant="secondary" onClick={openEdit}>
                  <Pencil className="h-4 w-4" />
                  {t("action.edit")}
                </Button>
              ) : undefined
            }
          />

          <DetailsSection title={t("record.identity")}>
            <MetadataList
              items={[
                { label: t("table.name"), value: data.name },
                { label: t("table.email"), value: <span dir="ltr">{data.email}</span>, mono: true },
                {
                  label: t("table.role"),
                  value: (
                    <Badge variant={ROLE_BADGE_VARIANTS[data.role]} className="capitalize">
                      {t(`role.${data.role}`)}
                    </Badge>
                  ),
                },
                {
                  label: t("table.status"),
                  value: (
                    <StatusBadge
                      status={data.isActive ? "active" : "inactive"}
                      label={data.isActive ? t("status.active") : t("status.inactive")}
                    />
                  ),
                },
                {
                  label: t("table.lastLogin"),
                  value: data.lastLoginAt ? formatDate(data.lastLoginAt) : t("admin.users.never"),
                },
              ]}
            />
          </DetailsSection>
        </RecordDetailsShell>
      )}

      <FormDialog open={editOpen} onOpenChange={setEditOpen}>
        <FormDialogContent size="md">
          <FormDialogHeader
            title={t("admin.users.edit")}
            description={t("admin.users.editDescription")}
          />
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
          >
            <FormDialogBody className="space-y-6">
              <FormSection>
                <FormGrid cols={2}>
                  <FormField>
                    <FormLabel required>{t("table.name")}</FormLabel>
                    <Input {...form.register("name")} />
                    <FormError>{form.formState.errors.name?.message}</FormError>
                  </FormField>
                  <FormField>
                    <FormLabel required>{t("table.email")}</FormLabel>
                    <Input type="email" {...form.register("email")} />
                    <FormError>{form.formState.errors.email?.message}</FormError>
                  </FormField>
                  <FormField>
                    <FormLabel required>{t("table.role")}</FormLabel>
                    <Select {...form.register("role")}>
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
                      {...form.register("isActive")}
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
                onClick={() => setEditOpen(false)}
                disabled={saveMutation.isPending}
              >
                {t("action.cancel")}
              </Button>
              <AsyncSubmitButton loading={saveMutation.isPending} loadingLabel={t("loading.saving")}>
                {t("action.saveChanges")}
              </AsyncSubmitButton>
            </FormDialogFooter>
          </form>
        </FormDialogContent>
      </FormDialog>
    </PermissionGuard>
  );
}
