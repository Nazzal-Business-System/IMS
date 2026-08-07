"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supplierSchema } from "@ims/validation";
import type { Supplier, PurchaseOrderStatus } from "@ims/shared-types";
import { z } from "zod";
import { Pencil } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { useRecordPermissions } from "@/lib/record-permissions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormDialog,
  FormDialogContent,
  FormDialogHeader,
  FormDialogBody,
  FormDialogFooter,
  AsyncSubmitButton,
  FormGrid,
  FormField,
  FormLabel,
  FormError,
  StatusBadge,
} from "@/components/management";
import {
  PermissionGuard,
  RecordDetailsShell,
  DetailsHeader,
  DetailsSection,
  MetadataList,
  RelatedRecordLink,
  RelatedRecords,
  RecordLoadingState,
  RecordNotFoundState,
  RecordErrorState,
} from "@/components/records";

type FormData = z.infer<typeof supplierSchema>;

const PO_STATUS_KEYS: Record<string, string> = {
  draft: "status.draft",
  ordered: "status.ordered",
  received: "status.received",
  cancelled: "status.cancelled",
};

function shortPoId(id: string) {
  return id.slice(-8).toUpperCase();
}

type SupplierDetail = Supplier & {
  purchaseOrderCount?: number;
  products?: Array<{ id: string; name: string; sku: string; quantity: number; status: string }>;
  purchaseOrders?: Array<{
    id: string;
    status: PurchaseOrderStatus;
    totalAmount: number;
    createdAt: string;
  }>;
};

export default function SupplierDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const perms = useRecordPermissions("suppliers");
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["suppliers", id],
    queryFn: () => apiFetch<SupplierDetail>(`/suppliers/${id}`),
    enabled: Boolean(id) && perms.canView,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: "", email: "", phone: "", address: "", contactPerson: "" },
  });

  const saveMutation = useMutation({
    mutationFn: (values: FormData) =>
      apiFetch<Supplier>(`/suppliers/${id}`, { method: "PUT", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers", id] });
      toast({ title: t("toast.supplierUpdated") });
      setEditOpen(false);
    },
    onError: (err: Error) => {
      const msg = err instanceof ApiClientError ? err.message : err.message;
      toast({ title: t("toast.error"), description: msg, variant: "destructive" });
    },
  });

  const openEdit = () => {
    if (!data) return;
    form.reset({
      name: data.name,
      email: data.email ?? "",
      phone: data.phone ?? "",
      address: data.address ?? "",
      contactPerson: data.contactPerson ?? "",
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
          <RecordNotFoundState backHref="/suppliers" />
        ) : (
          <RecordErrorState
            onRetry={() => refetch()}
            message={error instanceof Error ? error.message : undefined}
          />
        )
      ) : !data ? (
        <RecordNotFoundState backHref="/suppliers" />
      ) : (
        <RecordDetailsShell>
          <DetailsHeader
            backHref="/suppliers"
            title={data.name}
            subtitle={data.contactPerson ?? undefined}
            meta={
              <>
                {t("record.createdAt")}: {formatDate(data.createdAt)} · {t("record.updatedAt")}:{" "}
                {formatDate(data.updatedAt)}
              </>
            }
            actions={
              perms.canEdit ? (
                <Button type="button" variant="secondary" onClick={openEdit}>
                  <Pencil className="h-4 w-4" />
                  {t("action.edit")}
                </Button>
              ) : undefined
            }
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <DetailsSection title={t("record.identity")}>
              <MetadataList
                items={[
                  { label: t("suppliers.contactPerson"), value: data.contactPerson ?? t("table.dash") },
                  { label: t("table.email"), value: data.email ?? t("table.dash"), mono: true },
                  { label: t("table.phone"), value: data.phone ?? t("table.dash") },
                  { label: t("table.address"), value: data.address ?? t("table.dash") },
                ]}
              />
            </DetailsSection>

            <DetailsSection title={t("record.metadata")}>
              <MetadataList
                items={[
                  {
                    label: t("table.products"),
                    value: <span className="tabular-nums">{data.productCount ?? 0}</span>,
                  },
                  {
                    label: t("purchaseOrders.title"),
                    value: <span className="tabular-nums">{data.purchaseOrderCount ?? 0}</span>,
                  },
                ]}
              />
            </DetailsSection>
          </div>

          <DetailsSection title={t("record.related")}>
            <RelatedRecords>
              {(data.products ?? []).map((p) => (
                <RelatedRecordLink
                  key={p.id}
                  href={`/products/${p.id}`}
                  title={p.name}
                  meta={
                    <span className="font-mono" dir="ltr">
                      {p.sku} · {p.quantity}
                    </span>
                  }
                />
              ))}
            </RelatedRecords>
          </DetailsSection>

          <DetailsSection title={t("purchaseOrders.title")}>
            <RelatedRecords>
              {(data.purchaseOrders ?? []).map((po) => (
                <RelatedRecordLink
                  key={po.id}
                  href={`/purchase-orders/${po.id}`}
                  title={
                    <span className="font-mono" dir="ltr">
                      {t("purchaseOrders.poId")} {shortPoId(po.id)}
                    </span>
                  }
                  meta={
                    <span className="flex items-center gap-2">
                      <StatusBadge
                        status={po.status}
                        label={t(PO_STATUS_KEYS[po.status] ?? po.status)}
                      />
                      <span dir="ltr">{formatCurrency(po.totalAmount)}</span>
                    </span>
                  }
                />
              ))}
            </RelatedRecords>
          </DetailsSection>
        </RecordDetailsShell>
      )}

      <FormDialog open={editOpen} onOpenChange={setEditOpen}>
        <FormDialogContent size="lg">
          <FormDialogHeader title={t("suppliers.edit")} />
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}>
            <FormDialogBody>
              <FormGrid cols={2}>
                <FormField>
                  <FormLabel required>{t("table.name")}</FormLabel>
                  <Input {...form.register("name")} />
                  <FormError>{form.formState.errors.name?.message}</FormError>
                </FormField>
                <FormField>
                  <FormLabel optional>{t("suppliers.contactPerson")}</FormLabel>
                  <Input {...form.register("contactPerson")} />
                  <FormError>{form.formState.errors.contactPerson?.message}</FormError>
                </FormField>
                <FormField>
                  <FormLabel optional>{t("table.email")}</FormLabel>
                  <Input type="email" {...form.register("email")} />
                  <FormError>{form.formState.errors.email?.message}</FormError>
                </FormField>
                <FormField>
                  <FormLabel optional>{t("table.phone")}</FormLabel>
                  <Input {...form.register("phone")} />
                  <FormError>{form.formState.errors.phone?.message}</FormError>
                </FormField>
                <FormField className="sm:col-span-2">
                  <FormLabel optional>{t("table.address")}</FormLabel>
                  <Input {...form.register("address")} />
                  <FormError>{form.formState.errors.address?.message}</FormError>
                </FormField>
              </FormGrid>
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
    </PermissionGuard>
  );
}
