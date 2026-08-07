"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reorderRuleSchema } from "@ims/validation";
import type { ReorderRule } from "@ims/shared-types";
import { z } from "zod";
import { Pencil } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { useRecordPermissions } from "@/lib/record-permissions";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
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
  FormHint,
  StatusBadge,
} from "@/components/management";
import {
  PermissionGuard,
  RecordDetailsShell,
  DetailsHeader,
  DetailsSection,
  MetadataList,
  RelatedRecords,
  RelatedRecordLink,
  RecordLoadingState,
  RecordNotFoundState,
  RecordErrorState,
} from "@/components/records";

type FormData = z.infer<typeof reorderRuleSchema>;

export default function ReorderRuleDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const perms = useRecordPermissions("reorder_rules");
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["reorder-rules", id],
    queryFn: () => apiFetch<ReorderRule>(`/reorder-rules/${id}`),
    enabled: Boolean(id) && perms.canView,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(reorderRuleSchema),
    defaultValues: {
      productId: "",
      minQuantity: 0,
      maxQuantity: null,
      autoPo: false,
      isActive: true,
    },
  });

  const autoPo = form.watch("autoPo");
  const isActive = form.watch("isActive");

  const saveMutation = useMutation({
    mutationFn: (values: FormData) =>
      apiFetch<ReorderRule>(`/reorder-rules/${id}`, { method: "PUT", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reorder-rules"] });
      queryClient.invalidateQueries({ queryKey: ["reorder-rules", id] });
      toast({ title: t("toast.ruleUpdated") });
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
      productId: data.productId,
      minQuantity: data.minQuantity,
      maxQuantity: data.maxQuantity,
      autoPo: data.autoPo,
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
          <RecordNotFoundState backHref="/reorder-rules" />
        ) : (
          <RecordErrorState
            onRetry={() => refetch()}
            message={error instanceof Error ? error.message : undefined}
          />
        )
      ) : !data ? (
        <RecordNotFoundState backHref="/reorder-rules" />
      ) : (
        <RecordDetailsShell>
          <DetailsHeader
            backHref="/reorder-rules"
            title={data.product?.name ?? data.productId}
            subtitle={
              data.product?.sku ? (
                <span className="font-mono text-xs" dir="ltr">
                  {data.product.sku}
                </span>
              ) : undefined
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
                  { label: t("table.minQty"), value: <span className="tabular-nums">{data.minQuantity}</span> },
                  {
                    label: t("table.maxQty"),
                    value: (
                      <span className="tabular-nums">{data.maxQuantity ?? t("table.dash")}</span>
                    ),
                  },
                  {
                    label: t("table.autoPo"),
                    value: (
                      <Badge variant={data.autoPo ? "success" : "secondary"}>
                        {data.autoPo ? t("status.yes") : t("status.no")}
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
                ]}
              />
            </DetailsSection>
          </div>

          <DetailsSection title={t("table.product")}>
            {data.product ? (
              <RelatedRecords>
                <RelatedRecordLink
                  href={`/products/${data.productId}`}
                  title={data.product.name}
                  meta={
                    <span className="font-mono" dir="ltr">
                      {data.product.sku} · {data.product.quantity}
                    </span>
                  }
                />
              </RelatedRecords>
            ) : (
              <p className="text-sm text-muted">{t("table.dash")}</p>
            )}
          </DetailsSection>
        </RecordDetailsShell>
      )}

      <FormDialog open={editOpen} onOpenChange={setEditOpen}>
        <FormDialogContent size="md" aria-describedby={undefined}>
          <FormDialogHeader
            title={t("reorderRules.edit")}
            description={t("reorderRules.editDescription")}
          />
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
          >
            <FormDialogBody className="space-y-6">
              <FormSection title={t("reorderRules.section.assignment")}>
                <FormGrid cols={2}>
                  <FormField>
                    <FormLabel required>{t("reorderRules.minQuantity")}</FormLabel>
                    <Input type="number" min={0} {...form.register("minQuantity", { valueAsNumber: true })} />
                    <FormError>{form.formState.errors.minQuantity?.message}</FormError>
                  </FormField>
                  <FormField>
                    <FormLabel optional>{t("reorderRules.maxQuantity")}</FormLabel>
                    <Input type="number" min={0} {...form.register("maxQuantity", { valueAsNumber: true })} />
                    <FormError>{form.formState.errors.maxQuantity?.message}</FormError>
                  </FormField>
                </FormGrid>
              </FormSection>

              <FormSection title={t("reorderRules.section.automation")}>
                <div className="space-y-4">
                  <FormField>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/80 p-3">
                      <div className="min-w-0">
                        <FormLabel htmlFor="autoPo">{t("reorderRules.autoPo")}</FormLabel>
                        <FormHint>{t("reorderRules.autoPoHint")}</FormHint>
                      </div>
                      <Switch
                        id="autoPo"
                        checked={!!autoPo}
                        onCheckedChange={(checked) => form.setValue("autoPo", checked, { shouldDirty: true })}
                        aria-label={t("reorderRules.autoPo")}
                      />
                    </div>
                  </FormField>
                  <FormField>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/80 p-3">
                      <FormLabel htmlFor="isActive">{t("status.active")}</FormLabel>
                      <Switch
                        id="isActive"
                        checked={!!isActive}
                        onCheckedChange={(checked) => form.setValue("isActive", checked, { shouldDirty: true })}
                        aria-label={t("status.active")}
                      />
                    </div>
                  </FormField>
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
    </PermissionGuard>
  );
}
