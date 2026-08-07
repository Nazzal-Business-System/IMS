"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { warehouseSchema } from "@ims/validation";
import type { Warehouse } from "@ims/shared-types";
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
  RelatedRecordLink,
  RelatedRecords,
  RecordLoadingState,
  RecordNotFoundState,
  RecordErrorState,
} from "@/components/records";

type FormData = z.infer<typeof warehouseSchema>;

type WarehouseDetail = Warehouse & {
  products?: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
    costPrice: number;
    category: string;
    supplier: string;
  }>;
};

export default function WarehouseDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const perms = useRecordPermissions("warehouses");
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["warehouses", id],
    queryFn: () => apiFetch<WarehouseDetail>(`/warehouses/${id}`),
    enabled: Boolean(id) && perms.canView,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: { name: "", location: "", description: "" },
  });

  const saveMutation = useMutation({
    mutationFn: (values: FormData) =>
      apiFetch<Warehouse>(`/warehouses/${id}`, { method: "PUT", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["warehouses", id] });
      toast({ title: t("toast.warehouseUpdated") });
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
      location: data.location ?? "",
      description: data.description ?? "",
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
          <RecordNotFoundState backHref="/warehouses" />
        ) : (
          <RecordErrorState
            onRetry={() => refetch()}
            message={error instanceof Error ? error.message : undefined}
          />
        )
      ) : !data ? (
        <RecordNotFoundState backHref="/warehouses" />
      ) : (
        <RecordDetailsShell>
          <DetailsHeader
            backHref="/warehouses"
            title={data.name}
            subtitle={data.location ?? undefined}
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
                  { label: t("table.location"), value: data.location ?? t("table.dash") },
                  { label: t("table.description"), value: data.description ?? t("table.dash") },
                ]}
              />
            </DetailsSection>

            <DetailsSection title={t("warehouses.stock.title")}>
              <MetadataList
                items={[
                  {
                    label: t("table.products"),
                    value: <span className="tabular-nums">{data.productCount ?? 0}</span>,
                  },
                  {
                    label: t("table.totalStock"),
                    value: <span className="tabular-nums">{data.totalStock ?? 0}</span>,
                  },
                  {
                    label: t("table.value"),
                    value: (
                      <span className="tabular-nums" dir="ltr">
                        {formatCurrency(data.stockValue ?? 0)}
                      </span>
                    ),
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
        </RecordDetailsShell>
      )}

      <FormDialog open={editOpen} onOpenChange={setEditOpen}>
        <FormDialogContent size="sm">
          <FormDialogHeader title={t("warehouses.edit")} />
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
