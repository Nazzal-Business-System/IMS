"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { unitSchema } from "@ims/validation";
import type { UnitOfMeasure } from "@ims/shared-types";
import { z } from "zod";
import { Pencil } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { useRecordPermissions } from "@/lib/record-permissions";
import { formatDate } from "@/lib/utils";
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

type FormData = z.infer<typeof unitSchema>;

type UnitDetail = UnitOfMeasure & {
  products?: Array<{ id: string; name: string; sku: string; quantity: number; status: string }>;
};

export default function UnitDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const perms = useRecordPermissions("units");
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["units", id],
    queryFn: () => apiFetch<UnitDetail>(`/units/${id}`),
    enabled: Boolean(id) && perms.canView,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: { name: "", symbol: "" },
  });

  const saveMutation = useMutation({
    mutationFn: (values: FormData) =>
      apiFetch<UnitOfMeasure>(`/units/${id}`, { method: "PUT", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      queryClient.invalidateQueries({ queryKey: ["units", id] });
      toast({ title: t("toast.unitUpdated") });
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
    form.reset({ name: data.name, symbol: data.symbol });
    setEditOpen(true);
  };

  return (
    <PermissionGuard allowed={perms.canView} message={t("record.forbidden")}>
      {isLoading ? (
        <RecordLoadingState />
      ) : isError ? (
        (error instanceof ApiClientError && error.status === 404) ||
        (error instanceof Error && /not found/i.test(error.message)) ? (
          <RecordNotFoundState backHref="/units" />
        ) : (
          <RecordErrorState
            onRetry={() => refetch()}
            message={error instanceof Error ? error.message : undefined}
          />
        )
      ) : !data ? (
        <RecordNotFoundState backHref="/units" />
      ) : (
        <RecordDetailsShell>
          <DetailsHeader
            backHref="/units"
            title={data.name}
            subtitle={
              <span className="font-mono" dir="ltr">
                {data.symbol}
              </span>
            }
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

          <DetailsSection title={t("record.identity")}>
            <MetadataList
              items={[
                { label: t("table.name"), value: data.name },
                { label: t("units.symbol"), value: data.symbol, mono: true },
                {
                  label: t("table.products"),
                  value: <span className="tabular-nums">{data.productCount ?? 0}</span>,
                },
              ]}
            />
          </DetailsSection>

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
          <FormDialogHeader title={t("units.edit")} />
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
