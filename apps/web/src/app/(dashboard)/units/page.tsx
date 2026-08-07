"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { unitSchema } from "@ims/validation";
import type { UnitOfMeasure } from "@ims/shared-types";
import { z } from "zod";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { filterBySearch } from "@/lib/list-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/loading";
import {
  ManagementPageShell,
  ManagementPageHeader,
  ManagementToolbar,
  ManagementToolbarRow,
  SearchField,
  ManagementDataTable,
  RowActionMenu,
  FormDialog,
  FormDialogContent,
  FormDialogHeader,
  FormDialogBody,
  FormDialogFooter,
  AsyncSubmitButton,
  FormField,
  FormLabel,
  FormError,
  type ManagementColumn,
  type RowActionItem,
} from "@/components/management";

type FormData = z.infer<typeof unitSchema>;

export default function UnitsPage() {
  const { canRead, canWrite } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UnitOfMeasure | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UnitOfMeasure | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["units"],
    queryFn: () => apiFetch<UnitOfMeasure[]>("/units"),
    enabled: canRead("units"),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: { name: "", symbol: "" },
  });

  const saveMutation = useMutation({
    mutationFn: (values: FormData) =>
      editing
        ? apiFetch<UnitOfMeasure>(`/units/${editing.id}`, { method: "PUT", body: JSON.stringify(values) })
        : apiFetch<UnitOfMeasure>("/units", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast({ title: editing ? t("toast.unitUpdated") : t("toast.unitCreated") });
      setModalOpen(false);
      setEditing(null);
      form.reset();
    },
    onError: (err: Error) => {
      toast({ title: t("toast.error"), description: err instanceof ApiClientError ? err.message : err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/units/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast({ title: t("toast.unitDeleted") });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: t("toast.error"), description: err instanceof ApiClientError ? err.message : err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || !data) return;
    const record = data.find((u) => u.id === editId);
    if (record) {
      setEditing(record);
      form.reset({ name: record.name, symbol: record.symbol });
      setModalOpen(true);
    }
    router.replace("/units", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const filtered = useMemo(
    () => filterBySearch(data ?? [], search, (u) => [u.name, u.symbol]),
    [data, search]
  );

  if (!canRead("units")) {
    return <EmptyState title={t("access.denied")} description={t("access.units")} />;
  }

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", symbol: "" });
    setModalOpen(true);
  };

  const openEdit = (unit: UnitOfMeasure) => {
    setEditing(unit);
    form.reset({ name: unit.name, symbol: unit.symbol });
    setModalOpen(true);
  };

  const columns: ManagementColumn<UnitOfMeasure>[] = [
    {
      key: "name",
      header: t("table.name"),
      cell: (u) => <span className="font-medium">{u.name}</span>,
    },
    {
      key: "symbol",
      header: t("table.symbol"),
      cell: (u) => <span className="font-mono text-accent">{u.symbol}</span>,
    },
    {
      key: "count",
      header: t("table.products"),
      align: "end",
      cell: (u) => <span className="tabular-nums">{u.productCount ?? 0}</span>,
    },
  ];

  const rowActions = (u: UnitOfMeasure): RowActionItem[] => [
    {
      key: "view",
      label: t("action.view"),
      icon: <Eye className="h-4 w-4" />,
      onSelect: () => router.push(`/units/${u.id}`),
    },
    {
      key: "edit",
      label: t("action.edit"),
      icon: <Pencil className="h-4 w-4" />,
      hidden: !canWrite("units"),
      onSelect: () => openEdit(u),
    },
    {
      key: "delete",
      label: t("action.delete"),
      icon: <Trash2 className="h-4 w-4" />,
      destructive: true,
      hidden: !canWrite("units"),
      onSelect: () => setDeleteTarget(u),
    },
  ];

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title={t("units.title")}
        description={t("units.subtitle")}
        meta={!isLoading && data ? t("mgmt.records", { count: String(data.length) }) : undefined}
        actions={
          canWrite("units") ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("units.add")}
            </Button>
          ) : undefined
        }
      />

      <ManagementToolbar>
        <ManagementToolbarRow>
          <SearchField value={search} onChange={setSearch} placeholder={t("units.search")} />
        </ManagementToolbarRow>
      </ManagementToolbar>

      {isError ? (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-card px-6 py-12 text-center">
          <p className="font-medium text-foreground">{t("mgmt.errorState")}</p>
          <Button type="button" variant="secondary" className="mt-4" onClick={() => refetch()}>
            {t("mgmt.retry")}
          </Button>
        </div>
      ) : (
        <ManagementDataTable
          loading={isLoading}
          data={filtered}
          emptyTitle={search ? t("mgmt.noResults") : t("units.empty")}
          emptyAction={
            !search && canWrite("units") ? (
              <Button type="button" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                {t("units.add")}
              </Button>
            ) : undefined
          }
          columns={columns}
          actions={(u) => <RowActionMenu actions={rowActions(u)} />}
          getRowHref={(u) => `/units/${u.id}`}
          getRowLabel={(u) => u.name}
          mobileCard={{
            title: (u) => u.name,
            subtitle: (u) => <span className="font-mono">{u.symbol}</span>,
            fields: [
              { label: t("table.products"), value: (u) => String(u.productCount ?? 0) },
            ],
          }}
        />
      )}

      <FormDialog open={modalOpen} onOpenChange={setModalOpen}>
        <FormDialogContent size="sm">
          <FormDialogHeader title={editing ? t("units.edit") : t("units.new")} />
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}>
            <FormDialogBody className="space-y-4">
              <FormField>
                <FormLabel required>{t("table.name")}</FormLabel>
                <Input {...form.register("name")} placeholder={t("units.namePlaceholder")} />
                <FormError>{form.formState.errors.name?.message}</FormError>
              </FormField>
              <FormField>
                <FormLabel required>{t("units.symbol")}</FormLabel>
                <Input {...form.register("symbol")} placeholder={t("units.symbolPlaceholder")} />
                <FormError>{form.formState.errors.symbol?.message}</FormError>
              </FormField>
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
                {t("action.save")}
              </AsyncSubmitButton>
            </FormDialogFooter>
          </form>
        </FormDialogContent>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("units.delete.title")}
        description={
          deleteTarget
            ? t("units.delete.description", { name: deleteTarget.name, symbol: deleteTarget.symbol })
            : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </ManagementPageShell>
  );
}
