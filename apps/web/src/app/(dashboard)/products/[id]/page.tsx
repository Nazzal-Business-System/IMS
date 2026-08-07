"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema } from "@ims/validation";
import type { Category, Product, ReorderRule, StockMovement, Supplier, Warehouse } from "@ims/shared-types";
import { z } from "zod";
import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { useRecordPermissions } from "@/lib/record-permissions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buildProductWritePayload, displayOptionalText } from "@/lib/product-payload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
  RelatedRecordLink,
  RelatedRecords,
  RecordLoadingState,
  RecordNotFoundState,
  RecordErrorState,
} from "@/components/records";

type ProductDetail = Product & {
  reorderRule?: ReorderRule | null;
  recentMovements?: StockMovement[];
};

type FormData = z.infer<typeof productSchema>;

const STATUS_KEYS: Record<string, string> = {
  active: "status.active",
  inactive: "status.inactive",
  discontinued: "status.discontinued",
  archived: "status.archived",
};

export default function ProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const perms = useRecordPermissions("products");
  const [editOpen, setEditOpen] = useState(false);
  const [clearBarcode, setClearBarcode] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["products", id],
    queryFn: () => apiFetch<ProductDetail>(`/products/${id}`),
    enabled: Boolean(id) && perms.canView,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<Category[]>("/categories"),
    enabled: editOpen,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiFetch<Supplier[]>("/suppliers"),
    enabled: editOpen,
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => apiFetch<Warehouse[]>("/warehouses"),
    enabled: editOpen,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      categoryId: "",
      supplierId: "",
      costPrice: 0,
      sellingPrice: 0,
      quantity: 0,
      reorderLevel: 0,
      warehouseId: "",
      status: "active",
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: FormData) =>
      apiFetch<Product>(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(
          buildProductWritePayload(values, "update", { clearBarcode })
        ),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["products", id], (prev: ProductDetail | undefined) =>
        prev ? { ...prev, ...updated } : updated
      );
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", id] });
      toast({ title: t("toast.productUpdated") });
      setClearBarcode(false);
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

  const archiveMutation = useMutation({
    mutationFn: (archived: boolean) =>
      apiFetch(`/products/${id}/archive`, {
        method: "PATCH",
        body: JSON.stringify({ archived }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", id] });
      toast({
        title: data?.status === "archived" ? t("toast.productRestored") : t("toast.productArchived"),
      });
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
    setClearBarcode(false);
    form.reset({
      name: data.name,
      sku: data.sku,
      barcode: data.barcode ?? "",
      categoryId: data.categoryId,
      supplierId: data.supplierId,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      quantity: data.quantity,
      reorderLevel: data.reorderLevel,
      warehouseId: data.warehouseId,
      status: data.status === "archived" ? "inactive" : data.status,
    });
    setEditOpen(true);
  };

  const margin = useMemo(() => {
    if (!data) return null;
    if (data.costPrice <= 0) return null;
    return ((data.sellingPrice - data.costPrice) / data.costPrice) * 100;
  }, [data]);

  return (
    <PermissionGuard allowed={perms.canView} message={t("record.forbidden")}>
      {isLoading ? (
        <RecordLoadingState />
      ) : isError ? (
        (error instanceof ApiClientError && error.status === 404) ||
        (error instanceof Error && /not found/i.test(error.message)) ? (
          <RecordNotFoundState backHref="/products" />
        ) : (
          <RecordErrorState
            onRetry={() => refetch()}
            message={error instanceof Error ? error.message : undefined}
          />
        )
      ) : !data ? (
        <RecordNotFoundState backHref="/products" />
      ) : (
        <RecordDetailsShell>
          <DetailsHeader
            backHref="/products"
            title={data.name}
            subtitle={
              <span className="font-mono text-xs" dir="ltr">
                {data.sku}
                {displayOptionalText(data.barcode)
                  ? ` · ${displayOptionalText(data.barcode)}`
                  : ""}
              </span>
            }
            status={data.status}
            statusLabel={t(STATUS_KEYS[data.status] ?? data.status)}
            meta={
              <>
                {t("record.createdAt")}: {formatDate(data.createdAt)} · {t("record.updatedAt")}:{" "}
                {formatDate(data.updatedAt)}
              </>
            }
            actions={
              perms.canEdit ? (
                <>
                  <Button type="button" variant="secondary" onClick={openEdit}>
                    <Pencil className="h-4 w-4" />
                    {t("action.edit")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={archiveMutation.isPending}
                    onClick={() =>
                      archiveMutation.mutate(data.status !== "archived")
                    }
                  >
                    {data.status === "archived" ? (
                      <ArchiveRestore className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    {data.status === "archived" ? t("action.restore") : t("action.archive")}
                  </Button>
                </>
              ) : undefined
            }
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <DetailsSection title={t("record.identity")}>
              <MetadataList
                items={[
                  { label: t("table.sku"), value: data.sku, mono: true },
                  {
                    label: t("table.barcode"),
                    value: displayOptionalText(data.barcode) ?? t("table.dash"),
                    mono: Boolean(displayOptionalText(data.barcode)),
                  },
                  {
                    label: t("table.category"),
                    value: data.category ? (
                      <Link
                        href={`/categories/${data.categoryId}`}
                        className="text-accent hover:underline"
                      >
                        {data.category.name}
                      </Link>
                    ) : (
                      t("table.dash")
                    ),
                  },
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
                    label: t("units.title"),
                    value: data.unit
                      ? `${data.unit.name} (${data.unit.symbol})`
                      : t("table.dash"),
                  },
                  {
                    label: t("table.warehouse"),
                    value: data.warehouse ? (
                      <Link
                        href={`/warehouses/${data.warehouseId}`}
                        className="text-accent hover:underline"
                      >
                        {data.warehouse.name}
                      </Link>
                    ) : (
                      t("table.dash")
                    ),
                  },
                ]}
              />
            </DetailsSection>

            <DetailsSection title={t("table.status")}>
              <MetadataList
                items={[
                  {
                    label: t("table.qty"),
                    value: <span className="tabular-nums">{data.quantity}</span>,
                  },
                  {
                    label: t("table.reorderLevel"),
                    value: <span className="tabular-nums">{data.reorderLevel}</span>,
                  },
                  {
                    label: t("table.costPrice"),
                    value: (
                      <span className="tabular-nums" dir="ltr">
                        {formatCurrency(data.costPrice)}
                      </span>
                    ),
                  },
                  {
                    label: t("table.sellingPrice"),
                    value: (
                      <span className="tabular-nums" dir="ltr">
                        {formatCurrency(data.sellingPrice)}
                      </span>
                    ),
                  },
                  ...(margin != null
                    ? [
                        {
                          label: t("table.margin"),
                          value: (
                            <span className="tabular-nums">{margin.toFixed(1)}%</span>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            </DetailsSection>
          </div>

          {data.reorderRule ? (
            <DetailsSection title={t("products.reorderRule")}>
              <RelatedRecords>
                <RelatedRecordLink
                  href={`/reorder-rules/${data.reorderRule.id}`}
                  title={`${t("table.minQty")}: ${data.reorderRule.minQuantity}`}
                  meta={
                    <StatusBadge
                      status={data.reorderRule.isActive ? "active" : "inactive"}
                      label={
                        data.reorderRule.isActive ? t("status.active") : t("status.inactive")
                      }
                    />
                  }
                />
              </RelatedRecords>
            </DetailsSection>
          ) : null}

          <DetailsSection title={t("products.recentMovements")}>
            <RelatedRecords>
              {(data.recentMovements ?? []).map((m) => (
                <RelatedRecordLink
                  key={m.id}
                  href={`/stock-movements/${m.id}`}
                  title={
                    <span>
                      {m.type} · {m.quantity}
                    </span>
                  }
                  meta={formatDate(m.createdAt)}
                />
              ))}
            </RelatedRecords>
          </DetailsSection>
        </RecordDetailsShell>
      )}

      <FormDialog open={editOpen} onOpenChange={setEditOpen}>
        <FormDialogContent size="lg" aria-describedby={undefined}>
          <FormDialogHeader
            title={t("products.edit")}
            description={t("products.editDescription")}
          />
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
          >
            <FormDialogBody className="space-y-6">
              <FormSection title={t("products.section.identity")}>
                <FormGrid cols={2}>
                  <FormField>
                    <FormLabel required>{t("table.name")}</FormLabel>
                    <Input {...form.register("name")} />
                    <FormError>{form.formState.errors.name?.message}</FormError>
                  </FormField>
                  <FormField>
                    <FormLabel required>{t("table.sku")}</FormLabel>
                    <Input {...form.register("sku")} />
                    <FormError>{form.formState.errors.sku?.message}</FormError>
                  </FormField>
                  <FormField>
                    <FormLabel optional>{t("table.barcode")}</FormLabel>
                    <div className="flex gap-2">
                      <Input
                        dir="ltr"
                        className="font-mono"
                        {...form.register("barcode", {
                          onChange: () => setClearBarcode(false),
                        })}
                      />
                      {form.watch("barcode") || data?.barcode ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="shrink-0"
                          onClick={() => {
                            form.setValue("barcode", "");
                            setClearBarcode(true);
                          }}
                        >
                          {t("products.clearBarcode")}
                        </Button>
                      ) : null}
                    </div>
                    <FormError>{form.formState.errors.barcode?.message}</FormError>
                  </FormField>
                </FormGrid>
              </FormSection>

              <FormSection title={t("products.section.categorization")}>
                <FormGrid cols={2}>
                  <FormField>
                    <FormLabel required>{t("table.category")}</FormLabel>
                    <Select {...form.register("categoryId")}>
                      <option value="">{t("table.select")}</option>
                      {categories?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                    <FormError>{form.formState.errors.categoryId?.message}</FormError>
                  </FormField>
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
                    <FormLabel required>{t("table.warehouse")}</FormLabel>
                    <Select {...form.register("warehouseId")}>
                      <option value="">{t("table.select")}</option>
                      {warehouses?.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </Select>
                    <FormError>{form.formState.errors.warehouseId?.message}</FormError>
                  </FormField>
                </FormGrid>
              </FormSection>

              <FormSection title={t("products.section.stockPricing")}>
                <FormGrid cols={2}>
                  <FormField>
                    <FormLabel required>{t("table.costPrice")}</FormLabel>
                    <Input type="number" step="0.01" min={0} {...form.register("costPrice")} />
                    <FormError>{form.formState.errors.costPrice?.message}</FormError>
                  </FormField>
                  <FormField>
                    <FormLabel required>{t("table.sellingPrice")}</FormLabel>
                    <Input type="number" step="0.01" min={0} {...form.register("sellingPrice")} />
                    <FormError>{form.formState.errors.sellingPrice?.message}</FormError>
                  </FormField>
                  <FormField>
                    <FormLabel required>{t("table.quantity")}</FormLabel>
                    <Input type="number" min={0} {...form.register("quantity")} />
                  </FormField>
                  <FormField>
                    <FormLabel required>{t("table.reorderLevel")}</FormLabel>
                    <Input type="number" min={0} {...form.register("reorderLevel")} />
                  </FormField>
                </FormGrid>
              </FormSection>

              <FormSection title={t("products.section.status")}>
                <FormGrid cols={2}>
                  <FormField>
                    <FormLabel required>{t("table.status")}</FormLabel>
                    <Select {...form.register("status")}>
                      <option value="active">{t("status.active")}</option>
                      <option value="inactive">{t("status.inactive")}</option>
                      <option value="discontinued">{t("status.discontinued")}</option>
                    </Select>
                  </FormField>
                </FormGrid>
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
