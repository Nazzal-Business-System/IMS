"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { purchaseOrderSchema } from "@ims/validation";
import type { Product, PurchaseOrder, Supplier } from "@ims/shared-types";
import { z } from "zod";
import { Ban, Loader2, PackageCheck, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { useRecordPermissions } from "@/lib/record-permissions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

const PO_STATUS_KEYS: Record<string, string> = {
  draft: "status.draft",
  ordered: "status.ordered",
  received: "status.received",
  cancelled: "status.cancelled",
};

function shortPoId(id: string) {
  return id.slice(-8).toUpperCase();
}

type FormData = z.infer<typeof purchaseOrderSchema>;

export default function PurchaseOrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const perms = useRecordPermissions("purchase_orders");

  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["purchase-orders", id],
    queryFn: () => apiFetch<PurchaseOrder>(`/purchase-orders/${id}`),
    enabled: Boolean(id) && perms.canView,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiFetch<Supplier[]>("/suppliers"),
    enabled: editOpen,
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<Product[]>("/products"),
    enabled: editOpen,
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

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    queryClient.invalidateQueries({ queryKey: ["purchase-orders", id] });
  };

  const saveMutation = useMutation({
    mutationFn: (values: FormData) =>
      apiFetch<PurchaseOrder>(`/purchase-orders/${id}`, {
        method: "PUT",
        body: JSON.stringify({ ...values, status: "draft" }),
      }),
    onSuccess: () => {
      invalidateAll();
      toast({ title: t("toast.purchaseOrderUpdated") });
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

  const submitMutation = useMutation({
    mutationFn: () => apiFetch<PurchaseOrder>(`/purchase-orders/${id}/submit`, { method: "POST" }),
    onSuccess: () => {
      invalidateAll();
      toast({ title: t("purchaseOrders.submit") });
    },
    onError: (err: Error) => {
      toast({
        title: t("toast.error"),
        description: err instanceof ApiClientError ? err.message : err.message,
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiFetch<PurchaseOrder>(`/purchase-orders/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      invalidateAll();
      toast({ title: t("purchaseOrders.cancelAction") });
      setCancelOpen(false);
    },
    onError: (err: Error) => {
      toast({
        title: t("toast.error"),
        description: err instanceof ApiClientError ? err.message : err.message,
        variant: "destructive",
      });
      setCancelOpen(false);
    },
  });

  const receiveMutation = useMutation({
    mutationFn: (items: Array<{ itemId: string; receivedQuantity: number }>) =>
      apiFetch<PurchaseOrder>(`/purchase-orders/${id}/receive`, {
        method: "POST",
        body: JSON.stringify({ items }),
      }),
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: t("toast.purchaseOrderReceived"),
        description: t("toast.purchaseOrderReceivedDescription"),
      });
      setReceiveOpen(false);
    },
    onError: (err: Error) => {
      toast({
        title: t("toast.error"),
        description: err instanceof ApiClientError ? err.message : err.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/purchase-orders/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: t("toast.purchaseOrderDeleted") });
      router.push("/purchase-orders");
    },
    onError: (err: Error) => {
      toast({
        title: t("toast.cannotDeletePurchaseOrder"),
        description: err instanceof ApiClientError ? err.message : err.message,
        variant: "destructive",
      });
      setDeleteOpen(false);
    },
  });

  const openEdit = () => {
    if (!data) return;
    form.reset({
      supplierId: data.supplierId,
      status: "draft",
      items:
        data.items && data.items.length > 0
          ? data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            }))
          : [{ productId: "", quantity: 1, unitPrice: 0 }],
    });
    setEditOpen(true);
  };

  const startReceive = () => {
    const qtys: Record<string, number> = {};
    data?.items?.forEach((item) => {
      qtys[item.id] = item.quantity - item.receivedQuantity;
    });
    setReceiveQtys(qtys);
    setReceiveOpen(true);
  };

  return (
    <PermissionGuard allowed={perms.canView} message={t("record.forbidden")}>
      {isLoading ? (
        <RecordLoadingState />
      ) : isError ? (
        (error instanceof ApiClientError && error.status === 404) ||
        (error instanceof Error && /not found/i.test(error.message)) ? (
          <RecordNotFoundState backHref="/purchase-orders" />
        ) : (
          <RecordErrorState
            onRetry={() => refetch()}
            message={error instanceof Error ? error.message : undefined}
          />
        )
      ) : !data ? (
        <RecordNotFoundState backHref="/purchase-orders" />
      ) : (
        <RecordDetailsShell>
          <DetailsHeader
            backHref="/purchase-orders"
            title={`${t("purchaseOrders.poId")} ${shortPoId(data.id)}`}
            subtitle={data.supplier?.name}
            status={data.status}
            statusLabel={t(PO_STATUS_KEYS[data.status] ?? data.status)}
            meta={
              <>
                {t("purchaseOrders.createdBy")}: {data.createdBy?.name ?? t("table.dash")} ·{" "}
                {t("record.createdAt")}: {formatDate(data.createdAt)} · {t("record.updatedAt")}:{" "}
                {formatDate(data.updatedAt)}
              </>
            }
            actions={
              perms.canWrite ? (
                <>
                  {data.status === "draft" ? (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={openEdit}
                      >
                        <Pencil className="h-4 w-4" />
                        {t("purchaseOrders.editDraft")}
                      </Button>
                      <Button
                        type="button"
                        disabled={submitMutation.isPending}
                        onClick={() => submitMutation.mutate()}
                      >
                        {submitMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        {submitMutation.isPending
                          ? t("purchaseOrders.submitting")
                          : t("purchaseOrders.submit")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setCancelOpen(true)}
                      >
                        <Ban className="h-4 w-4" />
                        {t("purchaseOrders.cancelAction")}
                      </Button>
                    </>
                  ) : null}
                  {data.status === "ordered" ? (
                    <>
                      <Button type="button" onClick={startReceive}>
                        <PackageCheck className="h-4 w-4" />
                        {t("action.receive")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setCancelOpen(true)}
                      >
                        <Ban className="h-4 w-4" />
                        {t("purchaseOrders.cancelAction")}
                      </Button>
                    </>
                  ) : null}
                  {data.status !== "received" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("action.delete")}
                    </Button>
                  ) : null}
                </>
              ) : undefined
            }
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <DetailsSection title={t("record.identity")}>
              <MetadataList
                items={[
                  {
                    label: t("table.supplier"),
                    value: data.supplier ? (
                      <Link
                        href={`/suppliers/${data.supplierId}`}
                        className="text-accent hover:underline"
                      >
                        {data.supplier.name}
                      </Link>
                    ) : (
                      t("table.dash")
                    ),
                  },
                  {
                    label: t("table.status"),
                    value: (
                      <StatusBadge status={data.status} label={t(PO_STATUS_KEYS[data.status] ?? data.status)} />
                    ),
                  },
                  {
                    label: t("purchaseOrders.createdBy"),
                    value: data.createdBy?.name ?? t("table.dash"),
                  },
                ]}
              />
            </DetailsSection>

            <DetailsSection title={t("record.metadata")}>
              <MetadataList
                items={[
                  {
                    label: t("table.items"),
                    value: <span className="tabular-nums">{data.items?.length ?? 0}</span>,
                  },
                  {
                    label: t("table.total"),
                    value: (
                      <span className="font-medium tabular-nums" dir="ltr">
                        {formatCurrency(data.totalAmount)}
                      </span>
                    ),
                  },
                  {
                    label: t("record.createdAt"),
                    value: formatDate(data.createdAt),
                  },
                  {
                    label: t("record.updatedAt"),
                    value: formatDate(data.updatedAt),
                  },
                ]}
              />
            </DetailsSection>
          </div>

          <DetailsSection title={t("record.lineItems")}>
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.product")}</TableHead>
                    <TableHead className="text-end">{t("purchaseOrders.orderedQty")}</TableHead>
                    <TableHead className="text-end">{t("purchaseOrders.receivedQty")}</TableHead>
                    <TableHead className="text-end">{t("purchaseOrders.outstanding")}</TableHead>
                    <TableHead className="text-end">{t("table.unitPrice")}</TableHead>
                    <TableHead className="text-end">{t("purchaseOrders.lineTotal")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.items ?? []).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product?.name ?? item.productId}</TableCell>
                      <TableCell className="text-end tabular-nums">{item.quantity}</TableCell>
                      <TableCell className="text-end tabular-nums">{item.receivedQuantity}</TableCell>
                      <TableCell className="text-end tabular-nums">
                        {item.quantity - item.receivedQuantity}
                      </TableCell>
                      <TableCell className="text-end tabular-nums" dir="ltr">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-end font-medium tabular-nums" dir="ltr">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DetailsSection>
        </RecordDetailsShell>
      )}

      <FormDialog open={editOpen} onOpenChange={setEditOpen}>
        <FormDialogContent size="xl" aria-describedby={undefined}>
          <FormDialogHeader
            title={t("purchaseOrders.editDraft")}
            description={t("purchaseOrders.createDescription")}
          />
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
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
                onClick={() => setEditOpen(false)}
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

      <FormDialog
        open={receiveOpen}
        onOpenChange={(open) => {
          if (!open) setReceiveOpen(false);
        }}
      >
        <FormDialogContent size="md">
          <FormDialogHeader
            title={t("purchaseOrders.receive.title", { supplier: data?.supplier?.name ?? "" })}
            description={t("purchaseOrders.receive.description")}
          />
          <FormDialogBody className="space-y-4">
            {data?.items?.map((item) => (
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
                <div className="sm:col-span-2 sm:justify-self-end">
                  <label htmlFor={`recv-${item.id}`} className="sr-only">
                    {t("purchaseOrders.receive.qtyLabel")}
                  </label>
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
                </div>
              </div>
            ))}
          </FormDialogBody>
          <FormDialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setReceiveOpen(false)}
              disabled={receiveMutation.isPending}
            >
              {t("action.cancel")}
            </Button>
            <Button
              type="button"
              disabled={receiveMutation.isPending}
              onClick={() =>
                receiveMutation.mutate(
                  Object.entries(receiveQtys).map(([itemId, receivedQuantity]) => ({
                    itemId,
                    receivedQuantity,
                  }))
                )
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
        open={cancelOpen}
        onOpenChange={(open) => !open && setCancelOpen(false)}
        title={t("purchaseOrders.cancelConfirmTitle")}
        description={t("purchaseOrders.cancelConfirmDescription")}
        confirmLabel={t("purchaseOrders.cancelAction")}
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => !open && setDeleteOpen(false)}
        title={t("purchaseOrders.delete.title")}
        description={
          data ? t("purchaseOrders.delete.description", { supplier: data.supplier?.name ?? t("table.dash") }) : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </PermissionGuard>
  );
}
