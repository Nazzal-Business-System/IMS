"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema } from "@ims/validation";
import type { Category } from "@ims/shared-types";
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

type FormData = z.infer<typeof categorySchema>;

type CategoryDetail = Category & {
  products?: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
    status: string;
    sellingPrice: number;
  }>;
};

export default function CategoryDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const perms = useRecordPermissions("categories");
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["categories", id],
    queryFn: () => apiFetch<CategoryDetail>(`/categories/${id}`),
    enabled: Boolean(id) && perms.canView,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "" },
  });

  const saveMutation = useMutation({
    mutationFn: (values: FormData) =>
      apiFetch<Category>(`/categories/${id}`, { method: "PUT", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories", id] });
      toast({ title: t("toast.categoryUpdated") });
      setEditOpen(false);
    },
    onError: (err: Error) => {
      const msg = err instanceof ApiClientError ? err.message : err.message;
      toast({ title: t("toast.error"), description: msg, variant: "destructive" });
    },
  });

  const openEdit = () => {
    if (!data) return;
    form.reset({ name: data.name, description: data.description ?? "" });
    setEditOpen(true);
  };

  return (
    <PermissionGuard allowed={perms.canView} message={t("record.forbidden")}>
      {isLoading ? (
        <RecordLoadingState />
      ) : isError ? (
        (error instanceof ApiClientError && error.status === 404) ||
        (error instanceof Error && /not found/i.test(error.message)) ? (
          <RecordNotFoundState backHref="/categories" />
        ) : (
          <RecordErrorState
            onRetry={() => refetch()}
            message={error instanceof Error ? error.message : undefined}
          />
        )
      ) : !data ? (
        <RecordNotFoundState backHref="/categories" />
      ) : (
        <RecordDetailsShell>
          <DetailsHeader
            backHref="/categories"
            title={data.name}
            subtitle={data.description ?? undefined}
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
                { label: t("table.description"), value: data.description ?? t("table.dash") },
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
          <FormDialogHeader title={t("categories.edit")} />
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}>
            <FormDialogBody className="space-y-4">
              <FormField>
                <FormLabel required>{t("table.name")}</FormLabel>
                <Input {...form.register("name")} />
                <FormError>{form.formState.errors.name?.message}</FormError>
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
