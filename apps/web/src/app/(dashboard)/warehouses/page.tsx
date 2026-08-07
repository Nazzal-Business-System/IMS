"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { warehouseSchema } from "@ims/validation";
import type { Warehouse } from "@ims/shared-types";
import { z } from "zod";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import { filterBySearch, sortByDate } from "@/lib/list-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/loading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

type FormData = z.infer<typeof warehouseSchema>;

interface WarehouseDetail extends Warehouse {
  products?: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
    costPrice: number;
    category: string;
    supplier: string;
  }>;
}

export default function WarehousesPage() {
  const { canWrite } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => apiFetch<Warehouse[]>("/warehouses"),
  });

  const { data: warehouseDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["warehouses", viewId],
    queryFn: () => apiFetch<WarehouseDetail>(`/warehouses/${viewId}`),
    enabled: !!viewId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: { name: "", location: "", description: "" },
  });

  const saveMutation = useMutation({
    mutationFn: (values: FormData) =>
      editing
        ? apiFetch<Warehouse>(`/warehouses/${editing.id}`, { method: "PUT", body: JSON.stringify(values) })
        : apiFetch<Warehouse>("/warehouses", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast({ title: editing ? t("toast.warehouseUpdated") : t("toast.warehouseCreated") });
      setModalOpen(false);
      setEditing(null);
      form.reset();
    },
    onError: (err: Error) => {
      const msg = err instanceof ApiClientError ? err.message : err.message;
      toast({ title: t("toast.error"), description: msg, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/warehouses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast({ title: t("toast.warehouseDeleted") });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      const msg = err instanceof ApiClientError ? err.message : err.message;
      toast({
        title: t("toast.cannotDeleteWarehouse"),
        description: msg,
        variant: "destructive",
      });
      setDeleteTarget(null);
    },
  });

  const filtered = useMemo(() => {
    const list = filterBySearch(data ?? [], search, (w) => [w.name, w.location ?? ""]);
    return sortByDate(list, (w) => w.createdAt, "latest");
  }, [data, search]);

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", location: "", description: "" });
    setModalOpen(true);
  };

  const openEdit = (w: Warehouse) => {
    setEditing(w);
    form.reset({
      name: w.name,
      location: w.location ?? "",
      description: w.description ?? "",
    });
    setModalOpen(true);
  };

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || !data) return;
    const record = data.find((w) => w.id === editId);
    if (record) openEdit(record);
    router.replace("/warehouses", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const columns: ManagementColumn<Warehouse>[] = [
    {
      key: "name",
      header: t("table.name"),
      cell: (w) => <span className="font-medium">{w.name}</span>,
    },
    {
      key: "location",
      header: t("table.location"),
      hideBelow: "md",
      cell: (w) => <span className="text-muted">{w.location ?? t("table.dash")}</span>,
    },
    {
      key: "products",
      header: t("table.products"),
      align: "end",
      cell: (w) => <span className="tabular-nums">{w.productCount ?? 0}</span>,
    },
    {
      key: "stock",
      header: t("table.totalStock"),
      align: "end",
      hideBelow: "lg",
      cell: (w) => <span className="tabular-nums">{w.totalStock ?? 0}</span>,
    },
    {
      key: "value",
      header: t("table.value"),
      align: "end",
      cell: (w) => (
        <span className="font-medium tabular-nums" dir="ltr">
          {formatCurrency(w.stockValue ?? 0)}
        </span>
      ),
    },
  ];

  const rowActions = (w: Warehouse): RowActionItem[] => [
    {
      key: "view",
      label: t("action.view"),
      onSelect: () => router.push(`/warehouses/${w.id}`),
    },
    {
      key: "view-stock",
      label: t("warehouses.viewStock"),
      icon: <Eye className="h-4 w-4" />,
      onSelect: () => setViewId(w.id),
    },
    {
      key: "edit",
      label: t("action.edit"),
      icon: <Pencil className="h-4 w-4" />,
      hidden: !canWrite("warehouses"),
      onSelect: () => openEdit(w),
    },
    {
      key: "delete",
      label: t("action.delete"),
      icon: <Trash2 className="h-4 w-4" />,
      destructive: true,
      hidden: !canWrite("warehouses"),
      onSelect: () => setDeleteTarget(w),
    },
  ];

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title={t("warehouses.title")}
        description={t("warehouses.subtitle")}
        meta={!isLoading && data ? t("mgmt.records", { count: String(data.length) }) : undefined}
        actions={
          canWrite("warehouses") ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("warehouses.add")}
            </Button>
          ) : undefined
        }
      />

      <ManagementToolbar>
        <ManagementToolbarRow>
          <SearchField value={search} onChange={setSearch} placeholder={t("warehouses.search")} />
        </ManagementToolbarRow>
      </ManagementToolbar>

      {isError ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
          <p className="font-medium text-foreground">{t("mgmt.errorState")}</p>
          <Button type="button" variant="secondary" className="mt-4" onClick={() => refetch()}>
            {t("mgmt.retry")}
          </Button>
        </div>
      ) : (
        <ManagementDataTable
          loading={isLoading}
          data={filtered}
          emptyTitle={search ? t("mgmt.noResults") : t("warehouses.empty")}
          emptyAction={
            !search && canWrite("warehouses") ? (
              <Button type="button" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                {t("warehouses.add")}
              </Button>
            ) : undefined
          }
          columns={columns}
          actions={(w) => <RowActionMenu actions={rowActions(w)} />}
          getRowHref={(w) => `/warehouses/${w.id}`}
          getRowLabel={(w) => w.name}
          mobileCard={{
            title: (w) => w.name,
            subtitle: (w) => w.location ?? t("table.dash"),
            fields: [
              { label: t("table.products"), value: (w) => String(w.productCount ?? 0) },
              { label: t("table.totalStock"), value: (w) => String(w.totalStock ?? 0) },
              {
                label: t("table.value"),
                value: (w) => <span dir="ltr">{formatCurrency(w.stockValue ?? 0)}</span>,
              },
            ],
          }}
        />
      )}

      <FormDialog open={modalOpen} onOpenChange={setModalOpen}>
        <FormDialogContent size="sm">
          <FormDialogHeader title={editing ? t("warehouses.edit") : t("warehouses.new")} />
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}>
            <FormDialogBody className="space-y-4">
              <FormField>
                <FormLabel required>{t("table.name")}</FormLabel>
                <Input {...form.register("name")} />
                <FormError>{form.formState.errors.name?.message}</FormError>
              </FormField>
              <FormField>
                <FormLabel optional>{t("table.location")}</FormLabel>
                <Input {...form.register("location")} />
                <FormError>{form.formState.errors.location?.message}</FormError>
              </FormField>
              <FormField>
                <FormLabel optional>{t("table.description")}</FormLabel>
                <Input {...form.register("description")} />
                <FormError>{form.formState.errors.description?.message}</FormError>
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

      <FormDialog open={!!viewId} onOpenChange={(o) => !o && setViewId(null)}>
        <FormDialogContent size="lg">
          <FormDialogHeader
            title={`${warehouseDetail?.name ?? t("nav.warehouses")} — ${t("warehouses.stock.title")}`}
          />
          <FormDialogBody>
            {detailLoading ? (
              <p className="text-sm text-muted">{t("warehouses.stock.loading")}</p>
            ) : warehouseDetail ? (
              <>
                <p className="mb-4 text-sm text-muted">
                  {t("warehouses.stock.summary", {
                    units: warehouseDetail.totalStock ?? 0,
                    value: formatCurrency(warehouseDetail.stockValue ?? 0),
                  })}
                </p>
                {!warehouseDetail.products?.length ? (
                  <EmptyState title={t("warehouses.stock.empty")} />
                ) : (
                  <div className="max-h-80 overflow-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("table.product")}</TableHead>
                          <TableHead>{t("table.sku")}</TableHead>
                          <TableHead>{t("table.qty")}</TableHead>
                          <TableHead>{t("table.category")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {warehouseDetail.products.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>{p.name}</TableCell>
                            <TableCell className="text-muted">{p.sku}</TableCell>
                            <TableCell>{p.quantity}</TableCell>
                            <TableCell>{p.category}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            ) : null}
          </FormDialogBody>
          <FormDialogFooter>
            <Button type="button" variant="secondary" onClick={() => setViewId(null)}>
              {t("action.cancel")}
            </Button>
          </FormDialogFooter>
        </FormDialogContent>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("warehouses.delete.title")}
        description={
          deleteTarget ? t("warehouses.delete.description", { name: deleteTarget.name }) : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </ManagementPageShell>
  );
}
