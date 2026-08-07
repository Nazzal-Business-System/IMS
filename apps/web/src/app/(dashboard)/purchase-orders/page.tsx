"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { purchaseOrderSchema } from "@ims/validation";
import type { Product, PurchaseOrder, Supplier } from "@ims/shared-types";
import { z } from "zod";
import { Eye, PackageCheck, Plus, Trash2 } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  FormSection,
  FormGrid,
  FormField,
  FormLabel,
  FormError,
  StatusBadge,
  type ManagementColumn,
  type RowActionItem,
} from "@/components/management";

type FormData = z.infer<typeof purchaseOrderSchema>;

const PO_STATUS_KEYS: Record<string, string> = {
  draft: "status.draft",
  ordered: "status.ordered",
  received: "status.received",
  cancelled: "status.cancelled",
};

function shortPoId(id: string) {
  return id.slice(-8).toUpperCase();
}

export default function PurchaseOrdersPage() {
  const { canWrite } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => apiFetch<PurchaseOrder[]>("/purchase-orders"),
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiFetch<Supplier[]>("/suppliers"),
    enabled: modalOpen,
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<Product[]>("/products"),
    enabled: modalOpen,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      supplierId: "",
      status: "draft",
      items: [{ productId: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const watchedItems = useWatch({ control: form.control, name: "items" });

  const estimatedTotal = useMemo(() => {
    return (watchedItems ?? []).reduce((sum, item) => {
      const qty = Number(item?.quantity) || 0;
      const price = Number(item?.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  }, [watchedItems]);

  const createMutation = useMutation({
    mutationFn: (values: FormData) =>
      apiFetch<PurchaseOrder>("/purchase-orders", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: t("toast.purchaseOrderCreated") });
      setModalOpen(false);
      form.reset({
        supplierId: "",
        status: "draft",
        items: [{ productId: "", quantity: 1, unitPrice: 0 }],
      });
    },
    onError: (err: Error) => {
      const msg = err instanceof ApiClientError ? err.message : err.message;
      toast({ title: t("toast.error"), description: msg, variant: "destructive" });
    },
  });

  const receiveMutation = useMutation({
    mutationFn: ({
      id,
      items,
    }: {
      id: string;
      items: Array<{ itemId: string; receivedQuantity: number }>;
    }) =>
      apiFetch<PurchaseOrder>(`/purchase-orders/${id}/receive`, {
        method: "POST",
        body: JSON.stringify({ items }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: t("toast.purchaseOrderReceived"),
        description: t("toast.purchaseOrderReceivedDescription"),
      });
      setReceiving(null);
    },
    onError: (err: Error) => {
      const msg = err instanceof ApiClientError ? err.message : err.message;
      toast({ title: t("toast.error"), description: msg, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/purchase-orders/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: t("toast.purchaseOrderDeleted") });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      const msg = err instanceof ApiClientError ? err.message : err.message;
      toast({
        title: t("toast.cannotDeletePurchaseOrder"),
        description: msg,
        variant: "destructive",
      });
      setDeleteTarget(null);
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((po) => {
      const supplier = po.supplier?.name?.toLowerCase() ?? "";
      const status = po.status.toLowerCase();
      const id = po.id.toLowerCase();
      return supplier.includes(q) || status.includes(q) || id.includes(q) || shortPoId(po.id).toLowerCase().includes(q);
    });
  }, [data, search]);

  const openCreate = () => {
    form.reset({
      supplierId: "",
      status: "draft",
      items: [{ productId: "", quantity: 1, unitPrice: 0 }],
    });
    setModalOpen(true);
  };

  const startReceive = (po: PurchaseOrder) => {
    setReceiving(po);
    const qtys: Record<string, number> = {};
    po.items?.forEach((item) => {
      qtys[item.id] = item.quantity - item.receivedQuantity;
    });
    setReceiveQtys(qtys);
  };

  const columns: ManagementColumn<PurchaseOrder>[] = [
    {
      key: "po",
      header: t("purchaseOrders.poId"),
      cell: (po) => (
        <span className="font-mono text-xs tracking-wide text-foreground" dir="ltr">
          {shortPoId(po.id)}
        </span>
      ),
      className: "w-[7rem]",
    },
    {
      key: "supplier",
      header: t("table.supplier"),
      cell: (po) => <span className="font-medium">{po.supplier?.name ?? t("table.dash")}</span>,
    },
    {
      key: "date",
      header: t("table.date"),
      align: "end",
      hideBelow: "md",
      cell: (po) => <span className="text-muted tabular-nums">{formatDate(po.createdAt)}</span>,
    },
    {
      key: "status",
      header: t("table.status"),
      className: "w-[8.5rem]",
      cell: (po) => (
        <StatusBadge status={po.status} label={t(PO_STATUS_KEYS[po.status] ?? po.status)} />
      ),
    },
    {
      key: "items",
      header: t("table.items"),
      align: "end",
      hideBelow: "lg",
      cell: (po) => <span className="tabular-nums">{po.items?.length ?? 0}</span>,
    },
    {
      key: "total",
      header: t("table.total"),
      align: "end",
      cell: (po) => (
        <span className="font-medium tabular-nums" dir="ltr">
          {formatCurrency(po.totalAmount)}
        </span>
      ),
    },
  ];

  const rowActions = (po: PurchaseOrder): RowActionItem[] => [
    {
      key: "view",
      label: t("action.view"),
      icon: <Eye className="h-4 w-4" />,
      onSelect: () => router.push(`/purchase-orders/${po.id}`),
    },
    {
      key: "receive",
      label: t("action.receive"),
      icon: <PackageCheck className="h-4 w-4" />,
      hidden: !(canWrite("purchase_orders") && po.status === "ordered"),
      onSelect: () => startReceive(po),
    },
    {
      key: "delete",
      label: t("action.delete"),
      icon: <Trash2 className="h-4 w-4" />,
      destructive: true,
      hidden: !(canWrite("purchase_orders") && po.status !== "received"),
      disabled: po.status === "received",
      disabledReason: t("toast.cannotDeletePurchaseOrder"),
      onSelect: () => setDeleteTarget(po),
    },
  ];

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title={t("purchaseOrders.title")}
        description={t("purchaseOrders.subtitle")}
        meta={
          !isLoading && data
            ? t("purchaseOrders.recordCount", { count: String(data.length) })
            : undefined
        }
        actions={
          canWrite("purchase_orders") ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("purchaseOrders.new")}
            </Button>
          ) : undefined
        }
      />

      <ManagementToolbar>
        <ManagementToolbarRow>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder={t("purchaseOrders.search")}
          />
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
          emptyTitle={search ? t("purchaseOrders.noResults") : t("purchaseOrders.empty")}
          emptyAction={
            !search && canWrite("purchase_orders") ? (
              <Button type="button" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                {t("purchaseOrders.new")}
              </Button>
            ) : undefined
          }
          columns={columns}
          actions={(po) => <RowActionMenu actions={rowActions(po)} />}
          getRowHref={(po) => `/purchase-orders/${po.id}`}
          getRowLabel={(po) =>
            po.supplier?.name
              ? `${shortPoId(po.id)} · ${po.supplier.name}`
              : shortPoId(po.id)
          }
          mobileCard={{
            title: (po) => po.supplier?.name ?? t("table.dash"),
            subtitle: (po) => (
              <span className="font-mono text-xs" dir="ltr">
                {t("purchaseOrders.poId")} {shortPoId(po.id)}
              </span>
            ),
            badges: (po) => (
              <StatusBadge status={po.status} label={t(PO_STATUS_KEYS[po.status] ?? po.status)} />
            ),
            fields: [
              {
                label: t("table.date"),
                value: (po) => formatDate(po.createdAt),
              },
              {
                label: t("table.items"),
                value: (po) => String(po.items?.length ?? 0),
              },
              {
                label: t("table.total"),
                value: (po) => (
                  <span dir="ltr">{formatCurrency(po.totalAmount)}</span>
                ),
              },
            ],
          }}
        />
      )}

      <FormDialog open={modalOpen} onOpenChange={setModalOpen}>
        <FormDialogContent size="xl" aria-describedby={undefined}>
          <FormDialogHeader
            title={t("purchaseOrders.create")}
            description={t("purchaseOrders.createDescription")}
          />
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
          >
            <FormDialogBody className="space-y-6">
              <FormSection title={t("purchaseOrders.orderInfo")}>
                <FormGrid cols={2}>
                  <FormField>
                    <FormLabel required>{t("table.supplier")}</FormLabel>
                    <Select {...form.register("supplierId")}>
                      <option value="">{t("table.select")}</option>
                      {suppliers?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                    <FormError>{form.formState.errors.supplierId?.message}</FormError>
                  </FormField>
                  <FormField>
                    <FormLabel required>{t("table.status")}</FormLabel>
                    <Select {...form.register("status")}>
                      <option value="draft">{t("status.draft")}</option>
                      <option value="ordered">{t("status.ordered")}</option>
                    </Select>
                  </FormField>
                </FormGrid>
              </FormSection>

              <FormSection title={t("purchaseOrders.lineItems")}>
                <div className="hidden grid-cols-[minmax(0,1.4fr)_5.5rem_7rem_6.5rem_2.5rem] gap-2 px-1 text-xs font-medium text-muted sm:grid">
                  <span>{t("table.product")}</span>
                  <span>{t("table.quantity")}</span>
                  <span>{t("table.unitPrice")}</span>
                  <span className="text-end">{t("purchaseOrders.lineTotal")}</span>
                  <span className="sr-only">{t("action.removeLine")}</span>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => {
                    const qty = Number(watchedItems?.[index]?.quantity) || 0;
                    const price = Number(watchedItems?.[index]?.unitPrice) || 0;
                    const lineTotal = qty * price;
                    return (
                      <div
                        key={field.id}
                        className="grid gap-2 rounded-lg border border-border/80 bg-[var(--muted-bg)]/25 p-3 sm:grid-cols-[minmax(0,1.4fr)_5.5rem_7rem_6.5rem_2.5rem] sm:items-end sm:border-0 sm:bg-transparent sm:p-0"
                      >
                        <FormField>
                          <FormLabel className="sm:sr-only" required>
                            {t("table.product")}
                          </FormLabel>
                          <Select {...form.register(`items.${index}.productId`)}>
                            <option value="">{t("purchaseOrders.productPlaceholder")}</option>
                            {products?.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </Select>
                        </FormField>
                        <FormField>
                          <FormLabel className="sm:sr-only" required>
                            {t("table.quantity")}
                          </FormLabel>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            inputMode="numeric"
                            aria-label={t("table.quantity")}
                            {...form.register(`items.${index}.quantity`)}
                          />
                        </FormField>
                        <FormField>
                          <FormLabel className="sm:sr-only" required>
                            {t("table.unitPrice")}
                          </FormLabel>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            aria-label={t("table.unitPrice")}
                            {...form.register(`items.${index}.unitPrice`)}
                          />
                        </FormField>
                        <div className="flex h-10 items-center justify-between gap-2 sm:justify-end">
                          <span className="text-xs text-muted sm:hidden">
                            {t("purchaseOrders.lineTotal")}
                          </span>
                          <span className="tabular-nums text-sm font-medium" dir="ltr">
                            {formatCurrency(lineTotal)}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 justify-self-end"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                          aria-label={t("action.removeLine")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <FormError>
                  {typeof form.formState.errors.items?.message === "string"
                    ? form.formState.errors.items.message
                    : form.formState.errors.items
                      ? t("purchaseOrders.checkLineItems")
                      : null}
                </FormError>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })}
                  >
                    <Plus className="h-4 w-4" />
                    {t("action.addLine")}
                  </Button>
                  <p className="text-sm text-muted">
                    {t("purchaseOrders.estimatedTotal")}:{" "}
                    <span className="font-semibold text-foreground tabular-nums" dir="ltr">
                      {formatCurrency(estimatedTotal)}
                    </span>
                  </p>
                </div>
              </FormSection>
            </FormDialogBody>

            <FormDialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalOpen(false)}
                disabled={createMutation.isPending}
              >
                {t("action.cancel")}
              </Button>
              <AsyncSubmitButton
                loading={createMutation.isPending}
                loadingLabel={t("purchaseOrders.creating")}
              >
                {t("purchaseOrders.createPO")}
              </AsyncSubmitButton>
            </FormDialogFooter>
          </form>
        </FormDialogContent>
      </FormDialog>

      <FormDialog
        open={!!receiving}
        onOpenChange={(open) => {
          if (!open) setReceiving(null);
        }}
      >
        <FormDialogContent size="md">
          <FormDialogHeader
            title={t("purchaseOrders.receive.title", {
              supplier: receiving?.supplier?.name ?? "",
            })}
            description={t("purchaseOrders.receive.description")}
          />
          <FormDialogBody className="space-y-4">
            {receiving?.items?.map((item) => (
              <div
                key={item.id}
                className="grid gap-2 rounded-lg border border-border/70 p-3 sm:grid-cols-[1fr_auto_7rem] sm:items-end"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.product?.name ?? t("table.dash")}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {t("purchaseOrders.receive.ordered", { qty: item.quantity })} ·{" "}
                    {t("purchaseOrders.receive.remaining", {
                      qty: item.quantity - item.receivedQuantity,
                    })}
                  </p>
                </div>
                <FormField className="sm:col-span-2 sm:justify-self-end">
                  <FormLabel htmlFor={`recv-${item.id}`} required>
                    {t("purchaseOrders.receive.qtyLabel")}
                  </FormLabel>
                  <Input
                    id={`recv-${item.id}`}
                    type="number"
                    min={0}
                    className="w-full sm:w-28"
                    value={receiveQtys[item.id] ?? 0}
                    onChange={(e) =>
                      setReceiveQtys({
                        ...receiveQtys,
                        [item.id]: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </FormField>
              </div>
            ))}
          </FormDialogBody>
          <FormDialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setReceiving(null)}
              disabled={receiveMutation.isPending}
            >
              {t("action.cancel")}
            </Button>
            <Button
              type="button"
              disabled={receiveMutation.isPending}
              onClick={() =>
                receiving &&
                receiveMutation.mutate({
                  id: receiving.id,
                  items: Object.entries(receiveQtys).map(([itemId, receivedQuantity]) => ({
                    itemId,
                    receivedQuantity,
                  })),
                })
              }
            >
              <PackageCheck className="h-4 w-4" />
              {receiveMutation.isPending
                ? t("purchaseOrders.receive.receiving")
                : t("purchaseOrders.receive.confirm")}
            </Button>
          </FormDialogFooter>
        </FormDialogContent>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("purchaseOrders.delete.title")}
        description={
          deleteTarget
            ? t("purchaseOrders.delete.description", {
                supplier: deleteTarget.supplier?.name ?? t("table.dash"),
              })
            : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </ManagementPageShell>
  );
}
